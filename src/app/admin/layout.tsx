'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  User, 
  Scissors,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
  team: {
    id: string
    name: string
    teamNumber: string
    slug?: string
    bookingSlug?: string
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // Получаем данные пользователя через API
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          console.error('Ошибка получения данных пользователя')
          localStorage.removeItem('token')
          router.push('/login')
        }
      } catch (error) {
        console.error('Ошибка запроса данных пользователя:', error)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navigation = [
    { name: 'Календарь', href: '/admin', icon: Calendar },
    { name: 'Сводка', href: '/admin/bookings', icon: FileText },
    { name: 'Клиенты', href: '/admin/clients', icon: Users },
    { name: 'Услуги', href: '/admin/services', icon: Scissors },
    { name: 'Мастера', href: '/admin/masters', icon: User },
    { name: 'Настройки', href: '/admin/settings', icon: Settings },
    { name: 'Уведомления', href: '/admin/notifications', icon: Bell },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (user as any).impersonatedBy && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-sm">
            <div>Impersonation: вы вошли как админ команды</div>
            <button
              className="px-2 py-1 border border-yellow-300 rounded hover:bg-yellow-200"
              onClick={() => {
                const original = sessionStorage.getItem('superadmin_original_token')
                if (original) {
                  localStorage.setItem('token', original)
                  sessionStorage.removeItem('superadmin_original_token')
                  window.location.reload()
                } else {
                  alert('Оригинальный токен не найден')
                }
              }}
            >Вернуться к SUPER_ADMIN</button>
          </div>
        </div>
      )}
      {/* Mobile-only top bar with burger button */}
      <div className="md:hidden px-2 py-2">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Открыть меню"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-40 bg-[var(--sidebar-overlay)]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] shadow-xl border-r border-[hsl(var(--sidebar-border))] flex flex-col">
              <div className="h-16 px-4 flex items-center border-b border-[hsl(var(--sidebar-border))]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-light.png" alt="Logo" className="h-8 w-auto object-contain mr-3" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{user.team.name}</div>
                  <div className="text-xs opacity-70 truncate">{user.team.teamNumber}</div>
                </div>
                <button
                  className="ml-auto p-2 rounded-md text-[hsl(var(--sidebar-foreground))]/60 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`mx-2 mb-1 flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm'
                          : 'text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
                {user.team.slug && (
                  <Link
                    href={`/book/${user.team.bookingSlug || user.team.slug}`}
                    target="_blank"
                    className="mx-2 mt-2 flex items-center px-4 py-3 rounded-lg text-sm font-bold text-[hsl(var(--sidebar-accent-foreground))] bg-[hsl(var(--sidebar-accent))] hover:bg-[hsl(var(--sidebar-accent))]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ExternalLink className="w-5 h-5 mr-3" />
                    <span className="truncate">Страница записи</span>
                  </Link>
                )}
                <div className="my-3 mx-2 border-t border-[hsl(var(--sidebar-border))]" />
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout() }}
                  className="mx-2 mt-2 w-[calc(100%-1rem)] flex items-center justify-center px-4 py-3 text-sm font-bold rounded-lg transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Выйти
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main content: вертикальный сайдбар для всех страниц */}
      <div className="md:flex">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex md:flex-col ${isCollapsed ? 'md:w-20' : 'md:w-64'} md:shrink-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300`}>
          {/* Sidebar header: logo on top; below, salon name + cabinet left, collapse toggle right */}
          <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isCollapsed ? '/logo-mini.png' : '/logo-light.png'}
              alt="Logo"
              className={`${isCollapsed ? 'h-8 w-auto mx-auto' : 'h-10 w-auto'} object-contain`}
            />
            <div className="mt-2 flex items-center w-full">
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold truncate">{user.team.name}</div>
                  <div className="text-xs opacity-70 truncate">{user.team.teamNumber}</div>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto p-2 rounded-md text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                aria-label="Свернуть меню"
                title="Свернуть меню"
              >
                {isCollapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
                )}
              </button>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`mx-2 mb-1 flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm'
                      : 'text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
            {user.team.slug && (
              <Link
                href={`/book/${user.team.bookingSlug || user.team.slug}`}
                target="_blank"
                className={`mx-2 mt-2 flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-bold text-[hsl(var(--sidebar-accent-foreground))] bg-[hsl(var(--sidebar-accent))] hover:bg-[hsl(var(--sidebar-accent))]`}
              >
                <ExternalLink className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="truncate">Страница записи</span>}
              </Link>
            )}
            <div className="my-3 mx-2 border-t border-[hsl(var(--sidebar-border))]" />
            {/* Logout button placed statically right under the last menu item */}
            <button
              onClick={handleLogout}
              className={`mx-2 mt-2 flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-bold transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]`}
            >
              <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="truncate">Выйти</span>}
            </button>
          </nav>
        </aside>
        {/* Content */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}