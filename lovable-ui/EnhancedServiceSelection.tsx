import React, { useState, useMemo } from 'react'
import { Clock, ArrowRight, Sparkles } from 'lucide-react'
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

export function EnhancedServiceSelection({
  serviceGroups,
  selectedServices,
  onServiceSelect,
  onNext,
  className,
  showImagesOverride = true
}: EnhancedServiceSelectionProps) {
  const [showImages, setShowImages] = useState(showImagesOverride)

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
    <div className={cn("space-y-6", className)}>
      {/* Заголовок с переключателем */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Выберите услуги</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">С фото</span>
          <button
            onClick={() => setShowImages(!showImages)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              showImages ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                showImages ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Группы услуг */}
      {serviceGroups.map((group) => (
        <Card key={group.id} className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {group.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {group.services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id)
                
                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-sm"
                    )}
                    onClick={() => handleServiceToggle(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          {showImages && (service.image || service.photoUrl) && (
                            <div className="mb-3">
                              <ImageWithFallback
                                src={service.image || service.photoUrl}
                                alt={service.name}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <h3 className="font-semibold mb-1">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {service.duration} мин
                            </span>
                            <span className="font-semibold text-primary">
                              {new Intl.NumberFormat('ru-RU').format(service.price)} ₽
                            </span>
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

      {/* Итого */}
      {selectedServices.length > 0 && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Выбрано услуг: {selectedServices.length}</h3>
                <p className="text-sm opacity-90">
                  Общее время: {totalDuration} мин
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽
                </p>
                <Button
                  onClick={handleNext}
                  className="mt-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Продолжить
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}