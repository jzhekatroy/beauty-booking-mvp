'use client'

import { useState, useEffect } from 'react'
import BookingSettings from '@/components/BookingSettings'
import BookingLinkSettings from '@/components/BookingLinkSettings'
import TimezoneSettings from '@/components/TimezoneSettings'
import TelegramBotSettings from '@/components/TelegramBotSettings'
import LogoUpload from '@/components/LogoUpload'

interface TeamSettings {
  bookingStep: number
  masterLimit: number
  webhooksEnabled: boolean
  fairMasterRotation: boolean
  privacyPolicyUrl?: string
  contactPerson: string
  email: string
  logoUrl?: string
  slug: string
  bookingSlug: string
  timezone: string
  telegramBotToken: string | null
  // доп. поля страницы записи
  publicServiceCardsWithPhotos?: boolean
  publicTheme?: 'light' | 'dark'
  publicPageTitle?: string
  publicPageDescription?: string
  publicPageLogoUrl?: string
  dailyBookingLimit?: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // раскрывающиеся блоки
  const [openMain, setOpenMain] = useState(false)
  const [openTelegram, setOpenTelegram] = useState(false)
  const [openTimezone, setOpenTimezone] = useState(false)
  const [openBookingPage, setOpenBookingPage] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      const response = await fetch('/api/team/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки настроек')
      }

      const data = await response.json()
      setSettings(data.settings)
    } catch (err: any) {
      console.error('Ошибка загрузки настроек:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateBookingSlug = async (bookingSlug: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Токен авторизации не найден')
    }

    const response = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ bookingSlug })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Ошибка обновления ссылки')
    }

    const data = await response.json()
    setSettings(data.settings)
  }

  const updateTimezone = async (timezone: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Токен авторизации не найден')
    }

    const response = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ timezone })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Ошибка обновления часового пояса')
    }

    const data = await response.json()
    setSettings(data.settings)
  }

  const updateTelegramBotToken = async (telegramBotToken: string | null) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Токен авторизации не найден')
    }

    const response = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ telegramBotToken })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Ошибка обновления токена Telegram бота')
    }

    const data = await response.json()
    setSettings(data.settings)
  }

  const updatePublicUx = async (patch: Partial<Pick<TeamSettings,
    'publicServiceCardsWithPhotos' | 'publicTheme' | 'publicPageTitle' | 'publicPageDescription' | 'publicPageLogoUrl' | 'dailyBookingLimit'>>) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Токен авторизации не найден')
    const response = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(patch)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Ошибка обновления')
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  // fairMasterRotation всегда включен — UI управления удалён

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загружаем настройки...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Ошибка загрузки настроек
            </h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadSettings}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Настройки салона
            </h2>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Основная информация */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button type="button" onClick={()=>setOpenMain(!openMain)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold text-gray-900">Основная информация</span>
              <span className="text-gray-500 text-sm">{openMain ? 'Свернуть' : 'Развернуть'}</span>
            </button>
            {openMain && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Контактное лицо</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">{settings.contactPerson}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">{settings.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Лимит мастеров</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">{settings.masterLimit}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Интервал бронирования</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">{settings.bookingStep} минут</div>
                  </div>
                </div>
                {settings.privacyPolicyUrl && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Политика конфиденциальности</label>
                    <a href={settings.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm underline">
                      {settings.privacyPolicyUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Telegram Bot */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button type="button" onClick={()=>setOpenTelegram(!openTelegram)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold text-gray-900">Telegram Bot</span>
              <span className="text-gray-500 text-sm">{openTelegram ? 'Свернуть' : 'Развернуть'}</span>
            </button>
            {openTelegram && (
              <div className="px-4 pb-4">
                <TelegramBotSettings currentToken={settings.telegramBotToken} onUpdate={updateTelegramBotToken} />
              </div>
            )}
          </div>

          {/* Часовой пояс салона */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button type="button" onClick={()=>setOpenTimezone(!openTimezone)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold text-gray-900">Часовой пояс салона</span>
              <span className="text-gray-500 text-sm">{openTimezone ? 'Свернуть' : 'Развернуть'}</span>
            </button>
            {openTimezone && (
              <div className="px-4 pb-4">
                <TimezoneSettings currentTimezone={settings.timezone} onUpdate={updateTimezone} />
              </div>
            )}
          </div>

          {/* Настройки страницы записи */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button type="button" onClick={()=>setOpenBookingPage(!openBookingPage)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold text-gray-900">Настройки страницы записи</span>
              <span className="text-gray-500 text-sm">{openBookingPage ? 'Свернуть' : 'Развернуть'}</span>
            </button>
            {openBookingPage && (
              <div className="px-4 pb-4 space-y-6">
                {/* Ссылка для онлайн-записи */}
                <BookingLinkSettings currentSlug={settings.slug} currentBookingSlug={settings.bookingSlug} onUpdate={updateBookingSlug} />
                {/* Настройки бронирования */}
                <BookingSettings />

                {/* Блок "Справедливое распределение мастеров" удалён, теперь всегда включён */}
                {/* Блок "Внешний вид публичной страницы" удалён */}

                {/* Брендинг салона */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Брендинг салона</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Название салона</label>
                      <input type="text" value={settings.publicPageTitle || ''} onChange={(e) => updatePublicUx({ publicPageTitle: e.target.value || undefined })} placeholder="Например: BEAUTY SALON" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <p className="text-sm text-gray-600 mt-1">Отображается на публичной странице записи</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Описание салона</label>
                      <textarea value={settings.publicPageDescription || ''} onChange={(e) => updatePublicUx({ publicPageDescription: e.target.value || undefined })} placeholder="Добро пожаловать в наш салон красоты! Мы предлагаем профессиональные услуги..." rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <p className="text-sm text-gray-600 mt-1">Краткое описание салона для клиентов</p>
                    </div>
                    <LogoUpload currentLogoUrl={settings.publicPageLogoUrl} onLogoChange={(url) => updatePublicUx({ publicPageLogoUrl: url })} onLogoRemove={() => updatePublicUx({ publicPageLogoUrl: undefined })} label="Логотип салона" />
                  </div>
                </div>

                {/* Настройки клиентов */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки клиентов</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Лимит записей в день на клиента</label>
                      <div className="mb-3">
                        <label className="flex items-center">
                          <input type="checkbox" checked={(Number(settings.dailyBookingLimit) || 0) === 0} onChange={(e) => updatePublicUx({ dailyBookingLimit: e.target.checked ? 0 : 3 })} className="mr-2" />
                          <span className="text-sm font-medium text-gray-700">Без ограничений</span>
                        </label>
                        <p className="text-sm text-gray-600 ml-6">Клиенты могут создавать неограниченное количество записей в день</p>
                      </div>
                      {(Number(settings.dailyBookingLimit) || 0) !== 0 && (
                        <div>
                          <input type="number" min="1" max="100" value={Number(settings.dailyBookingLimit) || 3} onChange={(e) => updatePublicUx({ dailyBookingLimit: parseInt(e.target.value) || 3 })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                          <p className="text-sm text-gray-600 mt-1">Максимальное количество записей за день (1-100)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}