'use client'

import React, { useState } from 'react'
import { ClientInfo, BookingData } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  User, Phone, Mail, MessageSquare, Calendar, Clock, 
  DollarSign, Check, ChevronDown, ChevronUp 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toE164 } from '@/lib/phone'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'

interface EnhancedClientInfoAndConfirmationProps {
  bookingData: BookingData;
  onClientInfoChange: (info: ClientInfo) => void;
  onBookingConfirmed: () => void;
  className?: string;
}

export function EnhancedClientInfoAndConfirmation({
  bookingData,
  onClientInfoChange,
  onBookingConfirmed,
  className
}: EnhancedClientInfoAndConfirmationProps) {
  const [errors, setErrors] = useState<Partial<ClientInfo>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showBookingSummary, setShowBookingSummary] = useState(true)
  const [isRequestingPhone, setIsRequestingPhone] = useState(false)
  const telegramWebApp = useTelegramWebApp()

  // Автоматическое заполнение данных из Telegram WebApp (только если WebApp доступен)
  React.useEffect(() => {
    if (telegramWebApp.webApp && telegramWebApp.user && !bookingData.clientInfo.name) {
      const firstName = telegramWebApp.user.first_name || ''
      const lastName = telegramWebApp.user.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      if (fullName) {
        onClientInfoChange({
          ...bookingData.clientInfo,
          name: fullName
        })
      }
    }
  }, [telegramWebApp.webApp, telegramWebApp.user, bookingData.clientInfo.name, onClientInfoChange])

  // Автоматический запрос номера телефона для WebApp
  React.useEffect(() => {
    if (telegramWebApp.webApp && !bookingData.clientInfo.phone && !isRequestingPhone) {
      // Небольшая задержка, чтобы пользователь увидел форму
      const timer = setTimeout(() => {
        if (telegramWebApp.webApp && !bookingData.clientInfo.phone) {
          console.log('📱 WebApp detected, requesting phone number...')
          requestPhoneNumber()
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [telegramWebApp.webApp, bookingData.clientInfo.phone, isRequestingPhone])

  // Функция для запроса номера телефона через Telegram WebApp
  const requestPhoneNumber = async () => {
    if (!telegramWebApp.webApp) {
      console.error('❌ Telegram WebApp недоступен')
      alert('Telegram WebApp недоступен')
      return
    }

    console.log('📱 ===== НАЧАЛО ЗАПРОСА НОМЕРА ТЕЛЕФОНА =====')
    console.log('📱 WebApp object:', telegramWebApp.webApp)
    console.log('📱 requestContact method:', typeof telegramWebApp.webApp.requestContact)
    console.log('📱 onEvent method:', typeof telegramWebApp.webApp.onEvent)
    console.log('📱 offEvent method:', typeof telegramWebApp.webApp.offEvent)
    console.log('📱 WebApp version:', telegramWebApp.webApp.version)
    console.log('📱 WebApp platform:', telegramWebApp.webApp.platform)
    console.log('📱 User agent:', navigator.userAgent)
    console.log('📱 Current URL:', window.location.href)
    
    // Отправляем подробные логи на сервер для отладки
    try {
      await fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'PHONE_REQUEST_START',
          data: {
            webAppAvailable: !!telegramWebApp.webApp,
            requestContactAvailable: typeof telegramWebApp.webApp?.requestContact === 'function',
            onEventAvailable: typeof telegramWebApp.webApp?.onEvent === 'function',
            offEventAvailable: typeof telegramWebApp.webApp?.offEvent === 'function',
            webAppVersion: telegramWebApp.webApp?.version,
            webAppPlatform: telegramWebApp.webApp?.platform,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (e) {
      console.error('❌ Failed to send debug log:', e)
    }

    setIsRequestingPhone(true)
    
    try {
      // Проверяем, доступен ли метод requestContact
      if (typeof telegramWebApp.webApp.requestContact !== 'function') {
        console.log('❌ requestContact method not available, trying requestWriteAccess')
        
        // Альтернативный способ - запрашиваем доступ к записи
        if (typeof telegramWebApp.webApp.requestWriteAccess === 'function') {
          console.log('📱 Trying requestWriteAccess as fallback...')
          telegramWebApp.webApp.requestWriteAccess((granted: boolean) => {
            console.log('📱 requestWriteAccess result:', granted)
            setIsRequestingPhone(false)
            if (granted) {
              console.log('✅ Write access granted, but phone number still needs manual input')
              if (telegramWebApp.webApp) {
                alert('Доступ к записи предоставлен, но номер телефона нужно ввести вручную')
              }
            } else {
              console.log('❌ Write access denied')
              if (telegramWebApp.webApp) {
                alert('Доступ к записи не предоставлен. Пожалуйста, введите номер телефона вручную.')
              }
            }
          })
          return
        } else {
          console.log('❌ No fallback methods available')
          if (telegramWebApp.webApp) {
            alert('Функция запроса номера телефона недоступна в этой версии Telegram. Пожалуйста, введите номер вручную.')
          }
          setIsRequestingPhone(false)
          return
        }
      }

      console.log('✅ requestContact method available, proceeding with contact request...')

      // В Telegram WebApp requestContact работает по-другому!
      // Он НЕ принимает callback, а показывает кнопку для отправки контакта
      // Результат приходит через событие 'contactRequested'
      
      // Устанавливаем обработчик события
      const handleContactRequested = (contact: any) => {
        console.log('📱 ===== КОНТАКТ ПОЛУЧЕН ЧЕРЕЗ СОБЫТИЕ =====')
        console.log('📱 Contact data:', contact)
        console.log('📱 Contact type:', typeof contact)
        console.log('📱 Contact keys:', contact ? Object.keys(contact) : 'null')
        console.log('📱 Phone number:', contact?.phone_number)
        
        setIsRequestingPhone(false)
        
        // Проверяем разные форматы контакта
        let phoneNumber = null
        
        if (contact?.phone_number) {
          phoneNumber = contact.phone_number
        } else if (contact?.contact?.phone_number) {
          phoneNumber = contact.contact.phone_number
        } else if (contact?.responseUnsafe?.contact?.phone_number) {
          phoneNumber = contact.responseUnsafe.contact.phone_number
        }
        
        if (phoneNumber) {
          console.log('✅ Получен контакт из Telegram:', contact)
          console.log('✅ Phone number extracted:', phoneNumber)
          onClientInfoChange({
            ...bookingData.clientInfo,
            phone: phoneNumber
          })
          
          // Отправляем успешный лог на сервер
          fetch('/api/telegram/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'PHONE_REQUEST_SUCCESS',
              data: { 
                contact, 
                phone: phoneNumber,
                timestamp: new Date().toISOString() 
              }
            })
          }).catch(e => console.error('Failed to send success log:', e))
          
          // Убираем обработчики после получения контакта
          telegramWebApp.webApp?.offEvent('contactRequested', handleContactRequested)
          telegramWebApp.webApp?.offEvent('contact_requested', handleContactRequested)
          telegramWebApp.webApp?.offEvent('contact', handleContactRequested)
        } else {
          console.log('❌ Контакт не получен или нет номера телефона:', contact)
          if (telegramWebApp.webApp) {
            alert('Не удалось получить номер телефона. Пожалуйста, введите его вручную.')
          }
          
          // Отправляем лог об ошибке на сервер
          fetch('/api/telegram/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'PHONE_REQUEST_FAILED',
              data: { contact, timestamp: new Date().toISOString() }
            })
          }).catch(e => console.error('Failed to send error log:', e))
        }
      }

      console.log('📱 Setting up event listener for contactRequested...')
      
      // Добавляем обработчик события
      telegramWebApp.webApp.onEvent('contactRequested', handleContactRequested)
      console.log('✅ Event listener attached')
      
      // Также попробуем другие возможные события
      telegramWebApp.webApp.onEvent('contact_requested', handleContactRequested)
      telegramWebApp.webApp.onEvent('contact', handleContactRequested)
      
      // Запрашиваем контакт (показывает кнопку в интерфейсе)
      console.log('📱 Calling requestContact()...')
      telegramWebApp.webApp.requestContact()
      console.log('✅ requestContact() called, waiting for user action...')
      
      // Устанавливаем таймаут на случай, если пользователь не отправит контакт
      const timeoutId = setTimeout(() => {
        console.log('⏰ ===== ТАЙМАУТ ОЖИДАНИЯ КОНТАКТА =====')
        setIsRequestingPhone(false)
        telegramWebApp.webApp?.offEvent('contactRequested', handleContactRequested)
        telegramWebApp.webApp?.offEvent('contact_requested', handleContactRequested)
        telegramWebApp.webApp?.offEvent('contact', handleContactRequested)
        console.log('⏰ Timeout waiting for contact - user did not send contact')
        
        // Отправляем лог о таймауте на сервер
        fetch('/api/telegram/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'PHONE_REQUEST_TIMEOUT',
            data: { timestamp: new Date().toISOString() }
          })
        }).catch(e => console.error('Failed to send timeout log:', e))
      }, 30000) // 30 секунд
      
      console.log('⏰ Timeout set for 30 seconds')
      
      // Очищаем таймаут при получении контакта
      const originalHandler = handleContactRequested
      const wrappedHandler = (contact: any) => {
        console.log('📱 Wrapped handler called, clearing timeout...')
        clearTimeout(timeoutId)
        originalHandler(contact)
      }
      
      // Заменяем обработчики на обернутые
      telegramWebApp.webApp.offEvent('contactRequested', handleContactRequested)
      telegramWebApp.webApp.offEvent('contact_requested', handleContactRequested)
      telegramWebApp.webApp.offEvent('contact', handleContactRequested)
      
      telegramWebApp.webApp.onEvent('contactRequested', wrappedHandler)
      telegramWebApp.webApp.onEvent('contact_requested', wrappedHandler)
      telegramWebApp.webApp.onEvent('contact', wrappedHandler)
      console.log('✅ Wrapped handlers attached')
      
    } catch (error: any) {
      console.error('❌ ===== ОШИБКА ПРИ ЗАПРОСЕ НОМЕРА ТЕЛЕФОНА =====')
      console.error('❌ Error details:', error)
      console.error('❌ Error message:', error?.message)
      console.error('❌ Error stack:', error?.stack)
      
      // Показываем alert только для WebApp, для публичной страницы не показываем
      if (telegramWebApp.webApp) {
        alert('Ошибка при запросе номера телефона. Пожалуйста, введите номер вручную.')
      }
      setIsRequestingPhone(false)
      
      // Отправляем лог об ошибке на сервер
      fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'PHONE_REQUEST_ERROR',
          data: { 
            error: error.message, 
            stack: error.stack,
            timestamp: new Date().toISOString() 
          }
        })
      }).catch(e => console.error('Failed to send error log:', e))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientInfo> = {}

    if (!bookingData.clientInfo.name.trim()) {
      newErrors.name = 'Имя обязательно'
    }

    if (!bookingData.clientInfo.phone.trim()) {
      newErrors.phone = 'Телефон обязателен'
    } else if (!/^[\+]?[1-9][\d]{10,14}$/.test(bookingData.clientInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Некорректный формат телефона'
    }

    if (bookingData.clientInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.clientInfo.email)) {
      newErrors.email = 'Некорректный формат email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ClientInfo, value: string) => {
    onClientInfoChange({
      ...bookingData.clientInfo,
      [field]: value
    })

    // Очищаем ошибку для этого поля при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleConfirm = async () => {
    if (!validateForm()) {
      return
    }
    
    // Дополнительная валидация
    if (!bookingData.timeSlot?.time) {
      alert('Пожалуйста, выберите время записи')
      return
    }

    setIsSubmitting(true)
    try {
      // На сервер нужно отправлять время САЛОНА, иначе появится конфликт
      const salonTime = bookingData.timeSlot?.timezoneInfo?.salonTime || bookingData.timeSlot!.time
      const startTime = `${bookingData.date}T${salonTime}:00`
      console.log('🔍 DEBUG startTime (salon) being sent:', startTime)
      
      // Отправляем данные на сервер
      // Нормализуем телефон в E.164 перед отправкой
      const { e164: phoneE164, error: phoneErr } = toE164(bookingData.clientInfo.phone, 'RU')
      if (phoneErr || !phoneE164) {
        setErrors(prev => ({ ...prev, phone: 'Некорректный номер телефона' }))
        setIsSubmitting(false)
        return
      }


      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamSlug: window.location.pathname.split('/')[2], // Извлекаем slug из URL
          serviceIds: bookingData.services.map(s => s.id),
          masterId: bookingData.master?.id,
          startTime: startTime,
          clientData: {
            name: bookingData.clientInfo.name,
            phone: phoneE164,
            email: bookingData.clientInfo.email,
            notes: bookingData.clientInfo.notes,
            // Добавляем данные Telegram WebApp
            telegramId: telegramWebApp.user?.id?.toString(),
            telegramUsername: telegramWebApp.user?.username,
            telegramFirstName: telegramWebApp.user?.first_name,
            telegramLastName: telegramWebApp.user?.last_name,
            telegramLanguageCode: telegramWebApp.user?.language_code,
          }
        })
      })

      if (response.ok) {
        onBookingConfirmed()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при создании записи')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} ч`
    return `${hours} ч ${remainingMinutes} мин`
  }

  // Добавляем отладочную информацию
  console.log('🔍 EnhancedClientInfoAndConfirmation render:', {
    timeSlot: bookingData.timeSlot,
    timeSlotTime: bookingData.timeSlot?.time,
    fullBookingData: bookingData
  })

  return (
    <div className={cn("space-y-6", className)}>
      {/* Краткая сводка заказа */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setShowBookingSummary(!showBookingSummary)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ваш заказ
            </div>
            {showBookingSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showBookingSummary && (
          <CardContent className="space-y-4">
            {/* Услуги */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Услуги:</p>
              <div className="space-y-1">
                {bookingData.services.map(service => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span>{service.name}</span>
                    <span>{service.price} ₽</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Дата, время, мастер */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Дата:</p>
                <p>{formatDate(bookingData.date)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Время:</p>
                <p>{bookingData.timeSlot?.time || 'Не выбрано'}</p>
              </div>
              {bookingData.master && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-700 mb-2">Мастер:</p>
                  <div className="flex items-center gap-3">
                    {bookingData.master.photoUrl ? (
                      <img
                        src={bookingData.master.photoUrl}
                        alt={`${bookingData.master.firstName} ${bookingData.master.lastName}`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{bookingData.master.firstName} {bookingData.master.lastName}</p>
                      {bookingData.master.description && (
                        <p className="text-xs text-gray-600">{bookingData.master.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Итого */}
            <div className="border-t pt-3 flex justify-between items-center font-semibold">
              <span>Итого:</span>
              <span className="text-[#00acf4]">{bookingData.totalPrice} ₽</span>
            </div>
            <p className="text-xs text-gray-600">
              Продолжительность: {formatDuration(bookingData.totalDuration)}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Форма контактных данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Ваши контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Имя */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Ваше имя *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Введите ваше имя"
                  value={bookingData.clientInfo.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={cn(
                    "pl-10",
                    errors.name ? 'border-red-500 focus:border-red-500' : ''
                  )}
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Телефон */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Номер телефона *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={bookingData.clientInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={cn(
                      "pl-10",
                      errors.phone ? 'border-red-500 focus:border-red-500' : ''
                    )}
                  />
                </div>
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (необязательно)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={bookingData.clientInfo.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={cn(
                    "pl-10",
                    errors.email ? 'border-red-500 focus:border-red-500' : ''
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Примечания */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Комментарий (необязательно)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  id="notes"
                  placeholder="Дополнительные пожелания..."
                  value={bookingData.clientInfo.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00acf4] focus:border-transparent resize-none"
                  )}
                />
              </div>
            </div>

            {/* Кнопка подтверждения */}
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg mt-6"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Создаем запись...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Подтвердить запись
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
