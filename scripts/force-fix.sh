#!/bin/bash

echo "🔥 Принудительное исправление серверных проблем..."

# Останавливаем все процессы Node.js/npm агрессивно
echo "🛑 Останавливаем все процессы..."

# Показываем что сейчас на порту 3000
echo "📊 Текущие процессы на порту 3000:"
netstat -punta | grep 3000 || echo "Порт свободен"

# Убиваем next-server (основная проблема)
echo "🎯 Убиваем next-server процессы..."
sudo pkill -9 -f "next-server" || true

# Сначала мягко
sudo pkill -f "npm start" || true
sudo pkill -f "node" || true
sudo pkill -f "npm" || true
sleep 2

# Потом жестко
sudo pkill -9 -f "npm start" || true
sudo pkill -9 -f "node" || true
sudo pkill -9 -f "npm" || true
sleep 2

# Освобождаем порт 3000 агрессивно
echo "🔓 Освобождаем порт 3000..."
sudo fuser -k 3000/tcp || true
sleep 1
sudo fuser -9 -k 3000/tcp || true

# Убиваем все что висит на порту 3000 по PID
PIDS=$(sudo lsof -t -i:3000 2>/dev/null || true)
if [ ! -z "$PIDS" ]; then
    echo "🔫 Убиваем процессы на порту 3000: $PIDS"
    sudo kill -9 $PIDS || true
fi

# Дополнительная проверка через netstat
NETSTAT_PIDS=$(netstat -punta | grep ':3000' | awk '{print $7}' | cut -d'/' -f1 | grep -v '^-$' || true)
if [ ! -z "$NETSTAT_PIDS" ]; then
    echo "🎯 Убиваем через netstat: $NETSTAT_PIDS"
    echo "$NETSTAT_PIDS" | xargs -r sudo kill -9 || true
fi

sleep 3

# Финальная проверка
echo "✅ Проверяем что порт 3000 свободен:"
netstat -punta | grep 3000 || echo "✅ Порт 3000 свободен!"

# Защищаем базу данных от случайного удаления
echo "🛡️ Создаем резервную копию базы данных перед исправлениями..."
chmod +x scripts/protect-database.sh
./scripts/protect-database.sh

# Исправляем права доступа
echo "🔧 Исправляем права доступа..."
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
sudo chmod 664 /home/beautyapp/beauty-booking/prisma/dev.db || true

# Очищаем кэш
echo "🧹 Очищаем кэш..."
sudo rm -rf /home/beautyapp/beauty-booking/.next
sudo rm -rf /home/beautyapp/beauty-booking/node_modules/.cache

# Переустанавливаем зависимости если нужно
echo "📦 Проверяем зависимости..."
cd /home/beautyapp/beauty-booking
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📥 Переустанавливаем зависимости..."
    sudo -u beautyapp npm ci
fi

# Проверяем окружение (без setup-env.sh)
echo "⚙️ Проверяем окружение..."
if [ ! -f .env ]; then
    echo "⚠️ .env файл отсутствует, но НЕ запускаем setup-env.sh"
    echo "🛡️ ЗАЩИТА: setup-env.sh может сбросить базу данных"
    echo "📋 Создайте .env вручную или убедитесь что он есть"
else
    echo "📁 .env файл существует ✅"
fi

# Исправляем права доступа к базе если нужно
if [ -f prisma/dev.db ]; then
    sudo chmod 664 prisma/dev.db || true
    echo "✅ Права доступа к базе исправлены"
fi

# Собираем проект
echo "🔨 Собираем проект..."
sudo -u beautyapp npm run build

# Запускаем приложение
echo "🚀 Запускаем приложение..."
cd /home/beautyapp/beauty-booking
sudo -u beautyapp nohup npm start > nohup.out 2>&1 &

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 5

# Проверяем статус
echo "🔍 Проверяем статус..."

# Дополнительная проверка - убиваем старые процессы если они еще есть
OLD_PIDS=$(sudo lsof -t -i:3000 2>/dev/null | grep -v $(pgrep -f "npm start" | head -1) || true)
if [ ! -z "$OLD_PIDS" ]; then
    echo "🧹 Убираем старые процессы: $OLD_PIDS"
    sudo kill -9 $OLD_PIDS || true
    sleep 2
fi

if pgrep -f "npm start" > /dev/null; then
    echo "✅ Приложение запущено!"
    echo "📊 Процессы: $(pgrep -f 'npm start' | wc -l)"
    echo "🔌 Порт 3000: $(sudo lsof -i:3000 2>/dev/null | wc -l) соединений"
    
    # Проверяем доступность несколько раз
    for i in {1..3}; do
        if curl -s http://localhost:3000/api/status > /dev/null; then
            echo "✅ Приложение отвечает на запросы! (попытка $i)"
            break
        else
            echo "⏳ Ждем ответа приложения (попытка $i)..."
            sleep 2
        fi
    done
    
    # Финальная проверка
    if curl -s http://localhost:3000/api/status > /dev/null; then
        echo "🎉 Приложение готово к работе!"
    else
        echo "⚠️ Приложение запущено, но не отвечает на запросы"
        echo "📋 Последние строки логов:"
        tail -5 nohup.out || echo "Логи недоступны"
    fi
else
    echo "❌ Ошибка запуска приложения"
    echo "📋 Последние строки логов:"
    tail -10 nohup.out || echo "Логи недоступны"
    exit 1
fi

echo "🎉 Исправление завершено!"
exit 0