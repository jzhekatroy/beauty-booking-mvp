import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookingNumber } from '@/lib/auth'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { utcToSalonTime, createDateInSalonTimezone } from '@/lib/timezone'
import { toE164 } from '@/lib/phone'

// Создание нового бронирования
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      teamSlug,
      serviceIds,
      masterId,
      startTime,
      clientData
    } = body

    // Валидация
    if (!teamSlug || !serviceIds || !masterId || !startTime || !clientData) {
      return NextResponse.json(
        { error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      )
    }

    // Логируем входящие данные для отладки
    console.log('🔍 Received clientData:', {
      name: clientData.name,
      phone: clientData.phone,
      email: clientData.email,
      telegramId: clientData.telegramId,
      telegramUsername: clientData.telegramUsername,
      telegramFirstName: clientData.telegramFirstName,
      telegramLastName: clientData.telegramLastName,
      telegramLanguageCode: clientData.telegramLanguageCode
    })

    // Находим команду по slug
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    if (team.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Команда временно не принимает записи' },
        { status: 403 }
      )
    }

    // Проверяем мастера
    const master = await prisma.master.findFirst({
      where: {
        id: masterId,
        teamId: team.id,
        isActive: true
      }
    })

    if (!master) {
      return NextResponse.json(
        { error: 'Мастер не найден или неактивен' },
        { status: 404 }
      )
    }

    // Получаем услуги
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        teamId: team.id,
        isArchived: false
      }
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Некоторые услуги не найдены' },
        { status: 404 }
      )
    }

    // Вычисляем общую продолжительность и стоимость (для проверки конфликта и итогов)
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0)

    // Вычисляем время окончания
    console.log('🔍 DEBUG startTime (salon string):', startTime)
    // Парсим строку времени как время САЛОНА, а не локальное время сервера
    const [datePart, timePart] = startTime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    
    if (!year || !month || !day || isNaN(hour) || isNaN(minute)) {
      return NextResponse.json(
        { error: `Некорректное время: ${startTime}` },
        { status: 400 }
      )
    }
    
    // Создаем UTC-время из локального времени салона для сохранения в БД
    const salonTimezone = team.timezone || 'Europe/Moscow'
    const utcStartDateTime = createDateInSalonTimezone(year, month, day, hour, minute, salonTimezone)
    const utcEndDateTime = new Date(utcStartDateTime.getTime() + totalDuration * 60 * 1000)
    
    console.log('🔍 DEBUG utcStartDateTime:', utcStartDateTime)
    console.log('🔍 DEBUG utcEndDateTime:', utcEndDateTime)

    // Проверяем конфликты с существующими бронированиями для всего блока времени
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        masterId: masterId,
        status: { in: ['NEW', 'CONFIRMED'] },
        OR: [
          {
            startTime: { lte: utcStartDateTime },
            endTime: { gt: utcStartDateTime }
          },
          {
            startTime: { lt: utcEndDateTime },
            endTime: { gte: utcEndDateTime }
          },
          {
            startTime: { gte: utcStartDateTime },
            endTime: { lte: utcEndDateTime }
          }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Выбранное время уже занято' },
        { status: 409 }
      )
    }

    // Создаем или находим клиента (MVP: по email/телефону + имя из name)
    const fullName: string = (clientData.name || '').trim()
    let parsedFirstName: string = ''
    let parsedLastName: string = ''
    if (fullName) {
      const parts = fullName.split(/\s+/)
      parsedFirstName = parts[0] || ''
      parsedLastName = parts.slice(1).join(' ') || ''
    }

    // Нормализуем телефон в E.164
    const { e164: phoneE164 } = toE164(clientData.phone || '', (team as any).countryCode || 'RU')

    // Если нового клиента не находим по email/телефону, потребуем имя и телефон
    const emailTrim = (clientData.email || '').trim()

    let client = null as null | (typeof prisma.client extends { findFirst: any } ? any : never)
    
    // Сначала ищем по Telegram ID (если есть)
    console.log('🔍 Checking Telegram ID:', {
      telegramId: clientData.telegramId,
      telegramIdType: typeof clientData.telegramId,
      teamId: team.id,
      teamSlug: teamSlug
    })
    
    // Определяем источник: WebApp или публичная страница
    const isWebApp = !!clientData.telegramId
    console.log('🔍 Client search source:', isWebApp ? 'TELEGRAM_WEBAPP' : 'PUBLIC_PAGE')
    
    if (isWebApp) {
      // WEBAPP: ищем ТОЛЬКО по telegramId
      try {
        client = await prisma.client.findFirst({
      where: {
            telegramId: BigInt(clientData.telegramId), 
        teamId: team.id
      }
    })
        if (client) {
          console.log('✅ Found client by Telegram ID:', {
            clientId: client.id,
            telegramId: client.telegramId?.toString(),
            firstName: client.firstName,
            lastName: client.lastName
          })
        
          // Обновляем Telegram данные, если они изменились
          const telegramDataChanged = 
            client.telegramUsername !== clientData.telegramUsername ||
            client.telegramFirstName !== clientData.telegramFirstName ||
            client.telegramLastName !== clientData.telegramLastName ||
            client.telegramLanguageCode !== clientData.telegramLanguageCode
          
          if (telegramDataChanged) {
            console.log('🔄 Updating Telegram data for client:', client.id)
            client = await prisma.client.update({
              where: { id: client.id },
              data: {
                telegramUsername: clientData.telegramUsername || null,
                telegramFirstName: clientData.telegramFirstName || null,
                telegramLastName: clientData.telegramLastName || null,
                telegramLanguageCode: clientData.telegramLanguageCode || null,
                lastActivity: new Date()
              }
            })
            console.log('✅ Telegram data updated for client:', client.id)
          }
        } else {
          console.log('❌ No client found with Telegram ID:', clientData.telegramId, 'in team:', team.id)
        }
      } catch (error) {
        console.error('❌ Error searching by Telegram ID:', error)
      }
    } else {
      // ПУБЛИЧНАЯ СТРАНИЦА: ищем ТОЛЬКО по телефону
      if (phoneE164) {
        client = await prisma.client.findFirst({
          where: { phone: phoneE164, teamId: team.id }
        })
        if (client) {
          console.log('✅ Found client by phone:', client.id)
        } else {
          console.log('❌ No client found with phone:', phoneE164, 'in team:', team.id)
        }
      } else {
        console.log('❌ No phone provided for public page client')
      }
    }

    if (!client) {
      console.log('📝 No existing client found, creating new one...')
      if (!fullName) {
        console.log('❌ No name provided')
        return NextResponse.json({ error: 'Укажите имя клиента' }, { status: 400 })
      }
      if (!phoneE164) {
        console.log('❌ No phone provided')
        return NextResponse.json({ error: 'Укажите корректный телефон клиента' }, { status: 400 })
      }
      // Определяем email для создания клиента
      let emailForCreate = emailTrim
      if (!emailForCreate) {
        // Для всех клиентов без email оставляем пустым
        emailForCreate = ''
      }
      
      console.log('📝 Creating new client with data:', {
        email: emailForCreate,
        phone: phoneE164,
        telegramId: clientData.telegramId,
        telegramUsername: clientData.telegramUsername,
        telegramFirstName: clientData.telegramFirstName,
        telegramLastName: clientData.telegramLastName,
        firstName: clientData.firstName ?? parsedFirstName,
        lastName: clientData.lastName ?? parsedLastName,
        source: clientData.telegramId ? 'TELEGRAM_WEBAPP' : 'PUBLIC_PAGE'
      })
      
      // Пытаемся создать клиента, если он не найден. На случай гонки (P2002) — перезапрашиваем существующего
      try {
      client = await prisma.client.create({
        data: {
            email: emailForCreate,
            phone: phoneE164,
            telegramId: clientData.telegramId ? BigInt(clientData.telegramId) : null,
            telegramUsername: clientData.telegramUsername || null,
            telegramFirstName: clientData.telegramFirstName || null,
            telegramLastName: clientData.telegramLastName || null,
            firstName: clientData.firstName ?? parsedFirstName,
            lastName: clientData.lastName ?? parsedLastName,
          address: clientData.address,
            teamId: team.id,
            source: clientData.telegramId ? 'TELEGRAM_WEBAPP' : 'PUBLIC_PAGE'
          }
        })
        console.log('✅ New client created:', client.id)
      } catch (err: any) {
        console.log('❌ Error creating client:', err)
        console.log('❌ Error code:', err.code)
        console.log('❌ Error message:', err.message)
        
        // Если уникальный индекс email+teamId сработал — значит клиент уже есть
        if (err && err.code === 'P2002') {
          console.log('⚠️ Client already exists, searching for existing...')
          let existing = null as any
          
          if (isWebApp) {
            // Для WebApp ищем по telegramId
            if (clientData.telegramId) {
              console.log('🔍 Searching by telegramId:', clientData.telegramId)
              existing = await prisma.client.findFirst({ 
                where: { telegramId: BigInt(clientData.telegramId), teamId: team.id } 
              })
            }
          } else {
            // Для публичной страницы ищем ТОЛЬКО по телефону
            if (phoneE164) {
              console.log('🔍 Searching by phone:', phoneE164)
              existing = await prisma.client.findFirst({ 
                where: { phone: phoneE164, teamId: team.id } 
              })
            }
          }
          
          if (existing) {
            client = existing
            console.log('✅ Found existing client:', client.id)
          } else {
            // Если не нашли клиента по основному идентификатору, но конфликт по email+teamId
            // для публичной страницы - попробуем создать с уникальным email
            if (!isWebApp && err.meta?.target?.includes('email')) {
              console.log('🔄 P2002 email conflict for public page, trying with unique email...')
              try {
                const uniqueEmail = `${phoneE164}@noemail.local`
                client = await prisma.client.create({
                  data: {
                    email: uniqueEmail,
                    phone: phoneE164,
                    firstName: parsedFirstName || '',
                    lastName: parsedLastName || '',
                    teamId: team.id,
                    source: 'PUBLIC_PAGE'
                  }
                })
                console.log('✅ Created client with unique email:', client.id)
              } catch (retryErr: any) {
                console.log('❌ Failed to create with unique email:', retryErr)
                throw err // Re-throw original error
              }
            } else {
              console.log('❌ No existing client found, re-throwing error')
              throw err
            }
          }
        } else {
          console.error('❌ Error creating client:', err)
          throw err
        }
      }
    } else if (((!client.firstName && parsedFirstName) || (!client.lastName && parsedLastName)) || (phoneE164 && client.phone !== phoneE164) || (clientData.telegramId && !client.telegramId)) {
      // Обновляем отсутствующие ФИО, телефон или Telegram данные, если пришло от клиента
      const updateData: any = {
        firstName: client.firstName || parsedFirstName,
        lastName: client.lastName || parsedLastName,
        phone: phoneE164 || client.phone
      }
      
      // Обновляем Telegram данные, если они есть
      if (clientData.telegramId && !client.telegramId) {
        updateData.telegramId = BigInt(clientData.telegramId)
        updateData.telegramUsername = clientData.telegramUsername || null
        updateData.telegramFirstName = clientData.telegramFirstName || null
        updateData.telegramLastName = clientData.telegramLastName || null
        updateData.source = 'TELEGRAM_WEBAPP'
        console.log('📱 Updating client with Telegram data:', updateData)
      }
      
      client = await prisma.client.update({
        where: { id: client.id },
        data: updateData
      })
      console.log('✅ Client updated:', client.id)
    }

    // Лимит записей на клиента/день (по времени салона)
    // SQLite типы у Prisma могут не подтянуть добавленное поле в типе, используем any для безопасного доступа
    const limit = (team as any).maxBookingsPerDayPerClient ?? 3
    
    // Если лимит = 0, то ограничений нет
    if (limit > 0) {
      const dayStartUtc = createDateInSalonTimezone(year, month, day, 0, 0, team.timezone || 'Europe/Moscow')
      const dayEndUtc = createDateInSalonTimezone(year, month, day, 23, 59, team.timezone || 'Europe/Moscow')
      const existingCount = await prisma.booking.count({
        where: {
          teamId: team.id,
          clientId: client.id,
          status: { in: ['NEW', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
          startTime: { gte: dayStartUtc, lte: dayEndUtc }
        }
      })
      const newBookingsNeeded = services.length
      if (existingCount + newBookingsNeeded > limit) {
        return NextResponse.json(
          { error: `Лимит записей на день: ${limit}. Запрошено ${newBookingsNeeded} записей, уже есть ${existingCount}.` },
          { status: 429 }
        )
      }
    }

    // Создаем НЕСКОЛЬКО бронирований подряд (по одной услуге на бронь) в транзакции
    const createdIds = await prisma.$transaction(async (tx) => {
      const created: string[] = []
      let currentStart = new Date(utcStartDateTime)
      for (const service of services) {
        const segDurationMin = service.duration
        const segEnd = new Date(currentStart.getTime() + segDurationMin * 60 * 1000)
        // Дополнительная точечная проверка конфликта сегмента
        const segConflict = await tx.booking.findFirst({
          where: {
            masterId,
            status: { in: ['NEW', 'CONFIRMED'] },
            OR: [
              { startTime: { lte: currentStart }, endTime: { gt: currentStart } },
              { startTime: { lt: segEnd }, endTime: { gte: segEnd } },
              { startTime: { gte: currentStart }, endTime: { lte: segEnd } }
            ]
          },
          select: { id: true }
        })
        if (segConflict) {
          throw new Error('Выбранное время занято для одной из услуг')
        }

      const booking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
            startTime: currentStart,
            endTime: segEnd,
            totalPrice: service.price as any,
          notes: clientData.notes,
            status: BookingStatus.CONFIRMED,
          teamId: team.id,
          clientId: client.id,
          masterId: masterId
        }
      })

        await tx.bookingService.create({
          data: {
            bookingId: booking.id,
            serviceId: service.id,
            price: service.price
          }
        })

      await tx.bookingLog.create({
        data: {
          bookingId: booking.id,
            action: 'CONFIRMED',
            description: 'Бронирование создано клиентом через виджет записи (автоматически подтверждено)',
          teamId: team.id
        }
      })


        await (tx as any).clientEvent.create({
          data: {
            teamId: team.id,
            clientId: client.id,
            source: 'public',
            type: 'booking_created',
            metadata: {
              bookingId: booking.id,
              masterId,
              serviceId: service.id,
              timezone: (team as any).timezone || 'Europe/Moscow',
            },
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            userAgent: request.headers.get('user-agent') || null
          }
        })

        // Обновляем lastActivity клиента
        await tx.client.update({
          where: { id: client.id },
          data: { lastActivity: new Date() }
        })

        created.push(booking.id)
        currentStart = segEnd
      }
      return created
    })

    // Загружаем созданные брони целиком
    const fullBookings = await prisma.booking.findMany({
      where: { id: { in: createdIds } },
      include: {
        client: true,
        master: true,
        services: { include: { service: true } }
      },
      orderBy: { startTime: 'asc' }
    })

    // Создаем логи для каждого бронирования
    console.log('📊 Total bookings to log:', fullBookings.length)
    for (const booking of fullBookings) {
      if (!booking.clientId) {
        console.log('⚠️ Skipping log creation for booking without clientId:', booking.id)
        continue
      }
      
      try {
        console.log('📝 Creating logs for booking:', booking.id, 'clientId:', booking.clientId)
        
        // Создаем запись в clientAction для логирования
        const clientAction = await prisma.clientAction.create({
          data: {
            clientId: booking.clientId!,
            teamId: team.id,
            actionType: 'BOOKING_CREATED',
            pageUrl: request.url || '',
            telegramData: {
              bookingId: booking.id,
              bookingNumber: booking.bookingNumber,
              serviceName: booking.services[0]?.service?.name || 'Unknown',
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              totalPrice: booking.totalPrice
            },
            userAgent: request.headers.get('user-agent') || '',
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          }
        })
        console.log('✅ ClientAction created:', clientAction.id)

        // Создаем запись в telegramLog для логирования
        const telegramLog = await prisma.telegramLog.create({
          data: {
            clientId: booking.clientId!,
            teamId: team.id,
            level: 'INFO',
            message: `Бронирование создано через публичную страницу: ${booking.bookingNumber}`,
            data: {
              bookingId: booking.id,
              bookingNumber: booking.bookingNumber,
              serviceName: booking.services[0]?.service?.name || 'Unknown',
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              totalPrice: booking.totalPrice,
              clientData: clientData
            },
            url: request.url || '',
            userAgent: request.headers.get('user-agent') || '',
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          }
        })
        console.log('✅ TelegramLog created:', telegramLog.id)
      } catch (error) {
        console.error('❌ Error creating logs for booking:', booking.id, error)
      }
    }

    return NextResponse.json({
      success: true,
      count: fullBookings.length,
      bookings: fullBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        startTime: b.startTime,
        endTime: b.endTime,
        totalPrice: b.totalPrice,
        status: b.status,
        client: b.client ? {
          firstName: b.client.firstName,
          lastName: b.client.lastName,
          email: b.client.email
        } : null,
        master: {
          firstName: b.master.firstName,
          lastName: b.master.lastName
        },
        services: b.services.map(bs => ({
          name: bs.service.name,
          duration: bs.service.duration,
          price: bs.price
        }))
      }))
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Получение бронирований команды
export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию для админки
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
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const masterId = searchParams.get('masterId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Используем teamId из авторизованного пользователя
    const teamId = user.teamId

    let whereClause: any = { teamId }

    // Автообновление: при каждом запросе списка, закрываем просроченные CONFIRMED как COMPLETED
    // Перевод просроченных CONFIRMED в COMPLETED + лог события клиента
    const outdated = await prisma.booking.findMany({
      where: { teamId, status: 'CONFIRMED', endTime: { lt: new Date() } },
      select: { id: true, clientId: true }
    })
    if (outdated.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { teamId, status: 'CONFIRMED', endTime: { lt: new Date() } },
          data: { status: 'COMPLETED' }
        })
        for (const b of outdated) {
          if (b.clientId) {
            await tx.clientAction.create({
              data: {
                teamId,
                clientId: b.clientId,
                actionType: 'BOOKING_CREATED',
                bookingId: b.id,
                telegramData: { source: 'system' }
              }
            })
          }
        }
      })
    }

    if (masterId) {
      whereClause.masterId = masterId
    }

    if (clientId) {
      whereClause.clientId = clientId
    }

    if (from || to) {
      const gte = from ? new Date(from) : undefined
      const lte = to ? new Date(to) : undefined
      whereClause.startTime = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
    } else if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.startTime = { gte: startOfDay, lte: endOfDay }
    }

    if (status) {
      whereClause.status = status
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: true,
        master: true,
        services: {
          include: { service: true }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    // Конвертируем BigInt в строки для JSON сериализации
    const bookingsWithSerializedData = bookings.map(booking => ({
      ...booking,
      client: booking.client ? {
        ...booking.client,
        telegramId: booking.client.telegramId?.toString() || null
      } : null
    }))

    // Возвращаем время как есть (UTC). Клиент сам отображает в TZ салона
    return NextResponse.json({ bookings: bookingsWithSerializedData })

  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}