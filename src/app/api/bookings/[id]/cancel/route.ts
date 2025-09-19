import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@/lib/enums'
import jwt from 'jsonwebtoken'

// Отмена бронирования администратором
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Авторизация
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

    // Находим бронирование
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    if (booking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Прошедшие брони отменять нельзя — только отметка NO_SHOW
    if (booking.endTime <= new Date()) {
      return NextResponse.json({ error: 'Прошедшие записи нельзя отменить. Отметьте как «Не пришёл».' }, { status: 400 })
    }

    if (booking.status === 'CANCELLED_BY_SALON' || booking.status === 'CANCELLED_BY_CLIENT') {
      return NextResponse.json({ success: true, message: 'Бронирование уже отменено' })
    }

    // Отмена в транзакции + лог
    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED_BY_SALON }
      })

      await tx.bookingLog.create({
        data: {
          bookingId: id,
          action: 'UPDATED',
          description: 'Бронирование отменено администратором',
          teamId: user.teamId,
          userId: user.id
        }
      })

      // Событие клиента
      await (tx as any).clientEvent.create({
        data: {
          teamId: user.teamId,
          clientId: updated.clientId,
          source: 'admin',
          type: 'booking_cancelled',
          metadata: { bookingId: updated.id, cancelledBy: 'salon' },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null
        }
      })

      // Обновляем lastActivity клиента
      if (updated.clientId) {
        await tx.client.update({
          where: { id: updated.clientId },
          data: { lastActivity: new Date() }
        })
      }

      // Уведомление клиенту при отмене брони салоном (только если была NEW/CONFIRMED)
      try {
        const full = await tx.booking.findUnique({
          where: { id },
          include: { client: true, master: true, team: true, services: { include: { service: true } } }
        })
        if (full?.client?.telegramId && (full.status === 'CANCELLED_BY_SALON')) {
          const policy = await tx.teamNotificationPolicy.findUnique({ where: { teamId: user.teamId } })
          const pjson: any = policy?.reminders || {}
          const enabled = Boolean(pjson.cancelBySalonEnabled ?? false)
          const message = String(pjson.cancelBySalonMessage || '').trim() || (
            'Уважаемый клиент, {client_name}!\n\n' +
            'К сожалению, ваша запись в салон {team_name} на услугу {service_name} к мастеру {master_name}\n' +
            'Дата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\n' +
            'отменена салоном. Пожалуйста, выберите другое удобное время для новой записи.'
          )
          if (enabled) {
            // Собираем метаданные для подстановок
            const serviceNames = (full.services || []).map((s: any) => s.service?.name).filter(Boolean)
            const durationMin = (full.services || []).reduce((acc: number, s: any) => acc + (s.service?.duration || 0), 0) || Math.round((full.endTime.getTime() - full.startTime.getTime())/60000)
            await tx.notificationQueue.create({
              data: {
                type: 'SEND_MESSAGE',
                data: {
                  teamId: user.teamId,
                  clientId: full.clientId!,
                  message,
                  meta: {
                    source: 'booking_cancelled_by_salon',
                    booking: {
                      startTime: full.startTime.toISOString(),
                      serviceName: serviceNames.join(', '),
                      serviceNames,
                      serviceDurationMin: Math.round(durationMin),
                      masterName: `${full.master.firstName || ''} ${full.master.lastName || ''}`.trim(),
                      timezone: (full.team as any).timezone || 'Europe/Moscow',
                    },
                  },
                },
                executeAt: new Date(),
                status: 'PENDING',
                attempts: 0,
                maxAttempts: 3,
              } as any,
            })
          }
        }
      } catch (enqueueErr) {
        console.error('Cancel booking notify enqueue error:', enqueueErr)
      }

      return updated
    })

    return NextResponse.json({ success: true, booking: result })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}


