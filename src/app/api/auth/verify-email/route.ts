import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const code = String(body?.code || '').trim()
    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Email и 6-значный код обязательны' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    // Find latest active code
    const now = new Date()
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    const rec = await prisma.emailVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' }
    })
    if (!rec) return NextResponse.json({ error: 'Код не найден, запросите новый' }, { status: 400 })

    // throttling / attempts
    if (rec.consumedAt) return NextResponse.json({ error: 'Код уже использован' }, { status: 400 })
    if (rec.expiresAt < now) return NextResponse.json({ error: 'Код истёк' }, { status: 400 })
    if (rec.attempts >= 5) return NextResponse.json({ error: 'Превышено число попыток' }, { status: 429 })

    if (rec.codeHash !== codeHash) {
      await prisma.emailVerificationCode.update({
        where: { id: rec.id },
        data: { attempts: rec.attempts + 1 }
      })
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.emailVerificationCode.update({ where: { id: rec.id }, data: { consumedAt: now } }),
      prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
