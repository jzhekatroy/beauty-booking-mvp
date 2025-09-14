import React, { useState } from 'react'
import { ClientInfo, BookingData } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  User, Phone, Mail, MessageSquare, Calendar, Clock, 
  Check 
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Имя *
              </label>
              <Input
                value={bookingData.clientInfo.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Введите имя"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Фамилия
              </label>
              <Input
                value={bookingData.clientInfo.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Введите фамилию"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Телефон *
            </label>
            <Input
              type="tel"
              value={bookingData.clientInfo.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input
              type="email"
              value={bookingData.clientInfo.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="example@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Комментарий
            </label>
            <Textarea
              value={bookingData.clientInfo.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Сводка записи */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            Сводка записи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Услуги */}
            <div>
              <h4 className="font-medium mb-2">Выбранные услуги:</h4>
              <div className="space-y-2">
                {bookingData.services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} мин • {new Intl.NumberFormat('ru-RU').format(service.price)} ₽
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Дата и время */}
            {bookingData.date && bookingData.timeSlot && (
              <div>
                <h4 className="font-medium mb-2">Дата и время:</h4>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(bookingData.date).toLocaleDateString('ru-RU')}</span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>{bookingData.timeSlot.time}</span>
                </div>
              </div>
            )}

            {/* Мастер */}
            {bookingData.master && (
              <div>
                <h4 className="font-medium mb-2">Мастер:</h4>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{bookingData.master.firstName} {bookingData.master.lastName}</span>
                </div>
              </div>
            )}

            {/* Итого */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Итого:</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bookingData.totalDuration} мин
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопка подтверждения */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !bookingData.clientInfo.phone}
        className="w-full py-3 text-lg font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            Создание записи...
          </div>
        ) : (
          'Подтвердить запись'
        )}
      </Button>
    </div>
  )
}