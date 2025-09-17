import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, role?: string }
    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me || me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let aCount = null, bCount = null, aRows: any[] = [], bRows: any[] = []
    try { const r: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM email_logs`); aCount = r[0]?.cnt ?? 0 } catch {}
    try { const r: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM public.email_logs`); bCount = r[0]?.cnt ?? 0 } catch {}
    try { aRows = await prisma.$queryRawUnsafe(`SELECT id, created_at, to_email, subject, status FROM email_logs ORDER BY created_at DESC LIMIT 3`) } catch {}
    try { bRows = await prisma.$queryRawUnsafe(`SELECT id, created_at, to_email, subject, status FROM public.email_logs ORDER BY created_at DESC LIMIT 3`) } catch {}

    return NextResponse.json({ aCount, bCount, aRows, bRows })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


