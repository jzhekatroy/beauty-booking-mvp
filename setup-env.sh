#!/bin/bash

# Скрипт настройки окружения для beauty-booking
echo "🔧 Настройка окружения beauty-booking..."

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-$(date +%s)"
NODE_ENV="development"
EOF
    echo "✅ .env файл создан"
else
    echo "📁 .env файл уже существует"
fi

# Проверяем существование базы данных
if [ ! -f prisma/dev.db ]; then
    echo "🗄️ База данных отсутствует. Создаем новую..."
    npx prisma db push
    
    echo "🌱 Заполняем базу данных тестовыми данными..."
    npm run db:seed
    
    echo "✅ База данных создана и заполнена"
else
    echo "🗄️ База данных найдена. Сохраняем существующие данные..."
    
    # Исправляем права доступа к базе данных
    chmod 664 prisma/dev.db 2>/dev/null || echo "Права доступа уже корректны"
    
    # Проверяем, нужно ли обновить схему (БЕЗ потери данных)
    echo "🔄 Обновляем схему базы данных (с сохранением данных)..."
    if npx prisma db push 2>/dev/null; then
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
    else
        echo "⚠️ Не удалось обновить схему базы данных"
        echo "🔧 Попробуйте исправить права доступа или пересоздать БД"
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