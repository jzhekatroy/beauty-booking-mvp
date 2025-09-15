#!/bin/bash

# Скрипт автодеплоя для beauty-booking
set -e

echo "🚀 Начинаем деплой beauty-booking..."

# Переходим в директорию проекта
cd /home/beautyapp/beauty-booking

echo "📥 Получаем последние изменения из GitHub..."
git fetch origin
git reset --hard origin/main

# Загружаем переменные окружения из .env (если есть)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "📦 Устанавливаем зависимости..."
npm ci --production=false

echo "💾 Делаем бэкап базы перед миграциями..."
./scripts/backup-before-migrate.sh || true

echo "🔧 Останавливаем Docker стек (если используется) и удаляем осиротевшие контейнеры..."
docker compose down --remove-orphans || true
docker rm -f beauty-booking-app || true

echo "🔄 Применяем миграции (prisma migrate deploy)..."
npx prisma migrate deploy

echo "🧩 Выполняем post-migrate bootstrap..."
npx tsx scripts/post-migrate-bootstrap.ts

echo "🔨 Собираем проект..."
npm run build

echo "🐳 Запускаем через Docker Compose..."
docker compose up -d || true

echo "🗄️ Применяем миграции внутри контейнера..."
docker compose exec -T beauty-booking npx prisma migrate deploy || true

echo "🚜 Запускаем воркер очереди через Docker Compose..."
docker compose up -d queue-worker || true

echo "⏳ Ждем запуска приложения..."
sleep 8

# Проверяем, что приложение запустилось
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "🧪 Проверяем эндпоинт глобальных настроек..."
    if curl -f http://localhost:3000/api/superadmin/global-notification-settings > /dev/null 2>&1; then
        echo "✅ Деплой успешно завершен!"
        echo "🌐 Приложение доступно на http://test.2minutes.ru"
        echo "ℹ️ Воркёр очереди работает в сервисе Docker Compose: queue-worker"
    else
        echo "❌ Эндпоинт глобальных настроек недоступен (non-2xx)"
        exit 1
    fi
else
    echo "❌ Приложение не отвечает на health check"
    echo "🔍 Проверьте логи: sudo journalctl -u beauty-booking -f"
    exit 1
fi