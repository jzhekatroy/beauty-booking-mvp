import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, teamId } = await request.json()

    // Получаем клиента и команду
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { team: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    if (!client.telegramId) {
      return NextResponse.json({ error: 'У клиента нет Telegram ID' }, { status: 400 })
    }

    if (!client.team.telegramBotToken) {
      return NextResponse.json({ error: 'У салона не настроен Telegram Bot' }, { status: 400 })
    }

    // Ставим задачу в очередь на отправку
    const task = await prisma.notificationQueue.create({
      data: {
        type: 'SEND_MESSAGE',
        data: {
          teamId: client.teamId,
          clientId: client.id,
          message,
          meta: {
            userAgent: request.headers.get('user-agent') || 'unknown',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            source: 'admin_manual',
          }
        },
        executeAt: new Date(),
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 3,
        errorMessage: null,
      } as any,
    })

    return NextResponse.json({
      success: true,
      queued: true,
      queueId: task.id,
      message: 'Сообщение поставлено в очередь'
    })

  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
