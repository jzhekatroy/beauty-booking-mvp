import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, context: any) {
  try {
    const id = context?.params?.id as string
    const log = await prisma.notificationLog.findUnique({ where: { id }, include: { team: true, client: true } })
    if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    if (!log.clientId || !log.team?.telegramBotToken) {
      return NextResponse.json({ error: 'Missing client or bot token' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({ where: { id: log.clientId } })
    if (!client?.telegramId) return NextResponse.json({ error: 'Client has no telegramId' }, { status: 400 })

    // Render template variables
    const first = (client.firstName || (client as any).telegramFirstName || '').trim()
    const last = (client.lastName || (client as any).telegramLastName || '').trim()
    const username = (client as any).telegramUsername ? `@${(client as any).telegramUsername}` : ''
    const clientName = (first || last) ? `${first} ${last}`.trim() : (username || 'клиент')
    const teamName = log.team?.name || 'Салон'
    const replacements: Record<string, string> = {
      '{client_name}': clientName,
      '{client_first_name}': first || clientName,
      '{client_last_name}': last || '',
      '{team_name}': teamName,
    }
    let rendered = String(log.message)
    for (const [k, v] of Object.entries(replacements)) rendered = rendered.split(k).join(v)

    // Переотправляем текущее сообщение
    const resp = await fetch(`https://api.telegram.org/bot${log.team.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: client.telegramId.toString(), text: rendered, parse_mode: 'HTML' })
    })
    const data = await resp.json()
    const ok = resp.ok && data?.ok !== false

    await prisma.notificationLog.create({
      data: {
        type: 'manual_resend',
        teamId: log.teamId,
        clientId: log.clientId,
        message: rendered,
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


