import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action as 'resendFailed' | 'releaseProcessing'
    const from = body.from as string | undefined
    const to = body.to as string | undefined
    const minutes = Number(body.minutes || 10)

    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

    if (action === 'resendFailed') {
      const start = from ? new Date(from + 'T00:00:00.000Z') : new Date(new Date().toISOString().slice(0,10) + 'T00:00:00.000Z')
      const end = to ? new Date(to + 'T23:59:59.999Z') : new Date(new Date().toISOString().slice(0,10) + 'T23:59:59.999Z')
      const failed = await prisma.notificationLog.findMany({
        where: { status: 'FAILED', createdAt: { gte: start, lte: end } },
        take: 1000,
      })
      // На основе логов создадим задачи в очереди
      for (const l of failed) {
        await prisma.notificationQueue.create({
          data: {
            type: 'RESEND_MESSAGE',
            data: { logId: l.id },
            executeAt: new Date(),
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 3,
            errorMessage: null,
          } as any,
        })
      }
      return NextResponse.json({ success: true, created: failed.length })
    }

    if (action === 'releaseProcessing') {
      const threshold = new Date(Date.now() - minutes * 60 * 1000)
      const released = await prisma.notificationQueue.updateMany({
        where: { status: 'PROCESSING', updatedAt: { lt: threshold } },
        data: { status: 'PENDING' }
      })
      return NextResponse.json({ success: true, released: released.count })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error in bulk queue action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


