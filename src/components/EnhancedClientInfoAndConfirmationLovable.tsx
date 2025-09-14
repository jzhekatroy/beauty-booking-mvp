'use client'

import React, { useState } from 'react'
import { ClientInfo, BookingData } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  User, Phone, Mail, MessageSquare, Calendar, Clock, 
  DollarSign, Check, ChevronDown, ChevronUp, Star, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
// import { toE164 } from '@/lib/phone' // Временно отключено
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'

interface EnhancedClientInfoAndConfirmationProps {
  bookingData: BookingData;
  onClientInfoChange: (info: ClientInfo) => void;
  onBookingConfirmed: () => void;
  className?: string;
}

export function EnhancedClientInfoAndConfirmationLovable({
  bookingData,
  onClientInfoChange,
  onBookingConfirmed,
  className
}: EnhancedClientInfoAndConfirmationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const telegramWebApp = useTelegramWebApp()

  const handleInputChange = (field: keyof ClientInfo, value: string) => {
    onClientInfoChange({
      ...bookingData.clientInfo,
      [field]: value
    })
  }

  const handleSubmit = async () => {
    if (!bookingData.clientInfo.phone) {
      if (telegramWebApp.isAvailable) {
        telegramWebApp.showAlert('Пожалуйста, введите номер телефона')
      } else {
        alert('Пожалуйста, введите номер телефона')
      }
      return
    }

    setIsSubmitting(true)
    try {
      await onBookingConfirmed()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Форма контактных данных - улучшенный дизайн */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            Контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Имя *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={bookingData.clientInfo.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Введите имя"
                  className="pl-10 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 transition-colors"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Фамилия
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={bookingData.clientInfo.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Введите фамилию"
                  className="pl-10 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Телефон *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                value={bookingData.clientInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="pl-10 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 transition-colors"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                value={bookingData.clientInfo.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="example@email.com"
                className="pl-10 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Комментарий
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
              <textarea
                value={bookingData.clientInfo.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Дополнительная информация..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Сводка записи - улучшенный дизайн */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg">
              <Check className="w-6 h-6 text-white" />
            </div>
            Сводка записи
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Услуги */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-indigo-600" />
                Выбранные услуги:
              </h4>
              <div className="space-y-3">
                {bookingData.services && bookingData.services.length > 0 ? bookingData.services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {service.duration} мин
                        </span>
                  <span className="font-medium text-indigo-600">
                    {new Intl.NumberFormat('ru-RU').format(Number(service.price))} ₽
                  </span>
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Нет выбранных услуг</p>
                  </div>
                )}
              </div>
            </div>

            {/* Дата и время */}
            {bookingData.date && bookingData.timeSlot && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Дата и время:
                </h4>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <span className="text-lg font-medium text-gray-900">
                    {new Date(bookingData.date).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <Clock className="w-6 h-6 text-blue-600 ml-4" />
                  <span className="text-lg font-medium text-gray-900">
                    {bookingData.timeSlot.time}
                  </span>
                </div>
              </div>
            )}

            {/* Мастер */}
            {bookingData.master && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Мастер:
                </h4>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <User className="w-6 h-6 text-green-600" />
                  <span className="text-lg font-medium text-gray-900">
                    {bookingData.master.firstName && bookingData.master.lastName 
                      ? `${bookingData.master.firstName} ${bookingData.master.lastName}`
                      : bookingData.master.name || 'Мастер'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Итого */}
            <div className="pt-6 border-t-2 border-gray-200">
              <div className="flex justify-between items-center p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8" />
                  <div>
                    <span className="text-xl font-semibold">Итого к оплате:</span>
                    <p className="text-indigo-100 text-sm">
                      {bookingData.totalDuration} мин • {bookingData.services?.length || 0} услуг
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold">
                    {new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопка подтверждения - улучшенный дизайн */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !bookingData.clientInfo.phone}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            Создание записи...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6" />
            Подтвердить запись
          </div>
        )}
      </Button>
    </div>
  )
}
