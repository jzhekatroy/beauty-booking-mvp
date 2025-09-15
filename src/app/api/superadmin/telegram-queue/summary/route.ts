import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [pending, processing, failed] = await Promise.all([
      prisma.notificationQueue.count({ where: { status: 'PENDING' } }),
      prisma.notificationQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.notificationQueue.count({ where: { status: 'FAILED' } }),
    ])
    // Скорость отправки: последние 60с и 5 минут
    const now = new Date()
    const minus1m = new Date(now.getTime() - 60 * 1000)
    const minus5m = new Date(now.getTime() - 5 * 60 * 1000)
    const [last1m, last5m] = await Promise.all([
      prisma.notificationLog.count({ where: { createdAt: { gte: minus1m } } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: minus5m } } }),
    ])
    const perMinute5m = Math.round((last5m / 5) * 100) / 100
    // Лимиты из глобальных настроек
    const global = await prisma.globalNotificationSettings.findFirst()
    const limits = global ? {
      maxRequestsPerMinute: global.maxRequestsPerMinute,
      requestDelayMs: global.requestDelayMs,
      maxRetryAttempts: global.maxRetryAttempts,
      retryDelayMs: global.retryDelayMs,
      exponentialBackoff: global.exponentialBackoff,
    } : null
    return NextResponse.json({ pending, processing, failed, rate: { last1m, perMinute5m }, limits })
  } catch (error) {
    console.error('Error fetching queue summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


