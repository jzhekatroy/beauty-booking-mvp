# Beauty Booking MVP

## 🎯 Система управления записями для салонов красоты

### ✅ Текущие возможности:
- Управление мастерами и услугами
- Система расписания мастеров
- Архивирование услуг
- Защищенная база данных
- Автодеплой с сохранением данных

### 🔥 Последние обновления:
- **Управление расписанием мастеров** - полный недельный календарь
- **Защита базы данных** - данные сохраняются при деплоях
- **Безопасные обновления схемы** - отдельный процесс

### 🚀 Тестирование сохранности данных
*Деплой запущен для проверки сохранности пользовательских данных*

---

## Установка и запуск

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

## Структура проекта

- `/src/app` - Next.js приложение
- `/src/components` - React компоненты
- `/prisma` - Схема базы данных
- `/scripts` - Скрипты управления

## API Routes

- `/api/auth/*` - Авторизация
- `/api/masters/*` - Управление мастерами
- `/api/services/*` - Управление услугами
- `/api/teams/*` - Информация о салонах
 - `/api/superadmin/*` - БОГ‑админка (требуется роль SUPER_ADMIN)

## База данных

По умолчанию используется SQLite с Prisma ORM (локально). Для продакшена рекомендуется PostgreSQL.

Быстрый старт с Postgres (Docker):
```bash
npm run pg:up
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/beauty?schema=public"
npx prisma generate && npx prisma migrate dev
npm run dev
```

Подробнее: `docs/postgres-setup.md`.

## Документация

- Пользовательские гайды:
  - `docs/calendar-user.md`
  - `docs/bookings-summary-user.md`
  - `docs/superadmin-user.md`

- Технические гайды:
  - `docs/calendar-technical.md`
  - `docs/bookings-summary-technical.md`
  - `docs/superadmin-technical.md`
