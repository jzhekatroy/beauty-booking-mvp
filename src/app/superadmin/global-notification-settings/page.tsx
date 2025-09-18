'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, RotateCcw, Info } from 'lucide-react'

interface GlobalNotificationSettings {
  id: string
  maxRequestsPerMinute: number
  requestDelayMs: number
  maxRetryAttempts: number
  retryDelayMs: number
  exponentialBackoff: boolean
  failureThreshold: number
  recoveryTimeoutMs: number
  enabled: boolean
}

function RateLimitEditor({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rpm, setRpm] = useState<number>(25)
  const [cpm, setCpm] = useState<number>(15)
  const [conc, setConc] = useState<number>(1)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Токен авторизации отсутствует')
      const res = await fetch(`/api/superadmin/notifications/policy/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки')
      setRpm(Number(data?.policy?.telegramRatePerMinute ?? 25))
      setCpm(Number(data?.policy?.telegramPerChatPerMinute ?? 15))
      setConc(Number(data?.policy?.maxConcurrentSends ?? 1))
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки')
    } finally { setLoading(false) }
  }

  const save = async () => {
    try {
      setSaving(true); setError(null)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Токен авторизации отсутствует')
      const res = await fetch(`/api/superadmin/notifications/policy/${teamId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegramRatePerMinute: rpm, telegramPerChatPerMinute: cpm, maxConcurrentSends: conc })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Ошибка сохранения')
    } catch (e: any) {
      setError(e?.message || 'Ошибка сохранения')
    } finally { setSaving(false) }
  }

  useEffect(() => { if (teamId) load() }, [teamId])

  return (
    <div className="bg-white rounded-lg border p-4 mt-4">
      <h3 className="text-lg font-semibold mb-2">Ограничение скорости (Telegram)</h3>
      {error && <div className="mb-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Сообщений в минуту на бота</label>
          <input type="number" min={1} value={rpm} onChange={(e)=>setRpm(Math.max(1, parseInt(e.target.value||'25')))} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Сообщений в минуту в один чат</label>
          <input type="number" min={1} value={cpm} onChange={(e)=>setCpm(Math.max(1, parseInt(e.target.value||'15')))} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Параллельных отправок</label>
          <input type="number" min={1} value={conc} onChange={(e)=>setConc(Math.max(1, parseInt(e.target.value||'1')))} className="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving || loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving? 'Сохранение…':'Сохранить лимиты'}</button>
        {loading && <span className="text-sm text-gray-500">Загрузка…</span>}
      </div>
      <p className="text-xs text-gray-500 mt-2">Дефолты: 25/мин на бота, 15/мин на чат, 1 параллельно.</p>
    </div>
  )
}

export default function GlobalNotificationSettingsProxy() {
  // обертка — старая страница экспонируется здесь; определим teamId из localStorage / /api/auth/me
  const [teamId, setTeamId] = useState<string>('')
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token'); if (!token) return
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        const me = await res.json()
        if (res.ok && me?.team?.id) setTeamId(me.team.id)
      } catch {}
    })()
  }, [])
  return (
    <div>
      {/* Старая страница настроек уже отрисовывается выше (import default) — просто дополняем блоком лимитов */}
      {teamId && <RateLimitEditor teamId={teamId} />}
    </div>
  )
}
