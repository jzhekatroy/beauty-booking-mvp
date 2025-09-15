import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [pending, processing, failed] = await Promise.all([
      prisma.notificationQueue.count({ where: { status: 'PENDING' } }),
      prisma.notificationQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.notificationQueue.count({ where: { status: 'FAILED' } }),
    ])
    return NextResponse.json({ pending, processing, failed })
  } catch (error) {
    console.error('Error fetching queue summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


