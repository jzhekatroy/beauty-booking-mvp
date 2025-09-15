import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const log = await prisma.notificationLog.findUnique({ where: { id }, include: { team: true, client: true } })
    if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    if (!log.clientId || !log.team?.telegramBotToken) {
      return NextResponse.json({ error: 'Missing client or bot token' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({ where: { id: log.clientId } })
    if (!client?.telegramId) return NextResponse.json({ error: 'Client has no telegramId' }, { status: 400 })

    // Переотправляем текущее сообщение
    const resp = await fetch(`https://api.telegram.org/bot${log.team.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: client.telegramId.toString(), text: log.message, parse_mode: 'HTML' })
    })
    const data = await resp.json()
    const ok = resp.ok && data?.ok !== false

    await prisma.notificationLog.create({
      data: {
        teamId: log.teamId,
        clientId: log.clientId,
        message: log.message,
        status: ok ? 'SUCCESS' : 'FAILED',
        telegramMessageId: ok ? String(data?.result?.message_id || '') : null,
        errorMessage: ok ? null : JSON.stringify(data),
        attempts: 1,
        processingTimeMs: null,
        userAgent: 'resend-api',
        ipAddress: null,
      }
    })

    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error('Error resending telegram message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


