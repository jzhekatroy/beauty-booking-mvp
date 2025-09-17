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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me || me.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ensure schema exists (separate statements)
    try { await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS public.email_logs (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      to_email text NOT NULL,
      subject text NOT NULL,
      body_text text NULL,
      body_html text NULL,
      status text NOT NULL,
      error_text text NULL,
      meta jsonb NULL
    )`) } catch {}
    try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs (created_at DESC)`) } catch {}
    try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_status_idx ON public.email_logs (status)`) } catch {}

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const status = (searchParams.get('status') || '').trim().toUpperCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const conditions: string[] = []
    const params: any[] = []
    let idx = 1

    if (q) { conditions.push(`(to_email ILIKE $${idx} OR subject ILIKE $${idx})`); params.push(`%${q}%`); idx++ }
    if (status && ['PENDING','SENT','FAILED'].includes(status)) { conditions.push(`status = $${idx}`); params.push(status); idx++ }
    if (from) { conditions.push(`created_at >= $${idx}`); params.push(new Date(from) as any); idx++ }
    if (to) { conditions.push(`created_at <= $${idx}`); params.push(new Date(to) as any); idx++ }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const noDateConditions = conditions.filter(c => !c.includes('created_at >=' ) && !c.includes('created_at <='))
    const whereNoDate = noDateConditions.length ? `WHERE ${noDateConditions.join(' AND ')}` : ''
    const offset = (page - 1) * pageSize

    try {
      // Пытаемся читать из email_logs (без схемы)
      const rowsA: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, created_at, to_email, subject, status, error_text, substr(COALESCE(body_text, ''), 1, 256) as body_preview
         FROM email_logs ${where}
         ORDER BY created_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        ...params
      )
      const totalA: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as cnt FROM email_logs ${where}`,
        ...params
      )
      if ((totalA[0]?.cnt || 0) === 0 && (from || to)) {
        // повторная выборка без дат, если с датой пусто (для несовместимых типов SQLite)
        const rowsA2: any[] = await prisma.$queryRawUnsafe(
          `SELECT id, created_at, to_email, subject, status, error_text, substr(COALESCE(body_text, ''), 1, 256) as body_preview
           FROM email_logs ${whereNoDate}
           ORDER BY created_at DESC
           LIMIT ${pageSize} OFFSET ${offset}`
        )
        const totalA2: any[] = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as cnt FROM email_logs ${whereNoDate}`
        )
        return NextResponse.json({ items: rowsA2, page, pageSize, total: totalA2[0]?.cnt || 0 })
      }
      return NextResponse.json({ items: rowsA, page, pageSize, total: totalA[0]?.cnt || 0 })
    } catch (e1) {
      try {
        // Фолбек на public.email_logs (Postgres)
        const rowsB: any[] = await prisma.$queryRawUnsafe(
          `SELECT id, created_at, to_email, subject, status, error_text, left(coalesce(body_text, ''), 256) as body_preview
           FROM public.email_logs ${where}
           ORDER BY created_at DESC
           LIMIT ${pageSize} OFFSET ${offset}`,
          ...params
        )
        const totalB: any[] = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as cnt FROM public.email_logs ${where}`,
          ...params
        )
        return NextResponse.json({ items: rowsB, page, pageSize, total: totalB[0]?.cnt || 0 })
      } catch (e2) {
        // Последняя попытка: без фильтров, последние 100
        try {
          const rowsAny: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, created_at, to_email, subject, status, error_text, substr(COALESCE(body_text, ''), 1, 256) as body_preview
             FROM email_logs ORDER BY created_at DESC LIMIT 100`
          )
          return NextResponse.json({ items: rowsAny, page: 1, pageSize: 100, total: rowsAny.length })
        } catch {
          try {
            const rowsAnyB: any[] = await prisma.$queryRawUnsafe(
              `SELECT id, created_at, to_email, subject, status, error_text, left(COALESCE(body_text, ''), 256) as body_preview
               FROM public.email_logs ORDER BY created_at DESC LIMIT 100`
            )
            return NextResponse.json({ items: rowsAnyB, page: 1, pageSize: 100, total: rowsAnyB.length })
          } catch {
            return NextResponse.json({ items: [], page, pageSize, total: 0 })
          }
        }
      }
    }
  } catch (error) {
    console.error('Email logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
