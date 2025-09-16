import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// GET - получить настройки команды
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const settings = {
      bookingStep: user.team.bookingStep,
      maxBookingsPerDayPerClient: user.team.maxBookingsPerDayPerClient,
      masterLimit: user.team.masterLimit,
      webhooksEnabled: user.team.webhooksEnabled,
      fairMasterRotation: Boolean(user.team.fairMasterRotation), // Явно преобразуем в boolean
      privacyPolicyUrl: user.team.privacyPolicyUrl,
      contactPerson: user.team.contactPerson,
      email: user.team.email,
      logoUrl: user.team.logoUrl,
      slug: user.team.slug,
      bookingSlug: user.team.bookingSlug || user.team.slug,
      timezone: user.team.timezone,
      telegramBotToken: user.team.telegramBotToken,
      ungroupedGroupName: (user.team as any).ungroupedGroupName || 'Основные услуги'
    }

    // Добавляем публичные настройки (без блока "внешний вид")
    try {
      const rows: any[] = await prisma.$queryRaw`SELECT "publicPageTitle", "publicPageDescription", "publicPageLogoUrl", "maxBookingsPerDayPerClient", "notificationsEnabled", "reminderHours" FROM "public"."teams" WHERE id = ${user.team.id} LIMIT 1`
      if (rows && rows[0]) {
        ;(settings as any).publicPageTitle = rows[0].publicPageTitle || null
        ;(settings as any).publicPageDescription = rows[0].publicPageDescription || null
        ;(settings as any).publicPageLogoUrl = rows[0].publicPageLogoUrl || null
        ;(settings as any).dailyBookingLimit = rows[0].maxBookingsPerDayPerClient || 0
        ;(settings as any).notificationsEnabled = Boolean(rows[0].notificationsEnabled ?? false)
        ;(settings as any).reminderHours = rows[0].reminderHours || 24
      } else {
        ;(settings as any).publicPageTitle = null
        ;(settings as any).publicPageDescription = null
        ;(settings as any).publicPageLogoUrl = null
        ;(settings as any).dailyBookingLimit = 0
        ;(settings as any).notificationsEnabled = false
        ;(settings as any).reminderHours = 24
      }
    } catch (e) {
      // Если колонок нет — возвращаем дефолты (без внешнего вида)
      ;(settings as any).publicPageTitle = null
      ;(settings as any).publicPageDescription = null
      ;(settings as any).publicPageLogoUrl = null
      ;(settings as any).dailyBookingLimit = 0
      ;(settings as any).notificationsEnabled = false
      ;(settings as any).reminderHours = 24
    }

    // Справедливое распределение мастеров — всегда включено
    ;(settings as any).fairMasterRotation = true

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Ошибка получения настроек команды:', error)
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500 }
    )
  }
}

// PUT - обновить настройки команды
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ JSON parse error:', error)
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }
    
    const {
      bookingStep,
      maxBookingsPerDayPerClient,
      masterLimit,
      webhooksEnabled,
      fairMasterRotation,
      privacyPolicyUrl,
      contactPerson,
      email,
      logoUrl,
      bookingSlug,
      timezone,
      telegramBotToken,
      ungroupedGroupName,
      publicServiceCardsWithPhotos,
      publicTheme,
      publicPageTitle,
      publicPageDescription,
      publicPageLogoUrl,
      dailyBookingLimit,
      notificationsEnabled,
      reminderHours
    } = body

    // Валидация интервала бронирования
    if (bookingStep !== undefined) {
      const validSteps = [15, 30, 60]
      if (!validSteps.includes(bookingStep)) {
        return NextResponse.json(
          { error: 'Интервал бронирования должен быть 15, 30 или 60 минут' },
          { status: 400 }
        )
      }
    }

    // Валидация лимита записей на клиента
    if (maxBookingsPerDayPerClient !== undefined) {
      if (typeof maxBookingsPerDayPerClient !== 'number' || maxBookingsPerDayPerClient < 0 || maxBookingsPerDayPerClient > 100) {
        return NextResponse.json(
          { error: 'Лимит записей на клиента должен быть числом от 0 до 100 (0 = без ограничений)' },
          { status: 400 }
        )
      }
    }

    // Валидация лимита мастеров
    if (masterLimit !== undefined) {
      if (masterLimit < 1 || masterLimit > 50) {
        return NextResponse.json(
          { error: 'Лимит мастеров должен быть от 1 до 50' },
          { status: 400 }
        )
      }

      // Проверяем что новый лимит не меньше текущего количества активных мастеров
      const activeMastersCount = await prisma.master.count({
        where: {
          teamId: user.teamId,
          isActive: true
        }
      })

      if (masterLimit < activeMastersCount) {
        return NextResponse.json(
          { error: `Нельзя установить лимит меньше текущего количества активных мастеров (${activeMastersCount})` },
          { status: 400 }
        )
      }
    }

    // Валидация bookingSlug
    if (bookingSlug !== undefined) {
      if (bookingSlug && bookingSlug.trim()) {
        // Проверяем что slug уникален среди других команд
        const slugPattern = /^[a-z0-9-]+$/
        if (!slugPattern.test(bookingSlug)) {
          return NextResponse.json(
            { error: 'Ссылка может содержать только латинские буквы, цифры и дефисы' },
            { status: 400 }
          )
        }

        const existingTeam = await prisma.team.findFirst({
          where: {
            OR: [
              { slug: bookingSlug },
              { bookingSlug: bookingSlug }
            ],
            NOT: { id: user.teamId }
          }
        })

        if (existingTeam) {
          return NextResponse.json(
            { error: 'Эта ссылка уже используется другим салоном' },
            { status: 400 }
          )
        }
      }
    }

    // Валидация часового пояса
    if (timezone !== undefined) {
      const validTimezones = [
        'Europe/Moscow', 'Europe/Kiev', 'Europe/Minsk', 'Asia/Almaty', 'Asia/Tashkent',
        'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok', 'Europe/London',
        'America/New_York', 'UTC'
      ]
      
      if (!validTimezones.includes(timezone)) {
        return NextResponse.json(
          { error: 'Неподдерживаемый часовой пояс' },
          { status: 400 }
        )
      }
    }

    // Валидация Telegram токена
    if (telegramBotToken !== undefined) {
      if (telegramBotToken && telegramBotToken.trim()) {
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/
        if (!tokenPattern.test(telegramBotToken.trim())) {
          return NextResponse.json(
            { error: 'Неверный формат токена Telegram бота' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {}
    if (bookingStep !== undefined) updateData.bookingStep = bookingStep
    if (maxBookingsPerDayPerClient !== undefined) updateData.maxBookingsPerDayPerClient = maxBookingsPerDayPerClient
    if (masterLimit !== undefined) updateData.masterLimit = masterLimit
    if (webhooksEnabled !== undefined) updateData.webhooksEnabled = webhooksEnabled
    // Всегда включаем справедливое распределение
    updateData.fairMasterRotation = true
    if (privacyPolicyUrl !== undefined) updateData.privacyPolicyUrl = privacyPolicyUrl || null
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (email !== undefined) updateData.email = email
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null
    if (bookingSlug !== undefined) updateData.bookingSlug = bookingSlug?.trim() || null
    if (timezone !== undefined) updateData.timezone = timezone
    if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken?.trim() || null
    if (ungroupedGroupName !== undefined) updateData.ungroupedGroupName = (ungroupedGroupName || 'Основные услуги').trim()
    
    // Публичные UX-настройки (без внешнего вида)
    if (publicPageTitle !== undefined) updateData.publicPageTitle = publicPageTitle || null
    if (publicPageDescription !== undefined) updateData.publicPageDescription = publicPageDescription || null
    if (publicPageLogoUrl !== undefined) updateData.publicPageLogoUrl = publicPageLogoUrl || null
    if (dailyBookingLimit !== undefined) {
      updateData.maxBookingsPerDayPerClient = dailyBookingLimit || 0 // Синхронизируем с основным полем
    }
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled || false
    if (reminderHours !== undefined) updateData.reminderHours = reminderHours || 24

    const updatedTeam = await prisma.team.update({
      where: { id: user.teamId },
      data: updateData
    })

    return NextResponse.json({
      message: 'Настройки обновлены',
      settings: {
        bookingStep: updatedTeam.bookingStep,
        maxBookingsPerDayPerClient: updatedTeam.maxBookingsPerDayPerClient,
        masterLimit: updatedTeam.masterLimit,
        webhooksEnabled: updatedTeam.webhooksEnabled,
        fairMasterRotation: true,
        privacyPolicyUrl: updatedTeam.privacyPolicyUrl,
        contactPerson: updatedTeam.contactPerson,
        email: updatedTeam.email,
        logoUrl: updatedTeam.logoUrl,
        slug: updatedTeam.slug,
        bookingSlug: updatedTeam.bookingSlug || updatedTeam.slug,
        timezone: updatedTeam.timezone,
        telegramBotToken: updatedTeam.telegramBotToken,
        ungroupedGroupName: (updatedTeam as any).ungroupedGroupName || 'Основные услуги',
        publicPageTitle: (updatedTeam as any).publicPageTitle,
        publicPageDescription: (updatedTeam as any).publicPageDescription,
        publicPageLogoUrl: (updatedTeam as any).publicPageLogoUrl,
        dailyBookingLimit: updatedTeam.maxBookingsPerDayPerClient,
        notificationsEnabled: (updatedTeam as any).notificationsEnabled,
        reminderHours: (updatedTeam as any).reminderHours
      }
    })

  } catch (error) {
    console.error('Ошибка обновления настроек команды:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Ошибка обновления настроек',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    )
  } finally {
    // Не отключаем singleton Prisma клиент
  }
}