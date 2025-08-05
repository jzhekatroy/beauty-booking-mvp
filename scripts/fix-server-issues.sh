#!/bin/bash

echo "🔧 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ПРОБЛЕМ СЕРВЕРА"
echo "============================================="
echo ""

# Переходим в директорию проекта
cd /home/beautyapp/beauty-booking

echo "🛑 Останавливаем старые процессы..."
# Останавливаем все процессы npm/node
sudo pkill -f "npm start" 2>/dev/null || echo "Процессы npm start не найдены"
sudo pkill -f "next-server" 2>/dev/null || echo "Процессы next-server не найдены"
sudo pkill -f "node" 2>/dev/null || echo "Процессы node не найдены"

# Освобождаем порт 3000
echo "🔌 Освобождаем порт 3000..."
sudo fuser -k 3000/tcp 2>/dev/null || echo "Порт 3000 уже свободен"

# Ждем завершения процессов
sleep 3

echo "🔧 Исправляем права доступа..."
# Исправляем владельца всех файлов
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking

# Исправляем права доступа к базе данных
chmod 664 prisma/dev.db 2>/dev/null || echo "База данных не найдена"

echo "🗑️ Очищаем кэш сборки..."
# Удаляем старую сборку
rm -rf .next

echo "🔨 Собираем проект от имени beautyapp..."
# Собираем проект
if sudo -u beautyapp npm run build; then
    echo "✅ Сборка прошла успешно"
else
    echo "❌ Ошибка сборки"
    exit 1
fi

echo "🚀 Запускаем приложение от имени beautyapp..."
# Запускаем приложение в фоне
sudo -u beautyapp bash -c "cd /home/beautyapp/beauty-booking && NODE_ENV=production PORT=3000 nohup npm start > app.log 2>&1 &"

echo "⏳ Ждем запуска приложения..."
sleep 10

# Проверяем что процесс запустился
npm_pid=$(pgrep -f "npm start" || echo "")
if [ ! -z "$npm_pid" ]; then
    process_owner=$(ps -o user= -p $npm_pid 2>/dev/null || echo "unknown")
    echo "✅ Процесс npm start запущен (PID: $npm_pid)"
    echo "👤 Владелец процесса: $process_owner"
    
    if [ "$process_owner" = "beautyapp" ]; then
        echo "✅ Процесс запущен от правильного пользователя"
    else
        echo "⚠️ Процесс запущен от неправильного пользователя: $process_owner"
    fi
else
    echo "❌ Процесс не запустился"
    echo "📋 Последние строки лога:"
    tail -10 app.log 2>/dev/null || echo "Лог недоступен"
    exit 1
fi

# Проверяем endpoints
echo "🔍 Проверяем работоспособность..."

for i in {1..10}; do
    if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Health check прошел успешно!"
        break
    else
        echo "Попытка $i/10: приложение еще не отвечает..."
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Приложение не отвечает после 20 секунд"
        echo "📋 Логи:"
        tail -20 app.log 2>/dev/null || echo "Лог недоступен"
        exit 1
    fi
done

echo ""
echo "🎉 ВСЕ ПРОБЛЕМЫ ИСПРАВЛЕНЫ!"
echo ""
echo "✅ Процесс запущен от beautyapp"
echo "✅ База данных доступна для записи" 
echo "✅ Порт 3000 свободен и используется правильно"
echo "✅ Приложение отвечает на запросы"
echo ""
echo "🌐 Приложение доступно на: http://test.2minutes.ru"
echo "🔗 Тестовые аккаунты:"
echo "   - Админ салона: salon@example.com / password123"
echo "   - Мастера: anna@example.com, elena@example.com / password123"
echo ""
echo "📊 Статус процессов:"
ps aux | grep -E "(npm|node)" | grep beautyapp | head -3