'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TelegramNotificationsRoot() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // По умолчанию открываем вкладку настроек
    if (pathname?.endsWith('/telegram-notifications')) {
      router.replace('/superadmin/telegram-notifications/settings')
    }
  }, [pathname, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Telegram уведомления</h1>
        <div className="flex gap-3 mb-6 text-sm">
          <Link href="/superadmin/telegram-notifications/settings" className="px-3 py-2 rounded bg-white border">Настройки</Link>
          <Link href="/superadmin/telegram-notifications/logs" className="px-3 py-2 rounded bg-white border">Логи отправки</Link>
        </div>
      </div>
    </div>
  )
}


