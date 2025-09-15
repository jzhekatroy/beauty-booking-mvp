import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function ensureNotificationLogsSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.notification_logs (
      id text PRIMARY KEY,
      team_id text NOT NULL,
      type text NOT NULL,
      client_id text NOT NULL,
      message text NOT NULL,
      status text NOT NULL,
      telegram_message_id text NULL,
      error_message text NULL,
      attempts integer NOT NULL DEFAULT 1,
      processing_time_ms integer NULL,
      user_agent text NULL,
      ip_address text NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS notification_logs_team_created_idx ON public.notification_logs(team_id, created_at)
  `)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.notification_logs'::regclass AND attname = 'campaign_id') THEN
      ALTER TABLE public.notification_logs ADD COLUMN campaign_id text;
    END IF; END $$;
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureNotificationLogsSchema()
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const start = from ? new Date(from + 'T00:00:00.000Z') : new Date(new Date().toISOString().slice(0,10) + 'T00:00:00.000Z')
    const end = to ? new Date(to + 'T23:59:59.999Z') : new Date(new Date().toISOString().slice(0,10) + 'T23:59:59.999Z')

    const where: any = { createdAt: { gte: start, lte: end } }
    if (teamId) where.teamId = teamId

    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        team: { select: { name: true } },
        client: { select: { firstName: true, lastName: true, telegramUsername: true } }
      }
    })

    const mapped = logs.map(l => ({
      id: l.id,
      teamId: l.teamId,
      teamName: (l as any).team?.name,
      clientId: l.clientId,
      clientName: (() => {
        const first = (l as any).client?.firstName || ''
        const last = (l as any).client?.lastName || ''
        const username = (l as any).client?.telegramUsername ? `@${(l as any).client?.telegramUsername}` : ''
        return (first || last) ? `${first} ${last}`.trim() : (username || l.clientId)
      })(),
      message: l.message,
      status: l.status as 'SUCCESS' | 'FAILED',
      telegramMessageId: l.telegramMessageId,
      errorMessage: l.errorMessage,
      attempts: l.attempts,
      processingTimeMs: l.processingTimeMs,
      createdAt: l.createdAt.toISOString(),
    }))

    return NextResponse.json({ logs: mapped })
  } catch (error) {
    console.error('Error fetching telegram send logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


