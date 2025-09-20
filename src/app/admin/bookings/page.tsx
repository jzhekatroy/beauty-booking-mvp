'use client'

import React, { useState, useEffect } from 'react'
import { createDateInSalonTimezone } from '@/lib/timezone'
import { Calendar, Clock, User, Phone, Mail, AlertCircle, Search, Filter, Download, MessageCircle, X, Edit, ChevronDown, ChevronUp, Save } from 'lucide-react'
import Link from 'next/link'
import { formatTimeForAdmin } from '@/lib/timezone'
// Removed calendar view on bookings page

interface BookingService {
  id?: string
  name: string
  duration: number
  price: number
}

interface Booking {
  id: string
  bookingNumber: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  notes?: string
  createdAt?: string
  client: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    telegram?: string
  }
  master: {
    id: string
    firstName: string
    lastName: string
  }
  services: BookingService[]
}

interface Master {
  id: string
  firstName: string
  lastName: string
  isActive?: boolean
}

interface FilterService {
  id: string
  name: string
  isArchived?: boolean
}

const statusColors = {
  'NEW': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-blue-100 text-blue-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'NO_SHOW': 'bg-orange-100 text-orange-800',
  'CANCELLED_BY_CLIENT': 'bg-red-100 text-red-800',
  'CANCELLED_BY_SALON': 'bg-gray-100 text-gray-800'
}

const statusNames = {
  'NEW': 'Создана',
  'CONFIRMED': 'Подтверждена',
  'COMPLETED': 'Завершена',
  'NO_SHOW': 'Не пришел',
  'CANCELLED_BY_CLIENT': 'Отменена клиентом',
  'CANCELLED_BY_SALON': 'Отменена администратором'
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [services, setServices] = useState<FilterService[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)
  const [summary, setSummary] = useState<{[k:string]: any}>({})
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [includeDismissedMasters, setIncludeDismissedMasters] = useState<boolean>(false)
  const [includeArchivedServices, setIncludeArchivedServices] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'master' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)

  // Просмотр: день | неделя | месяц | диапазон
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'range'>('week')
  const [anchorDate, setAnchorDate] = useState<Date>(new Date())
  const [rangeStartStr, setRangeStartStr] = useState<string>('') // YYYY-MM-DD
  const [rangeEndStr, setRangeEndStr] = useState<string>('')
  
  // Новое состояние для временной зоны салона
  const [salonTimezone, setSalonTimezone] = useState<string>('Europe/Moscow')
  
  // Состояние для отслеживания отмены бронирования
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  const [editingBookings, setEditingBookings] = useState<Set<string>>(new Set())
  const [editForms, setEditForms] = useState<Record<string, any>>({})
  const [overlaps, setOverlaps] = useState<Record<string, boolean>>({})

  // Данные для мини‑графиков (грузим всегда с сервера, не зависят от списка)
  const [dailySeries, setDailySeries] = useState<{ daysIso: string[]; labels: string[]; counts: number[]; revenueSalon: number[]; revenueNoShow: number[]; revenueCancelled: number[] }>({ daysIso: [], labels: [], counts: [], revenueSalon: [], revenueNoShow: [], revenueCancelled: [] })
  const [dailyLoading, setDailyLoading] = useState<boolean>(false)
  const [graphGroupBy, setGraphGroupBy] = useState<'day' | 'week' | 'month'>('day')
  // Триггер принудительного обновления сводки/графиков после сохранения изменений
  const [refreshTick, setRefreshTick] = useState<number>(0)

  // На странице бронирований оставляем только список (календарь убран)

  useEffect(() => {
    loadStaticData()
  }, [])

  useEffect(() => {
    // загружаем сводку при изменении периода
    const fetchSummary = async () => {
      try {
        setSummaryLoading(true)
        const tz = salonTimezone || 'Europe/Moscow'
        const { startUtc, endUtc } = getCurrentRangeUtc()
        const token = localStorage.getItem('token')
        if (!token) return
        const masterIds = selectedMasterIds.join(',')
        const serviceIds = selectedServiceIds.join(',')
        const statuses = selectedStatuses.join(',')
        const url = `/api/bookings/summary?from=${encodeURIComponent(startUtc.toISOString())}&to=${encodeURIComponent(endUtc.toISOString())}${masterIds ? `&masterIds=${encodeURIComponent(masterIds)}` : ''}${serviceIds ? `&serviceIds=${encodeURIComponent(serviceIds)}` : ''}${statuses ? `&status=${encodeURIComponent(statuses)}` : ''}&t=${Date.now()}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setSummary(data.summary || {})
        }
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchSummary()
  }, [viewMode, anchorDate, rangeStartStr, rangeEndStr, salonTimezone, selectedMasterIds, selectedServiceIds, selectedStatuses, refreshTick])

  // Загружаем дневные ряды для графиков (всегда, без кнопки загрузки списка)
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        setDailyLoading(true)
        const { startUtc, endUtc } = getCurrentRangeUtc()
        const token = localStorage.getItem('token')
        if (!token) return
        const masterIds = selectedMasterIds.join(',')
        const serviceIds = selectedServiceIds.join(',')
        const statuses = selectedStatuses.join(',')
        const url = `/api/bookings/summary/daily?from=${encodeURIComponent(startUtc.toISOString())}&to=${encodeURIComponent(endUtc.toISOString())}${masterIds ? `&masterIds=${encodeURIComponent(masterIds)}` : ''}${serviceIds ? `&serviceIds=${encodeURIComponent(serviceIds)}` : ''}${statuses ? `&status=${encodeURIComponent(statuses)}` : ''}&t=${Date.now()}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const tz = salonTimezone || 'Europe/Moscow'
          const arr: any[] = (data.dailySummary || data.daily || [])
          const daysIso: string[] = arr.map((d: any) => (d.date || d.day))
          const labels: string[] = daysIso.map((iso: string) => new Date(iso).toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' }))
          const counts: number[] = arr.map((d: any) => Number(d.count) || 0)
          const revenueSalon: number[] = arr.map((d: any) => Number(d.revenueSalon) || 0)
          const revenueNoShow: number[] = arr.map((d: any) => Number(d.revenueNoShow) || 0)
          const revenueCancelled: number[] = arr.map((d: any) => Number(d.revenueCancelled) || 0)
          setDailySeries({ daysIso, labels, counts, revenueSalon, revenueNoShow, revenueCancelled })
        }
      } finally {
        setDailyLoading(false)
      }
    }
    fetchDaily()
  }, [viewMode, anchorDate, rangeStartStr, rangeEndStr, salonTimezone, selectedMasterIds, selectedServiceIds, selectedStatuses, refreshTick])

  // Агрегация рядов для графиков по дням/неделям/месяцам
  const aggregateGraphSeries = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    if (graphGroupBy === 'day') {
      return dailySeries
    }
    // Строим словари по ключам
    const map: Record<string, { label: string; count: number; revenueSalon: number; revenueNoShow: number; revenueCancelled: number }> = {}
    const addToKey = (key: string, label: string, i: number) => {
      if (!map[key]) map[key] = { label, count: 0, revenueSalon: 0, revenueNoShow: 0, revenueCancelled: 0 }
      map[key].count += dailySeries.counts[i] || 0
      map[key].revenueSalon += dailySeries.revenueSalon[i] || 0
      map[key].revenueNoShow += (dailySeries as any).revenueNoShow?.[i] || 0
      map[key].revenueCancelled += (dailySeries as any).revenueCancelled?.[i] || 0
    }
    dailySeries.daysIso.forEach((iso, i) => {
      const d = new Date(iso)
      const y = Number(d.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
      const m = Number(d.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
      const day = Number(d.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
      if (graphGroupBy === 'week') {
        const noon = createDateInSalonTimezone(y, m, day, 12, 0, tz)
        const weekday = noon.getUTCDay()
        const offsetToMonday = (weekday + 6) % 7
        const mondayNoonUtc = new Date(noon.getTime() - offsetToMonday * 24 * 60 * 60 * 1000)
        const my = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
        const mm = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
        const md = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
        const key = `${my}-${String(mm).padStart(2, '0')}-${String(md).padStart(2, '0')}`
        const label = new Date(createDateInSalonTimezone(my, mm, md, 12, 0, tz)).toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' })
        addToKey(key, label, i)
      } else {
        // month
        const key = `${y}-${String(m).padStart(2, '0')}`
        const dateForLabel = createDateInSalonTimezone(y, m, 1, 12, 0, tz)
        const label = dateForLabel.toLocaleDateString('ru-RU', { timeZone: tz, month: 'short', year: '2-digit' })
        addToKey(key, label, i)
      }
    })
    const keys = Object.keys(map).sort()
    const labels = keys.map(k => map[k].label)
    const counts = keys.map(k => map[k].count)
    const revenueSalon = keys.map(k => Math.round(map[k].revenueSalon))
    const revenueNoShow = keys.map(k => Math.round(map[k].revenueNoShow))
    const revenueCancelled = keys.map(k => Math.round(map[k].revenueCancelled))
    return { daysIso: keys, labels, counts, revenueSalon, revenueNoShow, revenueCancelled }
  }

  // Загрузка данных
  const loadStaticData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      // Загружаем настройки команды для получения временной зоны
      const settingsResponse = await fetch('/api/team/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSalonTimezone(settingsData.settings.timezone || 'Europe/Moscow')
      }

      // Загружаем мастеров и услуги параллельно (без бронирований)
      const [mastersResponse, servicesResponse] = await Promise.all([
        fetch('/api/masters', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/services?includeArchived=true', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        setMasters(mastersData.masters || mastersData)
      } else {
        const errorData = await mastersResponse.json()
        setError(`Ошибка загрузки мастеров: ${errorData.error || 'Неизвестная ошибка'}`)
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        const list = (servicesData.services || servicesData || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          isArchived: s.isArchived ?? false
        }))
        setServices(list)
      } else {
        const errorData = await servicesResponse.json()
        setError(`Ошибка загрузки услуг: ${errorData.error || 'Неизвестная ошибка'}`)
      }

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      setBookingsLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Токен авторизации не найден')
      // Грузим только текущий диапазон дат, чтобы уменьшить объём данных и ускорить ответ
      const { startUtc, endUtc } = getCurrentRangeUtc()
      const qs = new URLSearchParams({
        from: startUtc.toISOString(),
        to: endUtc.toISOString(),
        t: String(Date.now()),
      })
      const response = await fetch(`/api/bookings?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Ошибка загрузки бронирований')
      }
      const data = await response.json()
      const normalized = (data.bookings || []).map((b: any) => ({
        ...b,
        createdAt: b.createdAt,
        services: (b.services || []).map((bs: any) => ({
          id: bs.service?.id ?? bs.serviceId ?? bs.id,
          name: bs.service?.name ?? bs.name,
          duration: bs.service?.duration ?? bs.duration ?? 0,
          price: bs.service?.price ?? bs.price ?? 0
        })),
        client: {
          ...b.client,
          firstName: b.client?.firstName || b.client?.name || '',
          lastName: b.client?.lastName || ''
        }
      }))
      setBookings(normalized)
      setBookingsLoaded(true)
    } catch (e) {
      console.error('Ошибка загрузки бронирований:', e)
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setBookingsLoading(false)
    }
  }

  // Отмена/"Не пришёл" с подтверждением
  const cancelBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId)
      if (!booking) return
      const isFinished = new Date(booking.endTime).getTime() <= Date.now()
      const confirmText = isFinished ? 'Отметить запись как «Не пришёл»?' : 'Отменить эту запись?'
      if (!confirm(confirmText)) return

      setCancellingBooking(bookingId)
      const token = localStorage.getItem('token')
      const endpoint = isFinished ? `/api/bookings/${bookingId}/no-show` : `/api/bookings/${bookingId}/cancel`
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })

      if (response.ok) {
        // Обновляем список бронирований
        await loadBookings()
      } else {
        const errorData = await response.json()
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error)
      alert('Произошла ошибка при изменении статуса')
    } finally {
      setCancellingBooking(null)
    }
  }

  // Убрали раскрытие брони по клику — оставляем только инлайн‑редактирование в строке

  // Начало редактирования
  const toLocalDateTimeInputValue = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const toSalonLocalInputFromUtcIso = (utcIso: string, tz: string) => {
    const d = new Date(utcIso)
    const y = Number(d.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
    const m = Number(d.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const day = Number(d.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
    const hh = Number(d.toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', hour12: false }))
    const mm = Number(d.toLocaleString('ru-RU', { timeZone: tz, minute: '2-digit' }))
    const yStr = String(y)
    const mStr = String(m).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const hhStr = String(hh).padStart(2, '0')
    const mmStr = String(mm).padStart(2, '0')
    return `${yStr}-${mStr}-${dayStr}T${hhStr}:${mmStr}`
  }

  const startEditing = (booking: Booking) => {
    setEditingBookings(prev => new Set(prev).add(booking.id))
    setEditForms(prev => ({
      ...prev,
      [booking.id]: {
        startTime: toSalonLocalInputFromUtcIso(booking.startTime, salonTimezone || 'Europe/Moscow'),
        masterId: booking.master.id,
        duration: booking.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
        totalPrice: booking.totalPrice,
        notes: booking.notes || '',
        serviceId: (booking.services && (booking.services[0] as any)?.service?.id) || (booking.services && (booking.services[0] as any)?.id) || '',
        status: booking.status
      }
    }))
  }

  // Отмена редактирования
  const cancelEditing = (bookingId: string) => {
    setEditingBookings(prev => {
      const newSet = new Set(prev)
      newSet.delete(bookingId)
      return newSet
    })
    setEditForms(prev => {
      const newForms = { ...prev }
      delete newForms[bookingId]
      return newForms
    })
  }

  // Сохранение изменений
  const saveChanges = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('token')
      const formData = editForms[bookingId]

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Обновляем список бронирований
        await loadBookings()
        // Выходим из режима редактирования
        cancelEditing(bookingId)
        // Принудительно обновляем сводный блок и мини‑графики
        setRefreshTick(t => t + 1)
      } else {
        const errorData = await response.json()
        alert(`Ошибка сохранения: ${errorData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Произошла ошибка при сохранении')
    }
  }

  // Обновление формы редактирования
  const updateEditForm = (bookingId: string, field: string, value: any) => {
    setEditForms(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: value }
    }))
  }

  // Проверка пересечений при изменении startTime/masterId/duration
  useEffect(() => {
    const tz = salonTimezone || 'Europe/Moscow'
    const newOverlaps: Record<string, boolean> = {}
    bookings.forEach(b => {
      if (!editingBookings.has(b.id)) return
      const form = editForms[b.id]
      if (!form?.startTime || !form?.masterId) return
      try {
        const [datePart, timePart] = form.startTime.split('T')
        const [y, m, d] = datePart.split('-').map(Number)
        const [hh, mm] = timePart.split(':').map(Number)
        const utcStart = createDateInSalonTimezone(y, m, d, hh, mm, tz)
        const duration = Number(form.duration) || 0
        const utcEnd = new Date(utcStart.getTime() + duration * 60 * 1000)
    const conflict = bookings.some(other => {
          if (other.id === b.id) return false
          if (other.master.id !== form.masterId) return false
      // Предупреждаем о конфликтах со всеми активными/прошедшими бронями, но не блокируем
          const oStart = new Date(other.startTime)
          const oEnd = new Date(other.endTime)
          return utcStart < oEnd && utcEnd > oStart
        })
        newOverlaps[b.id] = conflict
      } catch {
        newOverlaps[b.id] = false
      }
    })
    setOverlaps(newOverlaps)
  }, [editForms, editingBookings, bookings, salonTimezone])

  // Удалён обработчик клика календаря (календарь скрыт)

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: date.toLocaleDateString('ru-RU', { timeZone: salonTimezone }),
      time: date.toLocaleTimeString('ru-RU', { timeZone: salonTimezone, hour: '2-digit', minute: '2-digit' })
    }
  }

  // Вспомогательные функции для диапазонов по часовому поясу салона
  const getMondaySalonDate = (date: Date, tz: string) => {
    // Возвращает дату (год, месяц, день) ПОНЕДЕЛЬНИКА для недели, в которой находится date по часовому поясу салона
    const d = new Date(date)
    // Вычисляем локальный (по tz) день недели: 0=вс,1=пн,...
    // Для устойчивости используем toLocaleString с опцией weekday? Трудно. Проще сдвигать по UTC, но достаточно типично:
    // Берем даты в «календарном» смысле с точки зрения tz:
    const y = Number(d.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
    const m = Number(d.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const day = Number(d.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
    const noon = createDateInSalonTimezone(y, m, day, 12, 0, tz) // полдень чтобы избегать переходов
    const weekday = noon.getUTCDay() // 0 вс ... 6 сб (в UTC, но для полудня с tz это корректно)
    const offsetToMonday = (weekday + 6) % 7 // пн=0, вт=1, ... вс=6
    const mondayNoonUtc = new Date(noon.getTime() - offsetToMonday * 24 * 60 * 60 * 1000)
    const my = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
    const mm = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const md = Number(mondayNoonUtc.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
    return { y: my, m: mm, d: md }
  }

  const getWeekRangeUtc = (date: Date, tz: string) => {
    const { y, m, d } = getMondaySalonDate(date, tz)
    const startUtc = createDateInSalonTimezone(y, m, d, 0, 0, tz)
    const endUtc = new Date(startUtc.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { startUtc, endUtc }
  }

  const getMonthRangeUtc = (date: Date, tz: string) => {
    const y = Number(date.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
    const m = Number(date.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const startUtc = createDateInSalonTimezone(y, m, 1, 0, 0, tz)
    const nextMonth = m === 12 ? 1 : m + 1
    const nextYear = m === 12 ? y + 1 : y
    const endUtc = createDateInSalonTimezone(nextYear, nextMonth, 1, 0, 0, tz)
    return { startUtc, endUtc }
  }

  const getDayRangeUtc = (date: Date, tz: string) => {
    const y = Number(date.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
    const m = Number(date.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const d = Number(date.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
    const startUtc = createDateInSalonTimezone(y, m, d, 0, 0, tz)
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
    return { startUtc, endUtc }
  }

  const getRangeModeUtc = (tz: string) => {
    if (!rangeStartStr || !rangeEndStr) return null
    const [sy, sm, sd] = rangeStartStr.split('-').map(Number)
    const [ey, em, ed] = rangeEndStr.split('-').map(Number)
    const startUtc = createDateInSalonTimezone(sy, sm, sd, 0, 0, tz)
    // end exclusive: следующий день после end
    const endUtc = createDateInSalonTimezone(ey, em, ed, 0, 0, tz)
    return { startUtc, endUtc: new Date(endUtc.getTime() + 24 * 60 * 60 * 1000) }
  }

  const getCurrentRangeUtc = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    if (viewMode === 'day') return getDayRangeUtc(anchorDate, tz)
    if (viewMode === 'week') return getWeekRangeUtc(anchorDate, tz)
    if (viewMode === 'month') return getMonthRangeUtc(anchorDate, tz)
    const r = getRangeModeUtc(tz)
    return r || getWeekRangeUtc(new Date(), tz)
  }

  const formatRangeLabel = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    const { startUtc, endUtc } = getCurrentRangeUtc()
    const startLabel = startUtc.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' })
    // Для месяца: показываем месяц и год
    if (viewMode === 'month') {
      return anchorDate.toLocaleDateString('ru-RU', { timeZone: tz, month: 'long', year: 'numeric' })
    }
    if (viewMode === 'day') {
      return anchorDate.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric' })
    }
    const endMinusOne = new Date(endUtc.getTime() - 24 * 60 * 60 * 1000)
    const endLabel = endMinusOne.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' })
    return `${startLabel} — ${endLabel}`
  }

  const getMonthPrepositional = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    const m = Number(anchorDate.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
    const map: Record<number, string> = {
      1: 'январе', 2: 'феврале', 3: 'марте', 4: 'апреле', 5: 'мае', 6: 'июне',
      7: 'июле', 8: 'августе', 9: 'сентябре', 10: 'октябре', 11: 'ноябре', 12: 'декабре'
    }
    return map[m]
  }

  const getSummaryTitle = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    if (viewMode === 'day') {
      return `За день ${formatRangeLabel()} у вас:`
    }
    if (viewMode === 'week') {
      return `За неделю ${formatRangeLabel()} у вас:`
    }
    if (viewMode === 'month') {
      return `В ${getMonthPrepositional()} у вас:`
    }
    // range
    const { startUtc, endUtc } = getCurrentRangeUtc()
    const startLabel = startUtc.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' })
    const endMinusOne = new Date(endUtc.getTime() - 24 * 60 * 60 * 1000)
    const endLabel = endMinusOne.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short' })
    return `За период ${startLabel} — ${endLabel} у вас:`
  }

  // Мини‑графики: подготовка дневных рядов в TZ салона
  const getDailyMetrics = () => {
    const tz = salonTimezone || 'Europe/Moscow'
    const { startUtc, endUtc } = getCurrentRangeUtc()
    const days: Date[] = []
    for (let t = startUtc.getTime(); t < endUtc.getTime(); t += 24 * 60 * 60 * 1000) {
      days.push(new Date(t))
    }
    const dayKeys = days.map(d => new Date(d).toLocaleDateString('ru-RU', { timeZone: tz }))
    const mapAll: Record<string, { count: number, amountCompleted: number, amountPlanned: number, amountLost: number }> = {}
    dayKeys.forEach(k => { mapAll[k] = { count: 0, amountCompleted: 0, amountPlanned: 0, amountLost: 0 } })
    filteredBookings.forEach(b => {
      const key = new Date(b.startTime).toLocaleDateString('ru-RU', { timeZone: tz })
      if (!mapAll[key]) return
      mapAll[key].count += 1
      const price = Number(b.totalPrice || 0)
      if (b.status === 'COMPLETED') mapAll[key].amountCompleted += price
      if (b.status === 'NEW' || b.status === 'CONFIRMED') mapAll[key].amountPlanned += price
      if (b.status === 'NO_SHOW' || b.status === 'CANCELLED_BY_CLIENT' || b.status === 'CANCELLED_BY_SALON') mapAll[key].amountLost += price
    })
    const counts = dayKeys.map(k => mapAll[k]?.count || 0)
    const revenueSalon = dayKeys.map(k => (mapAll[k]?.amountCompleted || 0) + (mapAll[k]?.amountPlanned || 0))
    const revenueLost = dayKeys.map(k => mapAll[k]?.amountLost || 0)
    return { labels: dayKeys, counts, revenueSalon, revenueLost }
  }

  const buildSparklinePath = (values: number[], width = 240, height = 40, maxValue?: number) => {
    if (values.length === 0) return ''
    const max = Math.max(1, maxValue ?? Math.max(...values))
    const stepX = values.length > 1 ? width / (values.length - 1) : width
    const points = values.map((v, i) => {
      const x = i * stepX
      const y = height - (v / max) * height
      return [x, y]
    })
    const d = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ')
    return d
  }

  // Фильтрация и сортировка
  const displayedServices = includeArchivedServices ? services : services.filter(s => !s.isArchived)
  const displayedMasters = includeDismissedMasters ? masters : masters.filter(m => m.isActive !== false)

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(booking.status)
    const matchesMaster = selectedMasterIds.length === 0 || selectedMasterIds.includes(booking.master.id)
    const matchesServices = selectedServiceIds.length === 0 || (booking.services || []).some(s => s.id && selectedServiceIds.includes(s.id))
    // Фильтр по диапазону дат
    const { startUtc, endUtc } = getCurrentRangeUtc()
    const bStart = new Date(booking.startTime)
    const inRange = bStart >= startUtc && bStart < endUtc
    const matchesSearch = searchTerm === '' || 
      booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${booking.client.firstName} ${booking.client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${booking.master.firstName} ${booking.master.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesMaster && matchesServices && inRange && matchesSearch
  })

  const summaryCounts = (() => {
    const list = filteredBookings
    return {
      COMPLETED: list.filter(b => b.status === 'COMPLETED').length,
      NEW: list.filter(b => b.status === 'NEW').length,
      CONFIRMED: list.filter(b => b.status === 'CONFIRMED').length,
      NO_SHOW: list.filter(b => b.status === 'NO_SHOW').length,
      CANCELLED_BY_CLIENT: list.filter(b => b.status === 'CANCELLED_BY_CLIENT').length,
      CANCELLED_BY_SALON: list.filter(b => b.status === 'CANCELLED_BY_SALON').length
    }
  })()

  const getPrimaryServiceLabel = (b: Booking) => {
    const count = b.services?.length || 0
    if (count === 0) return '—'
    const primary = b.services[0].name
    return count > 1 ? `${primary} +${count - 1}` : primary
  }

  const getTotalDuration = (b: Booking) => {
    const start = new Date(b.startTime).getTime()
    const end = new Date(b.endTime).getTime()
    if (isNaN(start) || isNaN(end) || end <= start) return 0
    return Math.round((end - start) / 60000)
  }

  const getStatusChipStyle = (status: string) => {
    const map: Record<string, string> = {
      NEW: '#FFA500',
      CONFIRMED: '#4CAF50',
      COMPLETED: '#2196F3',
      CANCELLED_BY_CLIENT: '#FF9800',
      CANCELLED_BY_SALON: '#F44336',
      NO_SHOW: '#FF5722'
    }
    const bg = map[status] || '#9E9E9E'
    return { backgroundColor: bg, color: '#fff' }
  }

  const hasActiveAdvancedFilters =
    selectedStatuses.length > 0 ||
    selectedMasterIds.length > 0 ||
    selectedServiceIds.length > 0 ||
    includeDismissedMasters ||
    includeArchivedServices

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.startTime)
        bValue = new Date(b.startTime)
        break
      case 'client':
        aValue = `${a.client.firstName} ${a.client.lastName}`
        bValue = `${b.client.firstName} ${b.client.lastName}`
        break
      case 'master':
        aValue = `${a.master.firstName} ${a.master.lastName}`
        bValue = `${b.master.firstName} ${b.master.lastName}`
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      default:
        aValue = a.startTime
        bValue = b.startTime
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h2>
          <p className="mt-2 text-gray-600">{error}</p>
                  <button
                    onClick={loadBookings}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Попробовать снова
                  </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-[hsl(var(--sidebar-foreground))] sm:text-3xl sm:truncate">
              Сводка по бронированиям
            </h2>
          </div>
        </div>

        

        {/* Управление диапазоном и режимом просмотра */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-[hsl(var(--sidebar-border))] p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-[hsl(var(--sidebar-border))] overflow-hidden">
              <button onClick={() => setViewMode('day')} className={`px-3 py-2 text-sm font-bold ${viewMode === 'day' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>День</button>
              <button onClick={() => setViewMode('week')} className={`px-3 py-2 text-sm font-bold ${viewMode === 'week' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Неделя</button>
              <button onClick={() => setViewMode('month')} className={`px-3 py-2 text-sm font-bold ${viewMode === 'month' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Месяц</button>
              <button onClick={() => setViewMode('range')} className={`px-3 py-2 text-sm font-bold ${viewMode === 'range' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Диапазон</button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(anchorDate)
                  if (viewMode === 'day') d.setDate(d.getDate() - 1)
                  else if (viewMode === 'week') d.setDate(d.getDate() - 7)
                  else if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
                  else {
                    // диапазон — ручной выбор
                  }
                  setAnchorDate(d)
                }}
                className="px-2 py-1 rounded-lg text-sm text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] border border-[hsl(var(--sidebar-border))]"
                title="Назад"
              >◀</button>
              <div className="text-sm font-bold text-[hsl(var(--sidebar-foreground))] min-w-[160px] text-center">{formatRangeLabel()}</div>
              <button
                onClick={() => {
                  const d = new Date(anchorDate)
                  if (viewMode === 'day') d.setDate(d.getDate() + 1)
                  else if (viewMode === 'week') d.setDate(d.getDate() + 7)
                  else if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
                  setAnchorDate(d)
                }}
                className="px-2 py-1 rounded-lg text-sm text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] border border-[hsl(var(--sidebar-border))]"
                title="Вперед"
              >▶</button>
              <button
                onClick={() => setAnchorDate(new Date())}
                className="px-2 py-1 rounded-lg text-sm font-bold bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
              >Сегодня</button>
            </div>

            {viewMode === 'month' && (
              <div className="ml-auto">
                <input
                  type="month"
                  value={(() => {
                    const tz = salonTimezone || 'Europe/Moscow'
                    const y = anchorDate.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' })
                    const m = Number(anchorDate.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
                    return `${y}-${String(m).padStart(2, '0')}`
                  })()}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number)
                    const tz = salonTimezone || 'Europe/Moscow'
                    const d = createDateInSalonTimezone(y, m, 1, 12, 0, tz)
                    setAnchorDate(d)
                  }}
                  className="border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]"
                />
              </div>
            )}

            {viewMode === 'day' && (
              <div className="ml-auto">
                <input
                  type="date"
                  value={(() => {
                    const tz = salonTimezone || 'Europe/Moscow'
                    const y = anchorDate.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' })
                    const m = Number(anchorDate.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
                    const d = Number(anchorDate.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
                    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  })()}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    const tz = salonTimezone || 'Europe/Moscow'
                    const newDate = createDateInSalonTimezone(y, m, d, 12, 0, tz)
                    setAnchorDate(newDate)
                  }}
                  className="border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]"
                />
              </div>
            )}

            {viewMode === 'range' && (
              <div className="ml-auto flex items-center gap-2">
                <input type="date" value={rangeStartStr} onChange={(e) => setRangeStartStr(e.target.value)} className="border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]" />
                <span>—</span>
                <input type="date" value={rangeEndStr} onChange={(e) => setRangeEndStr(e.target.value)} className="border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))]" />
              </div>
            )}
          </div>
        </div>

        {/* Кнопка доп. фильтров (под блоком времени) */}
        <div className="mt-3 flex justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`px-3 py-2 text-sm border rounded-md bg-white hover:bg-[hsl(var(--sidebar-accent))] ${(!showAdvancedFilters && hasActiveAdvancedFilters) ? 'border-orange-400 text-orange-700' : 'border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))]'}`}
            >
              {showAdvancedFilters ? 'Скрыть дополнительные фильтры ▲' : 'Дополнительные фильтры ▼'}
            </button>
            {!showAdvancedFilters && hasActiveAdvancedFilters && (
              <button
                onClick={() => {
                  setSelectedStatuses([]);
                  setSelectedMasterIds([]);
                  setSelectedServiceIds([]);
                  setIncludeDismissedMasters(false);
                  setIncludeArchivedServices(false);
                }}
                title="Сбросить дополнительные фильтры"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 border border-red-300 hover:bg-red-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Дополнительные фильтры (ниже периода) */}
        {showAdvancedFilters && (
        <div className="mt-3 bg-white rounded-lg shadow-sm border border-[hsl(var(--sidebar-border))] p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-[hsl(var(--sidebar-foreground))]/80">Вы можете выбрать несколько значений в каждом поле, удерживая Ctrl/Cmd или перетаскивая мышью.</div>
            <button
              onClick={() => {
                setSelectedStatuses([])
                setSelectedMasterIds([])
                setSelectedServiceIds([])
                setIncludeDismissedMasters(false)
                setIncludeArchivedServices(false)
              }}
              className="text-sm text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-1 hover:bg-[hsl(var(--sidebar-accent))]"
            >Очистить все доп. фильтры</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sidebar-foreground))] mb-2">Статус</label>
              <select multiple value={selectedStatuses} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedStatuses(opts) }} className="w-full border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm h-28">
                <option value="NEW">Создана</option>
                <option value="CONFIRMED">Подтверждена</option>
                <option value="COMPLETED">Завершена</option>
                <option value="NO_SHOW">Не пришел</option>
                <option value="CANCELLED_BY_CLIENT">Отменена клиентом</option>
                <option value="CANCELLED_BY_SALON">Отменена администратором</option>
              </select>
              <div className="mt-2 text-xs text-[hsl(var(--sidebar-foreground))]/70">Мультивыбор: Cmd/Ctrl + клик</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sidebar-foreground))] mb-2">Мастера</label>
              <select multiple value={selectedMasterIds} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedMasterIds(opts) }} className="w-full border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm h-28">
                {displayedMasters.map(master => (<option key={master.id} value={master.id}>{master.firstName} {master.lastName}{master.isActive === false ? ' (уволен)' : ''}</option>))}
              </select>
              <label className="mt-2 inline-flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/80">
                <input type="checkbox" className="mr-2" checked={includeDismissedMasters} onChange={(e) => setIncludeDismissedMasters(e.target.checked)} />
                Показать уволенных
              </label>
              <div className="mt-1 text-xs text-[hsl(var(--sidebar-foreground))]/70">Мультивыбор: Cmd/Ctrl + клик</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sidebar-foreground))] mb-2">Услуги</label>
              <select multiple value={selectedServiceIds} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedServiceIds(opts) }} className="w-full border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 text-sm h-28">
                {displayedServices.map(service => (<option key={service.id} value={service.id}>{service.name}{service.isArchived ? ' (архив)' : ''}</option>))}
              </select>
              <label className="mt-2 inline-flex items-center text-xs text-[hsl(var(--sidebar-foreground))]/80">
                <input type="checkbox" className="mr-2" checked={includeArchivedServices} onChange={(e) => setIncludeArchivedServices(e.target.checked)} />
                Показать архивные услуги
              </label>
              <div className="mt-1 text-xs text-[hsl(var(--sidebar-foreground))]/70">Мультивыбор: Cmd/Ctrl + клик</div>
            </div>
          </div>
        </div>
        )}

        {/* Сводная информация (построчно) */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-[hsl(var(--sidebar-border))] p-4">
          {/* Мини‑графики: всегда показываем, две панели */}
          {(() => {
            const { labels, counts, revenueSalon, revenueNoShow, revenueCancelled } = aggregateGraphSeries()
            const width = 240
            const height = 80
            const stepX = (n: number) => (n > 1 ? width / (n - 1) : width)

            // Количество: тики по Y
            const maxCount = Math.max(1, ...counts)
            const countTicks = [0, Math.round(maxCount / 2), maxCount]

            // Выручка: тики по Y
            const maxRevenue = Math.max(1, ...revenueSalon, ...revenueNoShow, ...revenueCancelled)
            const revenueTicks = [0, Math.round(maxRevenue / 2), maxRevenue]

            // Метки по оси X (дни): начало, середина, конец
            const xIdxs = (() => {
              const n = labels.length
              if (n === 0) return [] as number[]
              if (n <= 2) return [0, n - 1]
              const mid = Math.floor((n - 1) / 2)
              return [0, mid, n - 1]
            })()

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="mb-2 md:col-span-2">
                  <div className="inline-flex rounded-md border border-[hsl(var(--sidebar-border))] overflow-hidden">
                    <button onClick={() => setGraphGroupBy('day')} className={`px-2 py-1 text-xs ${graphGroupBy === 'day' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Дни</button>
                    <button onClick={() => setGraphGroupBy('week')} className={`px-2 py-1 text-xs ${graphGroupBy === 'week' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Недели</button>
                    <button onClick={() => setGraphGroupBy('month')} className={`px-2 py-1 text-xs ${graphGroupBy === 'month' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'}`}>Месяцы</button>
                  </div>
                </div>
                {/* График 1: количество */}
                <div className="border border-[hsl(var(--sidebar-border))] rounded p-3">
                  <div className="text-xs text-[hsl(var(--sidebar-foreground))] mb-2">Количество бронирований по дням</div>
                  <div className="flex items-start gap-2">
                    {/* Ось Y с подписями вне графика */}
                    <div>
                      <div className="flex flex-col justify-between text-[10px] text-[hsl(var(--sidebar-foreground))]">
                        <div className="flex items-center gap-1"><span>{maxCount}</span><span>шт</span></div>
                        <div>{Math.round(maxCount / 2)}</div>
                        <div>0</div>
                      </div>
                    </div>
                    {/* Сам график */}
                    <div className="flex-1">
                      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                        {/* горизонтальные линии сетки: верх, середина, низ (0) */}
                        <line x1={0} y1={0} x2={width} y2={0} stroke="#e5e7eb" strokeWidth="1" />
                        <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeWidth="1" />
                        <line x1={0} y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
                        <path d={buildSparklinePath(counts, width, height, maxCount)} stroke="#2563eb" strokeWidth="2" fill="none" />
                      </svg>
                      {/* Ось X с метками вне графика */}
                      <div className="flex items-center justify-between text-[10px] text-[hsl(var(--sidebar-foreground))] mt-1">
                        <div className="flex-1 flex justify-between">
                          {xIdxs.map((idx, i) => (
                            <div key={i} className="text-[10px]">{labels[idx]}</div>
                          ))}
                        </div>
                        <div className="ml-2">дни</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* График 2: выручка (зелёная) и упущенная (красная) */}
                <div className="border border-[hsl(var(--sidebar-border))] rounded p-3">
                  <div className="text-xs text-[hsl(var(--sidebar-foreground))] mb-2">
                    По дням: <span className="text-[#16a34a] font-medium">Выручка</span>, <span className="text-[#ef4444] font-medium">Клиент не пришёл</span>, <span className="text-[#f59e0b] font-medium">Отмены</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {/* Ось Y с подписями вне графика */}
                    <div>
                      <div className="flex flex-col justify-between text-[10px] text-[hsl(var(--sidebar-foreground))]">
                        <div className="flex items-center gap-1"><span>{maxRevenue.toLocaleString('ru-RU')}</span><span>₽</span></div>
                        <div>{Math.round(maxRevenue / 2).toLocaleString('ru-RU')}</div>
                        <div>0</div>
                      </div>
                    </div>
                    {/* Сам график */}
                    <div className="flex-1">
                      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                        {/* горизонтальные линии сетки: верх, середина, низ (0) */}
                        <line x1={0} y1={0} x2={width} y2={0} stroke="#e5e7eb" strokeWidth="1" />
                        <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeWidth="1" />
                        <line x1={0} y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
                        {/* Упущенная: красная (NO_SHOW) и оранжевая (отмены) */}
                        <path d={buildSparklinePath(revenueNoShow, width, height, maxRevenue)} stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d={buildSparklinePath(revenueCancelled, width, height, maxRevenue)} stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                        {/* Выручка: зелёная */}
                        <path d={buildSparklinePath(revenueSalon, width, height, maxRevenue)} stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      </svg>
                      {/* Ось X с метками вне графика */}
                      <div className="flex items-center justify-between text-[10px] text-[hsl(var(--sidebar-foreground))] mt-1">
                        <div className="flex-1 flex justify-between">
                          {xIdxs.map((idx, i) => (
                            <div key={i} className="text-[10px]">{labels[idx]}</div>
                          ))}
                        </div>
                        <div className="ml-2">дни</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-baseline mb-3">
            <div className="text-sm font-bold text-[hsl(var(--sidebar-foreground))]">{getSummaryTitle()}</div>
            <div className="text-sm font-bold text-[hsl(var(--sidebar-foreground))] md:border-l md:pl-4 border-[hsl(var(--sidebar-border))]">на сумму</div>
            <div className="text-sm font-medium text-gray-900 md:border-l md:pl-4 border-gray-200"></div>
            <div className="text-sm font-medium text-gray-900 md:border-l md:pl-4 border-gray-200"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            {/* Колонка 1: статусы и количества */}
            <div>
              {[
                { key: 'COMPLETED', label: 'Выполнено' },
                { key: 'CONFIRMED', label: 'Подтверждено' },
                { key: 'NO_SHOW', label: 'Клиент не пришел' },
                { key: 'CANCELLED_BY_CLIENT', label: 'Отменено клиентом' },
                { key: 'CANCELLED_BY_SALON', label: 'Отменено салоном' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center py-0.5">
                  <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs text-white" style={getStatusChipStyle(key)}>{label}</span>
                  <span className="ml-3 font-semibold inline-block w-12 text-right tabular-nums">{summaryLoading ? '…' : (summary[key]?.count ?? summary[key] ?? 0)}</span>
                </div>
              ))}
            </div>
            {/* Колонка 2: суммы по статусам */}
            <div className="md:border-l md:pl-4 border-[hsl(var(--sidebar-border))]">
              {[
                { key: 'COMPLETED' },
                { key: 'CONFIRMED' },
                { key: 'NO_SHOW' },
                { key: 'CANCELLED_BY_CLIENT' },
                { key: 'CANCELLED_BY_SALON' },
              ].map(({ key }) => (
                <div key={key} className="flex justify-end py-0.5">
                  <span className="font-medium inline-block w-28 text-right tabular-nums">{summaryLoading ? '' : `${(summary[key]?.amount ?? 0).toLocaleString('ru-RU')} ₽`}</span>
                </div>
              ))}
            </div>
            {/* Колонка 3: Выручка салона (итого и разбивка) */}
            <div className="md:border-l md:pl-4 border-[hsl(var(--sidebar-border))]">
              {(() => {
                const completed = Number(summary.COMPLETED?.amount ?? 0)
                const planned = Number((summary.CONFIRMED?.amount ?? 0))
                const total = completed + planned
                return (
                  <div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[hsl(var(--sidebar-foreground))] font-medium">Выручка салона</span>
                      <span className="font-semibold tabular-nums">{summaryLoading ? '' : `${total.toLocaleString('ru-RU')} ₽`}</span>
                    </div>
                    <div className="text-xs text-[hsl(var(--sidebar-foreground))]/70 mt-1">из них</div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[hsl(var(--sidebar-foreground))]/90">Фактическая (выполнено)</span>
                      <span className="font-semibold tabular-nums">{summaryLoading ? '' : `${completed.toLocaleString('ru-RU')} ₽`}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[hsl(var(--sidebar-foreground))]/90">Планируемая (подтверждено)</span>
                      <span className="font-semibold tabular-nums">{summaryLoading ? '' : `${planned.toLocaleString('ru-RU')} ₽`}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* Колонка 4: Упущенная выручка (отдельно) */}
            <div className="md:border-l md:pl-4 border-[hsl(var(--sidebar-border))]">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-red-600">Клиент не пришёл</span>
                <span className="font-semibold tabular-nums">{summaryLoading ? '' : `${(Number(summary.NO_SHOW?.amount ?? 0)).toLocaleString('ru-RU')} ₽`}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-orange-600">Отмены</span>
                <span className="font-semibold tabular-nums">{summaryLoading ? '' : `${(Number(summary.CANCELLED_BY_CLIENT?.amount ?? 0) + Number(summary.CANCELLED_BY_SALON?.amount ?? 0)).toLocaleString('ru-RU')} ₽`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка загрузки списка вне блока сводки */}
        <div className="mt-3">
          <button
            onClick={loadBookings}
            disabled={bookingsLoading}
            className="px-4 py-2 rounded-md text-sm font-bold bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))] disabled:opacity-50"
          >
            {bookingsLoading ? 'Загрузка…' : (bookingsLoaded ? 'Обновить список' : 'Загрузить список')}
          </button>
        </div>

        {/* Таблица бронирований */}
        <div className="mt-6">
          {sortedBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет записей</h3>
              <p className="mt-1 text-sm text-gray-500">Записи будут отображаться здесь после их создания.</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-[hsl(var(--sidebar-border))] overflow-x-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full table-fixed divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[14%]">Дата начала услуги</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[14%]">Дата создания брони</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[18%]">Услуга</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[14%]">Мастер</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[10%]">Длительность</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[10%]">Цена</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[16%]">Имя клиента</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-[12%]">Статус</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider w-16">Действие</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedBookings.map((b) => {
                    const isEditing = editingBookings.has(b.id)
                    const editForm = editForms[b.id] || {}
                    const isFinished = new Date(b.endTime).getTime() <= Date.now()
                    const isCancellable = ['NEW', 'CONFIRMED'].includes(b.status)
                    const start = formatDateTime(b.startTime)
                    const end = formatDateTime(b.endTime)
                    const created = b.createdAt ? formatDateTime(b.createdAt) : null
                  return (
                      <React.Fragment key={b.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 break-words">
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                value={editForm.startTime || ''}
                                onChange={(e) => updateEditForm(b.id, 'startTime', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
                              />
                            ) : (
                              <>
                                {start.date} <br />
                                <span className="text-gray-500">{start.time} - {end.time}</span>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 break-words">
                            {created ? (
                              <>
                                {created.date} <br />
                                <span className="text-gray-500">{created.time}</span>
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 break-words max-w-[180px]">
                            {isEditing ? (
                              <select
                                value={editForm.serviceId || ''}
                                onChange={(e) => {
                                  const newServiceId = e.target.value
                                  const svc = services.find(s => s.id === newServiceId)
                                  updateEditForm(b.id, 'serviceId', newServiceId)
                                  if (svc) {
                                    // Автоподстановка длительности/цены по услуге (можно потом отключить)
                                    const svcDef = (b.services && b.services[0]) ? b.services[0] : null
                                    updateEditForm(b.id, 'duration', (svc as any).duration ?? svcDef?.duration ?? editForm.duration ?? 0)
                                    updateEditForm(b.id, 'totalPrice', (svc as any).price ?? editForm.totalPrice ?? 0)
                                  }
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
                              >
                                {services.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            ) : (
                              getPrimaryServiceLabel(b)
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 break-words">
                            {isEditing ? (
                              <select
                                value={editForm.masterId || ''}
                                onChange={(e) => updateEditForm(b.id, 'masterId', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
                              >
                                {masters.filter(m => m.isActive !== false).map(master => (
                                  <option key={master.id} value={master.id}>{master.firstName} {master.lastName}</option>
                                ))}
                              </select>
                            ) : (
                              `${b.master.firstName} ${b.master.lastName}`
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            {isEditing ? (
                              <div>
                                <input
                                  type="number"
                                  min={15}
                                  step={15}
                                  value={editForm.duration || 0}
                                  onChange={(e) => updateEditForm(b.id, 'duration', parseInt(e.target.value) || 0)}
                                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs w-24 text-right"
                                />
                                {overlaps[b.id] && (
                                  <div className="mt-1 text-[10px] text-orange-600">Возможный конфликт по времени</div>
                                )}
                              </div>
                            ) : (
                              `${getTotalDuration(b)} мин`
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={String(editForm.totalPrice ?? 0)}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')
                                  const num = v === '' ? 0 : Number(v)
                                  updateEditForm(b.id, 'totalPrice', isNaN(num) ? 0 : num)
                                }}
                                className="border border-gray-300 rounded-md px-2 py-1.5 text-xs w-24 text-right"
                                placeholder="0"
                              />
                            ) : (
                              `${b.totalPrice} ₽`
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 break-words max-w-[180px]">
                            <a
                              href={`/admin/clients?id=${encodeURIComponent((b as any).clientId || '')}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {b.client.firstName} {b.client.lastName}
                            </a>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {isEditing ? (
                              <select
                                value={editForm.status || b.status}
                                onChange={(e) => updateEditForm(b.id, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
                              >
                                {(() => {
                                  const current = b.status
                                  const all: Array<{value:string,label:string}> = [
                                    { value: 'NEW', label: statusNames['NEW'] },
                                    { value: 'CONFIRMED', label: statusNames['CONFIRMED'] },
                                    { value: 'COMPLETED', label: statusNames['COMPLETED'] },
                                    { value: 'NO_SHOW', label: statusNames['NO_SHOW'] },
                                    { value: 'CANCELLED_BY_CLIENT', label: statusNames['CANCELLED_BY_CLIENT'] },
                                    { value: 'CANCELLED_BY_SALON', label: statusNames['CANCELLED_BY_SALON'] },
                                  ]
                                  let allowed: typeof all
                                  if (current === 'NEW' || current === 'CONFIRMED') {
                                    allowed = all.filter(o => o.value === 'CANCELLED_BY_SALON' || o.value === 'CANCELLED_BY_CLIENT')
                                  } else {
                                    allowed = all.filter(o => o.value !== 'NEW' && o.value !== 'CONFIRMED')
                                  }
                                  return allowed.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))
                                })()}
                              </select>
                            ) : (
                              <span className="inline-flex px-2 py-[2px] text-[10px] font-medium rounded-full" style={getStatusChipStyle(b.status)}>
                                {statusNames[b.status as keyof typeof statusNames] || b.status}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium w-16" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <div className="inline-flex gap-2">
                                <button onClick={() => saveChanges(b.id)} className="text-blue-600 hover:text-blue-800" title="Сохранить"><Save className="w-4 h-4" /></button>
                                <button onClick={() => cancelEditing(b.id)} className="text-gray-600 hover:text-gray-800" title="Отмена"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(b)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* раскрытие по клику отключено */}
                        {false && (
                          <tr>
                            <td colSpan={9} className="px-3 py-3 bg-gray-50">
                              <div className="flex justify-end space-x-2 mb-4">
                                {(b.status !== 'COMPLETED' && b.status !== 'CANCELLED_BY_CLIENT' && b.status !== 'CANCELLED_BY_SALON') && (
                                  <button
                                    onClick={() => isEditing ? saveChanges(b.id) : startEditing(b)}
                                    className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                                  >
                                    {isEditing ? (
                                      <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Сохранить
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Редактировать
                                      </>
                                    )}
                                  </button>
                                )}
                                {isEditing && (
                                  <button
                                    onClick={() => cancelEditing(b.id)}
                                    className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    Отмена
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Время начала</label>
                                    <input type="datetime-local" value={editForm.startTime || ''} onChange={(e) => updateEditForm(b.id, 'startTime', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Мастер</label>
                                    <select value={editForm.masterId || ''} onChange={(e) => updateEditForm(b.id, 'masterId', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                      {masters.map(master => (<option key={master.id} value={master.id}>{master.firstName} {master.lastName}</option>))}
                                    </select>
                            </div>
                            <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
                                    <input type="number" min={15} step={15} value={editForm.duration || 0} onChange={(e) => updateEditForm(b.id, 'duration', parseInt(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                    {overlaps[b.id] && (<p className="mt-1 text-xs text-orange-600">Внимание: новая длительность пересекается с другой записью.</p>)}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Общая цена (₽)</label>
                                    <input type="number" min={0} step={100} value={editForm.totalPrice ?? 0} onChange={(e) => updateEditForm(b.id, 'totalPrice', Number(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                                    <textarea value={editForm.notes || ''} onChange={(e) => updateEditForm(b.id, 'notes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Причина изменения..." />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Клиент</h4>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      <div className="flex items-center"><User className="w-4 h-4 mr-2" />
                                        <a href={`/admin/clients?id=${encodeURIComponent((b as any).clientId || '')}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                          {b.client.firstName} {b.client.lastName}
                                        </a>
                                      </div>
                                      <div className="flex items-center"><Mail className="w-4 h-4 mr-2" />{b.client.email}</div>
                                      {b.client.phone && (<div className="flex items-center"><Phone className="w-4 h-4 mr-2" />{b.client.phone}</div>)}
                                      {b.client.telegram && (<div className="flex items-center"><MessageCircle className="w-4 h-4 mr-2" />{b.client.telegram}</div>)}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Услуги</h4>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      {b.services.map((s, i) => (<div key={i} className="flex justify-between"><span>{s.name} ({s.duration} мин)</span><span className="font-medium">{s.price} ₽</span></div>))}
                                      <div className="pt-2 border-t border-gray-200">
                                        <div className="flex justify-between font-medium"><span>Мастер:</span><span>{b.master.firstName} {b.master.lastName}</span></div>
                                        <div className="flex justify-between font-medium text-lg text-blue-600"><span>Итого:</span><span>{b.totalPrice} ₽</span></div>
                              </div>
                            </div>
                          </div>
                                  {b.notes && (
                                    <div className="md:col-span-2">
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Комментарий</h4>
                                      <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md">{b.notes}</p>
                            </div>
                          )}
                        </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}