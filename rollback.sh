#!/bin/bash

echo "🔙 Откат Beauty Booking"
echo "====================="

# Показываем доступные версии
echo "📦 Доступные версии:"
git tag -l --sort=-version:refname | head -10

echo
read -p "🔄 К какой версии откатиться: " VERSION

# Добавляем v если не указан
if [[ ! $VERSION =~ ^v ]]; then
    VERSION="v$VERSION"
fi

# Проверяем что версия существует
if ! git tag -l | grep -q "^$VERSION$"; then
    echo "❌ Версия $VERSION не найдена"
    exit 1
fi

echo "⚠️  Внимание! Все несохраненные изменения будут потеряны!"
read -p "Продолжить откат к $VERSION? (y/N): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo "❌ Откат отменен"
    exit 1
fi

echo
echo "🔄 Откатываемся к версии $VERSION..."
git checkout $VERSION

echo "🔨 Пересобираем приложение..."
npm run build

if [ $? -eq 0 ]; then
    echo
    echo "✅ Откат завершен!"
    echo "📦 Текущая версия: $VERSION"
    echo "🔗 Для возврата к последней версии: git checkout main"
else
    echo "❌ Ошибка сборки после отката!"
    exit 1
fi