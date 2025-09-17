import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth: allow in development without JWT or with X-Internal-Key; otherwise require SUPER_ADMIN JWT
    const authHeader = request.headers.get('authorization')
    const internalKey = request.headers.get('x-internal-key')
    let allowed = false
    if (process.env.NODE_ENV !== 'production') {
      allowed = true
    }
    if (!allowed && process.env.MAIL_TEST_KEY && internalKey === process.env.MAIL_TEST_KEY) {
      allowed = true
    }
    if (!allowed) {
      if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const token = authHeader.replace('Bearer ', '')
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
      if (!me || me.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { to, subject, text, html, replyTo } = body || {}
    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'to, subject и text|html обязательны' }, { status: 400 })
    }

    // Дополнительно логируем здесь, чтобы гарантировать наличие записей
    const id = `api_${Date.now()}`
    // Отправляем почту (логирование и таблица создаются в mailer)
    const info = await sendMail({ to, subject, text, html, replyTo })
    return NextResponse.json({ success: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected })
  } catch (error) {
    console.error('Email test error:', error)
    const err = error as any
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Internal server error', details: err?.message || String(err) }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
