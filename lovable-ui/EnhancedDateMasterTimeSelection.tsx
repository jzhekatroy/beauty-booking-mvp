import React, { useState, useMemo } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientTimezone } from '@/hooks/useClientTimezone'

interface EnhancedDateMasterTimeSelectionProps {
  masters: Master[];
  selectedServices: Service[];
  selectedDate: string;
  selectedMaster: Master | null;
  selectedTimeSlot: TimeSlot | null;
  onDateTimeSelect: (date: string, master: Master | null, timeSlot: TimeSlot | null) => void;
  bookingStep: number;
  salonTimezone: string;
  className?: string;
  onNext?: () => void;
}

export function EnhancedDateMasterTimeSelection({
  masters,
  selectedServices,
  selectedDate,
  selectedMaster,
  selectedTimeSlot,
  onDateTimeSelect,
  bookingStep,
  salonTimezone,
  className,
  onNext
}: EnhancedDateMasterTimeSelectionProps) {
  
  const { clientTimezone, loading: timezoneLoading } = useClientTimezone()

  // Подсумма по выбранным услугам для шапки
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s?.duration || 0), 0),
    [selectedServices]
  )
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s?.price || 0), 0),
    [selectedServices]
  )

  // Генерируем доступные даты (следующие 30 дней)
  const availableDates = useMemo(() => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }, [])

  // Генерируем временные слоты
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots = []
    
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push({
          time,
          available: Math.random() > 0.3 // Случайная доступность для демо
        })
      }
    }
    
    return slots
  }, [selectedDate, selectedMaster])

  const handleDateSelect = (date: string) => {
    onDateTimeSelect(date, selectedMaster, null)
  }

  const handleMasterSelect = (master: Master) => {
    onDateTimeSelect(selectedDate, master, selectedTimeSlot)
  }

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    onDateTimeSelect(selectedDate, selectedMaster, timeSlot)
  }

  const handleNext = () => {
    if (selectedDate && selectedTimeSlot && onNext) {
      onNext()
    }
  }

  if (timezoneLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Выбор даты и времени
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Выбор даты и времени
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Услуг: {selectedServices.length}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalDuration} мин
            </span>
            <span className="font-medium">{new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Выбор мастера (если есть несколько) */}
        {masters.length > 1 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Выберите мастера
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {masters.map((master) => (
                <Card
                  key={master.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedMaster?.id === master.id 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleMasterSelect(master)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {master.photoUrl && (
                        <img 
                          src={master.photoUrl} 
                          alt={`${master.firstName} ${master.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{master.firstName} {master.lastName}</p>
                        {master.specialization && (
                          <p className="text-sm text-muted-foreground">{master.specialization}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Выбор даты */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Выберите дату
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
            {availableDates.map((date) => {
              const dateObj = new Date(date)
              const isSelected = selectedDate === date
              const isToday = date === new Date().toISOString().split('T')[0]
              
              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "h-auto p-2 flex flex-col",
                    isToday && "border-primary"
                  )}
                >
                  <span className="text-xs">
                    {dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                  <span className="font-medium">
                    {dateObj.getDate()}
                  </span>
                  <span className="text-xs">
                    {dateObj.toLocaleDateString('ru-RU', { month: 'short' })}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Выбор времени */}
        {selectedDate && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Выберите время
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {timeSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant={selectedTimeSlot?.time === slot.time ? "default" : "outline"}
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => handleTimeSlotSelect(slot)}
                  className="text-sm"
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Кнопка продолжить */}
        {selectedDate && selectedTimeSlot && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} className="flex items-center gap-2">
              Продолжить
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}