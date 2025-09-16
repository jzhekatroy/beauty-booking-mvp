'use client'

import { useEffect, useState } from 'react'

interface LogItem {
  id: string
  teamId: string
  teamName?: string
  clientId?: string
  clientName?: string
  telegramUserId?: string | null
  telegramUsername?: string | null
  message: string
  status: 'SUCCESS' | 'FAILED'
  telegramMessageId?: string | null
  errorMessage?: string | null
  attempts: number
  processingTimeMs?: number | null
  createdAt: string
}

export default function TelegramSendLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [teamId, setTeamId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (teamId) params.set('teamId', teamId)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetch(`/api/superadmin/telegram-send-logs?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(()=>({}))
        throw new Error(d.error || 'Ошибка загрузки логов')
      }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resend = async (logId: string) => {
    try {
      const res = await fetch(`/api/superadmin/telegram-send-logs/${logId}/resend`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось переотправить')
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка переотправки')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Логи отправки Telegram</h1>
      <div className="bg-white border rounded p-3 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Команда (ID)</label>
          <input value={teamId} onChange={e=>setTeamId(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="teamId" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">C даты</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">По дату</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Применить</button>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Загрузка…</div>
      ) : (
        <div className="bg-white border rounded overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Время</th>
                <th className="px-3 py-2 text-left">Команда</th>
                <th className="px-3 py-2 text-left">Клиент</th>
                <th className="px-3 py-2 text-left">Telegram</th>
                <th className="px-3 py-2 text-left">Сообщение</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Попытки</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2">{l.teamName || l.teamId}</td>
                  <td className="px-3 py-2">{l.clientName || l.clientId}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {l.telegramUsername || '-'}<br />
                    <span className="text-[11px] text-gray-400">{l.telegramUserId || ''}</span>
                  </td>
                  <td className="px-3 py-2 max-w-[480px]">
                    <details>
                      <summary className="cursor-pointer text-blue-600 hover:underline select-none truncate">Показать</summary>
                      <div className="mt-1 whitespace-pre-wrap break-words">{l.message}</div>
                    </details>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${l.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status}</span>
                    {l.errorMessage ? <div className="text-xs text-red-600 mt-1 truncate" title={l.errorMessage}>{l.errorMessage}</div> : null}
                  </td>
                  <td className="px-3 py-2">{l.attempts}</td>
                  <td className="px-3 py-2 text-right">
                    {l.status !== 'SUCCESS' && (
                      <button onClick={()=>resend(l.id)} className="px-2 py-1 border rounded text-xs">Переотправить</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


