import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

async function ensurePolicySchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.team_notification_policies (
      id text PRIMARY KEY,
      team_id text UNIQUE NOT NULL,
      delay_after_booking_seconds integer NOT NULL DEFAULT 60,
      reminders jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT team_notification_policies_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
    )
  `)
}

function parseAuth(request: NextRequest): { userId: string } {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) throw new Error('Токен авторизации отсутствует')
  const token = authHeader.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  return { userId: decoded.userId }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    await ensurePolicySchema()

    let policy = await prisma.teamNotificationPolicy.findUnique({ where: { teamId: user.teamId } })
    if (!policy) {
      policy = await prisma.teamNotificationPolicy.create({
        data: {
          teamId: user.teamId,
          delayAfterBookingSeconds: 60,
          reminders: [],
        },
      })
    }

    return NextResponse.json({ policy })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message, details: process.env.NODE_ENV !== 'production' ? String(message) : undefined }, { status })
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

    await ensurePolicySchema()

    const body = await request.json().catch(() => ({}))
    const delayAfterBookingSecondsRaw = body.delayAfterBookingSeconds
    const remindersRaw = body.reminders

    const delayAfterBookingSeconds = Number.isFinite(delayAfterBookingSecondsRaw)
      ? Math.max(0, Math.floor(delayAfterBookingSecondsRaw))
      : 60

    let reminders: Array<{ hoursBefore: number; templateId?: string | null }>
    if (Array.isArray(remindersRaw)) {
      reminders = remindersRaw
        .slice(0, 3)
        .map((r: any) => ({
          hoursBefore: Math.min(72, Math.max(1, Math.floor(Number(r?.hoursBefore ?? 24)))) ,
          templateId: r?.templateId ?? null,
        }))
    } else {
      reminders = []
    }

    const existing = await prisma.teamNotificationPolicy.findUnique({ where: { teamId: user.teamId } })
    const policy = existing
      ? await prisma.teamNotificationPolicy.update({
          where: { teamId: user.teamId },
          data: { delayAfterBookingSeconds, reminders },
        })
      : await prisma.teamNotificationPolicy.create({
          data: { teamId: user.teamId, delayAfterBookingSeconds, reminders },
        })

    return NextResponse.json({ success: true, policy })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message, details: process.env.NODE_ENV !== 'production' ? String(message) : undefined }, { status })
  }
}


