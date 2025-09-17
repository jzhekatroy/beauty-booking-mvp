import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
    
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Получаем данные пользователя с командой
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            teamNumber: true,
            slug: true,
            bookingSlug: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Возвращаем данные пользователя без пароля
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      id: userWithoutPassword.id,
      email: userWithoutPassword.email,
      role: userWithoutPassword.role,
      emailVerified: Boolean((userWithoutPassword as any).emailVerifiedAt),
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      impersonatedBy: (decoded as any).impersonatedBy || null,
    team: userWithoutPassword.team ? {
      id: userWithoutPassword.team.id,
      name: userWithoutPassword.team.name,
      teamNumber: userWithoutPassword.team.teamNumber,
      slug: userWithoutPassword.team.slug,
      bookingSlug: userWithoutPassword.team.bookingSlug
    } : null
    })
  } catch (error) {
  try { console.error('Ошибка получения данных пользователя:', error) } catch {}
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}