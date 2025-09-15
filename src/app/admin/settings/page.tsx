'use client'

import { useState, useEffect } from 'react'
import BookingSettings from '@/components/BookingSettings'
import BookingLinkSettings from '@/components/BookingLinkSettings'
import TimezoneSettings from '@/components/TimezoneSettings'
import TelegramBotSettings from '@/components/TelegramBotSettings'

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
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const updateFairMasterRotation = async (fairMasterRotation: boolean) => {
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
      body: JSON.stringify({ fairMasterRotation })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ API Error:', errorData)
      throw new Error(errorData.details || errorData.error || 'Ошибка обновления настройки справедливого распределения')
    }

    const data = await response.json()
    setSettings(data.settings)
  }

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

        <div className="mt-8 space-y-6">
          {/* Ссылка для онлайн записи перенесена в «Настройки страницы записи» */}

          {/* Часовой пояс */}
          <TimezoneSettings
            currentTimezone={settings.timezone}
            onUpdate={updateTimezone}
          />

          {/* Telegram Bot */}
          <TelegramBotSettings
            currentToken={settings.telegramBotToken}
            onUpdate={updateTelegramBotToken}
          />

          {/* Справедливое распределение мастеров перенесено на страницу «Настройки страницы записи» */}

          {/* Настройки бронирования перенесены на страницу «Настройки страницы записи» */}

          {/* Основная информация */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Основная информация
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Контактное лицо
                </label>
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">
                  {settings.contactPerson}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">
                  {settings.email}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Лимит мастеров
                </label>
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">
                  {settings.masterLimit}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Интервал бронирования
                </label>
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800">
                  {settings.bookingStep} минут
                </div>
              </div>
            </div>

            {/* Блок дополнительных настроек уведомлений удален по требованиям */}

            {settings.privacyPolicyUrl && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Политика конфиденциальности
                </label>
                <a
                  href={settings.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  {settings.privacyPolicyUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}