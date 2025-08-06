#!/bin/bash

echo "🚨 ОСТОРОЖНО: СБРОС БАЗЫ ДАННЫХ"
echo "================================"
echo ""
echo "🛡️  ОПЕРАЦИЯ ЗАБЛОКИРОВАНА ДЛЯ ЗАЩИТЫ ДАННЫХ!"
echo ""

# ЗАЩИТА: требуем специальный флаг для выполнения
if [ "$1" != "--force-delete-all-data" ]; then
    echo "❌ ОПЕРАЦИЯ ЗАБЛОКИРОВАНА!"
    echo ""
    echo "⚠️  Это действие УДАЛИТ ВСЕ ДАННЫЕ в базе данных:"
    echo "   - Всех пользователей и мастеров"
    echo "   - Все услуги и группы услуг"
    echo "   - Все записи и клиентов"
    echo "   - Всю историю и настройки"
    echo ""
    echo "Для принудительного сброса базы данных используйте:"
    echo "  $0 --force-delete-all-data"
    echo ""
    echo "🔄 Рекомендуемые безопасные действия:"
    echo "  - Исправить права: ./scripts/fix-database-permissions.sh"
    echo "  - Создать бэкап: ./scripts/protect-database.sh"
    echo "  - Восстановить из бэкапа: /home/beautyapp/db-backups/restore-latest.sh"
    echo ""
    exit 1
fi

echo "🔓 Флаг --force-delete-all-data получен."
echo "⚠️  Это действие УДАЛИТ ВСЕ ДАННЫЕ в базе данных:"
echo "   - Всех пользователей и мастеров"
echo "   - Все услуги и группы услуг"
echo "   - Все записи и клиентов"
echo "   - Всю историю и настройки"
echo ""
echo "💾 База данных будет пересоздана с тестовыми данными."
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем наличие резервной копии
if [ -f "prisma/dev.db" ]; then
    echo "📋 Текущая база данных найдена: prisma/dev.db"
    echo "📊 Размер: $(du -h prisma/dev.db | cut -f1)"
    echo ""
fi

# Запрашиваем подтверждение
read -p "❓ Вы ДЕЙСТВИТЕЛЬНО хотите удалить все данные? (введите 'УДАЛИТЬ' для подтверждения): " confirmation

if [ "$confirmation" != "УДАЛИТЬ" ]; then
    echo "❌ Операция отменена. Данные сохранены."
    exit 0
fi

echo ""
echo "⏳ Начинаем сброс базы данных..."

# Создаем резервную копию перед удалением
if [ -f "prisma/dev.db" ]; then
    backup_name="prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Создаем резервную копию: $backup_name"
    cp "prisma/dev.db" "$backup_name"
    echo "✅ Резервная копия создана"
fi

# Останавливаем процессы приложения
echo "🛑 Останавливаем процессы приложения..."
pkill -f "npm start" 2>/dev/null || echo "   Процессы npm start не найдены"
pkill -f "next" 2>/dev/null || echo "   Процессы Next.js не найдены"
sleep 2

# Удаляем базу данных
echo "🗑️ Удаляем старую базу данных..."
rm -f prisma/dev.db

# Создаем новую базу данных
echo "🏗️ Создаем новую базу данных..."
if npx prisma db push; then
    echo "✅ Схема базы данных создана"
else
    echo "❌ Ошибка создания схемы базы данных"
    exit 1
fi

# Заполняем тестовыми данными
echo "🌱 Заполняем тестовыми данными..."
if npm run db:seed; then
    echo "✅ Тестовые данные добавлены"
else
    echo "❌ Ошибка добавления тестовых данных"
    exit 1
fi

# Исправляем права доступа
echo "🔧 Исправляем права доступа..."
chmod 664 prisma/dev.db

echo ""
echo "🎉 Сброс базы данных завершен!"
echo ""
echo "🔗 Тестовые аккаунты:"
echo "   - Супер-админ: admin@beauty-booking.com / admin123"
echo "   - Админ салона: salon@example.com / password123"
echo "   - Мастера: anna@example.com, elena@example.com / password123"
echo ""
echo "💾 Резервные копии находятся в папке prisma/ с расширением .backup.*"
echo ""
echo "🚀 Теперь можно запустить приложение: npm start"