'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, addDays, subDays, startOfDay, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Master {
  id: string
  firstName: string
  lastName: string
  photo?: string
}

interface Service {
  name: string
  duration: number
  price: number
}

interface Client {
  firstName: string
  lastName: string
  email: string
  phone?: string
  telegram?: string
}

interface Booking {
  id: string
  bookingNumber: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  notes?: string
  client: Client
  master: Master
  services: Service[]
}

// Новые интерфейсы для расписания и отсутствий
interface MasterSchedule {
  masterId: string
  dayOfWeek: number // 0-6 (воскресенье-суббота)
  startTime: string // "09:00"
  endTime: string // "18:00"
  breakStart?: string // "13:00"
  breakEnd?: string // "14:00"
}

interface MasterAbsence {
  masterId: string
  startDate: string // ISO
  endDate: string   // ISO
  reason?: string
  description?: string
}

interface FullCalendarProps {
  masters: Master[]
  bookings: Booking[]
  masterSchedules?: MasterSchedule[]
  masterAbsences?: MasterAbsence[]
  onBookingClick?: (booking: Booking) => void
  salonTimezone?: string
  onBookingCancelled?: () => void
  onEmptySlotClick?: (payload: { time: Date; master: Master }) => void
}

export default function FullCalendar({ 
  bookings, 
  masters, 
  masterSchedules = [], 
  masterAbsences = [],
  onBookingClick,
  salonTimezone = 'Europe/Moscow',
  onBookingCancelled,
  onEmptySlotClick
}: FullCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    return dateOnly
  })
  

  
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)
  const [now, setNow] = useState<Date>(new Date())
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [slotPx, setSlotPx] = useState<number>(33)

  // Обновляем текущее время каждую минуту, чтобы линия и состояния брони обновлялись автоматически
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Адаптивная высота слотов для мобильных, без влияния на десктоп
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateSlotPx = () => setSlotPx(window.innerWidth < 640 ? 26 : 33)
    updateSlotPx()
    window.addEventListener('resize', updateSlotPx)
    return () => window.removeEventListener('resize', updateSlotPx)
  }, [])

  // Получаем активных мастеров (только выбранного или всех, если не выбран)
  const activeMasters = selectedMaster ? [selectedMaster] : masters

  // Используем только реальные данные из API
  const schedules = masterSchedules
  const absences = masterAbsences



  // Вспомогательные форматтеры времени/даты для часового пояса салона
  const formatHHmmInSalon = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      timeZone: salonTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getSalonDateYYYYMMDD = (date: Date) => {
    // en-CA даёт формат YYYY-MM-DD
    return date.toLocaleDateString('en-CA', { timeZone: salonTimezone })
  }

  const getSalonNowMinutes = () => {
    const nowLabel = formatHHmmInSalon(now)
    const [h, m] = nowLabel.split(':').map(Number)
    return h * 60 + m
  }

  // Функции для работы с расписанием и отсутствиями
  const getMasterSchedule = (masterId: string, date: Date) => {
    const dayOfWeek = date.getDay() // 0-6 (воскресенье-суббота)
    
    const schedule = schedules.find(schedule => 
      schedule.masterId === masterId && schedule.dayOfWeek === dayOfWeek
    )
    
    return schedule
  }

  const getMasterAbsence = (masterId: string, date: Date) => {
    // Оставляем как определение наличия отсутствия в дате (не по времени)
    const target = getSalonDateYYYYMMDD(date)
    return absences.find(absence => {
      const start = new Date(absence.startDate)
      const end = new Date(absence.endDate)
      const startStr = getSalonDateYYYYMMDD(start)
      const endStr = getSalonDateYYYYMMDD(end)
      return (
        absence.masterId === masterId &&
        startStr <= target &&
        endStr >= target
      )
    })
  }

  // Точный чек: отсутствует ли мастер в конкретное время слота
  const isMasterAbsentAt = (masterId: string, slotTime: Date) => {
    const dayStr = getSalonDateYYYYMMDD(slotTime)
    const slotLabel = formatHHmmInSalon(slotTime) // HH:mm в часовом поясе салона

    for (const absence of absences) {
      if (absence.masterId !== masterId) continue
      const aStart = new Date(absence.startDate)
      const aEnd = new Date(absence.endDate)

      const aStartDay = getSalonDateYYYYMMDD(aStart)
      const aEndDay = getSalonDateYYYYMMDD(aEnd)

      // Дата слота должна попадать в диапазон дат отсутствия
      if (aStartDay > dayStr || aEndDay < dayStr) continue

      // Вычисляем эффективные границы времени на текущий день
      const startLabel = aStartDay === dayStr ? formatHHmmInSalon(aStart) : '00:00'
      const endLabel = aEndDay === dayStr ? formatHHmmInSalon(aEnd) : '23:59'

      if (slotLabel >= startLabel && slotLabel < endLabel) {
        return { absent: true, reason: absence.reason || absence.description }
      }
    }

    return { absent: false as const }
  }

  // Человекочитаемые метки причин отсутствий, как в интерфейсе "Отсутствия"
  const getAbsenceReasonLabel = (reason?: string) => {
    const text = (reason && reason.trim()) ? reason : 'Отсутствие'
    return text
  }

  const cancelBooking = async (bookingId: string) => {
    try {
      if (!confirm('Отменить эту запись?')) return
      setCancellingId(bookingId)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Ошибка отмены: ${data.error || res.statusText}`)
        return
      }
      if (onBookingCancelled) onBookingCancelled()
    } catch (e) {
      alert('Не удалось отменить запись')
    } finally {
      setCancellingId(null)
    }
  }

  const markNoShow = async (bookingId: string) => {
    try {
      if (!confirm('Отметить как «Не пришёл»?')) return
      setCancellingId(bookingId)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/bookings/${bookingId}/no-show`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Ошибка изменения статуса: ${data.error || res.statusText}`)
        return
      }
      if (onBookingCancelled) onBookingCancelled()
    } catch (e) {
      alert('Не удалось отметить как «Не пришёл»')
    } finally {
      setCancellingId(null)
    }
  }

  const isWorkingTime = (masterId: string, time: Date, date: Date) => {
    const schedule = getMasterSchedule(masterId, date)
    if (!schedule) return false

    const timeString = formatHHmmInSalon(time)
    const isInWorkHours = timeString >= schedule.startTime && timeString < schedule.endTime
    
    // Проверяем, не попадает ли время в перерыв
    if (schedule.breakStart && schedule.breakEnd) {
      const isInBreak = timeString >= schedule.breakStart && timeString < schedule.breakEnd
      return isInWorkHours && !isInBreak
    }
    
    return isInWorkHours
  }

  const isBreakTime = (masterId: string, time: Date, date: Date) => {
    const schedule = getMasterSchedule(masterId, date)
    if (!schedule || !schedule.breakStart || !schedule.breakEnd) return false

    const timeString = formatHHmmInSalon(time)
    return timeString >= schedule.breakStart && timeString < schedule.breakEnd
  }

  const getWorkingTimeRange = () => {
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + m
    }

    if (activeMasters.length === 0) {
      return { startMinutes: 9 * 60, endMinutes: 18 * 60 }
    }

    let earliestStart = Number.POSITIVE_INFINITY
    let latestEnd = 0

    activeMasters.forEach(master => {
      const schedule = getMasterSchedule(master.id, selectedDate)
      if (schedule) {
        earliestStart = Math.min(earliestStart, toMinutes(schedule.startTime))
        latestEnd = Math.max(latestEnd, toMinutes(schedule.endTime))
      }
    })

    if (!isFinite(earliestStart) || latestEnd === 0) {
      return { startMinutes: 9 * 60, endMinutes: 18 * 60 }
    }

    return { startMinutes: earliestStart, endMinutes: latestEnd }
  }

  // Цвета статусов — как на странице "Сводка по бронированиям"
  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      NEW: '#FFA500',
      CONFIRMED: '#4CAF50',
      COMPLETED: '#2196F3',
      NO_SHOW: '#FF5722',
      CANCELLED_BY_CLIENT: '#FF9800',
      CANCELLED_BY_SALON: '#F44336'
    }
    return map[status] || '#9E9E9E'
  }

  // Форматирование времени и дат
  const formatTime = (time: Date) => {
    return formatHHmmInSalon(time)
  }

  const formatDate = (date: Date) => {
    return format(date, 'dd MMMM yyyy', { locale: ru })
  }

  // Генерация временных слотов
  const generateTimeSlots = (date: Date) => {
    const slots = []
    const { startMinutes, endMinutes } = getWorkingTimeRange()

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const time = new Date(date)
      time.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      slots.push(time)
    }
    
    return slots
  }

  const timeSlots = generateTimeSlots(selectedDate)

  // ПРОСТАЯ функция позиционирования броней (время салона)
  const getBookingPosition = (startTime: string, endTime: string) => {
    const SLOT_PX = slotPx // 30 минут визуально
    // Получаем метки времени в часовом поясе салона
    const startLabel = new Date(startTime).toLocaleTimeString('ru-RU', {
      timeZone: salonTimezone, hour: '2-digit', minute: '2-digit', hour12: false
    })
    const endLabel = new Date(endTime).toLocaleTimeString('ru-RU', {
      timeZone: salonTimezone, hour: '2-digit', minute: '2-digit', hour12: false
    })

    const [sh, sm] = startLabel.split(':').map(Number)
    const [eh, em] = endLabel.split(':').map(Number)

    const { startMinutes: baselineMinutes } = getWorkingTimeRange()
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em

    const top = ((startMinutes - baselineMinutes) / 30) * SLOT_PX
    const durationMinutes = Math.max(0, endMinutes - startMinutes)
    const height = (durationMinutes / 30) * SLOT_PX - 2

    return { top, height }
  }

  // Получаем все брони для конкретного мастера
  const getMasterBookings = (masterId: string) => {
    // Фильтруем брони по мастеру И по выбранной дате
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime)
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
      
      const isSameDate = isSameDay(bookingDateOnly, selectedDateOnly)
      const isSameMaster = booking.master.id === masterId
      const isCancelled = booking.status === 'CANCELLED_BY_CLIENT' || booking.status === 'CANCELLED_BY_SALON'
      
      return isSameDate && isSameMaster && !isCancelled
    })
    
    return filteredBookings
  }

  // Навигация по дням
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1))
  }

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  // Навигация по неделям
  const goToPreviousWeek = () => {
    setSelectedDate(prev => {
      const newDate = subWeeks(prev, 1)
      return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
    })
  }

  const goToNextWeek = () => {
    setSelectedDate(prev => {
      const newDate = addWeeks(prev, 1)
      return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
    })
  }

  const goToWeekDay = (day: Date) => {

    
    const year = day.getFullYear()
    const month = day.getMonth()
    const dayOfMonth = day.getDate()
    const newDate = new Date(year, month, dayOfMonth)
    
    
    
    setSelectedDate(newDate)
    
    
  }



  // Генерация дней недели
  const weekDays = useMemo(() => {

    
    const dateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    
    
    const start = startOfWeek(dateOnly, { weekStartsOn: 1 })
    
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i)
      days.push(day)
      
    }
    
    return days
  }, [selectedDate])

  // Вычисляем ширину колонок мастеров равномерно
  const masterColumnWidth = activeMasters.length > 0 
    ? `calc((100% - 6rem) / ${activeMasters.length})` // 6rem для колонки времени
    : 'calc(100% - 6rem)' // Если нет мастеров, используем всю ширину
  


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Заголовок с навигацией */}
      <div className="p-3 sm:p-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={goToToday}
              className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-bold bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
            >
              Сегодня
            </button>
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold text-[hsl(var(--sidebar-foreground))]">
            {formatDate(selectedDate)}
          </h2>
        </div>

        {/* Дни недели с навигацией */}
        <div className="flex items-center space-x-4">
          {/* Стрелка влево */}
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Дни недели */}
          <div className="flex-1 flex space-x-1 overflow-x-auto">
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              
                           return (
                <button
                  key={index}
                  onClick={() => goToWeekDay(day)}
                  className={`min-w-[44px] sm:min-w-0 flex-1 text-center px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                    isSelected
                      ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm'
                      : isToday
                      ? 'bg-[hsl(var(--sidebar-accent))]/30 text-[hsl(var(--sidebar-foreground))]'
                      : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
                  }`}
                >
                  {format(day, 'EEE', { locale: ru })}
                  <br />
                  <span className="text-[11px] sm:text-xs">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
          
          {/* Стрелка вправо */}
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Селектор мастера */}
        <div className="mt-3 sm:mt-4">
          <select
            value={selectedMaster?.id || ''}
            onChange={(e) => {
              const master = masters.find(m => m.id === e.target.value)
              setSelectedMaster(master || null)
            }}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 w-full sm:w-auto border-[hsl(var(--sidebar-border))] focus:ring-[hsl(var(--sidebar-ring))] text-[hsl(var(--sidebar-foreground))]"
          >
            <option value="">Все мастера</option>
            {masters.map(master => (
              <option key={master.id} value={master.id}>
                {master.firstName} {master.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Календарная сетка */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Заголовок с временем */}
          <div className="flex border-b border-[hsl(var(--sidebar-border))] sticky top-0 z-20 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="w-24 p-2 sm:p-3 bg-gray-50 font-bold text-[hsl(var(--sidebar-foreground))] text-xs sm:text-sm sticky left-0 z-20 border-r border-[hsl(var(--sidebar-border))">
              Время
            </div>
            {activeMasters.map(master => (
              <div
                key={master.id}
                className="p-2 sm:p-3 bg-gray-50 font-bold text-[hsl(var(--sidebar-foreground))] text-xs sm:text-sm text-center border-l border-[hsl(var(--sidebar-border))]"
                style={{ width: masterColumnWidth }}
              >
                {master.firstName} {master.lastName}
              </div>
            ))}
          </div>

                        {/* Временные слоты */}
              <div className="relative">
                {timeSlots.map((timeSlot, index) => {
                  return (
                    <div key={index} className="flex border-b border-gray-100">
                      {/* Колонка времени */}
                      <div className="w-24 p-1.5 sm:p-2 text-[11px] sm:text-xs text-[hsl(var(--sidebar-foreground))]/70 bg-gray-50 sticky left-0 z-10 border-r border-[hsl(var(--sidebar-border))]">
                        {formatTime(timeSlot)}
                      </div>
                      
                      {/* Колонки мастеров */}
                      {activeMasters.map(master => {
                        const schedule = getMasterSchedule(master.id, selectedDate)
                        const absence = getMasterAbsence(master.id, selectedDate)
                        const absenceAtTime = isMasterAbsentAt(master.id, timeSlot)
                        const isWorking = isWorkingTime(master.id, timeSlot, selectedDate)
                        const isBreak = isBreakTime(master.id, timeSlot, selectedDate)
                        
                        let slotClass = "relative border-l border-[hsl(var(--sidebar-border))] min-h-[28px] sm:min-h-[32px]"
                        let slotContent = null
                        const isPastSlot = isSameDay(selectedDate, now) && isBefore(timeSlot, now)
                        
                        if (absenceAtTime.absent) {
                          // Мастер отсутствует - серый слот с подписью причины
                          slotClass += " bg-gray-300"
                          const reasonLabel = getAbsenceReasonLabel(absenceAtTime.reason)
                          slotContent = (
                            <div className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-xs text-[hsl(var(--sidebar-foreground))] text-center px-1">
                              <div className="font-medium truncate max-w-full">{reasonLabel}</div>
                            </div>
                          )
                        } else if (!schedule) {
                          // Нет расписания - серый слот
                          slotClass += " bg-gray-200"
                          slotContent = (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(var(--sidebar-foreground))]/70">
                              Не работает
                            </div>
                          )
                        } else if (!isWorking) {
                          // Вне рабочего времени - серый слот
                          slotClass += " bg-gray-100"
                        } else if (isBreak) {
                          // Перерыв - серый слот с подписью
                          slotClass += " bg-gray-200"
                          slotContent = (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(var(--sidebar-foreground))]/80">
                              Перерыв
                            </div>
                          )
                        }
                        
                        return (
                          <div
                            key={master.id}
                            className={slotClass + (isWorking && !isBreak && !absence ? ' hover:bg-[hsl(var(--sidebar-accent))]/20 cursor-pointer' : '')}
                            style={{ width: masterColumnWidth }}
                            onClick={() => {
                              if (!isWorking || isBreak || absenceAtTime.absent) return
                              if (onEmptySlotClick) onEmptySlotClick({ time: timeSlot, master })
                            }}
                          >
                            {isPastSlot && (
                              <div className="absolute inset-0 bg-gray-100/70 pointer-events-none" />
                            )}
                            {slotContent}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Красная линия текущего времени */}
                {isSameDay(selectedDate, now) && (() => {
                  const { startMinutes: baselineMinutes, endMinutes } = getWorkingTimeRange()
                  const nowMinutes = getSalonNowMinutes()
                  if (nowMinutes < baselineMinutes || nowMinutes > endMinutes) return null
                  const top = ((nowMinutes - baselineMinutes) / 30) * slotPx + 1
                  return (
                    <div className="absolute z-20" style={{ top: `${top}px`, left: '6rem', right: 0 }}>
                      <div className="h-0.5 bg-red-500 w-full relative">
                        <div className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    </div>
                  )
                })()}

            {/* Брони позиционируются абсолютно поверх сетки */}
            {activeMasters.map(master => {
              const masterBookings = getMasterBookings(master.id)
              const masterIndex = activeMasters.findIndex(m => m.id === master.id)
              

              
              return masterBookings.map(booking => {
                const { top, height } = getBookingPosition(booking.startTime, booking.endTime)
                const left = activeMasters.length === 1 
                  ? '6rem' // Один мастер - фиксированная позиция
                  : `calc(6rem + ${masterIndex} * ${masterColumnWidth})` // Несколько мастеров
                

                
                const start = new Date(booking.startTime)
                const end = new Date(booking.endTime)
                const isToday = isSameDay(selectedDate, now) && isSameDay(start, now)
                const isPastBooking = isToday && end.getTime() <= now.getTime()
                const isFinished = end.getTime() <= Date.now()
                const isCurrentBooking = isToday && start.getTime() <= now.getTime() && end.getTime() > now.getTime()

                // Текст карточки по требованию: Услуга, Мастер, Клиент (без времени)
                const serviceCount = booking.services ? booking.services.length : 0
                const primaryService = serviceCount > 0 ? booking.services[0].name : 'Услуга'
                const extraSuffix = serviceCount > 1 ? ` +${serviceCount - 1}` : ''

                // Для очень коротких бронирований показываем хотя бы услугу
                const showMasterLine = height >= 28
                const showClientLine = true

                const bgColor = getStatusColor(booking.status)
                return (
                  <div
                    key={booking.id}
                    className={`absolute text-white text-[11px] sm:text-xs p-1.5 sm:p-2 rounded cursor-pointer transition-colors z-10 ${
                      isPastBooking ? 'opacity-50' : ''
                    } ${isCurrentBooking ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                    style={{
                      top: `${top}px`,
                      left: left,
                      width: activeMasters.length === 1 
                        ? 'calc(100% - 6rem - 8px)' // Один мастер - полная ширина минус отступы
                        : `calc(${masterColumnWidth} - 8px)`, // Несколько мастеров
                      height: `${height}px`,
                      backgroundColor: bgColor
                    }}
                    onClick={() => onBookingClick?.(booking)}
                    title={`${primaryService}${extraSuffix} | Мастер: ${booking.master.firstName} ${booking.master.lastName} | Клиент: ${booking.client.firstName} ${booking.client.lastName}`}
                  >
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded px-1 leading-none text-[12px] text-white/90 hover:text-white bg-red-600/70 hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFinished) { markNoShow(booking.id) } else { cancelBooking(booking.id) }
                      }}
                      disabled={cancellingId === booking.id}
                      title={isFinished ? 'Отметить как «Не пришёл»' : 'Отменить запись'}
                    >
                      {cancellingId === booking.id ? '…' : '×'}
                    </button>
                    <div className="font-semibold truncate">{primaryService}{extraSuffix}</div>
                    {showMasterLine && (
                      <div className="hidden sm:block text-xs opacity-75">Мастер: {booking.master.firstName} {booking.master.lastName}</div>
                    )}
                    <div className="hidden sm:block text-xs opacity-75">
                      Клиент: <a href={`/admin/clients?id=${encodeURIComponent((booking as any).clientId || '')}`} className="underline" onClick={(e)=> e.stopPropagation()}>{booking.client.firstName} {booking.client.lastName}</a>
                    </div>
                  </div>
                )
              })
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
