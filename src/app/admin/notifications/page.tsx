'use client'

import { useState } from 'react'

export default function AdminNotificationsRoot() {
  const [openNotifications, setOpenNotifications] = useState(true)
  const [openBroadcast, setOpenBroadcast] = useState(true)

  // Локальное состояние (пока без API)
  const [delayAfterBookingSec, setDelayAfterBookingSec] = useState<number>(60)
  const [remindersHours, setRemindersHours] = useState<number[]>([])
  const addReminder = () => {
    if (remindersHours.length < 3) setRemindersHours([...remindersHours, 24])
  }
  const removeReminder = (idx: number) => {
    setRemindersHours(remindersHours.filter((_, i) => i !== idx))
  }

  const [broadcastText, setBroadcastText] = useState<string>('')
  const [broadcastPlannedAt, setBroadcastPlannedAt] = useState<string>('')

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
                  <label className="block text-sm text-gray-700 mb-1">Задержка отправки (секунды)</label>
                  <input
                    type="number"
                    min={0}
                    value={delayAfterBookingSec}
                    onChange={(e) => setDelayAfterBookingSec(parseInt(e.target.value || '0', 10))}
                    className="w-full max-w-xs border rounded px-3 py-2"
                  />
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

                {/* Шаблоны сообщений (заглушка) */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-2">Шаблоны сообщений</div>
                  <p className="text-sm text-gray-600">Редактирование шаблонов будет добавлено следующим шагом.</p>
                </div>

                <div className="pt-2">
                  <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Сохранить (будет подключено к API)</button>
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
              <p className="text-gray-600 mb-4">Массовые сообщения без сегментов. Прогресс и экспорт ошибок.</p>

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

                <div className="flex gap-3">
                  <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Создать рассылку (будет API)</button>
                  <button type="button" className="px-4 py-2 border rounded">Тест на себя</button>
                </div>

                {/* Прогресс (заглушка) */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-2">Прогресс рассылки</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-sm text-gray-600">Всего</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-sm text-gray-600">Отправлено</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-sm text-gray-600">Ошибки</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button type="button" className="px-3 py-2 text-sm border rounded">Экспорт ошибок (CSV)</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


