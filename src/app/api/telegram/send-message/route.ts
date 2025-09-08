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

    // Отправляем сообщение через Telegram Bot API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${client.team.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: client.telegramId.toString(),
        text: message,
        parse_mode: 'HTML'
      })
    })

    const telegramResult = await telegramResponse.json()

    if (!telegramResponse.ok) {
      return NextResponse.json({
        error: 'Ошибка отправки сообщения в Telegram',
        details: telegramResult
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Сообщение отправлено успешно',
      telegramMessageId: telegramResult.result.message_id
    })

  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
