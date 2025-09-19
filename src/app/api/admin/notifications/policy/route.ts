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
  sendOnlyDaytime?: boolean
  daytimeFrom?: string
  daytimeTo?: string
  reminderMessage?: string
  remindersEnabled?: boolean
  cancelBySalonEnabled?: boolean
  cancelBySalonMessage?: string
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

function defaultCancelBySalonMessage(): string {
  return (
    'Уважаемый клиент, {client_name}!\n\n' +
    'К сожалению, ваша запись в салон {team_name} на услугу {service_name} к мастеру {master_name}\n' +
    'Дата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\n' +
    'отменена салоном. Пожалуйста, выберите другое удобное время для новой записи.'
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
    // Support environments where Prisma Client may not include TeamNotificationPolicy model
    let policy: { delayAfterBookingSeconds: number; reminders: any } | null = null
    const hasModel = (prisma as any).teamNotificationPolicy && typeof (prisma as any).teamNotificationPolicy.findUnique === 'function'
    if (hasModel) {
      policy = await (prisma as any).teamNotificationPolicy.findUnique({ where: { teamId: user.teamId } })
      if (!policy) {
        policy = await (prisma as any).teamNotificationPolicy.create({
          data: { teamId: user.teamId, delayAfterBookingSeconds: 60, reminders: {} },
        })
      }
    } else {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.team_notification_policies (
          id text PRIMARY KEY DEFAULT gen_random_uuid(),
          team_id text UNIQUE NOT NULL,
          delay_after_booking_seconds integer NOT NULL DEFAULT 60,
          reminders jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )`)
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT delay_after_booking_seconds as "delayAfterBookingSeconds", reminders FROM public.team_notification_policies WHERE team_id = $1`, user.teamId)
      if (rows.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.team_notification_policies(id, team_id, delay_after_booking_seconds, reminders)
          VALUES ($1, $1, $2, $3::jsonb)
          ON CONFLICT (team_id) DO NOTHING
        `, user.teamId, 60, JSON.stringify({}))
        policy = { delayAfterBookingSeconds: 60, reminders: {} }
      } else {
        policy = rows[0]
      }
    }

    const json = ((policy?.reminders as unknown) as PolicyJson) || {}
    const items = Array.isArray((json as any).items) ? (json as any).items : []

    const effectivePolicy: { delayAfterBookingSeconds: number; reminders: any } = policy ?? { delayAfterBookingSeconds: 60, reminders: {} }

    return NextResponse.json({
      policy: {
        delayAfterBookingSeconds: effectivePolicy.delayAfterBookingSeconds,
        reminders: items,
        postBookingEnabled: Boolean(json.postBookingEnabled ?? false),
        postBookingMessage: String(json.postBookingMessage || defaultPostBookingMessage()),
        sendOnlyDaytime: Boolean(json.sendOnlyDaytime ?? true),
        daytimeFrom: String(json.daytimeFrom || '09:00'),
        daytimeTo: String(json.daytimeTo || '22:00'),
        reminderMessage: String(json.reminderMessage || (
          '{client_name}, спасибо за запись в {team_name} ✨\n\n' +
          'Напоминаем про вашу заявку на {service_name} к мастеру {master_name} — держим для вас время ✅\n' +
          'Дата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\n' +
          'Если планы изменятся — вы можете отменить запись по ссылке: ссылка на отмену ❌\n\n' +
          'Хорошего дня!'
        )),
        remindersEnabled: Boolean(json.remindersEnabled ?? false),
        cancelBySalonEnabled: Boolean(json.cancelBySalonEnabled ?? false),
        cancelBySalonMessage: String(json.cancelBySalonMessage || defaultCancelBySalonMessage()),
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
    const sendOnlyDaytime = !!body.sendOnlyDaytime
    const daytimeFrom = String(body.daytimeFrom || '09:00')
    const daytimeTo = String(body.daytimeTo || '22:00')
    const reminderMessage = String(body.reminderMessage || '').trim() || (
      '{client_name}, спасибо за запись в {team_name} ✨\n\n' +
      'Напоминаем про вашу заявку на {service_name} к мастеру {master_name} — держим для вас время ✅\n' +
      'Дата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\n' +
      'Если планы изменятся — вы можете отменить запись по ссылке: ссылка на отмену ❌\n\n' +
      'Хорошего дня!'
    )
    const remindersEnabled = body.remindersEnabled === undefined ? false : !!body.remindersEnabled
    const cancelBySalonEnabled = body.cancelBySalonEnabled === undefined ? true : !!body.cancelBySalonEnabled
    const cancelBySalonMessage = String(body.cancelBySalonMessage || '').trim() || defaultCancelBySalonMessage()

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
      sendOnlyDaytime,
      daytimeFrom,
      daytimeTo,
      reminderMessage,
      remindersEnabled,
      cancelBySalonEnabled,
      cancelBySalonMessage,
    }

    const hasModel = (prisma as any).teamNotificationPolicy && typeof (prisma as any).teamNotificationPolicy.upsert === 'function'
    let updated: { delayAfterBookingSeconds: number }
    if (hasModel) {
      const res = await (prisma as any).teamNotificationPolicy.upsert({
        where: { teamId: user.teamId },
        update: { delayAfterBookingSeconds, reminders: remindersJson as any },
        create: { teamId: user.teamId, delayAfterBookingSeconds, reminders: remindersJson as any },
      })
      updated = { delayAfterBookingSeconds: res.delayAfterBookingSeconds }
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.team_notification_policies(id, team_id, delay_after_booking_seconds, reminders)
        VALUES ($1, $1, $2, $3::jsonb)
        ON CONFLICT (team_id)
        DO UPDATE SET delay_after_booking_seconds = EXCLUDED.delay_after_booking_seconds, reminders = EXCLUDED.reminders, updated_at = now()
      `, user.teamId, delayAfterBookingSeconds, JSON.stringify(remindersJson))
      updated = { delayAfterBookingSeconds }
    }

    return NextResponse.json({ success: true, policy: {
      delayAfterBookingSeconds: updated.delayAfterBookingSeconds,
      reminders: remindersItems,
      postBookingEnabled,
      postBookingMessage,
      sendOnlyDaytime,
      daytimeFrom,
      daytimeTo,
      reminderMessage,
      cancelBySalonEnabled,
      cancelBySalonMessage,
    } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
