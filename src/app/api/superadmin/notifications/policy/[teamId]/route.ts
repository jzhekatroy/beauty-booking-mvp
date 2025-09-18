import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Токен авторизации отсутствует', status: 401 as const }
  const token = authHeader.replace('Bearer ', '')
  let decoded: any
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  } catch {
    return { error: 'Недействительный токен', status: 401 as const }
  }
  const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!me || me.role !== 'SUPER_ADMIN') return { error: 'Недостаточно прав', status: 403 as const }
  return { me }
}

export async function GET(request: NextRequest, context: { params: { teamId: string } }) {
  try {
    const auth = await requireSuperAdmin(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { teamId } = context.params
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })

    let policy = await prisma.teamNotificationPolicy.findUnique({ where: { teamId } })
    if (!policy) {
      policy = await prisma.teamNotificationPolicy.create({
        data: {
          teamId,
          delayAfterBookingSeconds: 60,
          reminders: [],
          telegramRatePerMinute: 25,
          telegramPerChatPerMinute: 15,
          maxConcurrentSends: 1,
        },
      })
    }

    return NextResponse.json({
      policy: {
        telegramRatePerMinute: policy.telegramRatePerMinute,
        telegramPerChatPerMinute: policy.telegramPerChatPerMinute,
        maxConcurrentSends: policy.maxConcurrentSends,
      },
    })
  } catch (error) {
    console.error('Superadmin get policy error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: { teamId: string } }) {
  try {
    const auth = await requireSuperAdmin(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { teamId } = context.params
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const rpm = Number.isFinite(Number(body.telegramRatePerMinute)) ? Math.max(1, Math.floor(Number(body.telegramRatePerMinute))) : undefined
    const cpm = Number.isFinite(Number(body.telegramPerChatPerMinute)) ? Math.max(1, Math.floor(Number(body.telegramPerChatPerMinute))) : undefined
    const conc = Number.isFinite(Number(body.maxConcurrentSends)) ? Math.max(1, Math.floor(Number(body.maxConcurrentSends))) : undefined

    const updated = await prisma.teamNotificationPolicy.upsert({
      where: { teamId },
      update: {
        telegramRatePerMinute: rpm ?? undefined,
        telegramPerChatPerMinute: cpm ?? undefined,
        maxConcurrentSends: conc ?? undefined,
      },
      create: {
        teamId,
        delayAfterBookingSeconds: 60,
        reminders: [],
        telegramRatePerMinute: rpm ?? 25,
        telegramPerChatPerMinute: cpm ?? 15,
        maxConcurrentSends: conc ?? 1,
      },
    })

    return NextResponse.json({
      success: true,
      policy: {
        telegramRatePerMinute: updated.telegramRatePerMinute,
        telegramPerChatPerMinute: updated.telegramPerChatPerMinute,
        maxConcurrentSends: updated.maxConcurrentSends,
      },
    })
  } catch (error) {
    console.error('Superadmin update policy error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


