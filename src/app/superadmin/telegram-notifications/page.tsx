'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function TelegramNotificationsRoot() {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (pathname?.endsWith('/telegram-notifications')) {
      router.replace('/superadmin/telegram-notifications/settings')
    }
  }, [pathname, router])
  return null
}


