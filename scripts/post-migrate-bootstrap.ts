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


