import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized) return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: normalized } })
    // Не раскрываем наличие пользователя, но проверяем верификацию
    if (!user || !user.emailVerifiedAt) {
      return NextResponse.json({ success: true })
    }

    // Throttling: 1/min, 5/hour — используем ту же таблицу email_verification_codes как универсальный код
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
        subject: 'Код для восстановления пароля',
        text: `Ваш код для смены пароля: ${code}. Срок действия 30 минут.`,
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
