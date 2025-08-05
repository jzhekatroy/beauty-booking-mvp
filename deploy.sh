#!/bin/bash

echo "🚀 Деплой Beauty Booking"
echo "======================="

# Проверяем есть ли изменения
if [[ -z $(git status --porcelain) ]]; then
    echo "❌ Нет изменений для деплоя"
    exit 1
fi

# Показываем изменения
echo "📝 Изменения:"
git diff --name-only

# Запрашиваем версию
echo
read -p "🏷️ Новая версия (например v1.2): " VERSION
read -p "📝 Что изменилось: " DESCRIPTION

# Добавляем v если не указан
if [[ ! $VERSION =~ ^v ]]; then
    VERSION="v$VERSION"
fi

echo
echo "💾 Сохраняем изменения..."
git add .
git commit -m "$VERSION - $DESCRIPTION"

echo "🏷️ Создаем тег версии..."
git tag $VERSION

echo "🔨 Собираем приложение..."
npm run build

if [ $? -eq 0 ]; then
    echo
    echo "🎉 Деплой завершен!"
    echo "📦 Версия: $VERSION"
    echo "📝 Описание: $DESCRIPTION"
    echo "🔗 Изменения сохранены в Git"
else
    echo "❌ Ошибка сборки! Откатываем..."
    git reset --hard HEAD~1
    git tag -d $VERSION
    exit 1
fi