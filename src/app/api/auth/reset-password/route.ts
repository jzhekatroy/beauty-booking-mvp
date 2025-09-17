import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()
    const normalized = String(email || '').trim().toLowerCase()
    const codeStr = String(code || '').trim()
    const password = String(newPassword || '')
    if (!normalized || !codeStr || codeStr.length !== 6 || password.length < 6) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } })
    if (!user || !user.emailVerifiedAt) {
      // не раскрываем
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    const rec = await prisma.emailVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' }
    })
    if (!rec) return NextResponse.json({ error: 'Код не найден' }, { status: 400 })
    if (rec.consumedAt) return NextResponse.json({ error: 'Код уже использован' }, { status: 400 })
    if (rec.expiresAt < new Date()) return NextResponse.json({ error: 'Код истёк' }, { status: 400 })
    if (rec.attempts >= 5) return NextResponse.json({ error: 'Превышено число попыток' }, { status: 429 })

    const codeHash = crypto.createHash('sha256').update(codeStr).digest('hex')
    if (rec.codeHash !== codeHash) {
      await prisma.emailVerificationCode.update({ where: { id: rec.id }, data: { attempts: rec.attempts + 1 } })
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    const hashed = await hashPassword(password)
    await prisma.$transaction([
      prisma.emailVerificationCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
