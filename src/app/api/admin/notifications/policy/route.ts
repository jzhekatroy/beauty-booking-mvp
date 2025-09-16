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

type PolicyJson = {
  items?: Array<{ hoursBefore: number }>
  postBookingEnabled?: boolean
  postBookingMessage?: string
}

function defaultPostBookingMessage(): string {
  return (
    '{client_name}, спасибо за запись в {team_name} ✨\n\n' +
    'Мы получили вашу заявку на {service_name} к мастеру {master_name} — держим для вас время ✅\n' +
    'Дата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\n' +
    'Если планы изменятся — вы можете отменить запись по ссылке: ссылка на отмену ❌\n\n' +
    'Хорошего дня!'
  )
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    let policy = await prisma.teamNotificationPolicy.findUnique({ where: { teamId: user.teamId } })
    if (!policy) {
      policy = await prisma.teamNotificationPolicy.create({
        data: {
          teamId: user.teamId,
          delayAfterBookingSeconds: 60,
          reminders: {},
        },
      })
    }

    const json = (policy.reminders as unknown as PolicyJson) || {}
    const items = Array.isArray(json.items) ? json.items : []

    return NextResponse.json({
      policy: {
        delayAfterBookingSeconds: policy.delayAfterBookingSeconds,
        reminders: items,
        postBookingEnabled: Boolean(json.postBookingEnabled ?? false),
        postBookingMessage: String(json.postBookingMessage || defaultPostBookingMessage()),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const delayAfterBookingSecondsRaw = body.delayAfterBookingSeconds
    const remindersRaw = Array.isArray(body.reminders) ? body.reminders : []
    const postBookingEnabled = !!body.postBookingEnabled
    const postBookingMessage = String(body.postBookingMessage || '').trim() || defaultPostBookingMessage()

    const delayAfterBookingSeconds = Number.isFinite(Number(delayAfterBookingSecondsRaw))
      ? Math.max(0, Math.floor(Number(delayAfterBookingSecondsRaw)))
      : 60
    const remindersItems: Array<{ hoursBefore: number }> = remindersRaw
      .slice(0, 3)
      .map((r: any) => ({ hoursBefore: Math.min(72, Math.max(1, Math.floor(Number(r?.hoursBefore ?? 24)))) }))

    const remindersJson: PolicyJson = {
      items: remindersItems,
      postBookingEnabled,
      postBookingMessage,
    }

    const updated = await prisma.teamNotificationPolicy.upsert({
      where: { teamId: user.teamId },
      update: { delayAfterBookingSeconds, reminders: remindersJson as any },
      create: { teamId: user.teamId, delayAfterBookingSeconds, reminders: remindersJson as any },
    })

    return NextResponse.json({ success: true, policy: {
      delayAfterBookingSeconds: updated.delayAfterBookingSeconds,
      reminders: remindersItems,
      postBookingEnabled,
      postBookingMessage,
    } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
