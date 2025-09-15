import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

async function ensureTemplatesSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.message_templates (
      id text PRIMARY KEY,
      team_id text NOT NULL,
      key text NOT NULL,
      name text NOT NULL,
      content text NOT NULL,
      is_html boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT message_templates_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS message_templates_team_key_idx ON public.message_templates(team_id, key)
  `)
}

function parseAuth(request: NextRequest): { userId: string } {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) throw new Error('Токен авторизации отсутствует')
  const token = authHeader.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  return { userId: decoded.userId }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    await ensureTemplatesSchema()

    const templates = await prisma.messageTemplate.findMany({
      where: { teamId: user.teamId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message, details: process.env.NODE_ENV !== 'production' ? String(message) : undefined }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = parseAuth(request)
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } })
    if (!user?.team) return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    await ensureTemplatesSchema()

    const body = await request.json().catch(() => ({}))
    const key = String(body.key || '').trim()
    const name = String(body.name || '').trim()
    const content = String(body.content || '').trim()
    const isHtml = Boolean(body.isHtml ?? false)

    if (!key || !name || !content) {
      return NextResponse.json({ error: 'key, name и content обязательны' }, { status: 400 })
    }

    const template = await prisma.messageTemplate.upsert({
      where: { teamId_key: { teamId: user.teamId, key } },
      update: { name, content, isHtml },
      create: { teamId: user.teamId, key, name, content, isHtml },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Токен авторизации') ? 401 : 500
    return NextResponse.json({ error: message, details: process.env.NODE_ENV !== 'production' ? String(message) : undefined }, { status })
  }
}


