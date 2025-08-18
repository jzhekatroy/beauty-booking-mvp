#!/bin/bash

echo "🐳 Инициализация Beauty Booking в Docker..."

# Ждем, пока приложение запустится
echo "⏳ Ожидание запуска приложения..."
sleep 10

# Проверяем health check
echo "🔍 Проверка состояния приложения..."
until curl -f http://localhost:3000/api/health; do
  echo "⏳ Приложение еще не готово, ждем..."
  sleep 5
done

echo "✅ Приложение запущено!"

echo "🗄️ Проверка базы данных... (только миграции в проде)"
# В проде применяем только миграции, без db push
docker exec beauty-booking-app npx prisma migrate deploy || true

echo "🎉 Инициализация завершена!"
echo ""
echo "🔗 Приложение доступно по адресу:"
echo "   http://localhost:3000"
echo ""
echo "🔑 Доступы для входа:"
echo "   Супер-админ: admin@beauty-booking.com / admin123"
echo "   Админ салона: salon@example.com / password123"