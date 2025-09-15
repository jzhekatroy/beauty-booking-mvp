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

echo "🔄 Применяем миграции (prisma migrate deploy)..."
npx prisma migrate deploy

echo "🧩 Выполняем post-migrate bootstrap..."
npx tsx scripts/post-migrate-bootstrap.ts

echo "🔨 Собираем проект..."
npm run build

echo "🛑 Останавливаем текущий процесс..."
sudo pkill -f "npm start" || true
sleep 2

echo "🔄 Запускаем новую версию..."
sudo -u beautyapp NODE_ENV=production PORT=3000 DATABASE_URL="$DATABASE_URL" nohup npm start > /dev/null 2>&1 &

echo "⏳ Ждем запуска приложения..."
sleep 5

# Проверяем, что приложение запустилось
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "🧪 Проверяем эндпоинт глобальных настроек..."
    if curl -f http://localhost:3000/api/superadmin/global-notification-settings > /dev/null 2>&1; then
        echo "✅ Деплой успешно завершен!"
        echo "🌐 Приложение доступно на http://test.2minutes.ru"
        echo "🚜 Запускаем воркер очереди..."
        # Запускаем воркер как отдельный процесс (если compose не используется на проде)
        sudo pkill -f "scripts/queue-worker.js" || true
        sudo -u beautyapp NODE_ENV=production DATABASE_URL="$DATABASE_URL" nohup node scripts/queue-worker.js > /dev/null 2>&1 &
    else
        echo "❌ Эндпоинт глобальных настроек недоступен (non-2xx)"
        exit 1
    fi
else
    echo "❌ Приложение не отвечает на health check"
    echo "🔍 Проверьте логи: sudo journalctl -u beauty-booking -f"
    exit 1
fi