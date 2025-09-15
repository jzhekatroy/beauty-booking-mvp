'use client'

import Link from 'next/link'

export default function AdminNotificationsRoot() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Уведомления и рассылки</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Уведомления */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-2">Уведомления</h2>
            <p className="text-gray-600 mb-4">Настройка автоматических сообщений: задержка после бронирования и до 3 напоминаний перед визитом. Управление шаблонами.</p>
            <div className="flex gap-3">
              <Link href="/admin/notifications/schedules" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Открыть настройки</Link>
            </div>
          </div>

          {/* Рассылка */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-2">Рассылка</h2>
            <p className="text-gray-600 mb-4">Массовые сообщения без сегментов. Прогресс: всего / отправлено / ошибки. Экспорт ошибок.</p>
            <div className="flex gap-3">
              <Link href="/admin/notifications/broadcast" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Создать рассылку</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


