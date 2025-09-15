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
  const [summaryExtra, setSummaryExtra] = useState<{ last1m: number; perMinute5m: number; limits?: any } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const sres = await fetch('/api/superadmin/telegram-queue/summary', { cache: 'no-store' })
      const sdata = await sres.json()
      setSummary({ pending: sdata.pending, processing: sdata.processing, failed: sdata.failed })
      setSummaryExtra({ last1m: sdata.rate?.last1m || 0, perMinute5m: sdata.rate?.perMinute5m || 0, limits: sdata.limits || null })

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
          {summaryExtra && (
            <div className="px-3 py-2 bg-white border rounded">
              Скорость: 1м=<b>{summaryExtra.last1m}</b>, ~мин=<b>{summaryExtra.perMinute5m}</b>
              {summaryExtra.limits && (
                <span className="ml-2 text-gray-600">лимит {summaryExtra.limits.maxRequestsPerMinute}/мин</span>
              )}
            </div>
          )}
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
        <BulkActions dateFrom={dateFrom} dateTo={dateTo} />
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

function BulkActions({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState(10)
  const run = async (payload: any) => {
    setBusy(true)
    try {
      const res = await fetch('/api/superadmin/telegram-queue/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка выполнения')
      alert('Готово')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-end gap-2">
      <button disabled={busy} onClick={()=>run({ action: 'resendFailed', from: dateFrom, to: dateTo })} className="px-3 py-2 border rounded text-sm">Переотправить FAILED за период</button>
      <div className="flex items-end gap-1">
        <div>
          <label className="block text-xs text-gray-500">минут</label>
          <input type="number" min={1} value={minutes} onChange={e=>setMinutes(parseInt(e.target.value||'10',10))} className="border rounded px-2 py-1 text-sm w-20" />
        </div>
        <button disabled={busy} onClick={()=>run({ action: 'releaseProcessing', minutes })} className="px-3 py-2 border rounded text-sm">Снять зависшие PROCESSING</button>
      </div>
    </div>
  )
}


