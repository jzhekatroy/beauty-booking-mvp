'use client'

import { useEffect, useRef, useState } from 'react'

type Reminder = { hoursBefore: number; templateId?: string | null }
type Template = { id: string; key: string; name: string; content: string; isHtml: boolean }

export default function AdminNotificationsRoot() {
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openBroadcast, setOpenBroadcast] = useState(false)

  // Policy
  const [enablePostBooking, setEnablePostBooking] = useState<boolean>(false)
  const [delayAfterBookingSec, setDelayAfterBookingSec] = useState<number>(60)
  const [remindersHours, setRemindersHours] = useState<number[]>([])
  const [loadingPolicy, setLoadingPolicy] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policyError, setPolicyError] = useState<string>('')

  // Templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [tplKey, setTplKey] = useState('')
  const [tplName, setTplName] = useState('')
  const [tplContent, setTplContent] = useState('')
  const [tplIsHtml, setTplIsHtml] = useState(false)
  const [templatesError, setTemplatesError] = useState<string>('')

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
    if (remindersHours.length < 3) setRemindersHours([...remindersHours, 24])
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
      const policy = (data as any).policy as { delayAfterBookingSeconds: number; reminders: Reminder[]; postBookingEnabled?: boolean }
      setDelayAfterBookingSec(Number(policy?.delayAfterBookingSeconds ?? 60))
      setEnablePostBooking(Boolean(policy?.postBookingEnabled ?? false))
      setRemindersHours(Array.isArray(policy?.reminders) ? policy.reminders.map(r => Number(r.hoursBefore ?? 24)) : [])
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

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    setTemplatesError('')
    try {
      const token = getToken()
      const resp = await fetch('/api/admin/notifications/templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await safeJson(resp)
      if (!resp.ok) throw new Error((data as any).error || 'Не удалось загрузить шаблоны')
      setTemplates(Array.isArray((data as any).templates) ? (data as any).templates : [])
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : 'Ошибка загрузки шаблонов')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const upsertTemplate = async () => {
    setSavingTemplate(true)
    setTemplatesError('')
    try {
      const payload = { key: tplKey.trim(), name: tplName.trim(), content: tplContent, isHtml: !!tplIsHtml }
      if (!payload.key || !payload.name || !payload.content) {
        setTemplatesError('Заполните key, name и content')
        setSavingTemplate(false)
        return
      }
      const resp = await fetch('/api/admin/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const data = await safeJson(resp)
      if (!resp.ok) throw new Error((data as any).error || 'Не удалось сохранить шаблон')
      setTplKey(''); setTplName(''); setTplContent(''); setTplIsHtml(false)
      await loadTemplates()
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : 'Ошибка сохранения шаблона')
    } finally {
      setSavingTemplate(false)
    }
  }

  useEffect(() => {
    // Автозагрузка при первом раскрытии секции
    if (openNotifications) {
      if (!loadingPolicy) loadPolicy()
      if (!loadingTemplates) loadTemplates()
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
              <p className="text-gray-600 mb-4">Настройка автоматических сообщений: задержка после бронирования и до 3 напоминаний перед визитом. Управление шаблонами.</p>

              <div className="space-y-6">
                {/* После бронирования */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-2">После оформления бронирования</div>
                  <label className="inline-flex items-center gap-2 text-sm mb-3">
                    <input type="checkbox" checked={enablePostBooking} onChange={(e) => setEnablePostBooking(e.target.checked)} />
                    Включить отбивку после оформления бронирования
                  </label>
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
                      </div>
                    </>
                  )}
                </div>

                {/* Перед визитом */}
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Напоминания перед визитом</div>
                    <button
                      type="button"
                      onClick={addReminder}
                      disabled={remindersHours.length >= 3}
                      className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                    >
                      + Добавить напоминание
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {remindersHours.length === 0 && (
                      <div className="text-sm text-gray-500">Нет напоминаний. Добавьте до 3 штук.</div>
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
                </div>

                {/* Шаблоны сообщений */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-2">Шаблоны сообщений</div>
                  {loadingTemplates ? (
                    <div className="text-sm text-gray-500">Загрузка шаблонов...</div>
                  ) : (
                    <div className="space-y-3">
                      {templatesError && (
                        <div className="text-sm text-red-600">{templatesError}</div>
                      )}
                      {templates.length === 0 && (
                        <div className="text-sm text-gray-500">Шаблоны отсутствуют</div>
                      )}
                      {templates.map(t => (
                        <div key={t.id} className="p-3 border rounded">
                          <div className="text-sm font-medium">{t.name} <span className="text-gray-500">({t.key})</span></div>
                          <div className="text-xs text-gray-500 truncate">{t.content}</div>
                        </div>
                      ))}
                      <div className="pt-2 border-t mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input value={tplKey} onChange={e => setTplKey(e.target.value)} placeholder="key" className="border rounded px-3 py-2" />
                          <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Название" className="border rounded px-3 py-2" />
                        </div>
                        <textarea value={tplContent} onChange={e => setTplContent(e.target.value)} rows={4} placeholder="Контент (HTML разрешён)" className="w-full border rounded px-3 py-2 mt-2" />
                        <label className="inline-flex items-center gap-2 text-sm mt-2">
                          <input type="checkbox" checked={tplIsHtml} onChange={e => setTplIsHtml(e.target.checked)} />
                          HTML
                        </label>
                        <div className="mt-2">
                          <button type="button" disabled={savingTemplate} onClick={upsertTemplate} className="px-3 py-1.5 bg-gray-800 text-white rounded disabled:opacity-50">Сохранить шаблон</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                  <label className="block text-sm text-gray-700 mb-1">Текст сообщения</label>
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
    </div>
  )
}


