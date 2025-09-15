'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNotificationsRoot() {
  const tabs = [
    { name: 'Уведомления', href: '/admin/notifications/schedules' },
    { name: 'Рассылка', href: '/admin/notifications/broadcast' },
  ]
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Уведомления и рассылки</h1>
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={`${pathname === tab.href ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'} whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="text-gray-600">Выберите раздел: «Уведомления» или «Рассылка».</div>
      </div>
    </div>
  )
}


