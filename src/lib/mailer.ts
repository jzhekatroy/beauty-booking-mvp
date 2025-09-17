import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

let schemaEnsured = false
async function ensureEmailLogsSchema() {
  if (schemaEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.email_logs (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_text TEXT NULL,
        body_html TEXT NULL,
        status TEXT NOT NULL,
        error_text TEXT NULL,
        meta JSONB NULL
      );
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs (created_at);`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_status_idx ON public.email_logs (status);`)
  } catch {} finally {
    schemaEnsured = true
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID()
  }
  // fallback
  return 'email_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type SendMailOptions = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`ENV ${name} is required`)
  return v
}

let cachedTransport: nodemailer.Transporter | null = null

function getTransport() {
  if (cachedTransport) return cachedTransport
  const host = getEnv('SMTP_HOST', 'smtp.yandex.ru')
  const port = Number(process.env.SMTP_PORT ?? 465)
  const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true'
  const user = getEnv('SMTP_USER')
  const pass = getEnv('SMTP_PASS')

  cachedTransport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  return cachedTransport
}

export async function sendMail(options: SendMailOptions) {
  await ensureEmailLogsSchema().catch(()=>{})
  const transporter = getTransport()
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || ''
  const toHeader = Array.isArray(options.to) ? options.to.join(', ') : options.to

  // log pending
  const logId = generateId()
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.email_logs (id, to_email, subject, body_text, body_html, status, meta)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6::jsonb)`,
      logId,
      toHeader,
      options.subject,
      options.text ?? null,
      options.html ?? null,
      JSON.stringify({ replyTo: options.replyTo || null })
    )
  } catch {}

  const info = await transporter.sendMail({
    from,
    to: toHeader,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
  })
  // update log on success
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE public.email_logs SET status = 'SENT', updated_at = now(), meta = $2::jsonb WHERE id = $1`,
      logId,
      JSON.stringify({ messageId: info.messageId, accepted: info.accepted, rejected: info.rejected })
    )
  } catch {}
  return info
}

export async function markEmailFailed(logId: string, errorText: string) {
  await ensureEmailLogsSchema().catch(()=>{})
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE public.email_logs SET status = 'FAILED', error_text = $2, updated_at = now() WHERE id = $1`,
      logId,
      errorText
    )
  } catch {}
}
