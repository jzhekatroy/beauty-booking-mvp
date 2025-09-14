import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { EnhancedServiceSelection } from '@/components/EnhancedServiceSelection'
import { EnhancedDateMasterTimeSelection } from '@/components/EnhancedDateMasterTimeSelection'
import { EnhancedClientInfoAndConfirmation } from '@/components/EnhancedClientInfoAndConfirmation'
import ActiveBookingsNotification from '@/components/ActiveBookingsNotification'
import { Service, ServiceGroup, Master, TimeSlot, BookingData, BookingStep, ClientInfo, TeamData } from '@/types/booking'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Демо данные для примера
const demoTeamData: TeamData = {
  team: {
    id: '1',
    name: 'Beauty Studio',
    slug: 'beauty-studio',
    bookingStep: 3,
    timezone: 'Europe/Moscow',
    publicServiceCardsWithPhotos: true,
    publicTheme: 'light',
    publicPageTitle: 'Запись в Beauty Studio',
    publicPageDescription: 'Профессиональные услуги красоты',
  },
  serviceGroups: [
    {
      id: '1',
      name: 'Маникюр и педикюр',
      order: 1,
      services: [
        {
          id: '1',
          name: 'Маникюр классический',
          duration: 60,
          price: 2000,
          description: 'Профессиональный уход за ногтями рук',
          image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400'
        },
        {
          id: '2',
          name: 'Педикюр spa',
          duration: 90,
          price: 3500,
          description: 'Расслабляющий уход за ногтями ног',
          image: 'https://images.unsplash.com/photo-1561579890-5c4cdbc7c2d9?w=400'
        }
      ]
    },
    {
      id: '2',
      name: 'Стрижки и укладки',
      order: 2,
      services: [
        {
          id: '3',
          name: 'Женская стрижка',
          duration: 45,
          price: 2500,
          description: 'Модная стрижка с учетом типа лица',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
        },
        {
          id: '4',
          name: 'Укладка волос',
          duration: 30,
          price: 1500,
          description: 'Профессиональная укладка',
          image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400'
        }
      ]
    }
  ],
  ungroupedServices: [],
  masters: [
    {
      id: '1',
      firstName: 'Анна',
      lastName: 'Иванова',
      specialization: 'Мастер маникюра',
      photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=200'
    },
    {
      id: '2',
      firstName: 'Мария',
      lastName: 'Петрова',
      specialization: 'Парикмахер-стилист',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
    }
  ]
}

export default function BookingWidget() {
  const params = useParams()
  const slug = params?.slug as string || 'demo'
  const telegramWebApp = useTelegramWebApp()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState<BookingStep>('select-services')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamData | null>(demoTeamData)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>(demoTeamData.serviceGroups)
  const [masters, setMasters] = useState<Master[]>(demoTeamData.masters)

  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    date: '',
    master: null,
    timeSlot: null,
    clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
    totalPrice: 0,
    totalDuration: 0,
  })

  // Состояния для активных записей
  const [activeBookings, setActiveBookings] = useState<any[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  // Умное заполнение полей из Telegram
  useEffect(() => {
    if (telegramWebApp.isAvailable && telegramWebApp.user) {
      setBookingData(prev => ({
        ...prev,
        clientInfo: {
          ...prev.clientInfo,
          firstName: telegramWebApp.user?.first_name || '',
          lastName: telegramWebApp.user?.last_name || ''
        }
      }))
    }
  }, [telegramWebApp.isAvailable, telegramWebApp.user])

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
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Запись создана!",
        description: "Ваша запись успешно подтверждена",
      })
      
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
      
    } catch (error) {
      console.error('Error confirming booking:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать запись. Попробуйте еще раз.",
        variant: "destructive"
      })
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
    if (currentStep === 'select-date-time') {
      setCurrentStep('select-services')
    } else if (currentStep === 'client-info') {
      setCurrentStep('select-date-time')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Ошибка</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Команда не найдена</h1>
          <p className="text-muted-foreground">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Заголовок */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {team.team.publicPageTitle || 'Запись на услуги'}
              </h1>
              {team.team.publicPageDescription && (
                <p className="text-muted-foreground mt-1">{team.team.publicPageDescription}</p>
              )}
            </div>
            {team.team.publicPageLogoUrl && (
              <img 
                src={team.team.publicPageLogoUrl} 
                alt="Logo" 
                className="h-12 w-auto"
              />
            )}
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Уведомление об активных записях */}
          <ActiveBookingsNotification 
            activeBookings={activeBookings}
            isLoading={isLoadingBookings}
          />

          {/* Шаги записи */}
          <div className="space-y-6">
            {currentStep === 'select-services' && (
              <EnhancedServiceSelection
                serviceGroups={serviceGroups}
                selectedServices={bookingData.services}
                onServiceSelect={handleServiceSelect}
                onNext={goToNextStep}
                showImagesOverride={team.team.publicServiceCardsWithPhotos}
              />
            )}

            {currentStep === 'select-date-time' && (
              <EnhancedDateMasterTimeSelection
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
              <EnhancedClientInfoAndConfirmation
                bookingData={bookingData}
                onClientInfoChange={handleClientInfoChange}
                onBookingConfirmed={handleBookingConfirmed}
              />
            )}
          </div>

          {/* Навигация */}
          <div className="flex justify-between">
            {currentStep !== 'select-services' && (
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
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
                className="flex items-center gap-2 ml-auto"
              >
                Далее
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}