import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded: any = verify(token, process.env.JWT_SECRET!)
    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { newEmail, code } = await request.json()
    const email = String(newEmail || '').trim().toLowerCase()
    const codeStr = String(code || '').trim()
    if (!email || codeStr.length !== 6) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const rec = await prisma.emailVerificationCode.findFirst({ where: { userId: me.id }, orderBy: { sentAt: 'desc' } })
    if (!rec) return NextResponse.json({ error: 'Код не найден' }, { status: 400 })
    if (rec.consumedAt) return NextResponse.json({ error: 'Код уже использован' }, { status: 400 })
    if (rec.expiresAt < new Date()) return NextResponse.json({ error: 'Код истёк' }, { status: 400 })
    if (rec.attempts >= 5) return NextResponse.json({ error: 'Превышено число попыток' }, { status: 429 })

    const codeHash = crypto.createHash('sha256').update(codeStr).digest('hex')
    if (rec.codeHash !== codeHash) {
      await prisma.emailVerificationCode.update({ where: { id: rec.id }, data: { attempts: rec.attempts + 1 } })
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    // Обновляем e‑mail пользователя и помечаем проверенным
    await prisma.$transaction([
      prisma.emailVerificationCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } }),
      prisma.user.update({ where: { id: me.id }, data: { email, emailVerifiedAt: new Date() } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change email confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
