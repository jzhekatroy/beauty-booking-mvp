import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { getTimezoneOffsetMinutes } from '@/lib/timezone'

async function ensureBroadcastSchema() {
  // Ensure Prisma enum type exists for BroadcastCampaignStatus
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BroadcastCampaignStatus') THEN
        CREATE TYPE "public"."BroadcastCampaignStatus" AS ENUM (
          'DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','FAILED','CANCELLED'
        );
      END IF;
    END$$;
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
      id text PRIMARY KEY,
      team_id text NOT NULL,
      name text NULL,
      message text NULL,
      template_id text NULL,
      status "public"."BroadcastCampaignStatus" NOT NULL DEFAULT 'DRAFT',
      scheduled_at timestamp with time zone NULL,
      started_at timestamp with time zone NULL,
      completed_at timestamp with time zone NULL,
      progress_total integer NOT NULL DEFAULT 0,
      progress_sent integer NOT NULL DEFAULT 0,
      progress_failed integer NOT NULL DEFAULT 0,
      error_csv_url text NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT broadcast_campaigns_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS broadcast_campaigns_team_status_idx ON public.broadcast_campaigns(team_id, status)
  `)

  // Ensure campaign_id column in notification_logs for relation (no FK to avoid failures if table missing)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS campaign_id text
  `)
}

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

    await ensureBroadcastSchema()

    const body = await request.json().catch(() => ({}))
    const message: string = String(body.message || '').trim()
    const scheduledAtRaw: string = String(body.scheduledAt || '')
    const name: string | null = body.name ? String(body.name).trim() : null

    if (!message) {
      return NextResponse.json({ error: 'Текст сообщения обязателен' }, { status: 400 })
    }

    // Рассчитываем executeAt с учётом часового пояса команды
    let scheduledAt: Date | null = null
    if (scheduledAtRaw) {
      // Ожидаем формат от <input type="datetime-local">: YYYY-MM-DDTHH:mm
      const m = scheduledAtRaw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
      if (m) {
        const [_, y, mo, d, h, mi] = m
        const offsetMin = getTimezoneOffsetMinutes(user.team.timezone)
        const msUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) - offsetMin * 60000
        scheduledAt = new Date(msUtc)
      } else {
        scheduledAt = new Date(scheduledAtRaw)
      }
    }

    // Получаем получателей: все клиенты с Telegram
    const clients = await prisma.client.findMany({
      where: { teamId: user.teamId, telegramId: { not: null }, telegramBlocked: false },
      select: { id: true },
    })
    const total = clients.length
    if (total === 0) {
      return NextResponse.json({ error: 'Нет получателей с Telegram ID' }, { status: 400 })
    }

    // Создаём кампанию
    const campaign = await prisma.broadcastCampaign.create({
      data: {
        teamId: user.teamId,
        name,
        message,
        status: scheduledAt ? 'SCHEDULED' : 'RUNNING',
        scheduledAt,
        startedAt: scheduledAt ? null : new Date(),
        progressTotal: total,
      },
    })

    // Ставим задачи в очередь (через createMany)
    const executeAt = scheduledAt ?? new Date()
    const tasks = clients.map((c) => ({
      type: 'SEND_MESSAGE',
      data: {
        teamId: user.teamId,
        clientId: c.id,
        message,
        meta: { source: 'broadcast', campaignId: campaign.id },
      },
      executeAt,
      status: 'PENDING' as const,
      attempts: 0,
      maxAttempts: 3,
    }))

    // Prisma createMany с JSON поддерживается в PostgreSQL
    await prisma.notificationQueue.createMany({ data: tasks })

    return NextResponse.json({ success: true, campaignId: campaign.id, total })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message, details: process.env.NODE_ENV !== 'production' ? String(message) : undefined }, { status })
  }
}


