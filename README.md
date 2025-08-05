# Beauty Booking MVP

Система записи на бьюти-услуги с тремя уровнями доступа: БОГ-админка, админка команды и публичный виджет записи.

## Технологический стек

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База данных**: PostgreSQL с Prisma ORM
- **Авторизация**: JWT токены
- **Календарь**: FullCalendar (планируется)
- **UI**: Lucide React icons

## Архитектура системы

### 1. БОГ-админка (Super Admin)
- Управление всеми командами (салонами)
- Поиск команд по номеру B0XXXXXXX
- Управление статусом команд (активна/отключена)
- Управление лимитом мастеров
- Система вебхуков
- Журнал действий

### 2. Админка команды
- Календарь с бронированиями (FullCalendar)
- Управление бронированиями
- Управление клиентами
- Управление услугами и группами услуг
- Управление мастерами и расписанием
- Настройки команды

### 3. Публичный виджет записи
- Уникальный URL для каждой команды
- Пошаговый процесс записи (услуги → мастер и время → контакты)
- Адаптивный дизайн
- Согласие на обработку персональных данных

## Особенности

- **Уникальные номера команд**: Формат B0XXXXXXX
- **Роли пользователей**: SUPER_ADMIN, ADMIN, MASTER
- **Статусы бронирований**: CREATED, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED_BY_CLIENT, CANCELLED_BY_STAFF
- **Настраиваемый шаг бронирования**: 5-60 минут (по умолчанию 15 минут)
- **Система логирования**: Все операции с бронированиями сохраняются
- **Вебхуки**: Уведомления о ключевых действиях с бронями

## Установка и запуск

### Предварительные требования

- Node.js 18+ 
- PostgreSQL
- npm или yarn

### 1. Клонирование и установка зависимостей

```bash
cd beauty-booking
npm install
```

### 2. Настройка базы данных

Создайте базу данных PostgreSQL и обновите строку подключения в `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/beauty_booking?schema=public"
```

### 3. Настройка переменных окружения

Скопируйте `.env` и обновите значения:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/beauty_booking?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# JWT
JWT_SECRET="your-jwt-secret-here"

# App Settings
APP_URL="http://localhost:3000"

# Super Admin Default
SUPER_ADMIN_EMAIL="admin@beauty-booking.com"
SUPER_ADMIN_PASSWORD="admin123"
```

### 4. Инициализация базы данных

```bash
npx prisma generate
npx prisma db push
```

### 5. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу http://localhost:3000

## Структура URL

- `/` - Главная страница с регистрацией команды
- `/login` - Страница входа
- `/admin` - Админка команды (календарь)
- `/admin/bookings` - Управление бронированиями
- `/admin/clients` - Управление клиентами  
- `/admin/services` - Управление услугами
- `/admin/masters` - Управление мастерами
- `/admin/settings` - Настройки команды
- `/super-admin` - БОГ-админка (планируется)
- `/book/[slug]` - Публичный виджет записи

## Развертывание

### Vercel (рекомендуется)

```bash
npm install -g vercel
vercel
```

### Docker

```bash
docker build -t beauty-booking .
docker run -p 3000:3000 beauty-booking
```

## Текущий статус разработки

### ✅ Завершено
- [x] Настройка проекта с Next.js, TypeScript, Tailwind CSS
- [x] Схема базы данных Prisma
- [x] Система авторизации с JWT
- [x] API регистрации и входа
- [x] Базовый layout админки команды
- [x] Главная страница календаря (с заглушкой)
- [x] Публичный виджет записи

### 🚧 В разработке
- [ ] БОГ-админка
- [ ] Интеграция FullCalendar
- [ ] API для работы с бронированиями
- [ ] Система вебхуков
- [ ] Детальное логирование

### 📋 Планируется
- [ ] Восстановление пароля
- [ ] Загрузка файлов (фото услуг, логотипы)
- [ ] Email уведомления
- [ ] Экспорт данных
- [ ] Мобильное приложение

## API Документация

### Авторизация

#### POST /api/auth/register
Регистрация новой команды

```json
{
  "email": "admin@example.com",
  "password": "password123",
  "teamName": "Beauty Salon",
  "contactPerson": "Иван Иванов"
}
```

#### POST /api/auth/login
Вход в систему

```json
{
  "email": "admin@example.com", 
  "password": "password123"
}
```

## Модель данных

### Основные сущности
- **Team** - Команда/салон
- **User** - Пользователь системы
- **Master** - Мастер
- **Service** - Услуга
- **ServiceGroup** - Группа услуг
- **Client** - Клиент
- **Booking** - Бронирование
- **BookingLog** - Лог операций с бронированиями

## Поддержка

Для вопросов и предложений создавайте issues в репозитории.

## Лицензия

MIT License
