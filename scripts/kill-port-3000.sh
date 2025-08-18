#!/bin/bash

echo "🔫 Принудительное освобождение порта 3000..."

# Показываем что сейчас висит на порту 3000
echo "📊 Текущие процессы на порту 3000:"
netstat -punta | grep 3000 || echo "Порт свободен"

# Убиваем next-server (основная проблема!)
echo "🎯 Убиваем next-server процессы..."
sudo pkill -9 -f "next-server" || true

# Убиваем все процессы npm/node
echo "🛑 Убиваем все Node.js процессы..."
sudo pkill -9 -f "npm" || true
sudo pkill -9 -f "node" || true

# Принудительно освобождаем порт 3000
echo "🔓 Освобождаем порт 3000..."
sudo fuser -9 -k 3000/tcp || true

# Убиваем по PID все что на порту 3000
PIDS=$(sudo lsof -t -i:3000 2>/dev/null || true)
if [ ! -z "$PIDS" ]; then
    echo "🎯 Убиваем через lsof: $PIDS"
    sudo kill -9 $PIDS || true
fi

# Убиваем через netstat (как в примере пользователя)
NETSTAT_PIDS=$(netstat -punta | grep ':3000' | awk '{print $7}' | cut -d'/' -f1 | grep -v '^-$' || true)
if [ ! -z "$NETSTAT_PIDS" ]; then
    echo "🔫 Убиваем через netstat: $NETSTAT_PIDS"
    echo "$NETSTAT_PIDS" | xargs -r sudo kill -9 || true
fi

sleep 2

# Проверяем результат
echo "✅ Проверяем результат:"
if netstat -punta | grep 3000 > /dev/null 2>&1; then
    echo "❌ Порт 3000 все еще занят:"
    netstat -punta | grep 3000
else
    echo "✅ Порт 3000 свободен!"
fi

echo "🎉 Готово!"
exit 0