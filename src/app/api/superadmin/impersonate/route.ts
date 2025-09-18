import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Неверный формат JSON' }, { status: 400 })
    }
    const { teamId } = body || {}
    if (!teamId) return NextResponse.json({ error: 'teamId обязателен' }, { status: 400 })

    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })

    const adminUser = await prisma.user.findFirst({
      where: { teamId, role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })
    if (!adminUser) return NextResponse.json({ error: 'У команды нет администратора' }, { status: 400 })

    // Формируем полноценный JWTPayload, как при обычном логине,
    // чтобы downstream-эндпоинты видели teamId/role/email
    const impersonationPayload: any = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      teamId: adminUser.teamId,
      impersonatedBy: me.id,
    }
    const impersonationToken = jwt.sign(impersonationPayload, process.env.JWT_SECRET!, { expiresIn: '1h' })

    return NextResponse.json({ token: impersonationToken })
  } catch (error) {
    console.error('Superadmin impersonate error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


