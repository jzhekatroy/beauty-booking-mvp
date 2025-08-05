# 🚀 Настройка GitHub деплоя для Beauty Booking

## 📋 Пошаговая инструкция

### Шаг 1: Создание репозитория на GitHub

1. Идите на [github.com](https://github.com)
2. Нажмите **"New repository"**
3. Заполните:
   - **Repository name**: `beauty-booking-mvp`
   - **Description**: `Beauty Booking MVP - система записи на бьюти-услуги`
   - **Visibility**: Private (рекомендуется) или Public
   - ❌ **НЕ** ставьте галочки на README, .gitignore, license
4. Нажмите **"Create repository"**

### Шаг 2: Настройка SSH ключей на сервере

Скопируйте файл `setup-github-deploy.sh` на ваш сервер и запустите:

```bash
# На сервере
cd /home/beautyapp/beauty-booking
wget https://your-temp-location/setup-github-deploy.sh
chmod +x setup-github-deploy.sh
./setup-github-deploy.sh
```

**Или создайте файл вручную:**

```bash
# На сервере
cd /home/beautyapp/beauty-booking
nano setup-github-deploy.sh
# Скопируйте содержимое файла setup-github-deploy.sh
chmod +x setup-github-deploy.sh
./setup-github-deploy.sh
```

### Шаг 3: Добавление SSH ключа в GitHub

После запуска скрипта:

1. Скопируйте показанный SSH ключ
2. Идите на GitHub: **Settings** → **SSH and GPG keys**
3. Нажмите **"New SSH key"**
4. **Title**: `Beauty Booking Server`
5. **Key**: вставьте скопированный ключ
6. Нажмите **"Add SSH key"**

### Шаг 4: Настройка GitHub Secrets

В вашем репозитории на GitHub:

1. Идите в **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **"New repository secret"**
3. Создайте 3 секрета:

| Name | Value | Описание |
|------|-------|----------|
| `HOST` | `test.2minutes.ru` | IP или домен вашего сервера |
| `USERNAME` | `root` | Пользователь для SSH |
| `SSH_KEY` | `содержимое ~/.ssh/id_rsa` | Приватный SSH ключ |

**Для получения SSH_KEY на сервере:**
```bash
cat ~/.ssh/id_rsa
# Скопируйте ВСЁ содержимое включая:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

### Шаг 5: Тестирование деплоя

1. **Сделайте любое изменение в коде**
2. **Закоммитьте и запушьте:**
   ```bash
   git add .
   git commit -m "Тест автоматического деплоя"
   git push origin main
   ```
3. **Проверьте во вкладке Actions на GitHub**
4. **Проверьте сайт: http://test.2minutes.ru**

## 🔧 Команды для управления

### На сервере:
```bash
# Ручной деплой из GitHub
./deploy-from-github.sh

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs beauty-booking

# Перезапуск
pm2 restart beauty-booking
```

### Локально:
```bash
# Деплой через GitHub
git add .
git commit -m "Описание изменений"
git push origin main

# Просмотр статуса деплоя
# Идите на GitHub → Actions
```

## 🎯 Workflow деплоя

1. **Вы пушите код в GitHub**
2. **GitHub Actions автоматически:**
   - ✅ Проверяет код
   - ✅ Устанавливает зависимости
   - ✅ Собирает приложение
   - ✅ Подключается к серверу по SSH
   - ✅ Запускает деплой скрипт
3. **На сервере происходит:**
   - ⏸️ Остановка приложения
   - 📥 Получение изменений из GitHub
   - 📦 Установка зависимостей
   - 🔨 Сборка приложения
   - ▶️ Запуск приложения

## 🚨 Устранение проблем

### Ошибка SSH подключения
```bash
# Проверьте SSH ключ
ssh -T git@github.com

# Проверьте подключение к серверу
ssh root@test.2minutes.ru
```

### Ошибка сборки
```bash
# На сервере проверьте логи
pm2 logs beauty-booking

# Ручная сборка для диагностики
cd /home/beautyapp/beauty-booking
npm run build
```

### Ошибка прав доступа
```bash
# Исправление прав
chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
chmod +x deploy-from-github.sh
```

## 🎉 Готово!

Теперь у вас есть полноценный CI/CD! Каждый пуш в `main` ветку автоматически деплоится на сервер! 🚀