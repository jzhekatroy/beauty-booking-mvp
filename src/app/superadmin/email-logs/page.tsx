'use client'

import { useEffect, useState } from 'react'

type EmailLog = {
  id: string
  created_at: string
  to_email: string
  subject: string
  status: 'PENDING'|'SENT'|'FAILED'
  error_text?: string
  body_preview?: string
}

export default function EmailLogsPage() {
  const [items, setItems] = useState<EmailLog[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [toEmails, setToEmails] = useState('')
  const [subj, setSubj] = useState('тест почты')
  const [body, setBody] = useState('привет, это тест почты 2minutes')
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<{id:string, subject:string, to:string, status:string, body_text?:string, body_html?:string} | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/superadmin/email-logs?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setItems(data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // дефолтный фильтр: сегодня
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59)
    const toLocal = (d: Date) => {
      const pad = (n:number)=>String(n).padStart(2,'0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setFrom(toLocal(start))
    setTo(toLocal(end))
    setTimeout(load, 0)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Логи писем</h1>

      <div className="bg-white border rounded p-4 mb-4">
        <h2 className="text-lg font-medium mb-3">Отправить тестовое письмо</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input className="border px-3 py-2 rounded" placeholder="Получатели (через запятую)" value={toEmails} onChange={e=>setToEmails(e.target.value)} />
          <input className="border px-3 py-2 rounded" placeholder="Тема" value={subj} onChange={e=>setSubj(e.target.value)} />
          <textarea className="border px-3 py-2 rounded md:col-span-2" rows={3} placeholder="Текст письма" value={body} onChange={e=>setBody(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
            disabled={sending}
            onClick={async ()=>{
              setSending(true); setSendMsg(null)
              try {
                const token = localStorage.getItem('token')
                const tos = toEmails.split(',').map(s=>s.trim()).filter(Boolean)
                if (tos.length===0) { setSendMsg('Укажите хотя бы одного получателя'); setSending(false); return }
                if (!subj.trim()) { setSendMsg('Укажите тему'); setSending(false); return }
                if (!body.trim()) { setSendMsg('Укажите текст'); setSending(false); return }
                const res = await fetch('/api/superadmin/email/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ to: tos, subject: subj, text: body })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Ошибка отправки')
                setSendMsg(`Отправлено. messageId: ${data.messageId}`)
                await load()
              } catch (e:any) {
                setSendMsg(e?.message || 'Ошибка')
              } finally {
                setSending(false)
              }
            }}
          >{sending ? 'Отправляем…' : 'Отправить тест'}</button>
          {sendMsg && <div className="text-sm text-gray-700">{sendMsg}</div>}
        </div>
      </div>

      <div className="bg-white border rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border px-3 py-2 rounded" placeholder="Поиск по email/теме" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border px-3 py-2 rounded" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input className="border px-3 py-2 rounded" type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} />
        <input className="border px-3 py-2 rounded" type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} />
        <div className="md:col-span-4 flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={load} disabled={loading}>{loading ? 'Загрузка…' : 'Фильтровать'}</button>
          <button className="px-4 py-2 border rounded" onClick={()=>{setQ('');setStatus('');setFrom('');setTo(''); setTimeout(load,0)}}>Сбросить</button>
        </div>
      </div>

      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Дата</th>
              <th className="p-2">Получатель</th>
              <th className="p-2">Тема</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Ошибка</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString('ru-RU')}</td>
                <td className="p-2">{row.to_email}</td>
                <td className="p-2">{row.subject}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2 text-red-600">{row.error_text || ''}</td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 border rounded hover:bg-gray-50"
                    onClick={async ()=>{
                      setDetailsOpen(true)
                      setDetailsLoading(true)
                      setDetails(null)
                      try {
                        const token = localStorage.getItem('token')
                        const res = await fetch(`/api/superadmin/email-logs/${row.id}`, { headers: { Authorization: `Bearer ${token}` } })
                        const data = await res.json()
                        if (res.ok) {
                          setDetails({ id: data.item.id, subject: data.item.subject, to: data.item.to_email, status: data.item.status, body_text: data.item.body_text || '', body_html: data.item.body_html || '' })
                        }
                      } finally {
                        setDetailsLoading(false)
                      }
                    }}
                  >Показать</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Нет данных</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detailsOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{details?.to}</div>
                <div className="text-lg font-semibold">{details?.subject || 'Детали письма'}</div>
              </div>
              <button className="px-3 py-1 border rounded" onClick={()=>setDetailsOpen(false)}>Закрыть</button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Текст</div>
                <div className="border rounded p-3 h-64 overflow-auto whitespace-pre-wrap text-sm bg-gray-50">
                  {detailsLoading ? 'Загрузка…' : (details?.body_text || '—')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">HTML</div>
                <div className="border rounded p-3 h-64 overflow-auto bg-white">
                  {detailsLoading ? 'Загрузка…' : (details?.body_html ? <div dangerouslySetInnerHTML={{ __html: String(details.body_html) }} /> : <div className="text-sm text-gray-500">—</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
