#!/bin/bash

echo "🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ СХЕМЫ БАЗЫ ДАННЫХ"
echo "⚠️  Используйте этот скрипт ТОЛЬКО при изменении схемы Prisma!"
echo ""

if [ "$1" != "--confirm" ]; then
    echo "❌ Для безопасности требуется подтверждение."
    echo ""
    echo "Используйте: $0 --confirm"
    echo ""
    echo "🔒 Этот скрипт:"
    echo "   - Создаст резервную копию базы данных"
    echo "   - Обновит схему через prisma db push"
    echo "   - Восстановит данные в случае ошибки"
    echo ""
    exit 1
fi

echo "✅ Подтверждение получено. Начинаем обновление схемы..."
echo ""

# Проверяем наличие базы данных
if [ ! -f prisma/dev.db ]; then
    echo "❌ База данных не найдена!"
    echo "🆘 Создаем новую базу данных..."
    npx prisma db push
    npm run db:seed
    echo "✅ Новая база данных создана и заполнена"
    exit 0
fi

# Создаем резервную копию
BACKUP_FILE="/home/beautyapp/db-backups/manual_schema_update_$(date +%Y%m%d_%H%M%S).db"
mkdir -p /home/beautyapp/db-backups
cp prisma/dev.db "$BACKUP_FILE"
echo "💾 Резервная копия создана: $BACKUP_FILE"

# Обновляем схему
echo "🔄 Обновляем схему базы данных..."
if npx prisma db push; then
    echo "✅ Схема базы данных успешно обновлена!"
    
    # Проверяем что данные на месте
    if node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(count => console.log('Пользователей в базе:', count)).catch(err => {console.error('Ошибка:', err); process.exit(1)}).finally(() => prisma.\$disconnect())" 2>/dev/null; then
        echo "✅ Данные в базе сохранились!"
        echo "📋 Резервная копия сохранена на случай проблем: $BACKUP_FILE"
    else
        echo "❌ Проблема с данными после обновления схемы!"
        echo "🔄 Восстанавливаем из резервной копии..."
        cp "$BACKUP_FILE" prisma/dev.db
        chmod 664 prisma/dev.db
        echo "✅ Данные восстановлены из резервной копии"
    fi
else
    echo "❌ Ошибка обновления схемы!"
    echo "🔄 Восстанавливаем из резервной копии..."
    cp "$BACKUP_FILE" prisma/dev.db  
    chmod 664 prisma/dev.db
    echo "✅ Данные восстановлены из резервной копии"
    exit 1
fi

echo ""
echo "🎉 Обновление схемы завершено!"
echo "📁 Резервная копия: $BACKUP_FILE"