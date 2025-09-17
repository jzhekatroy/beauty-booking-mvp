import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('x-client-ip') || null
    const userAgent = request.headers.get('user-agent') || null

    // Валидация
    if (!email || !password) {
      // Логируем неуспешную попытку входа (валидация)
      try {
        await prisma.userLoginLog.create({
          data: {
            email: email || '',
            success: false,
            failureReason: 'VALIDATION_ERROR',
            ip: ip || undefined,
            userAgent: userAgent || undefined,
          }
        })
      } catch {}
      return NextResponse.json(
        { error: 'Email и пароль обязательны для заполнения' },
        { status: 400 }
      )
    }

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        team: true,
        master: true,
      }
    })

    if (!user) {
      // Логируем неуспешную попытку входа (пользователь не найден)
      try {
        await prisma.userLoginLog.create({
          data: {
            email,
            success: false,
            failureReason: 'USER_NOT_FOUND',
            ip: ip || undefined,
            userAgent: userAgent || undefined,
          }
        })
      } catch {}
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      try {
        await prisma.userLoginLog.create({
          data: {
            email,
            userId: user.id,
            teamId: user.teamId,
            success: false,
            failureReason: 'USER_INACTIVE',
            ip: ip || undefined,
            userAgent: userAgent || undefined,
          }
        })
      } catch {}
      return NextResponse.json(
        { error: 'Аккаунт заблокирован' },
        { status: 403 }
      )
    }

    // Проверка статуса команды
    if (user.team.status === 'DISABLED') {
      try {
        await prisma.userLoginLog.create({
          data: {
            email,
            userId: user.id,
            teamId: user.teamId,
            success: false,
            failureReason: 'TEAM_DISABLED',
            ip: ip || undefined,
            userAgent: userAgent || undefined,
          }
        })
      } catch {}
      return NextResponse.json(
        { error: 'Команда временно отключена' },
        { status: 403 }
      )
    }

    // Блокируем вход, если e-mail не подтверждён
    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'Email не подтверждён', verificationRequired: true },
        { status: 403 }
      )
    }

    // Проверка пароля
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      try {
        await prisma.userLoginLog.create({
          data: {
            email,
            userId: user.id,
            teamId: user.teamId,
            success: false,
            failureReason: 'INVALID_PASSWORD',
            ip: ip || undefined,
            userAgent: userAgent || undefined,
          }
        })
      } catch {}
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Обновление времени последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Логируем успешный вход
    try {
      await prisma.userLoginLog.create({
        data: {
          email,
          userId: user.id,
          teamId: user.teamId,
          success: true,
          ip: ip || undefined,
          userAgent: userAgent || undefined,
        }
      })
    } catch {}

    // Генерация токена
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        team: {
          id: user.team.id,
          teamNumber: user.team.teamNumber,
          name: user.team.name,
          slug: user.team.slug,
        },
        master: user.master ? {
          id: user.master.id,
          firstName: user.master.firstName,
          lastName: user.master.lastName,
        } : null,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    
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