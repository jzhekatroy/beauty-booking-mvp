'use client'

import { useEffect, useRef, useState } from 'react'

type Reminder = { hoursBefore: number; templateId?: string | null }
type Template = { id: string; key: string; name: string; content: string; isHtml: boolean }

export default function AdminNotificationsRoot() {
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openBroadcast, setOpenBroadcast] = useState(false)
  const [openPostBooking, setOpenPostBooking] = useState(false)
  const [openReminders, setOpenReminders] = useState(false)
  const [openCancel, setOpenCancel] = useState(false)

  // Policy
  const [enablePostBooking, setEnablePostBooking] = useState<boolean>(false)
  const [delayAfterBookingSec, setDelayAfterBookingSec] = useState<number>(60)
  const [remindersHours, setRemindersHours] = useState<number[]>([])
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true)
  const [cancelEnabled, setCancelEnabled] = useState<boolean>(true)
  const [sendOnlyDaytime, setSendOnlyDaytime] = useState<boolean>(true)
  const [daytimeFrom, setDaytimeFrom] = useState<string>('09:00')
  const [daytimeTo, setDaytimeTo] = useState<string>('22:00')
  const [reminderMessage, setReminderMessage] = useState<string>('')
  const [cancelMessage, setCancelMessage] = useState<string>('')
  const [loadingPolicy, setLoadingPolicy] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policyError, setPolicyError] = useState<string>('')

  // Templates removed
  const [postBookingMessage, setPostBookingMessage] = useState<string>('')

  // Broadcast (заглушка UI)
  const [broadcastText, setBroadcastText] = useState<string>('')
  const [broadcastPlannedAt, setBroadcastPlannedAt] = useState<string>('')
  const [broadcastMsg, setBroadcastMsg] = useState<string>('')
  const [broadcastErr, setBroadcastErr] = useState<string>('')
  const [broadcastOk, setBroadcastOk] = useState<string>('')
  const [creatingBroadcast, setCreatingBroadcast] = useState(false)
  // Тест-отправка по Telegram никнейму
  const [testUsername, setTestUsername] = useState<string>('')
  // Фото для рассылки (опционально)
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const [photoUploading, setPhotoUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [helpOpen, setHelpOpen] = useState<boolean>(false)
  const [helpContext, setHelpContext] = useState<'notifications' | 'broadcast' | null>(null)

  const handlePhotoInputChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    setBroadcastErr('')
    setBroadcastOk('')
    try {
      const form = new FormData()
      form.append('file', file)
      const resp = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await safeJson(resp)
      if (!resp.ok) throw new Error((data as any).error || 'Не удалось загрузить файл')
      const url = (data as any).url as string
      setPhotoUrl(url)
      setBroadcastOk('Фото загружено')
    } catch (e) {
      setBroadcastErr(e instanceof Error ? e.message : 'Ошибка загрузки фото')
    } finally {
      setPhotoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const addReminder = () => {
    if (remindersHours.length >= 3) return
    const defaults = [1, 12, 24]
    const next = defaults[remindersHours.length] ?? 24
    setRemindersHours([...remindersHours, next])
  }
  const removeReminder = (idx: number) => {
    setRemindersHours(remindersHours.filter((_, i) => i !== idx))
  }

  function getToken(): string | null {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  }

  async function safeJson(resp: Response) {
    try {
      const text = await resp.text()
      if (!text) return {}
      return JSON.parse(text)
    } catch {
      return {}
    }
  }

  const loadPolicy = async () => {
    setLoadingPolicy(true)
    setPolicyError('')
    try {
      const token = getToken()
      const resp = await fetch('/api/admin/notifications/policy', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await safeJson(resp)
      if (!resp.ok) throw new Error((data as any).error || 'Не удалось загрузить политику')
      const policy = (data as any).policy as { delayAfterBookingSeconds: number; reminders: Reminder[]; postBookingEnabled?: boolean; postBookingMessage?: string; sendOnlyDaytime?: boolean; daytimeFrom?: string; daytimeTo?: string; reminderMessage?: string; remindersEnabled?: boolean; cancelBySalonEnabled?: boolean; cancelBySalonMessage?: string }
      setDelayAfterBookingSec(Number(policy?.delayAfterBookingSeconds ?? 60))
      setEnablePostBooking(Boolean(policy?.postBookingEnabled ?? false))
      setRemindersHours(Array.isArray(policy?.reminders) ? policy.reminders.map(r => Number(r.hoursBefore ?? 24)) : [])
      setPostBookingMessage(String(policy?.postBookingMessage || ''))
      setSendOnlyDaytime(Boolean(policy?.sendOnlyDaytime ?? true))
      setDaytimeFrom(String(policy?.daytimeFrom || '09:00'))
      setDaytimeTo(String(policy?.daytimeTo || '22:00'))
      setReminderMessage(String(policy?.reminderMessage || ''))
      setRemindersEnabled(Boolean(policy?.remindersEnabled ?? true))
      setCancelEnabled(Boolean(policy?.cancelBySalonEnabled ?? true))
      setCancelMessage(String(policy?.cancelBySalonMessage || ''))
    } catch (e) {
      setPolicyError(e instanceof Error ? e.message : 'Ошибка загрузки политики')
    } finally {
      setLoadingPolicy(false)
    }
  }

  const savePolicy = async () => {
    setSavingPolicy(true)
    setPolicyError('')
    try {
      const token = getToken()
      const body = {
        delayAfterBookingSeconds: Number.isFinite(delayAfterBookingSec) ? Math.max(0, Math.floor(delayAfterBookingSec)) : 60,
        reminders: remindersHours.slice(0, 3).map(h => ({ hoursBefore: Math.min(72, Math.max(1, Math.floor(h))) })),
        postBookingEnabled: !!enablePostBooking,
        postBookingMessage: postBookingMessage,
        sendOnlyDaytime,
        daytimeFrom,
        daytimeTo,
        reminderMessage,
        remindersEnabled,
        cancelBySalonEnabled: !!cancelEnabled,
        cancelBySalonMessage: cancelMessage,
      }
      const resp = await fetch('/api/admin/notifications/policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await safeJson(resp)
      if (!resp.ok) throw new Error((data as any).error || 'Не удалось сохранить политику')
    } catch (e) {
      setPolicyError(e instanceof Error ? e.message : 'Ошибка сохранения политики')
    } finally {
      setSavingPolicy(false)
    }
  }

  // templates logic removed

  useEffect(() => {
    // Автозагрузка при первом раскрытии секции
    if (openNotifications) {
      if (!loadingPolicy) loadPolicy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNotifications])

  // Клиенты не загружаем — тест идёт по введённому никнейму

  // Сохраняем введённый ник в localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notifications_test_username')
      if (saved) setTestUsername(saved)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('notifications_test_username', testUsername)
    } catch {}
  }, [testUsername])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Уведомления и рассылки</h1>
        

        {/* Блок: Уведомления */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            type="button"
            onClick={() => setOpenNotifications(!openNotifications)}
            className="w-full flex items-center justify-between px-6 py-4"
          >
            <span className="text-lg font-semibold text-gray-900">Уведомления</span>
            <span className="text-gray-500 text-sm">{openNotifications ? 'Свернуть' : 'Развернуть'}</span>
          </button>
          {openNotifications && (
            <div className="px-6 pb-6">

              <div className="space-y-6">
                {/* Отбивка после бронирования */}
                <div className="border rounded-md">
                  <button
                    type="button"
                    onClick={() => setOpenPostBooking(!openPostBooking)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="font-medium">Отбивка после оформления бронирования</div>
                    <span className="text-gray-500 text-sm">{openPostBooking ? 'Свернуть' : 'Развернуть'}</span>
                  </button>
                  {openPostBooking && (
                    <div className="px-4 pb-4">
                      <div className="mb-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={enablePostBooking} onChange={(e) => setEnablePostBooking(e.target.checked)} />
                          Включено
                        </label>
                      </div>
                      {enablePostBooking && (
                        <>
                          <label className="block text-sm text-gray-700 mb-1">Задержка отправки (секунды)</label>
                          <input
                            type="number"
                            min={0}
                            value={delayAfterBookingSec}
                            onChange={(e) => setDelayAfterBookingSec(parseInt(e.target.value || '0', 10))}
                            className="w-full max-w-xs border rounded px-3 py-2"
                          />
                          <div className="mt-3 text-sm text-gray-600">
                            Пример сообщения:
                            <div className="bg-gray-50 border rounded p-3 mt-1 whitespace-pre-line">
                              {`${'{client_name}'}, спасибо за запись в ${'{team_name}'} ✨\n\nМы получили вашу заявку на ${'{service_name}'} к мастеру ${'{master_name}'} — держим для вас время ✅\nДата и время: ${'{booking_date}'} в ${'{booking_time}'} (длительность ~${'{service_duration_min}'} мин) ⏱️\nЕсли планы изменятся — вы можете отменить запись по ссылке: ссылка на отмену ❌\n\nХорошего дня!`}
                            </div>
                            <div className="mt-3">
                              <label className="block text-sm text-gray-700 mb-1">Текст сообщения отбивки
                                <button
                                  type="button"
                                  onClick={() => { setHelpContext('notifications'); setHelpOpen(true) }}
                                  className="ml-2 text-xs text-blue-600 hover:underline"
                                >
                                  Справка по переменным
                                </button>
                              </label>
                              <textarea
                                value={postBookingMessage}
                                onChange={(e) => setPostBookingMessage(e.target.value)}
                                rows={5}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Введите текст, можно использовать переменные: {client_name}, {team_name}, {service_name}, {master_name}, {booking_date}, {booking_time}, {service_duration_min}"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Напоминания перед визитом */}
                <div className="border rounded-md">
                  <button
                    type="button"
                    onClick={() => setOpenReminders(!openReminders)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="font-medium">Напоминания перед визитом</div>
                    <span className="text-gray-500 text-sm">{openReminders ? 'Свернуть' : 'Развернуть'}</span>
                  </button>
                  {openReminders && (
                    <div className="px-4 pb-4">
                      <div className="mb-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={remindersEnabled} onChange={(e)=>setRemindersEnabled(e.target.checked)} />
                          Включено
                        </label>
                      </div>
                      {!remindersEnabled ? null : (
                        <>
                          <label className="inline-flex items-center gap-2 text-sm mb-3">
                            <input type="checkbox" checked={sendOnlyDaytime} onChange={(e)=>setSendOnlyDaytime(e.target.checked)} />
                            Отправлять уведомления только днём
                          </label>
                          {sendOnlyDaytime && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm text-gray-700">Период:</span>
                              <input type="time" value={daytimeFrom} onChange={(e)=>setDaytimeFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                              <span className="text-sm text-gray-700">—</span>
                              <input type="time" value={daytimeTo} onChange={(e)=>setDaytimeTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                            </div>
                          )}
                          <div className="mb-3">
                            <button
                              type="button"
                              onClick={addReminder}
                              disabled={!remindersEnabled || remindersHours.length >= 3}
                              className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                            >
                              + Добавить напоминание
                            </button>
                          </div>
                          <div className="mt-3 space-y-3">
                            {remindersHours.length === 0 && (
                              <div className="text-sm text-gray-500">{remindersEnabled ? 'Нет напоминаний. Добавьте до 3 штук.' : 'Напоминания отключены'}</div>
                            )}
                            {remindersHours.map((h, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min={1}
                                  max={168}
                                  value={h}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value || '1', 10)
                                    setRemindersHours(remindersHours.map((x, i) => (i === idx ? v : x)))
                                  }}
                                  className="w-24 border rounded px-3 py-2"
                                />
                                <span className="text-sm text-gray-700">час(ов) до визита</span>
                                <button type="button" onClick={() => removeReminder(idx)} className="text-sm text-red-600 hover:underline">Удалить</button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 text-sm text-gray-600">
                            Пример сообщения:
                            <div className="bg-gray-50 border rounded p-3 mt-1 whitespace-pre-line">
                              {`${'{client_name}'}, спасибо за запись в ${'{team_name}'} ✨\n\nНапоминаем про вашу заявку на ${'{service_name}'} к мастеру ${'{master_name}'} — держим для вас время ✅\nДата и время: ${'{booking_date}'} в ${'{booking_time}'} (длительность ~${'{service_duration_min}'} мин) ⏱️\nЕсли планы изменятся — вы можете отменить запись по ссылке: ссылка на отмену ❌\n\nХорошего дня!`}
                            </div>
                            <div className="mt-3">
                              <label className="block text-sm text-gray-700 mb-1">Текст сообщения напоминания
                                <button
                                  type="button"
                                  onClick={() => { setHelpContext('notifications'); setHelpOpen(true) }}
                                  className="ml-2 text-xs text-blue-600 hover:underline"
                                >
                                  Справка по переменным
                                </button>
                              </label>
                              <textarea
                                value={reminderMessage}
                                onChange={(e)=>setReminderMessage(e.target.value)}
                                rows={5}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Можно использовать переменные: {client_name}, {team_name}, {service_name}, {master_name}, {booking_date}, {booking_time}, {service_duration_min}"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Уведомление при отмене брони салоном */}
                <div className="border rounded-md">
                  <button
                    type="button"
                    onClick={() => setOpenCancel(!openCancel)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="font-medium">Уведомление клиенту при отмене брони</div>
                    <span className="text-gray-500 text-sm">{openCancel ? 'Свернуть' : 'Развернуть'}</span>
                  </button>
                  {openCancel && (
                    <div className="px-4 pb-4">
                      <div className="mb-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={cancelEnabled} onChange={(e)=>setCancelEnabled(e.target.checked)} />
                          Включено
                        </label>
                      </div>
                      {cancelEnabled && (
                        <div className="text-sm text-gray-600">
                          <div className="bg-gray-50 border rounded p-3 mt-1 whitespace-pre-line">
                            {`Уважаемый клиент, {client_name}!\n\nК сожалению, ваша запись в салон {team_name} на услугу {service_name} к мастеру {master_name}\nДата и время: {booking_date} в {booking_time} (длительность ~{service_duration_min} мин) ⏱️\nотменена салоном. Пожалуйста, выберите другое удобное время для новой записи.`}
                          </div>
                          <div className="mt-3">
                            <label className="block text-sm text-gray-700 mb-1">Текст сообщения при отмене
                              <button
                                type="button"
                                onClick={() => { setHelpContext('notifications'); setHelpOpen(true) }}
                                className="ml-2 text-xs text-blue-600 hover:underline"
                              >
                                Справка по переменным
                              </button>
                            </label>
                            <textarea
                              value={cancelMessage}
                              onChange={(e)=>setCancelMessage(e.target.value)}
                              rows={5}
                              className="w-full border rounded px-3 py-2"
                              placeholder="Переменные: {client_name}, {team_name}, {service_name}, {master_name}, {booking_date}, {booking_time}, {service_duration_min}"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Шаблоны сообщений удалены */}

                <div className="pt-2 space-y-2">
                  {policyError && <div className="text-sm text-red-600">{policyError}</div>}
                  <button type="button" disabled={savingPolicy} onClick={savePolicy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Сохранить</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Блок: Рассылка */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <button
            type="button"
            onClick={() => setOpenBroadcast(!openBroadcast)}
            className="w-full flex items-center justify-between px-6 py-4"
          >
            <span className="text-lg font-semibold text-gray-900">Рассылка</span>
            <span className="text-gray-500 text-sm">{openBroadcast ? 'Свернуть' : 'Развернуть'}</span>
          </button>
          {openBroadcast && (
            <div className="px-6 pb-6">
              <div className="text-gray-600 mb-4">
                <div className="font-medium mb-1">Поддерживаемые переменные в тексте сообщения:</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><span className="text-gray-700">{`{client_name}`}</span> — имя клиента</li>
                  <li><span className="text-gray-700">{`{client_first_name}`}</span> — имя</li>
                  <li><span className="text-gray-700">{`{client_last_name}`}</span> — фамилия</li>
                  <li><span className="text-gray-700">{`{team_name}`}</span> — название салона</li>
                </ul>

                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Пример сообщения:</div>
                  <div className="bg-gray-50 border rounded p-3 text-sm space-y-1">
                    <div>✨ {`{team_name}`} приглашает вас!</div>
                    <div className="mt-1">{`{client_name}`}, привет! 👋</div>
                    <div>Мы рады сообщить, что у нас открылся новый салон 💇‍♀️💅</div>
                    <div>Для вас, {`{client_first_name}`}, подготовили подарки и скидки до 30% 🎁</div>
                    <div>Приходите на открытие — будет кофе, бьюти-розыгрыш и приятные сюрпризы ☕️🎉</div>
                    <div>Записывайтесь заранее, места быстро заканчиваются 😉</div>
                    <div className="pt-2">С любовью, команда {`{team_name}`} ❤️</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <label className="block text-sm text-gray-700 mb-1">Текст сообщения
                    <button
                      type="button"
                      onClick={() => { setHelpContext('broadcast'); setHelpOpen(true) }}
                      className="ml-2 text-xs text-blue-600 hover:underline"
                    >
                      Справка по переменным
                    </button>
                  </label>
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    rows={5}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Текст рассылки (HTML Telegram допустим)">
                  </textarea>
                </div>

                <div className="border rounded-md p-4">
                  <label className="block text-sm text-gray-700 mb-1">Запланировать на</label>
                  <input
                    type="datetime-local"
                    value={broadcastPlannedAt}
                    onChange={(e) => setBroadcastPlannedAt(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>

                {/* Фото (опционально) */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-2">Фото (опционально)</div>
                  {/* скрытый input для выбора файла */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoInputChange}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                    >
                      {photoUploading ? 'Загрузка...' : 'Загрузить фото с ПК'}
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-3 py-1.5 text-sm border rounded"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Требования к файлу: JPEG/JPG, PNG или WebP; максимальный размер — 5 МБ.
                  </div>
                  {photoUrl && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Превью:</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="preview" className="max-h-40 rounded border" onError={() => setBroadcastErr('Не удалось загрузить превью по указанному URL')} />
                    </div>
                  )}

                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={creatingBroadcast}
                    onClick={async () => {
                      setBroadcastErr(''); setBroadcastOk(''); setCreatingBroadcast(true)
                      try {
                        const token = getToken()
                        // Валидация: либо текст, либо фото
                        if (!broadcastText.trim() && !photoUrl.trim()) {
                          throw new Error('Укажите текст сообщения или ссылку на фото')
                        }
                        const resp = await fetch('/api/admin/notifications/broadcast', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            message: broadcastText || undefined,
                            scheduledAt: broadcastPlannedAt || undefined,
                            photoUrl: photoUrl || undefined,
                          }),
                        })
                        const data = await safeJson(resp)
                        if (!resp.ok) throw new Error((data as any).error || 'Не удалось создать рассылку')
                        setBroadcastOk(`Кампания создана. Всего получателей: ${(data as any).total}`)
                      } catch (e) {
                        setBroadcastErr(e instanceof Error ? e.message : 'Ошибка создания рассылки')
                      } finally {
                        setCreatingBroadcast(false)
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Создать рассылку
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!testUsername.trim()) {
                        setBroadcastErr('Введите Telegram ник (@username)')
                        return
                      }
                      setBroadcastErr(''); setBroadcastOk('')
                      try {
                        const token = getToken()
                        const resp = await fetch('/api/admin/notifications/test-send', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ message: broadcastText || 'Тестовая рассылка', username: testUsername, photoUrl: photoUrl || undefined }),
                        })
                        const data = await safeJson(resp)
                        if (!resp.ok) throw new Error((data as any).error || 'Не удалось отправить тест')
                        setBroadcastOk('Тест поставлен в очередь')
                      } catch (e) {
                        setBroadcastErr(e instanceof Error ? e.message : 'Ошибка тестовой отправки')
                      }
                    }}
                    className="px-4 py-2 border rounded"
                  >
                    Тест на себя
                  </button>
                </div>

                <div className="mt-3">
                  <label className="block text-sm text-gray-700 mb-1">Введите Telegram ник (@username)</label>
                  <input value={testUsername} onChange={e => setTestUsername(e.target.value)} placeholder="@username" className="border rounded px-3 py-2 min-w-[240px]" />
                  <div className="text-xs text-gray-500 mt-1">Если указан ник, можно не выбирать клиента</div>
                </div>

                {(broadcastErr || broadcastOk) && (
                  <div className="mt-2 text-sm">
                    {broadcastErr && <div className="text-red-600">{broadcastErr}</div>}
                    {broadcastOk && <div className="text-green-700">{broadcastOk}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHelpOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Справка по переменным</div>
              <button type="button" onClick={() => setHelpOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-6 text-sm text-gray-800 max-h-[70vh] overflow-auto">
              {helpContext === 'notifications' && (
                <div>
                  <div className="font-medium mb-1">Отбивка и напоминания</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{`{client_name}`} — имя клиента (фолбэк на @username)</li>
                    <li>{`{client_first_name}`} — имя</li>
                    <li>{`{client_last_name}`} — фамилия</li>
                    <li>{`{team_name}`} — название салона</li>
                    <li>{`{service_name}`} — услуга (или список услуг)</li>
                    <li>{`{service_names}`} — список услуг (синоним)</li>
                    <li>{`{master_name}`} — мастер</li>
                    <li>{`{booking_date}`} — дата визита (ДД.ММ.ГГГГ в TZ салона)</li>
                    <li>{`{booking_time}`} — время визита (ЧЧ:ММ в TZ салона)</li>
                    <li>{`{service_duration_min}`} — длительность услуги (мин)</li>
                  </ul>
                </div>
              )}
              {helpContext === 'broadcast' && (
                <div>
                  <div className="font-medium mb-1">Рассылка (массовые сообщения)</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{`{client_name}`} — имя клиента (фолбэк на @username)</li>
                    <li>{`{client_first_name}`} — имя</li>
                    <li>{`{client_last_name}`} — фамилия</li>
                    <li>{`{team_name}`} — название салона</li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-2">В рассылке не поддерживаются переменные бронирования.</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setHelpOpen(false)} className="px-4 py-2 border rounded">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


