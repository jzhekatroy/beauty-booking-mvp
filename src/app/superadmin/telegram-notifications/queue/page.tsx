'use client'

import { useEffect, useState } from 'react'

interface QueueItem {
  id: string
  type: string
  teamId?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  attempts: number
  maxAttempts: number
  errorMessage?: string | null
  executeAt: string
  createdAt: string
}

export default function TelegramQueuePage() {
  const [summary, setSummary] = useState<{ pending: number; processing: number; failed: number } | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [status, setStatus] = useState<string>('PENDING')
  const [teamId, setTeamId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState<boolean>(false)

  const load = async () => {
    setLoading(true)
    try {
      const sres = await fetch('/api/superadmin/telegram-queue/summary', { cache: 'no-store' })
      const sdata = await sres.json()
      setSummary(sdata)

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (teamId) params.set('teamId', teamId)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const qres = await fetch(`/api/superadmin/telegram-queue?${params.toString()}`, { cache: 'no-store' })
      const qdata = await qres.json()
      setItems(qdata.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Очередь отправки</h1>
      {summary && (
        <div className="flex gap-4 mb-4 text-sm">
          <div className="px-3 py-2 bg-white border rounded">В ожидании: <b>{summary.pending}</b></div>
          <div className="px-3 py-2 bg-white border rounded">В обработке: <b>{summary.processing}</b></div>
          <div className="px-3 py-2 bg-white border rounded">Ошибки: <b>{summary.failed}</b></div>
        </div>
      )}
      <div className="bg-white border rounded p-3 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Статус</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
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

      {loading ? <div>Загрузка…</div> : (
        <div className="bg-white border rounded overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Время</th>
                <th className="px-3 py-2 text-left">К исполнению</th>
                <th className="px-3 py-2 text-left">Команда</th>
                <th className="px-3 py-2 text-left">Тип</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Попытки</th>
                <th className="px-3 py-2 text-left">Ошибка</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(it.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(it.executeAt).toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2">{it.teamId || '—'}</td>
                  <td className="px-3 py-2">{it.type}</td>
                  <td className="px-3 py-2">{it.status}</td>
                  <td className="px-3 py-2">{it.attempts}/{it.maxAttempts}</td>
                  <td className="px-3 py-2 truncate max-w-[400px]" title={it.errorMessage || ''}>{it.errorMessage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


