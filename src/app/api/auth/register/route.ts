import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTeamNumber, generateToken } from '@/lib/auth'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'
import { UserRole } from '@/lib/enums'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, teamName, contactPerson, slug, timezone } = body

    // Валидация
    if (!email || !password || !teamName || !contactPerson || !slug) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      )
    }

    // Генерация уникального номера команды
    let teamNumber: string
    let isUnique = false
    do {
      teamNumber = generateTeamNumber()
      const existingTeam = await prisma.team.findUnique({
        where: { teamNumber }
      })
      isUnique = !existingTeam
    } while (!isUnique)

    // Проверка уникальности slug
    const existingTeamWithSlug = await prisma.team.findUnique({
      where: { slug }
    })

    if (existingTeamWithSlug) {
      return NextResponse.json(
        { error: 'URL салона уже занят. Выберите другой.' },
        { status: 409 }
      )
    }

    // Хеширование пароля
    const hashedPassword = await hashPassword(password)

    // Создание команды и администратора в транзакции
    const result = await prisma.$transaction(async (tx: any) => {
      // Создание команды
      const team = await tx.team.create({
        data: {
          teamNumber,
          name: teamName,
          slug,
          contactPerson,
          email,
          timezone: timezone || 'Europe/Moscow', // используем переданную временную зону или дефолт
        }
      })

      // Создание администратора команды
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          firstName: contactPerson,
          teamId: team.id,
        }
      })

      return { team, user }
    })

    // Generate 6-digit code and save hashed, TTL 30 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    try {
      await prisma.emailVerificationCode.create({
        data: {
          userId: result.user.id,
          codeHash,
          expiresAt,
        }
      })
    } catch {}

    // Send verification email (best-effort)
    try {
      await sendMail({
        to: result.user.email,
        subject: 'Код подтверждения e‑mail',
        text: `Ваш код подтверждения: ${code}. Срок действия 30 минут.`,
      })
    } catch (e) {
      console.error('Send verification email error:', e)
    }

    // Генерация токена
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      teamId: result.team.id,
    })

    return NextResponse.json({
      success: true,
      token,
      team: {
        id: result.team.id,
        teamNumber: result.team.teamNumber,
        name: result.team.name,
        slug: result.team.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        firstName: result.user.firstName,
        emailVerified: false,
      },
      verificationRequired: true
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    // В development режиме показываем детальную ошибку
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Внутренняя ошибка сервера',
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}