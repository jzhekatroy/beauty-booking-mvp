-- Normalize data for global_notification_settings and ensure single default record exists
-- This migration is idempotent for safety in diverse prod states

-- 1) Create default record if table exists and no rows present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'global_notification_settings'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.global_notification_settings) THEN
      INSERT INTO public.global_notification_settings (
        id, max_requests_per_minute, request_delay_ms, max_retry_attempts,
        retry_delay_ms, exponential_backoff, failure_threshold, recovery_timeout_ms,
        enabled, created_at, updated_at
      )
      VALUES (
        'global', 25, 2000, 3, 5000, true, 5, 60000, true, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END
$$;

-- 2) Copy camelCase timestamps to snake_case if such legacy columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='global_notification_settings' AND column_name='createdAt'
  ) THEN
    EXECUTE 'UPDATE public.global_notification_settings SET created_at = COALESCE(created_at, "createdAt")';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='global_notification_settings' AND column_name='updatedAt'
  ) THEN
    EXECUTE 'UPDATE public.global_notification_settings SET updated_at = COALESCE(updated_at, "updatedAt")';
  END IF;
END
$$;

-- 3) Normalize NULLs to defaults
UPDATE public.global_notification_settings
SET
  max_requests_per_minute = COALESCE(max_requests_per_minute, 25),
  request_delay_ms        = COALESCE(request_delay_ms,        2000),
  max_retry_attempts      = COALESCE(max_retry_attempts,      3),
  retry_delay_ms          = COALESCE(retry_delay_ms,          5000),
  exponential_backoff     = COALESCE(exponential_backoff,     true),
  failure_threshold       = COALESCE(failure_threshold,       5),
  recovery_timeout_ms     = COALESCE(recovery_timeout_ms,     60000),
  enabled                 = COALESCE(enabled,                 true),
  updated_at              = COALESCE(updated_at,              NOW());

-- 4) Enforce NOT NULL where Prisma expects non-null types
ALTER TABLE public.global_notification_settings
  ALTER COLUMN max_requests_per_minute SET NOT NULL,
  ALTER COLUMN request_delay_ms        SET NOT NULL,
  ALTER COLUMN max_retry_attempts      SET NOT NULL,
  ALTER COLUMN retry_delay_ms          SET NOT NULL,
  ALTER COLUMN exponential_backoff     SET NOT NULL,
  ALTER COLUMN failure_threshold       SET NOT NULL,
  ALTER COLUMN recovery_timeout_ms     SET NOT NULL,
  ALTER COLUMN enabled                 SET NOT NULL,
  ALTER COLUMN created_at              SET NOT NULL,
  ALTER COLUMN updated_at              SET NOT NULL;


