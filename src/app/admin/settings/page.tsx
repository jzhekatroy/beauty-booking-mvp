'use client'

import { useState, useEffect } from 'react'
import BookingSettings from '@/components/BookingSettings'
import BookingLinkSettings from '@/components/BookingLinkSettings'
import TimezoneSettings from '@/components/TimezoneSettings'
import TelegramBotSettings from '@/components/TelegramBotSettings'
import LogoUpload from '@/components/LogoUpload'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // раскрывающиеся блоки
  const [openMain, setOpenMain] = useState(false)
  const [openTelegram, setOpenTelegram] = useState(false)
  const [openTimezone, setOpenTimezone] = useState(false)
  const [openBookingPage, setOpenBookingPage] = useState(false)
  // email verification UI
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [meEmail, setMeEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)
  // change email UI
  const [changeOpen, setChangeOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [changeSent, setChangeSent] = useState(false)
  const [changeCode, setChangeCode] = useState('')
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeMsg, setChangeMsg] = useState<string | null>(null)

  const ChangePasswordForm = () => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')
    const [cpLoading, setCpLoading] = useState(false)
    const [cpMsg, setCpMsg] = useState<string | null>(null)
    const disabled = cpLoading || !currentPassword || newPassword.length < 6 || newPassword !== repeatPassword
    return (
      <div className="space-y-2">
        <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Текущий пароль" className="w-full px-3 py-2 border rounded text-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="Новый пароль (мин. 6)" className="w-full px-3 py-2 border rounded text-sm" />
          <input type="password" value={repeatPassword} onChange={(e)=>setRepeatPassword(e.target.value)} placeholder="Подтверждение пароля" className="w-full px-3 py-2 border rounded text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={async ()=>{
              setCpLoading(true); setCpMsg(null)
              try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/auth/change-password', {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword, newPassword })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Ошибка смены пароля')
                setCpMsg('Пароль изменён')
                setCurrentPassword(''); setNewPassword(''); setRepeatPassword('')
              } catch (e:any) {
                setCpMsg(e?.message || 'Ошибка смены пароля')
              } finally { setCpLoading(false) }
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >{cpLoading ? 'Сохраняем…' : 'Сменить пароль'}</button>
          {cpMsg && <span className="text-xs text-gray-600">{cpMsg}</span>}
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadSettings()
    loadMe()
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

  const loadMe = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setEmailVerified(Boolean(data.emailVerified))
        setMeEmail(data.email || null)
      }
    } catch {}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email для входа</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-800 flex items-center justify-between">
                      <span>{meEmail || settings.email}</span>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${emailVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {emailVerified ? 'Подтверждён' : 'Не подтверждён'}
                        </span>
                        {!emailVerified && (
                        <button
                          type="button"
                          className="px-3 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
                          disabled={resendLoading}
                          onClick={async ()=>{
                            setResendLoading(true); setResendMsg(null)
                            try {
                              const res = await fetch('/api/auth/resend-email-code', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: meEmail || settings.email })
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data?.error || 'Ошибка отправки кода')
                              setResendMsg('Код отправлен на почту')
                            } catch (e:any) {
                              setResendMsg(e?.message || 'Ошибка отправки кода')
                            } finally {
                              setResendLoading(false)
                            }
                          }}
                        >{resendLoading ? 'Отправляем…' : 'Отправить код'}</button>
                        )}
                      </div>
                    </div>
                    {resendMsg && (
                      <div className="mt-1 text-xs text-gray-600">{resendMsg}</div>
                    )}
                    {!emailVerified && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={code}
                          onChange={(e)=>setCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="Введите 6-значный код"
                          className="px-3 py-2 border rounded text-sm w-44 tracking-widest"
                        />
                        <button
                          type="button"
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                          disabled={verifyLoading || code.length!==6}
                          onClick={async ()=>{
                            setVerifyLoading(true); setVerifyMsg(null)
                            try {
                              const res = await fetch('/api/auth/verify-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: meEmail || settings.email, code })
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data?.error || 'Неверный код')
                              setVerifyMsg('Email подтверждён')
                              setEmailVerified(true)
                              setCode('')
                            } catch (e:any) {
                              setVerifyMsg(e?.message || 'Ошибка подтверждения')
                            } finally {
                              setVerifyLoading(false)
                            }
                          }}
                        >{verifyLoading ? 'Проверяем…' : 'Подтвердить'}</button>
                      </div>
                    )}
                    {verifyMsg && (
                      <div className="mt-1 text-xs text-gray-600">{verifyMsg}</div>
                    )}
                    {/* Change login email */}
                    <div className="mt-4">
                      <button
                        type="button"
                        className="text-xs underline text-blue-600"
                        onClick={()=>{ setChangeOpen(!changeOpen); setChangeMsg(null) }}
                      >{changeOpen ? 'Скрыть смену e‑mail' : 'Сменить e‑mail для входа'}</button>
                      {changeOpen && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e)=>setNewEmail(e.target.value)}
                            placeholder="new@email.com"
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                          {!changeSent ? (
                            <button
                              type="button"
                              disabled={changeLoading || !newEmail}
                              onClick={async ()=>{
                                setChangeLoading(true); setChangeMsg(null)
                                try {
                                  const token = localStorage.getItem('token')
                                  const res = await fetch('/api/auth/change-email/request', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ newEmail })
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data?.error || 'Ошибка отправки кода')
                                  setChangeSent(true)
                                  setChangeMsg('Код отправлен на новую почту')
                                } catch (e:any) {
                                  setChangeMsg(e?.message || 'Ошибка отправки кода')
                                } finally { setChangeLoading(false) }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                            >{changeLoading ? 'Отправляем…' : 'Отправить код'}</button>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={changeCode}
                                onChange={(e)=>setChangeCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                                placeholder="Код из письма (6 цифр)"
                                className="w-full px-3 py-2 border rounded text-sm tracking-widest"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={changeLoading || changeCode.length!==6}
                                  onClick={async ()=>{
                                    setChangeLoading(true); setChangeMsg(null)
                                    try {
                                      const token = localStorage.getItem('token')
                                      const res = await fetch('/api/auth/change-email/confirm', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ newEmail, code: changeCode })
                                      })
                                      const data = await res.json()
                                      if (!res.ok) throw new Error(data?.error || 'Ошибка подтверждения')
                                      setChangeMsg('Email изменён и подтверждён')
                                      setMeEmail(newEmail)
                                      setEmailVerified(true)
                                    } catch (e:any) {
                                      setChangeMsg(e?.message || 'Ошибка подтверждения')
                                    } finally { setChangeLoading(false) }
                                  }}
                                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                                >Подтвердить</button>
                                <button type="button" onClick={()=>{ setChangeSent(false); setChangeCode(''); setChangeMsg(null) }} className="px-3 py-2 border rounded text-sm">Отправить код ещё раз</button>
                              </div>
                            </div>
                          )}
                          {changeMsg && <div className="text-xs text-gray-600">{changeMsg}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Change password */}
                  <div className="md:col-span-2 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Смена пароля</h4>
                    <ChangePasswordForm />
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
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => updatePublicUx({
                          publicPageTitle: settings.publicPageTitle,
                          publicPageDescription: settings.publicPageDescription,
                          publicPageLogoUrl: settings.publicPageLogoUrl,
                        })}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        Сохранить брендинг
                      </button>
                    </div>
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