'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [needVerify, setNeedVerify] = useState(false)
  const [code, setCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [info, setInfo] = useState('')
  const router = useRouter()

  // Если уже авторизован — перекидываем в админку
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        router.replace('/admin')
      }
    } catch {}
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Сохраняем токен в localStorage
        localStorage.setItem('token', data.token)
        
        // Перенаправляем в зависимости от роли
        // Всех ведём в /admin; доступ к /superadmin проверяется отдельно
        router.push('/admin')
      } else {
        if (response.status === 403 && data?.verificationRequired) {
          setNeedVerify(true)
          setInfo('Мы отправили код подтверждения на почту. Введите его ниже.')
        } else {
          setError(data.error || 'Ошибка входа')
        }
      }
    } catch (error) {
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Beauty Booking
          </h1>
          <p className="text-gray-600">
            Войти в систему
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Вход в аккаунт
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-4">
              {info}
            </div>
          )}

          {!needVerify ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите пароль"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Код подтверждения (6 цифр)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e)=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest"
                  placeholder="123456"
                />
              </div>
              <button
                type="button"
                disabled={verifyLoading || code.length!==6}
                onClick={async ()=>{
                  setVerifyLoading(true); setError(''); setInfo('')
                  try {
                    const res = await fetch('/api/auth/verify-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: formData.email, code })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data?.error || 'Неверный код')
                    setInfo('Email подтверждён. Теперь можете войти.')
                    setNeedVerify(false)
                  } catch (e:any) {
                    setError(e?.message || 'Ошибка подтверждения')
                  } finally {
                    setVerifyLoading(false)
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >{verifyLoading ? 'Проверяем…' : 'Подтвердить'}</button>
              <button
                type="button"
                className="w-full border hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-200"
                onClick={async ()=>{
                  try {
                    const res = await fetch('/api/auth/resend-email-code', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.email })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data?.error || 'Ошибка отправки кода')
                    setInfo('Код отправлен повторно')
                  } catch (e:any) {
                    setError(e?.message || 'Ошибка отправки кода')
                  }
                }}
              >Отправить код ещё раз</button>
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <div className="text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">
                Зарегистрировать команду
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
                Забыли пароль?
              </Link>
            </div>
          </div>
        </div>

        {/* Удалено по требованию: ссылка "Администрирование системы" */}
      </div>
    </div>
  )
}