import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function ensureGlobalNotificationSettingsSchema(): Promise<void> {
  // Создаем таблицу, если её нет
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.global_notification_settings (
      id TEXT PRIMARY KEY,
      max_requests_per_minute INTEGER,
      request_delay_ms INTEGER,
      max_retry_attempts INTEGER,
      retry_delay_ms INTEGER,
      exponential_backoff BOOLEAN,
      failure_threshold INTEGER,
      recovery_timeout_ms INTEGER,
      enabled BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Добавляем отсутствующие колонки (идемпотентно)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS max_requests_per_minute INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS request_delay_ms INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS retry_delay_ms INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS exponential_backoff BOOLEAN`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS failure_threshold INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS recovery_timeout_ms INTEGER`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`)
  await prisma.$executeRawUnsafe(`ALTER TABLE public.global_notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)
}

// Получить глобальные настройки уведомлений
export async function GET(request: NextRequest) {
  try {
    await ensureGlobalNotificationSettingsSchema()
    // Получаем или создаем глобальные настройки
    let settings = await prisma.globalNotificationSettings.findFirst()

    // Если настроек нет, создаем с явными дефолтными значениями (на случай, если в прод-таблице нет SQL DEFAULT)
    if (!settings) {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          maxRequestsPerMinute: 25,
          requestDelayMs: 2000,
          maxRetryAttempts: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true,
          failureThreshold: 5,
          recoveryTimeoutMs: 60000,
          enabled: true,
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching global notification settings:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    // Отдаем безопасный фолбэк, чтобы UI не падал
    return NextResponse.json({
      settings: {
        id: 'global-default',
        maxRequestsPerMinute: 25,
        requestDelayMs: 2000,
        maxRetryAttempts: 3,
        retryDelayMs: 5000,
        exponentialBackoff: true,
        failureThreshold: 5,
        recoveryTimeoutMs: 60000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
  }
}

// Обновить глобальные настройки уведомлений
export async function PUT(request: NextRequest) {
  try {
    await ensureGlobalNotificationSettingsSchema()
    const body = await request.json()

    const toNumber = (v: any): number | undefined => {
      if (v === null || v === undefined) return undefined
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    const numMaxRequestsPerMinute = toNumber(body.maxRequestsPerMinute)
    const numRequestDelayMs = toNumber(body.requestDelayMs)
    const numMaxRetryAttempts = toNumber(body.maxRetryAttempts)
    const numRetryDelayMs = toNumber(body.retryDelayMs)
    const numFailureThreshold = toNumber(body.failureThreshold)
    const numRecoveryTimeoutMs = toNumber(body.recoveryTimeoutMs)
    const boolExponentialBackoff = typeof body.exponentialBackoff === 'boolean' ? body.exponentialBackoff : undefined
    const boolEnabled = typeof body.enabled === 'boolean' ? body.enabled : undefined

    // Валидация
    if (numMaxRequestsPerMinute !== undefined && (numMaxRequestsPerMinute < 1 || numMaxRequestsPerMinute > 30)) {
      return NextResponse.json(
        { error: 'maxRequestsPerMinute must be between 1 and 30' },
        { status: 400 }
      )
    }

    if (numRequestDelayMs !== undefined && (numRequestDelayMs < 100 || numRequestDelayMs > 10000)) {
      return NextResponse.json(
        { error: 'requestDelayMs must be between 100 and 10000' },
        { status: 400 }
      )
    }

    if (numMaxRetryAttempts !== undefined && (numMaxRetryAttempts < 1 || numMaxRetryAttempts > 10)) {
      return NextResponse.json(
        { error: 'maxRetryAttempts must be between 1 and 10' },
        { status: 400 }
      )
    }

    if (numRetryDelayMs !== undefined && (numRetryDelayMs < 1000 || numRetryDelayMs > 30000)) {
      return NextResponse.json(
        { error: 'retryDelayMs must be between 1000 and 30000' },
        { status: 400 }
      )
    }

    if (numFailureThreshold !== undefined && (numFailureThreshold < 1 || numFailureThreshold > 20)) {
      return NextResponse.json(
        { error: 'failureThreshold must be between 1 and 20' },
        { status: 400 }
      )
    }

    if (numRecoveryTimeoutMs !== undefined && (numRecoveryTimeoutMs < 10000 || numRecoveryTimeoutMs > 300000)) {
      return NextResponse.json(
        { error: 'recoveryTimeoutMs must be between 10000 and 300000' },
        { status: 400 }
      )
    }

    // Обновляем настройки
    let settings = await prisma.globalNotificationSettings.findFirst()
    
    if (settings) {
      settings = await prisma.globalNotificationSettings.update({
        where: { id: settings.id },
        data: {
          maxRequestsPerMinute: numMaxRequestsPerMinute ?? settings.maxRequestsPerMinute,
          requestDelayMs: numRequestDelayMs ?? settings.requestDelayMs,
          maxRetryAttempts: numMaxRetryAttempts ?? settings.maxRetryAttempts,
          retryDelayMs: numRetryDelayMs ?? settings.retryDelayMs,
          exponentialBackoff: boolExponentialBackoff ?? settings.exponentialBackoff,
          failureThreshold: numFailureThreshold ?? settings.failureThreshold,
          recoveryTimeoutMs: numRecoveryTimeoutMs ?? settings.recoveryTimeoutMs,
          enabled: boolEnabled ?? settings.enabled
        }
      })
    } else {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          maxRequestsPerMinute: numMaxRequestsPerMinute ?? 25,
          requestDelayMs: numRequestDelayMs ?? 2000,
          maxRetryAttempts: numMaxRetryAttempts ?? 3,
          retryDelayMs: numRetryDelayMs ?? 5000,
          exponentialBackoff: boolExponentialBackoff ?? true,
          failureThreshold: numFailureThreshold ?? 5,
          recoveryTimeoutMs: numRecoveryTimeoutMs ?? 60000,
          enabled: boolEnabled ?? true
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Глобальные настройки обновлены успешно'
    })
  } catch (error) {
    console.error('Error updating global notification settings:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Сбросить настройки к дефолтным
export async function POST(request: NextRequest) {
  try {
    await ensureGlobalNotificationSettingsSchema()
    let settings = await prisma.globalNotificationSettings.findFirst()
    
    if (settings) {
      settings = await prisma.globalNotificationSettings.update({
        where: { id: settings.id },
        data: {
          maxRequestsPerMinute: 25,
          requestDelayMs: 2000,
          maxRetryAttempts: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true,
          failureThreshold: 5,
          recoveryTimeoutMs: 60000,
          enabled: true
        }
      })
    } else {
      settings = await prisma.globalNotificationSettings.create({
        data: {
          maxRequestsPerMinute: 25,
          requestDelayMs: 2000,
          maxRetryAttempts: 3,
          retryDelayMs: 5000,
          exponentialBackoff: true,
          failureThreshold: 5,
          recoveryTimeoutMs: 60000,
          enabled: true
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Глобальные настройки сброшены к дефолтным значениям'
    })
  } catch (error) {
    console.error('Error resetting global notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

