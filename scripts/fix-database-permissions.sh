#!/bin/bash

echo "🔧 Исправление прав доступа к базе данных"
echo "========================================"

# Проверяем, что мы в правильной директории
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем наличие базы данных
if [ ! -f "prisma/dev.db" ]; then
    echo "❌ База данных не найдена: prisma/dev.db"
    echo "💡 Создайте базу данных командой: npx prisma db push && npm run db:seed"
    exit 1
fi

echo "📋 Информация о базе данных:"
echo "   Файл: prisma/dev.db"
echo "   Размер: $(du -h prisma/dev.db | cut -f1)"
echo "   Права: $(ls -la prisma/dev.db | awk '{print $1, $3, $4}')"

# Останавливаем процессы временно
echo ""
echo "🛑 Временно останавливаем процессы приложения..."
pkill -f "npm start" 2>/dev/null || echo "   Процессы npm start не найдены"
sleep 2

# Исправляем права доступа
echo "🔧 Исправляем права доступа к базе данных..."
chmod 664 prisma/dev.db

if [ $? -eq 0 ]; then
    echo "✅ Права доступа исправлены"
else
    echo "❌ Ошибка исправления прав доступа"
    exit 1
fi

# Проверяем, что база данных работает
echo "🧪 Проверяем подключение к базе данных..."
if npx prisma db push --accept-data-loss 2>/dev/null; then
    echo "✅ База данных работает корректно"
else
    echo "⚠️ Проблемы с базой данных обнаружены"
    echo "💡 Возможно, нужно обновить схему или пересоздать БД"
    echo "🔧 Попробуйте: npx prisma db push"
    echo "⚠️ Или полный сброс: ./scripts/reset-database.sh"
fi

echo ""
echo "📊 Текущие права доступа:"
ls -la prisma/dev.db

echo ""
echo "🎉 Исправление прав доступа завершено!"
echo "🚀 Можно запускать приложение: npm start"