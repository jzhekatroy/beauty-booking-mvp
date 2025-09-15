import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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
      include: { team: { select: { name: true } } }
    })

    const mapped = logs.map(l => ({
      id: l.id,
      teamId: l.teamId,
      teamName: (l as any).team?.name,
      clientId: l.clientId,
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


