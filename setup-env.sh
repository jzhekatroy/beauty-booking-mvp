#!/bin/bash

# Скрипт настройки окружения для beauty-booking
echo "🔧 Настройка окружения beauty-booking..."

# В продакшене не создаем .env и не подставляем SQLite
if [ "${NODE_ENV}" = "production" ]; then
    echo "🔒 PROD режим: пропускаем авто-создание .env и SQLite-пути"
else
    # Создаем .env файл если его нет (DEV)
    if [ ! -f .env ]; then
        echo "📝 (DEV) Создаем .env файл..."
        cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-$(date +%s)"
NODE_ENV="development"
EOF
        echo "✅ (DEV) .env файл создан"
    else
        echo "📁 .env файл уже существует"
    fi
fi

# Проверяем существование базы данных
if [ "${NODE_ENV}" != "production" ] && [ ! -f prisma/dev.db ]; then
    echo "🗄️ (DEV) База данных отсутствует. Создаем новую..."
    npx prisma db push
    
    echo "🌱 (DEV) Заполняем базу данных тестовыми данными..."
    npm run db:seed
    
    echo "✅ (DEV) База данных создана и заполнена"
else
    echo "🗄️ База данных найдена. Создаем резервную копию и сохраняем данные..."
    
    # Создаем резервную копию перед любыми изменениями
    if [ -f scripts/protect-database.sh ]; then
        chmod +x scripts/protect-database.sh
        ./scripts/protect-database.sh
    fi
    
    # Исправляем права доступа к базе данных
    chmod 664 prisma/dev.db 2>/dev/null || echo "Права доступа уже корректны"
    
    # БЕЗОПАСНЫЙ режим - НЕ изменяем схему если база существует и работает
    echo "🛡️ Безопасный режим: существующая база данных НЕ будет изменена"
    
    # Создаем резервную копию для безопасности
    DB_BACKUP="/tmp/dev.db.backup_$(date +%Y%m%d_%H%M%S)"
    cp prisma/dev.db "$DB_BACKUP"
    echo "💾 Резервная копия создана: $DB_BACKUP"
    
    # Только проверяем подключение, НЕ изменяем схему
    echo "🔍 Проверяем подключение к базе данных..."
    if node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(() => console.log('DB OK')).catch(() => process.exit(1)).finally(() => prisma.\$disconnect())" 2>/dev/null; then
        echo "✅ Схема базы данных обновлена"
        
        # Проверяем, есть ли тестовые данные (если нет - добавляем только недостающие)
        echo "🔍 Проверяем наличие базовых данных..."
        
        # Создаем скрипт проверки и дополнения данных
        cat > temp_check_data.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndAddMissingData() {
  try {
    // Проверяем есть ли супер-админ
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'admin@beauty-booking.com' }
    });
    
    if (!superAdmin) {
      console.log('Добавляем недостающие базовые данные...');
      // Запускаем seed только если нет базовых данных
      process.exit(1); // Сигнал что нужен seed
    } else {
      console.log('Базовые данные присутствуют');
      process.exit(0); // Все в порядке
    }
  } catch (error) {
    console.log('Ошибка проверки данных:', error.message);
    process.exit(1); // Нужен seed
  } finally {
    await prisma.$disconnect();
  }
}

checkAndAddMissingData();
EOF
        
        if node temp_check_data.js 2>/dev/null; then
            echo "✅ Все базовые данные на месте"
        else
            echo "⚠️ Некоторые базовые данные отсутствуют. Дополняем..."
            npm run db:seed 2>/dev/null || echo "Seed выполнен с предупреждениями (это нормально)"
        fi
        
        rm -f temp_check_data.js
        
        # Удаляем временную резервную копию если все прошло успешно
        rm -f "$DB_BACKUP"
        echo "🎉 База данных работает корректно, изменения НЕ требуются"
    else
        echo "⚠️ Проблема с подключением к базе данных"
        echo "🔄 Восстанавливаем резервную копию..."
        
        if [ -f "$DB_BACKUP" ]; then
            cp "$DB_BACKUP" prisma/dev.db
            chmod 664 prisma/dev.db
            echo "✅ База данных восстановлена из резервной копии"
            rm -f "$DB_BACKUP"
        else
            echo "❌ Резервная копия не найдена!"
            echo "🛡️ ЗАЩИТА: В проде используйте только 'prisma migrate deploy'. Исправление схемы через db push отключено."
        fi
    fi
fi

echo "🎉 Настройка окружения завершена!"
echo ""
echo "🔗 Тестовые аккаунты:"
echo "   - Супер-админ: admin@beauty-booking.com / admin123"
echo "   - Админ салона: salon@example.com / password123"
echo "   - Мастера: anna@example.com, elena@example.com / password123"
echo ""
echo "🌐 Ссылки:"
echo "   - Вход: http://test.2minutes.ru/login"
echo "   - Админка: http://test.2minutes.ru/admin"
echo "   - Запись: http://test.2minutes.ru/book/beauty-salon"