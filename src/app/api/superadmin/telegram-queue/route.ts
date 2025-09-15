import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const teamId = searchParams.get('teamId') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const start = from ? new Date(from + 'T00:00:00.000Z') : new Date(new Date().toISOString().slice(0,10) + 'T00:00:00.000Z')
    const end = to ? new Date(to + 'T23:59:59.999Z') : new Date(new Date().toISOString().slice(0,10) + 'T23:59:59.999Z')

    const where: any = { createdAt: { gte: start, lte: end } }
    if (status) where.status = status
    if (teamId) where.teamId = teamId

    const items = await prisma.notificationQueue.findMany({
      where,
      orderBy: [{ status: 'asc' }, { executeAt: 'asc' }],
      take: 500
    })

    const mapped = items.map(it => ({
      id: it.id,
      type: it.type,
      teamId: (it as any).teamId || undefined,
      status: it.status,
      attempts: it.attempts,
      maxAttempts: it.maxAttempts,
      errorMessage: it.errorMessage,
      executeAt: (it.executeAt as any) ? new Date(it.executeAt as any).toISOString() : new Date().toISOString(),
      createdAt: it.createdAt.toISOString(),
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('Error fetching telegram queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


