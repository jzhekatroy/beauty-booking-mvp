import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { verify } from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded: any = verify(token, process.env.JWT_SECRET!)
    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()
    const curr = String(currentPassword || '')
    const next = String(newPassword || '')
    if (next.length < 6) return NextResponse.json({ error: 'Новый пароль слишком короткий (мин. 6)' }, { status: 400 })

    const ok = await verifyPassword(curr, me.password)
    if (!ok) return NextResponse.json({ error: 'Текущий пароль неверный' }, { status: 400 })

    const hashed = await hashPassword(next)
    await prisma.user.update({ where: { id: me.id }, data: { password: hashed } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
