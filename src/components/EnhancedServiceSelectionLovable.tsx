'use client'

import React, { useState, useMemo } from 'react'
import { Clock, ArrowRight, Sparkles, Star, Check } from 'lucide-react'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { Service, ServiceGroup } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EnhancedServiceSelectionProps {
  serviceGroups: ServiceGroup[];
  selectedServices: Service[];
  onServiceSelect: (services: Service[]) => void;
  onNext?: () => void;
  className?: string;
  showImagesOverride?: boolean;
}

export function EnhancedServiceSelectionLovable({
  serviceGroups,
  selectedServices,
  onServiceSelect,
  onNext,
  className,
  showImagesOverride = true
}: EnhancedServiceSelectionProps) {
  const [showImages, setShowImages] = useState(showImagesOverride)
  
  console.log('EnhancedServiceSelectionLovable - serviceGroups:', serviceGroups)
  console.log('EnhancedServiceSelectionLovable - selectedServices:', selectedServices)
  console.log('EnhancedServiceSelectionLovable - serviceGroups length:', serviceGroups.length)
  if (serviceGroups.length > 0) {
    console.log('EnhancedServiceSelectionLovable - first group services:', serviceGroups[0].services)
  }

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices]
  )

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0),
    [selectedServices]
  )

  const handleServiceToggle = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id)
    
    if (isSelected) {
      onServiceSelect(selectedServices.filter(s => s.id !== service.id))
    } else {
      onServiceSelect([...selectedServices, service])
    }
  }

  const handleNext = () => {
    if (selectedServices.length > 0 && onNext) {
      onNext()
    }
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Заголовок с переключателем - улучшенный дизайн */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Выберите услуги</h2>
          <p className="text-gray-600">Выберите услуги, которые вас интересуют</p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 rounded-xl p-3">
          <span className="text-sm font-medium text-gray-700">С фото</span>
          <button
            onClick={() => setShowImages(!showImages)}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300",
              showImages ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300",
                showImages ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Группы услуг с улучшенным дизайном */}
      {serviceGroups.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Нет доступных услуг</p>
        </div>
      )}
      {serviceGroups.map((group) => (
        <Card key={group.id} className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              {group.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
              {group.services && group.services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id)
                
                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group",
                      isSelected 
                        ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg" 
                        : "hover:shadow-lg bg-white"
                    )}
                    onClick={() => handleServiceToggle(service)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        {showImages && (service.image || service.photoUrl) && (
                          <div className="relative h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={service.image || service.photoUrl}
                              alt={service.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            {isSelected && (
                              <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1">
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                              {service.name}
                            </h3>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service)}
                              className="mt-1"
                            />
                          </div>
                          
                          {service.description && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {service.duration} мин
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                {new Intl.NumberFormat('ru-RU').format(Number(service.price))} ₽
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Итого с улучшенным дизайном */}
      {selectedServices.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Star className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Выбрано услуг: {selectedServices.length}</h3>
                  <p className="text-blue-100 text-lg">
                    Общее время: {totalDuration} мин
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-4xl font-bold mb-4">
                  {new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽
                </p>
                <Button
                  onClick={handleNext}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Продолжить
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Пустое состояние */}
      {selectedServices.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Выберите услуги</h3>
          <p className="text-gray-600">Нажмите на карточки услуг, чтобы добавить их в заказ</p>
        </div>
      )}
    </div>
  )
}
