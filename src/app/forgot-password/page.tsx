"use client"

import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const sendCode = async () => {
    setLoading(true); setError(null); setInfo(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Ошибка отправки кода')
      setInfo('Код отправлен. Проверьте почту')
      setStep(2)
    } catch (e:any) {
      setError(e?.message || 'Ошибка отправки кода')
    } finally { setLoading(false) }
  }

  const resetPassword = async () => {
    setLoading(true); setError(null); setInfo(null)
    try {
      if (password.length < 6) throw new Error('Минимум 6 символов')
      if (password !== password2) throw new Error('Пароли не совпадают')
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, newPassword: password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Ошибка смены пароля')
      setInfo('Пароль изменён. Теперь можете войти')
    } catch (e:any) {
      setError(e?.message || 'Ошибка смены пароля')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Восстановление пароля</h1>
        {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>)}
        {info && (<div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded">{info}</div>)}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your@email.com" />
            </div>
            <button disabled={loading || !email} onClick={sendCode} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded">
              {loading ? 'Отправляем…' : 'Отправить код'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Код из письма</label>
              <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest" placeholder="123456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Минимум 6 символов" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Подтверждение пароля</label>
              <input type="password" value={password2} onChange={(e)=>setPassword2(e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Повторите пароль" />
            </div>
            <button disabled={loading || code.length!==6 || password.length<6 || password!==password2} onClick={resetPassword} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded">
              {loading ? 'Сохраняем…' : 'Сменить пароль'}
            </button>
            <button type="button" onClick={sendCode} className="w-full border text-gray-800 py-2 rounded hover:bg-gray-50">Отправить код ещё раз</button>
          </div>
        )}

        <div className="text-center">
          <Link href="/login" className="text-blue-600 hover:text-blue-500">← Вернуться ко входу</Link>
        </div>
      </div>
    </div>
  )
}


