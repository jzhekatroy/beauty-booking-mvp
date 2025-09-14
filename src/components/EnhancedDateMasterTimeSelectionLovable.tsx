'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User, CheckCircle } from 'lucide-react'
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

export function EnhancedDateMasterTimeSelectionLovable({
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
  
  const [loading, setLoading] = useState(false)
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

  // Проверяем что все необходимые пропсы доступны
  if (!salonTimezone) {
    return (
      <Card className={cn("w-full bg-white/80 backdrop-blur-sm", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="w-6 h-6 text-blue-600" />
            Выбор даты и времени
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Загрузка временной зоны...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleNext = () => {
    if (selectedDate && selectedTimeSlot && onNext) {
      onNext()
    }
  }

  return (
    <Card className={cn("w-full bg-white/80 backdrop-blur-sm border-0 shadow-xl", className)}>
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            Выбор даты и времени
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-white/50 rounded-xl px-4 py-2">
            <span className="font-medium">Услуг: {selectedServices.length}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalDuration} мин
            </span>
            <span className="font-bold text-green-600 text-lg">
              {new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8 p-8">
        {/* Выбор даты - улучшенный дизайн */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Выберите дату
          </h3>
          
          <div className="grid grid-cols-7 gap-2">
            {/* Заголовки дней недели */}
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {/* Дни месяца - упрощенная версия */}
            {Array.from({ length: 30 }, (_, i) => {
              const date = new Date()
              date.setDate(date.getDate() + i)
              const dateStr = date.toISOString().split('T')[0]
              const isSelected = selectedDate === dateStr
              const isToday = i === 0
              
              return (
                <button
                  key={dateStr}
                  onClick={() => onDateTimeSelect(dateStr, selectedMaster, null)}
                  className={cn(
                    "p-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105",
                    isSelected 
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg" 
                      : isToday
                      ? "bg-green-100 text-green-700 border-2 border-green-300"
                      : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200"
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Выбор мастера - улучшенный дизайн */}
        {masters.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Выберите мастера
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {masters.map((master) => {
                const isSelected = selectedMaster?.id === master.id
                
                return (
                  <Card
                    key={master.id}
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105",
                      isSelected 
                        ? "ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg" 
                        : "hover:shadow-md bg-white"
                    )}
                    onClick={() => onDateTimeSelect(selectedDate, master, selectedTimeSlot)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {master.photoUrl && (
                          <img
                            src={master.photoUrl}
                            alt={master.firstName || master.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {master.firstName && master.lastName 
                              ? `${master.firstName} ${master.lastName}`
                              : master.name || 'Мастер'
                            }
                          </h4>
                          {master.description && (
                            <p className="text-sm text-gray-600">{master.description}</p>
                          )}
                          {isSelected && (
                            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                              <CheckCircle className="w-4 h-4" />
                              Выбрано
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Выбор времени - улучшенный дизайн */}
        {selectedDate && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              Выберите время
            </h3>
            
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: 12 }, (_, i) => {
                const hour = 9 + i
                const timeStr = `${hour.toString().padStart(2, '0')}:00`
                const isSelected = selectedTimeSlot?.time === timeStr
                const isAvailable = Math.random() > 0.3 // Заглушка для доступности
                
                return (
                  <button
                    key={timeStr}
                    onClick={() => {
                      if (isAvailable) {
                        onDateTimeSelect(selectedDate, selectedMaster, { time: timeStr, available: true })
                      }
                    }}
                    disabled={!isAvailable}
                    className={cn(
                      "p-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isSelected 
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg" 
                        : isAvailable
                        ? "bg-white text-gray-700 hover:bg-green-50 border border-gray-200 hover:border-green-300"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {timeStr}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Кнопка продолжения */}
        {selectedDate && selectedTimeSlot && (
          <div className="pt-6 border-t border-gray-200">
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Продолжить
              <Clock className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
