# 📤 Загрузка проекта в GitHub

## Способ 1: Через веб-интерфейс GitHub (простой)

1. **Идите в ваш репозиторий**: https://github.com/jzhekatroy/beauty-booking-mvp

2. **Нажмите "uploading an existing file"** или перетащите файлы

3. **Загрузите ВСЕ файлы из проекта** (кроме):
   - `node_modules/` (папка)
   - `.next/` (папка) 
   - `*.db` (файлы базы данных)
   - `.git/` (папка)

## Способ 2: Через командную строку (если у вас есть git)

```bash
# Клонируйте ваш репозиторий
git clone https://github.com/jzhekatroy/beauty-booking-mvp.git
cd beauty-booking-mvp

# Скопируйте все файлы проекта в эту папку
# (кроме .git, node_modules, .next, *.db)

# Добавьте и закоммитьте
git add .
git commit -m "Initial commit: Beauty Booking MVP"
git push origin main
```

## 📁 Важные файлы для GitHub деплоя:

✅ **Обязательно загрузите:**
- `.github/workflows/deploy.yml` - GitHub Actions
- `setup-github-deploy.sh` - скрипт для сервера
- `GITHUB_DEPLOY_GUIDE.md` - инструкция
- Все файлы `src/`, `prisma/`, `public/`
- `package.json`, `package-lock.json`
- `next.config.ts`, `tsconfig.json`
- `.env` (если нужен)

❌ **НЕ загружайте:**
- `node_modules/` 
- `.next/`
- `*.db`
- `.git/`

## 🎯 После загрузки:

1. **Проверьте что файл `.github/workflows/deploy.yml` есть в репозитории**
2. **Переходите к настройке сервера** (следующий шаг)

## 🚀 Следующий шаг:

После загрузки файлов в GitHub, нужно настроить сервер. Скопируйте содержимое файла `setup-github-deploy.sh` на ваш сервер `test.2minutes.ru` и запустите его.