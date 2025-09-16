import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = (req.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim()
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const team = user.team
    const botToken = team.telegramBotToken?.trim()
    if (!botToken) {
      return NextResponse.json({ error: 'Токен Telegram бота не настроен' }, { status: 400 })
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {}

    const buttonText: string = (body?.text || 'Онлайн‑запись') as string
    const baseUrl = getBaseUrl(request)
    const slug = team.bookingSlug || team.slug
    const webAppUrl: string = (body?.url || `${baseUrl}/book/${slug}`) as string

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: buttonText,
          web_app: { url: webAppUrl }
        }
      })
    })

    const tgData = await tgResponse.json()
    if (!tgResponse.ok || !tgData.ok) {
      return NextResponse.json({ error: tgData?.description || 'Ошибка Telegram API' }, { status: 502 })
    }

    return NextResponse.json({ success: true, result: tgData.result, url: webAppUrl })
  } catch (error) {
    console.error('Ошибка назначения Mini App:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


