# 🔐 Настройка GitHub Secrets для деплоя

## Что нужно настроить

Зайдите в **Settings** → **Secrets and variables** → **Actions** вашего репозитория и добавьте следующие секреты:

### 1. DATABASE_URL
**Название:** `DATABASE_URL`  
**Значение:** `postgresql://beauty_user:your_password@test.2minutes.ru:5432/beauty?schema=public`

### 2. HOST
**Название:** `HOST`  
**Значение:** `test.2minutes.ru`

### 3. USERNAME  
**Название:** `USERNAME`  
**Значение:** `root`

### 4. SSH_KEY
**Название:** `SSH_KEY`  
**Значение:** Содержимое приватного SSH ключа

## Как получить SSH_KEY

### На сервере test.2minutes.ru:
```bash
# Подключитесь к серверу
ssh root@test.2minutes.ru

# Проверьте есть ли SSH ключ
ls -la ~/.ssh/

# Если нет ключа, создайте его
ssh-keygen -t rsa -b 4096 -C "github-actions"
# Нажмите Enter для всех вопросов (без пароля)

# Скопируйте приватный ключ
cat ~/.ssh/id_rsa
```

### Скопируйте ВСЁ содержимое:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
... (много строк) ...
-----END OPENSSH PRIVATE KEY-----
```

### Добавьте публичный ключ в authorized_keys:
```bash
# На сервере
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Проверка настройки

### 1. Проверьте SSH подключение:
```bash
# С вашего компьютера
ssh root@test.2minutes.ru
```

### 2. Проверьте что репозиторий настроен на сервере:
```bash
# На сервере
cd /home/beautyapp/beauty-booking
git remote -v
# Должно показать: origin https://github.com/jzhekatroy/beauty-booking-mvp.git
```

### 3. Проверьте права доступа:
```bash
# На сервере
ls -la /home/beautyapp/beauty-booking
# Должно быть: beautyapp:beautyapp
```

## Тестирование деплоя

После настройки всех секретов:

1. **Сделайте любое изменение в коде**
2. **Закоммитьте и запушьте:**
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. **Проверьте во вкладке Actions на GitHub**
4. **Проверьте сайт: http://test.2minutes.ru**

## Устранение проблем

### Ошибка SSH подключения:
```bash
# Проверьте SSH ключ
ssh -T git@github.com

# Проверьте подключение к серверу
ssh root@test.2minutes.ru
```

### Ошибка прав доступа:
```bash
# На сервере исправьте права
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
```

### Ошибка базы данных:
```bash
# На сервере проверьте подключение
cd /home/beautyapp/beauty-booking
npx prisma db push
```

## Готово! 🎉

После настройки всех секретов, каждый push в `main` ветку будет автоматически деплоить изменения на ваш сервер `test.2minutes.ru`!
