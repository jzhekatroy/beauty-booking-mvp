import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    try {
      if (!process.env.JWT_SECRET) {
        return NextResponse.json({ error: 'Сервер: JWT секрет не настроен' }, { status: 500 })
      }
    } catch {}
    let decoded: { userId: string }
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    } catch (e) {
      return NextResponse.json({ error: 'Неверный токен авторизации' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')))

    const where: any = {}
    if (q) {
      where.OR = [
        { teamNumber: { contains: q } },
        { name: { contains: q } },
        { contactPerson: { contains: q } },
        { email: { contains: q } }
      ]
    }

    const total = await prisma.team.count({ where })
    
    let teams: any[]
    try {
      teams = await prisma.team.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          teamNumber: true,
          status: true,
          createdAt: true,
          contactPerson: true,
          email: true,
          masterLimit: true,
          _count: {
            select: {
              users: { where: { role: 'MASTER' } },
              clients: true,
              bookings: true
            }
          },
          notificationSettings: {
            select: { enabled: true }
          }
        }
      })
    } catch (e) {
      // Фолбэк на случай отсутствия связанной таблицы или неподдерживаемого count-фильтра
      teams = await prisma.team.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          teamNumber: true,
          status: true,
          createdAt: true,
          contactPerson: true,
          email: true,
          masterLimit: true,
          _count: { select: { users: true, clients: true, bookings: true } }
        }
      })
      teams = teams.map(t => ({ ...t, notificationSettings: { enabled: true } }))
    }

    const teamsWithCounts = teams.map(team => ({
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      createdAt: team.createdAt.toISOString(),
      status: team.status,
      contactPerson: team.contactPerson,
      email: team.email,
      masterLimit: team.masterLimit,
      mastersCount: team._count.users,
      clientsCount: team._count.clients,
      bookingsCount: team._count.bookings,
      notificationsEnabled: team.notificationSettings?.enabled ?? true
    }))

    return NextResponse.json({ total, page, pageSize, teams: teamsWithCounts })
  } catch (error) {
    console.error('Error fetching teams:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}