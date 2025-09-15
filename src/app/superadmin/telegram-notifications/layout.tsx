'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TelegramNotificationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSettings = pathname?.includes('/superadmin/telegram-notifications/settings')
  const isLogs = pathname?.includes('/superadmin/telegram-notifications/logs')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Telegram уведомления</h1>

        {/* Вкладки */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <Link
              href="/superadmin/telegram-notifications/settings"
              className={`whitespace-nowrap py-2 border-b-2 text-sm ${isSettings ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}
            >
              Настройки
            </Link>
            <Link
              href="/superadmin/telegram-notifications/logs"
              className={`whitespace-nowrap py-2 border-b-2 text-sm ${isLogs ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}
            >
              Логи отправки
            </Link>
            <Link
              href="/superadmin/telegram-notifications/queue"
              className={`whitespace-nowrap py-2 border-b-2 text-sm ${pathname?.includes('/superadmin/telegram-notifications/queue') ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}
            >
              Очередь
            </Link>
          </nav>
        </div>

        <div>
          {children}
        </div>
      </div>
    </div>
  )
}


