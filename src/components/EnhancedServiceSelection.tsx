'use client'

import React, { useState, useMemo } from 'react'
import { Search, Clock, DollarSign, Check, X, ArrowRight } from 'lucide-react'
import { Service, ServiceGroup } from '@/types/booking'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EnhancedServiceSelectionProps {
  serviceGroups: ServiceGroup[];
  selectedServices: Service[];
  onServiceSelect: (services: Service[]) => void;
  onNext?: () => void;
  className?: string;
}

// Упрощённый UI: без переключателя вида и фильтра по цене

export function EnhancedServiceSelection({
  serviceGroups,
  selectedServices,
  onServiceSelect,
  onNext,
  className = ''
}: EnhancedServiceSelectionProps) {
  console.log('🔍 EnhancedServiceSelection: render with props:', {
    serviceGroups: serviceGroups?.length,
    selectedServices: selectedServices?.length,
    onNext: !!onNext
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  // Переключатели вида и фильтр цены убраны

  // Объединяем все услуги из групп
  const allServices = useMemo(() => {
    if (!serviceGroups || !Array.isArray(serviceGroups)) {
      return [];
    }
    return serviceGroups.flatMap(group => {
      if (!group.services || !Array.isArray(group.services)) {
        return [];
      }
      return group.services.map(service => ({
        ...service,
        description: service.description || '',
        image: service.photoUrl || service.image
      }));
    });
  }, [serviceGroups]);

  // Фильтрация услуг
  const filteredServices = useMemo(() => {
    let filtered = allServices;

    // Поиск по названию и описанию
    if (searchQuery) {
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [allServices, searchQuery]);

  // Вычисления для выбранных услуг
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.price, 0),
    [selectedServices]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.duration, 0),
    [selectedServices]
  );

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    console.log('🔍 toggleService:', { service: service.name, isSelected });
    
    if (isSelected) {
      onServiceSelect(selectedServices.filter(s => s.id !== service.id));
    } else {
      onServiceSelect([...selectedServices, service]);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value || 0)
    } catch {
      return `${Math.round(value || 0).toLocaleString('ru-RU')} ₽`
    }
  }

  const getHueFromString = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }

  const getDisplayImageUrl = (url?: string | null) => {
     if (!url) return null
     try {
       const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
       if (typeof window !== 'undefined') {
         const cur = window.location
         // Приводим localhost/127.0.0.1 к относительному
         if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          const path = u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`
          return `${cur.protocol}//${cur.host}${path}`
         }
         // Избегаем mixed-content: если страница https, поднимаем до https для того же хоста
         if (cur.protocol === 'https:' && u.protocol === 'http:' && u.hostname === cur.hostname) {
           u.protocol = 'https:'
           return u.href
         }
         // Если относительный путь или тот же хост — возвращаем абсолютный URL
         if (u.hostname === cur.hostname) {
           return `${cur.protocol}//${cur.host}${u.pathname}`
         }
       }
       return u.href
     } catch {
      if (typeof window !== 'undefined') {
        const cur = window.location
        const path = url.startsWith('/') ? url : `/${url}`
        return `${cur.protocol}//${cur.host}${path}`
      }
      return url
    }
  }

  const ServiceCard = ({ service }: { service: Service }) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    const imageUrl = getDisplayImageUrl(service.image || service.photoUrl);
 
    const hue = getHueFromString(service.id || service.name || 'service')
    const fallbackGradient = `linear-gradient(135deg, hsl(${hue} 70% 70%), hsl(${(hue + 30) % 360} 70% 55%))`

    return (
      <div
        onClick={() => toggleService(service)}
        className={`relative cursor-pointer transition-all duration-200 rounded-2xl border overflow-hidden ${
          isSelected
            ? 'border-[#f59e0b] shadow-[0_6px_16px_rgba(245,158,11,0.35)]'
            : 'border-gray-200 hover:border-[#f59e0b] hover:shadow-[0_6px_16px_rgba(245,158,11,0.25)] active:border-[#ea580c] active:shadow-[0_8px_20px_rgba(234,88,12,0.35)]'
        }`}
      >
        {/* Фон: фото или тёплый градиент */}
        <div className="relative w-full">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={service.name} className="absolute inset-0 w-full h-full object-cover block" loading="lazy" />
            ) : (
              <div className="absolute inset-0 w-full h-full" style={{ background: fallbackGradient }} />
            )}
          </div>
          {/* Верхние чипсы: длительность и цена */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs bg-white/90 text-gray-800 shadow flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatDuration(service.duration)}
            </span>
          </div>
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs bg-white/90 text-[#b45309] font-semibold shadow">
            {formatCurrency(Number(service.price))}
          </div>
          {/* Индикатор выбранного */}
          <div className={`absolute bottom-2 right-2 rounded-full p-1.5 shadow ${isSelected ? 'bg-[#f59e0b] text-white' : 'bg-white/90 text-gray-600'}`}>
            <Check className="w-4 h-4" />
          </div>
          {/* Низ: светлый полупрозрачный стикер с названием и описанием (адаптивная ширина) */}
          <div className="absolute inset-x-2 bottom-2">
            <div className="rounded-lg bg-white/60 backdrop-blur px-3 py-2 shadow-sm border border-gray-100 w-fit max-w-[80%]">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">{service.name}</h3>
              {service.description && (
                <p className="mt-0.5 text-xs sm:text-[13px] leading-snug text-gray-600 line-clamp-2">{service.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Поиск */}
      <div className="space-y-4">
        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск услуг..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00acf4] focus:border-transparent transition-all"
          />
        </div>

        {/* Фильтры и переключатель вида удалены */}
      </div>

      {/* Услуги — адаптивная сетка */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {filteredServices.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Услуги не найдены</div>
          <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {/* Удалён fallback-список по требованию */}

      {/* Итоговая информация и кнопки */}
      {selectedServices.length > 0 && (
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-4 border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-gray-600">
                Выбрано услуг: {selectedServices.length}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {formatDuration(totalDuration)}
                </span>
                <span className="font-semibold text-[#f59e0b]">
                  {formatCurrency(Number(totalPrice))}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onServiceSelect([])}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Очистить выбор"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Кнопка "Далее" */}
          {onNext && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  console.log('🔍 EnhancedServiceSelection: onNext clicked');
                  onNext();
                }}
                className="bg-[#f59e0b] hover:bg-[#ea580c] text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>Продолжить</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
