import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (user.emailVerifiedAt) return NextResponse.json({ success: true, alreadyVerified: true })

    // Throttling: not more than 1/min and 5/hour
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const recent = await prisma.emailVerificationCode.findMany({
      where: { userId: user.id, sentAt: { gt: oneHourAgo } },
      orderBy: { sentAt: 'desc' }
    })
    if (recent[0] && recent[0].sentAt > oneMinuteAgo) {
      return NextResponse.json({ error: 'Слишком часто. Повторите через минуту' }, { status: 429 })
    }
    if (recent.length >= 5) {
      return NextResponse.json({ error: 'Достигнут лимит за час' }, { status: 429 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await prisma.emailVerificationCode.create({ data: { userId: user.id, codeHash, expiresAt } })

    try {
      await sendMail({
        to: user.email,
        subject: 'Код подтверждения e‑mail',
        text: `Ваш код подтверждения: ${code}. Срок действия 30 минут.`,
      })
    } catch (e) {
      console.error('Resend verification email error:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend email code error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
