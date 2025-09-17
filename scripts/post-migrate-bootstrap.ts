import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureGlobalNotificationSettings(): Promise<void> {
  try {
    // Проверяем доступность таблицы (важно для ранней диагностики миграций)
    await prisma.$queryRawUnsafe(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_notification_settings'"
    )
  } catch (error) {
    console.error('❌ Таблица global_notification_settings недоступна. Проверьте миграции.', error)
    throw error
  }

    // Идемпотентно создаем запись, если её нет
  const existing = await prisma.globalNotificationSettings.findFirst()
  if (!existing) {
    await prisma.globalNotificationSettings.create({
      data: {
        // Все дефолты определены в Prisma-схеме
      },
    })
    console.log('✅ Создана запись GlobalNotificationSettings с настройками по умолчанию')
  } else {
    console.log('ℹ️ Запись GlobalNotificationSettings уже существует — пропускаем создание')
  }
}

async function main() {
  console.log('🔧 Post-migrate bootstrap: старт')
  await ensureGlobalNotificationSettings()
  // Ensure email verification schema (self-healing for prod)
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "emailVerifiedAt" timestamptz NULL;')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.email_verification_codes (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        code_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        sent_at timestamptz NOT NULL DEFAULT now(),
        consumed_at timestamptz NULL,
        attempts int NOT NULL DEFAULT 0
      );
    `)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS evc_user_id_expires_idx ON public.email_verification_codes (user_id, expires_at);')
    console.log('✅ Email verification schema ensured')
  } catch (e) {
    console.error('❌ Failed to ensure email verification schema', e)
  }
  console.log('🎉 Post-migrate bootstrap: завершено успешно')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('❌ Ошибка в post-migrate bootstrap:', error)
    await prisma.$disconnect()
    process.exit(1)
  })


