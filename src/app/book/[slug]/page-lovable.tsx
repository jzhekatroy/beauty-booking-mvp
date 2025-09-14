'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { EnhancedServiceSelectionLovable } from '@/components/EnhancedServiceSelectionLovable'
import { EnhancedDateMasterTimeSelectionLovable } from '@/components/EnhancedDateMasterTimeSelectionLovable'
import { EnhancedClientInfoAndConfirmationLovable } from '@/components/EnhancedClientInfoAndConfirmationLovable'
import ActiveBookingsNotification from '@/components/ActiveBookingsNotification'
import { Service, ServiceGroup, Master, TimeSlot, BookingData, BookingStep, ClientInfo } from '@/types/booking'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
// import { toast } from 'sonner' // Временно отключено

interface TeamData {
  team: {
    id: string
    name: string
    logoUrl?: string
    privacyPolicyUrl?: string
    slug: string
    bookingStep: number
    timezone: string
    publicServiceCardsWithPhotos?: boolean
    publicTheme?: 'light' | 'dark'
    publicPageTitle?: string
    publicPageDescription?: string
    publicPageLogoUrl?: string
  }
  serviceGroups: any[]
  ungroupedServices: any[]
  masters: any[]
}

export default function BookingWidgetLovable() {
  const params = useParams()
  const slug = params?.slug as string
  const telegramWebApp = useTelegramWebApp()
  // toast теперь импортирован напрямую из sonner

  const [currentStep, setCurrentStep] = useState<BookingStep>('select-services')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamData | null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [isDarkLocal, setIsDarkLocal] = useState(false)
  const [showImagesByTeam, setShowImagesByTeam] = useState<boolean>(true)

  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    date: '',
    master: null,
    timeSlot: null,
    clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
    totalPrice: 0,
    totalDuration: 0,
  })

  // Состояния для инициализации клиента
  const [isLoadingClient, setIsLoadingClient] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [existingClient, setExistingClient] = useState<any>(null)
  
  // Состояния для активных записей
  const [activeBookings, setActiveBookings] = useState<any[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  // Загрузка данных
  useEffect(() => {
    loadInitialData()
  }, [slug])

  // Умное заполнение полей: БД имеет приоритет над Telegram
  useEffect(() => {
    if (!telegramWebApp.isAvailable) {
      return
    }
    
    if (!telegramWebApp.user?.id) {
      return
    }

    const loadClientData = async () => {
      try {
        // Получаем данные клиента из БД
        const teamSlug = window.location.pathname.split('/')[2]
        const response = await fetch(`/api/telegram/client?telegramId=${telegramWebApp.user?.id}&teamSlug=${teamSlug}`)

        if (response.ok) {
          const data = await response.json()

          if (data.client) {
            // Клиент найден в БД
            const dbFirstName = data.client.firstName || ''
            const dbLastName = data.client.lastName || ''

            // Всегда используем данные из БД, если они есть (даже если пустые)
            setBookingData(prev => ({
              ...prev,
              clientInfo: {
                ...prev.clientInfo,
                firstName: dbFirstName,
                lastName: dbLastName
              }
            }))

            // Если в БД пусто, заполняем Telegram данными
            if (!dbFirstName && !dbLastName) {
              setBookingData(prev => ({
                ...prev,
                clientInfo: {
                  ...prev.clientInfo,
                  firstName: telegramWebApp.user?.first_name || '',
                  lastName: telegramWebApp.user?.last_name || ''
                }
              }))
            }
          }
        }
      } catch (error) {
        console.error('Error loading client data:', error)
      }
    }

    loadClientData()
  }, [telegramWebApp.isAvailable, telegramWebApp.user?.id])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      console.log('Loading data for slug:', slug)
      
      const response = await fetch(`/api/teams/${slug}`)
      
      if (!response.ok) {
        throw new Error('Команда не найдена')
      }
      
      const data = await response.json()
      console.log('Team data loaded:', data)
      setTeam(data)
      
      // Обрабатываем данные услуг - если есть ungroupedServices, создаем группу
      let serviceGroups = data.serviceGroups || []
      if (data.ungroupedServices && data.ungroupedServices.length > 0) {
        serviceGroups = [{
          id: 'ungrouped',
          name: 'Услуги',
          services: data.ungroupedServices
        }]
      }
      setServiceGroups(serviceGroups)
      setMasters(data.masters || [])
      
      // Настройка темы
      const isDark = data.team.publicTheme === 'dark'
      setIsDarkLocal(isDark)
      
      // Настройка отображения изображений
      setShowImagesByTeam(data.team.publicServiceCardsWithPhotos ?? true)
      
    } catch (error) {
      console.error('Error loading team data:', error)
      setError(error instanceof Error ? error.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (services: Service[]) => {
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price || 0), 0)
    const totalDuration = services.reduce((sum, service) => sum + (service.duration || 0), 0)
    
    setBookingData(prev => ({
      ...prev,
      services,
      totalPrice,
      totalDuration
    }))
  }

  const handleDateTimeSelect = (date: string, master: Master | null, timeSlot: TimeSlot | null) => {
    setBookingData(prev => ({
      ...prev,
      date,
      master,
      timeSlot
    }))
  }

  const handleClientInfoChange = (clientInfo: ClientInfo) => {
    setBookingData(prev => ({
      ...prev,
      clientInfo
    }))
  }

  const handleBookingConfirmed = async () => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingData,
          teamSlug: slug
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Booking confirmed:', result)
        
        // Показываем уведомление об успехе
        alert("Запись успешно создана!")
        
        // Сбрасываем форму
        setBookingData({
          services: [],
          date: '',
          master: null,
          timeSlot: null,
          clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
          totalPrice: 0,
          totalDuration: 0,
        })
        setCurrentStep('select-services')
      } else {
        throw new Error('Ошибка создания записи')
      }
    } catch (error) {
      console.error('Error confirming booking:', error)
      alert("Ошибка создания записи. Попробуйте еще раз.")
    }
  }

  const goToNextStep = () => {
    if (currentStep === 'select-services') {
      setCurrentStep('select-date-time')
    } else if (currentStep === 'select-date-time') {
      setCurrentStep('client-info')
    }
  }

  const goToPreviousStep = () => {
    if (currentStep === 'select-services') {
      setCurrentStep('select-services')
    } else if (currentStep === 'select-date-time') {
      setCurrentStep('select-services')
    } else if (currentStep === 'client-info') {
      setCurrentStep('select-date-time')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Команда не найдена</h1>
          <p className="text-gray-600">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }

  // Компонент переключателя версий
  const VersionToggle = () => {
    const [isLovable, setIsLovable] = useState(true)
    
    const toggleVersion = () => {
      const newVersion = !isLovable
      setIsLovable(newVersion)
      const url = new URL(window.location.href)
      if (newVersion) {
        url.searchParams.set('lovable', 'true')
      } else {
        url.searchParams.delete('lovable')
      }
      window.location.href = url.toString()
    }

    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700">UI:</div>
            <button
              onClick={toggleVersion}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                !isLovable 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Оригинал
            </button>
            <button
              onClick={toggleVersion}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLovable 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Lovable
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDarkLocal ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <VersionToggle />
      {/* Заголовок с улучшенным дизайном */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {team.team.publicPageTitle || 'Запись на услуги'}
              </h1>
              {team.team.publicPageDescription && (
                <p className="text-gray-600 text-lg">{team.team.publicPageDescription}</p>
              )}
            </div>
            {team.team.publicPageLogoUrl && (
              <div className="ml-6">
                <img 
                  src={team.team.publicPageLogoUrl} 
                  alt="Logo" 
                  className="h-16 w-auto rounded-lg shadow-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Основной контент с улучшенным дизайном */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Уведомление об активных записях */}
          <ActiveBookingsNotification 
            activeBookings={activeBookings}
            isLoading={isLoadingBookings}
          />

          {/* Шаги записи с улучшенным дизайном */}
          <div className="space-y-8">
            {currentStep === 'select-services' && (
              <EnhancedServiceSelectionLovable
                serviceGroups={serviceGroups}
                selectedServices={bookingData.services}
                onServiceSelect={handleServiceSelect}
                onNext={goToNextStep}
                showImagesOverride={showImagesByTeam}
              />
            )}

            {currentStep === 'select-date-time' && (
              <EnhancedDateMasterTimeSelectionLovable
                masters={masters}
                selectedServices={bookingData.services}
                selectedDate={bookingData.date}
                selectedMaster={bookingData.master}
                selectedTimeSlot={bookingData.timeSlot}
                onDateTimeSelect={handleDateTimeSelect}
                bookingStep={team.team.bookingStep}
                salonTimezone={team.team.timezone}
                onNext={goToNextStep}
              />
            )}

            {currentStep === 'client-info' && (
              <EnhancedClientInfoAndConfirmationLovable
                bookingData={bookingData}
                onClientInfoChange={handleClientInfoChange}
                onBookingConfirmed={handleBookingConfirmed}
              />
            )}
          </div>

          {/* Навигация с улучшенным дизайном */}
          <div className="flex justify-between items-center">
            {currentStep !== 'select-services' && (
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                className="flex items-center gap-2 px-6 py-3 bg-white/80 hover:bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl font-medium transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                Назад
              </Button>
            )}
            
            {currentStep !== 'client-info' && (
              <Button
                onClick={goToNextStep}
                disabled={
                  (currentStep === 'select-services' && bookingData.services.length === 0) ||
                  (currentStep === 'select-date-time' && (!bookingData.date || !bookingData.timeSlot))
                }
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Далее
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
