# 🔄 Руководство по восстановлению удаленных агентов

## 📋 Способы восстановления удаленного агента

### 1. **Git History (История коммитов)**
```bash
# Просмотр всех коммитов с агентом
git log --all --grep="agent\|bot\|telegram" --oneline

# Восстановление конкретного коммита
git checkout <commit-hash> -- path/to/agent/file

# Восстановление всей папки агента
git checkout <commit-hash> -- src/app/api/telegram/
git checkout <commit-hash> -- src/hooks/useTelegramWebApp.ts
```

### 2. **Git Reflog (История всех действий)**
```bash
# Просмотр всех действий в Git
git reflog --all

# Восстановление из reflog
git checkout <reflog-hash> -- path/to/file
```

### 3. **Git Stash (Временные сохранения)**
```bash
# Просмотр stash'ей
git stash list

# Восстановление из stash
git stash show -p stash@{0} > recovered_agent.patch
git apply recovered_agent.patch
```

### 4. **Git FSck (Поиск потерянных объектов)**
```bash
# Поиск потерянных коммитов
git fsck --lost-found

# Восстановление потерянных объектов
git show <object-hash> > recovered_file
```

### 5. **Архивные файлы**
```bash
# Распаковка архивов
tar -xzf beauty-booking-github.tar.gz
tar -xzf beauty-booking-source.tar.gz
tar -xzf api-files.tar.gz

# Поиск агента в архивах
find . -name "*agent*" -o -name "*bot*" -o -name "*telegram*"
```

### 6. **Удаленные репозитории**
```bash
# Проверка всех веток
git fetch --all
git branch -r

# Восстановление из другой ветки
git checkout origin/other-branch -- path/to/agent
```

## 🎯 Текущий статус агента beauty-booking-mvp

### ✅ **Агент НАЙДЕН и ВОССТАНОВЛЕН!**

**Источник**: GitHub репозиторий `https://github.com/jzhekatroy/beauty-booking-mvp`

**Файлы агента**:
- ✅ `src/app/api/telegram/webapp-start/route.ts`
- ✅ `src/app/api/telegram/logs/route.ts`
- ✅ `src/hooks/useTelegramWebApp.ts`

**Дополнительные улучшения**:
- ✅ Добавлена настройка токена бота в админке
- ✅ Динамическая валидация через Telegram API
- ✅ Поддержка индивидуальных ботов для каждого салона

## 🔧 Команды для восстановления

### Восстановление из коммита b752928:
```bash
# Восстановление Telegram агента
git checkout b752928 -- src/app/api/telegram/
git checkout b752928 -- src/hooks/useTelegramWebApp.ts

# Восстановление с исправлениями из коммита 1ba5e8b
git checkout 1ba5e8b -- src/app/book/layout.tsx
git checkout 1ba5e8b -- src/hooks/useTelegramWebApp.ts
```

### Восстановление из GitHub репозитория:
```bash
# Клонирование репозитория
git clone https://github.com/jzhekatroy/beauty-booking-mvp.git temp_recovery

# Копирование файлов агента
cp -r temp_recovery/src/app/api/telegram src/app/api/
cp temp_recovery/src/hooks/useTelegramWebApp.ts src/hooks/

# Очистка
rm -rf temp_recovery
```

## 🚨 Если агент полностью потерян

### 1. **Проверьте резервные копии**
- Локальные копии проекта
- Облачные хранилища (Google Drive, Dropbox)
- Внешние диски

### 2. **Проверьте другие репозитории**
```bash
# Поиск других репозиториев
git remote -v
git fetch --all
git branch -r
```

### 3. **Восстановление из архива**
```bash
# Распаковка всех архивов
for archive in *.tar.gz; do
  mkdir -p temp_${archive%.tar.gz}
  tar -xzf "$archive" -C temp_${archive%.tar.gz}
done

# Поиск агента
find temp_* -name "*agent*" -o -name "*bot*" -o -name "*telegram*"
```

### 4. **Создание нового агента**
Если восстановление невозможно, можно создать нового агента на основе:
- Документации Telegram Bot API
- Примеров из официальной документации
- Шаблонов из других проектов

## 📊 Статистика восстановления

| Метод | Статус | Файлы найдены |
|-------|--------|---------------|
| Git History | ✅ Успешно | 3 файла |
| GitHub Repo | ✅ Успешно | 3 файла |
| Архивы | ❌ Не найдено | 0 файлов |
| Stash | ❌ Не найдено | 0 файлов |
| FSck | ❌ Не найдено | 0 файлов |

## 🎯 Рекомендации

### Для предотвращения потери агентов:
1. **Регулярные коммиты** - коммитьте изменения часто
2. **Ветки** - работайте в отдельных ветках
3. **Резервные копии** - создавайте архивы проекта
4. **Удаленные репозитории** - используйте GitHub/GitLab
5. **Документация** - документируйте важные компоненты

### Для быстрого восстановления:
1. **Теги** - используйте git tags для важных версий
2. **Releases** - создавайте GitHub releases
3. **Автоматические бэкапы** - настройте CI/CD
4. **Мониторинг** - отслеживайте изменения в критических файлах

## ✅ Заключение

**Агент beauty-booking-mvp успешно восстановлен!** 

Все файлы агента найдены в Git истории и GitHub репозитории. Дополнительно добавлены новые функции для настройки токенов ботов.

**Статус**: 🟢 Полностью восстановлен и улучшен