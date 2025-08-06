#!/bin/bash

echo "🔫 Принудительное освобождение порта 3000..."

# Показываем что сейчас висит на порту 3000
echo "📊 Текущие процессы на порту 3000:"
sudo lsof -i:3000 || echo "Порт свободен"

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
    echo "🎯 Убиваем процессы: $PIDS"
    sudo kill -9 $PIDS || true
fi

sleep 2

# Проверяем результат
echo "✅ Проверяем результат:"
if sudo lsof -i:3000 > /dev/null 2>&1; then
    echo "❌ Порт 3000 все еще занят:"
    sudo lsof -i:3000
else
    echo "✅ Порт 3000 свободен!"
fi

echo "🎉 Готово!"
exit 0