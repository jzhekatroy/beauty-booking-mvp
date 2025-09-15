'use client'

import { useEffect, useState } from 'react'
import BookingLinkSettings from '@/components/BookingLinkSettings'
import BookingSettings from '@/components/BookingSettings'
import LogoUpload from '@/components/LogoUpload'

interface TeamSettings {
  slug: string
  bookingSlug: string
  bookingStep: number
  fairMasterRotation?: boolean
  ungroupedGroupName?: string
  publicServiceCardsWithPhotos?: boolean
  publicTheme?: 'light' | 'dark'
  publicPageTitle?: string
  publicPageDescription?: string
  publicPageLogoUrl?: string
  dailyBookingLimit?: number
  notificationsEnabled?: boolean
  reminderHours?: number
}

export default function BookingPageSettings() {
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/team/settings', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки настроек')
        setSettings(data.settings)
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateBookingSlug = async (bookingSlug: string) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingSlug })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Ошибка обновления ссылки')
    setSettings((prev) => prev ? { ...prev, bookingSlug: data.settings.bookingSlug } : prev)
  }

  // Редактирование названия раздела без группы перенесено в /admin/services

  const updateFairMasterRotation = async (fairMasterRotation: boolean) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fairMasterRotation })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Ошибка обновления настройки распределения')
    setSettings((prev) => prev ? { ...prev, fairMasterRotation: data.settings.fairMasterRotation } : prev)
  }

  const updatePublicUx = async (patch: Partial<Pick<TeamSettings, 'publicServiceCardsWithPhotos' | 'publicTheme' | 'publicPageTitle' | 'publicPageDescription' | 'publicPageLogoUrl' | 'dailyBookingLimit' | 'notificationsEnabled' | 'reminderHours'>>) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Ошибка обновления')
    
    setSettings((prev) => {
      if (!prev) return prev
      return { ...prev, ...patch }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загружаем…</span>
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
            <div className="text-red-700">{error || 'Ошибка'}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Настройки страницы записи</h1>

        <div className="space-y-6">
          {/* Название раздела без группы редактируется на странице услуг */}
          {/* Ссылка для онлайн записи */}
          <BookingLinkSettings
            currentSlug={settings.slug}
            currentBookingSlug={settings.bookingSlug}
            onUpdate={updateBookingSlug}
          />

          {/* Настройки бронирования */}
          <BookingSettings />

          {/* Справедливое распределение мастеров */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Справедливое распределение мастеров</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Включить справедливое распределение</label>
                  <p className="text-sm text-gray-600">Мастера будут появляться на разных позициях по очереди, выравнивая количество показов.</p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      (settings.fairMasterRotation ?? false) ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => updateFairMasterRotation(!(settings.fairMasterRotation ?? false))}
                    aria-pressed={settings.fairMasterRotation ?? false}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings.fairMasterRotation ?? false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              {(settings.fairMasterRotation ?? false) && (
                <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Как это работает:</strong> система выравнивает позиции показа мастеров (1-я, 2-я, 3-я и т.д.),
                    чтобы каждый мастер получал одинаковое количество показов на каждой позиции.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Публичная страница записи: внешний вид */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Внешний вид публичной страницы</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Карточки услуг</label>
                  <p className="text-sm text-gray-600">Отображать карточки услуг с фотографиями или компактным списком.</p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      (settings.publicServiceCardsWithPhotos ?? true) ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => updatePublicUx({ publicServiceCardsWithPhotos: !(settings.publicServiceCardsWithPhotos ?? true) })}
                    aria-pressed={settings.publicServiceCardsWithPhotos ?? true}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings.publicServiceCardsWithPhotos ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
                  <p className="text-sm text-gray-600">Светлая или тёмная тема публичной страницы записи.</p>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm border rounded ${settings.publicTheme === 'light' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => updatePublicUx({ publicTheme: 'light' })}
                  >
                    Светлая
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm border rounded ${settings.publicTheme === 'dark' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => updatePublicUx({ publicTheme: 'dark' })}
                  >
                    Тёмная
                  </button>
                </div>
              </div>
              
              {/* Кнопка сохранения для UX настроек */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    // Сохраняем все UX настройки
                    updatePublicUx({
                      publicServiceCardsWithPhotos: settings.publicServiceCardsWithPhotos,
                      publicTheme: settings.publicTheme
                    })
                  }}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Сохранить настройки внешнего вида
                </button>
              </div>
            </div>
          </div>

          {/* Брендинг салона */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Брендинг салона</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Название салона</label>
                <input
                  type="text"
                  value={settings.publicPageTitle || ''}
                  onChange={(e) => updatePublicUx({ publicPageTitle: e.target.value || undefined })}
                  placeholder="Например: BEAUTY SALON"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-600 mt-1">Отображается на публичной странице записи</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Описание салона</label>
                <textarea
                  value={settings.publicPageDescription || ''}
                  onChange={(e) => updatePublicUx({ publicPageDescription: e.target.value || undefined })}
                  placeholder="Добро пожаловать в наш салон красоты! Мы предлагаем профессиональные услуги..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-600 mt-1">Краткое описание салона для клиентов</p>
              </div>

              <LogoUpload
                currentLogoUrl={settings.publicPageLogoUrl}
                onLogoChange={(url) => updatePublicUx({ publicPageLogoUrl: url })}
                onLogoRemove={() => updatePublicUx({ publicPageLogoUrl: undefined })}
                label="Логотип салона"
              />
              
              {/* Кнопка сохранения */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    // Сохраняем все настройки брендинга
                    updatePublicUx({
                      publicPageTitle: settings.publicPageTitle,
                      publicPageDescription: settings.publicPageDescription,
                      publicPageLogoUrl: settings.publicPageLogoUrl
                    })
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Сохранить настройки брендинга
                </button>
              </div>
            </div>
          </div>

          {/* Настройки клиентов */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки клиентов</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Лимит записей в день на клиента</label>
                
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(settings.dailyBookingLimit || 0) === 0}
                      onChange={(e) => updatePublicUx({ dailyBookingLimit: e.target.checked ? 0 : 3 })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Без ограничений</span>
                  </label>
                  <p className="text-sm text-gray-600 ml-6">Клиенты могут создавать неограниченное количество записей в день</p>
                </div>

                {settings.dailyBookingLimit !== 0 && (
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.dailyBookingLimit || 3}
                      onChange={(e) => updatePublicUx({ dailyBookingLimit: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-600 mt-1">Максимальное количество записей, которое может сделать один клиент за день (1-100)</p>
                  </div>
                )}
              </div>

              {/* Блок включения уведомлений и напоминаний удален по требованиям */}

              {/* Кнопка сохранения */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    // Сохраняем все настройки клиентов
                    updatePublicUx({
                      dailyBookingLimit: settings.dailyBookingLimit,
                    })
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Сохранить настройки клиентов
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


