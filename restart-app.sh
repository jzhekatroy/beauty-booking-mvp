#!/bin/bash

echo "🔍 Диагностика и перезапуск beauty-booking приложения"
echo "=================================================="

# Переходим в рабочую директорию
cd /home/beautyapp/beauty-booking

echo "📂 Текущая директория: $(pwd)"
echo "👤 Текущий пользователь: $(whoami)"

# Останавливаем старые процессы
echo "🛑 Останавливаем старые процессы..."
sudo pkill -f "npm start" 2>/dev/null || echo "Процессы npm start не найдены"
sudo fuser -k 3000/tcp 2>/dev/null || echo "Порт 3000 уже свободен"

# Проверяем файлы
echo "📁 Проверяем файлы..."
echo "  .env файл: $([ -f .env ] && echo '✅ Существует' || echo '❌ Отсутствует')"
echo "  База данных: $([ -f prisma/dev.db ] && echo '✅ Существует' || echo '❌ Отсутствует')"
echo "  package.json: $([ -f package.json ] && echo '✅ Существует' || echo '❌ Отсутствует')"

if [ -f .env ]; then
    echo "📝 Содержимое .env:"
    cat .env | sed 's/JWT_SECRET=.*/JWT_SECRET=***HIDDEN***/'
else
    echo "❌ .env файл отсутствует! Пропускаем авто-создание в целях безопасности."
fi

# В продакшене не выполняем auto db push/seed
if [ "${NODE_ENV}" = "production" ]; then
    echo "🔒 PROD режим: пропускаем любые auto-инициализации БД."
else
    if [ ! -f prisma/dev.db ]; then
        echo "🗄️ (DEV) База данных отсутствует. Создаем..."
        npx prisma db push
        npm run db:seed
        echo "✅ (DEV) База данных создана и заполнена"
    else
        echo "🔧 (DEV) Исправляем права доступа к базе данных..."
        chmod 664 prisma/dev.db 2>/dev/null || echo "Права уже корректны"
    fi
fi

# Исправляем права доступа
echo "🔧 Исправляем права доступа..."
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking

# Пробуем простую проверку Node.js
echo "🧪 Проверяем Node.js..."
node --version
npm --version

# Проверяем зависимости
echo "📦 Проверяем зависимости..."
if [ ! -d node_modules ]; then
    echo "📥 Устанавливаем зависимости..."
    npm ci
fi

# Удаляем .next для чистой сборки
echo "🗑️ Очищаем кэш сборки..."
rm -rf .next

# Собираем проект
echo "🔨 Собираем проект..."
if npm run build; then
    echo "✅ Проект собран успешно"
else
    echo "❌ Ошибка сборки проекта"
    exit 1
fi

# Запускаем приложение
echo "🚀 Запускаем приложение..."
NODE_ENV=development PORT=3000 nohup npm start > app.log 2>&1 &
APP_PID=$!

echo "⏳ Ждем запуска приложения..."
sleep 10

# Проверяем что процесс запустился
if kill -0 $APP_PID 2>/dev/null; then
    echo "✅ Процесс запущен (PID: $APP_PID)"
else
    echo "❌ Процесс не запустился"
    echo "📋 Последние строки лога:"
    tail -20 app.log
    exit 1
fi

# Проверяем endpoints
echo "🔍 Проверяем endpoints..."

# Простой статус
if curl -f http://localhost:3000/api/status > /dev/null 2>&1; then
    echo "✅ /api/status - работает"
else
    echo "❌ /api/status - не отвечает"
fi

# Health check
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ /api/health - работает"
else
    echo "❌ /api/health - не отвечает"
fi

# Debug endpoint
if curl -f http://localhost:3000/api/debug > /dev/null 2>&1; then
    echo "✅ /api/debug - работает"
else
    echo "❌ /api/debug - не отвечает"
fi

echo ""
echo "🎉 Диагностика завершена!"
echo "🌐 Приложение должно быть доступно на: http://test.2minutes.ru"
echo "📋 Логи приложения: tail -f /home/beautyapp/beauty-booking/app.log"