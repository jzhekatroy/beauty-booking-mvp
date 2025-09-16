import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const id = context?.params?.id
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const item = await prisma.notificationQueue.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (item.status === 'PROCESSING') {
      return NextResponse.json({ error: 'Нельзя удалить задачу в обработке' }, { status: 409 })
    }

    await prisma.notificationQueue.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete queue item error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


