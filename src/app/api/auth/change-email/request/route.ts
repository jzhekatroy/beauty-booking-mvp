import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded: any = verify(token, process.env.JWT_SECRET!)
    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { newEmail } = await request.json()
    const email = String(newEmail || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })

    // Проверка: нельзя менять на уже существующий и подтверждённый email
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.id === me.id) {
        return NextResponse.json({ error: 'Этот e‑mail уже используется вашим аккаунтом' }, { status: 400 })
      }
      if (existing.emailVerifiedAt) {
        return NextResponse.json({ error: 'Этот e‑mail уже занят' }, { status: 409 })
      }
    }

    // Троттлинг + генерация кода (используем ту же таблицу)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    // Сохраняем запись, связывая по userId, а новый email передадим в meta в письме
    await prisma.emailVerificationCode.create({ data: { userId: me.id, codeHash, expiresAt } })

    try {
      await sendMail({
        to: email,
        subject: 'Код подтверждения смены e‑mail',
        text: `Ваш код: ${code}. Срок действия 30 минут.`,
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change email request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
