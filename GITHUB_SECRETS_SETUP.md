# 🔐 Настройка GitHub Secrets для деплоя

## Необходимые секреты

Для работы автоматизированного деплоя необходимо настроить следующие секреты в GitHub:

### 1. DATABASE_URL

**Описание:** Строка подключения к продакшн базе данных PostgreSQL

**Как получить:**
1. Перейдите в настройки вашего хостинга (Vercel, Railway, Heroku, etc.)
2. Найдите переменную `DATABASE_URL` или создайте новую
3. Скопируйте значение

**Формат:**
```
postgresql://username:password@host:port/database?schema=public
```

**Пример:**
```
postgresql://postgres:your_password@db.railway.app:5432/railway?schema=public
```

### 2. Настройка в GitHub

1. **Перейдите в репозиторий:** https://github.com/jzhekatroy/beauty-booking-mvp
2. **Откройте Settings** (вкладка в меню репозитория)
3. **Выберите "Secrets and variables" → "Actions"**
4. **Нажмите "New repository secret"**
5. **Добавьте секрет:**
   - **Name:** `DATABASE_URL`
   - **Secret:** ваша строка подключения к базе данных

### 3. Проверка настройки

После добавления секрета:

1. **Перейдите в Actions:** https://github.com/jzhekatroy/beauty-booking-mvp/actions
2. **Выберите "Advanced Deploy with Database Migrations"**
3. **Нажмите "Run workflow"**
4. **Проверьте логи** - не должно быть ошибок с `DATABASE_URL`

### 4. Альтернативные способы получения DATABASE_URL

#### Vercel
```bash
vercel env pull .env.local
# Найдите DATABASE_URL в файле .env.local
```

#### Railway
```bash
railway variables
# Скопируйте значение DATABASE_URL
```

#### Heroku
```bash
heroku config:get DATABASE_URL -a your-app-name
```

#### Локальная PostgreSQL
```bash
# Если у вас локальная база
postgresql://postgres:password@localhost:5432/beauty?schema=public
```

### 5. Безопасность

⚠️ **Важно:**
- Никогда не коммитьте `DATABASE_URL` в код
- Используйте только GitHub Secrets для хранения
- Регулярно обновляйте пароли
- Ограничьте доступ к базе данных по IP

### 6. Тестирование

После настройки секретов:

```bash
# Локальная проверка
npm run db:health

# Проверка готовности к деплою
npm run deploy:check
```

### 7. Устранение проблем

#### Ошибка: "DATABASE_URL resolved to an empty string"
- Проверьте, что секрет добавлен в GitHub
- Убедитесь, что имя секрета точно `DATABASE_URL`
- Проверьте, что секрет не пустой

#### Ошибка подключения к базе данных
- Проверьте правильность строки подключения
- Убедитесь, что база данных доступна
- Проверьте права доступа пользователя

#### Ошибка миграций
- Убедитесь, что база данных пустая или совместима
- Проверьте права на создание таблиц
- Используйте `npm run db:fix` для исправления

### 8. Поддержка

Если возникли проблемы:
1. Проверьте логи в GitHub Actions
2. Используйте `npm run db:health` для диагностики
3. Обратитесь к документации вашего хостинга
