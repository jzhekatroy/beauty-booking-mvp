import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

function parseAuth(request: NextRequest): { userId: string } {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) throw new Error('Токен авторизации отсутствует')
  const token = authHeader.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  return { userId: decoded.userId }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const message = String(body.message || '').trim() || 'Тестовая рассылка'
    const clientId = String(body.clientId || '') || null

    // Если не указан clientId, берём первого клиента команды, у кого есть telegramId
    const client = clientId
      ? await prisma.client.findFirst({ where: { id: clientId, teamId: user.teamId, telegramId: { not: null } } })
      : await prisma.client.findFirst({ where: { teamId: user.teamId, telegramId: { not: null } }, orderBy: { createdAt: 'asc' } })

    if (!client) return NextResponse.json({ error: 'Нет клиентов с Telegram ID' }, { status: 400 })
    const team = await prisma.team.findUnique({ where: { id: user.teamId } })
    if (!team?.telegramBotToken) return NextResponse.json({ error: 'Не настроен Telegram Bot' }, { status: 400 })

    // Ставим задачу в очередь
    await prisma.notificationQueue.create({
      data: {
        type: 'SEND_MESSAGE',
        data: {
          teamId: user.teamId,
          clientId: client.id,
          message,
          meta: { source: 'manual_test' },
        },
        executeAt: new Date(),
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 3,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}


