# Админ‑панель: структура UI и ключевые фрагменты кода

Назначение: краткий практичный бриф для редизайна админки в Lovable. Включает структуру экранов, основные паттерны UX и опорные фрагменты кода.

## Стек
- Next.js (App Router), React 18
- TypeScript
- Tailwind CSS (утилитарные классы)
- Иконки: `lucide-react`
- JWT токен в `localStorage` для API (`Authorization: Bearer <token>`) 

## Информационная архитектура
Горизонтальное меню (в хедере):
- Календарь: `/admin`
- Сводка: `/admin/bookings`
- Клиенты: `/admin/clients`
- Услуги: `/admin/services`
- Мастера: `/admin/masters`
- Настройки: `/admin/settings`
- Уведомления и рассылки: `/admin/notifications`

Справа — только кнопка «Выйти» (имя и роль скрыты).

## Общие паттерны
- Загрузка/сохранение через `fetch` на клиенте, с токеном.
- Модалки создания/редактирования.
- Аккордеоны (настройки).
- Табы (мастера, группы услуг).
- Списки/карточки с действиями (редактирование, архив, уволить и т.д.).

## Главный лэйаут
Файл: `src/app/admin/layout.tsx`

- Название салона, номер команды
- Горизонтальная навигация
- Кнопка «Выйти»

```tsx
// Кнопка «Выйти» в правом углу хедера
<button
  onClick={handleLogout}
  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
>
  <LogOut className="w-4 h-4 mr-2" />
  <span className="hidden sm:inline">Выйти</span>
</button>
```

## Календарь (Календарь бронирований)
Файл: `src/app/admin/page.tsx`

- Недельный календарь через `FullCalendarComponent`
- Модалка «Редактирование брони» (время, мастер, длительность, цена, комментарий, отмена)
- Модалка «Новая запись» (дата, время, мастер, услуга, клиент)

```tsx
<FullCalendarComponent
  bookings={bookings}
  masters={masters}
  masterSchedules={masterSchedules}
  masterAbsences={masterAbsences}
  onBookingClick={startEditingBooking}
  salonTimezone={team?.settings?.timezone || team?.timezone || 'Europe/Moscow'}
  onBookingCancelled={() => loadData(true)}
  onEmptySlotClick={({ time, master }) => { /* открыть модал создания */ }}
/>
```

## Услуги
Файл: `src/app/admin/services/page.tsx`

- Вкладки групп услуг + «Без группы»
- Создание/редактирование услуги (название, длительность, цена, описание, фото)
- Архивирование/восстановление
- Модальное редактирование группы и удаление с переносом услуг

```tsx
// Поля формы услуги (фрагмент)
<input
  type="text"
  value={serviceForm.name}
  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
  className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[44px]"
  placeholder="Например: Стрижка женская"
/>
```

## Мастера
Файл: `src/app/admin/masters/page.tsx`

- Список мастеров (фото, описание, услуги)
- Создание/редактирование (Профиль)
- Табы: «Расписание», «Отсутствия» (встроенные компоненты)
- Увольнение/восстановление

```tsx
// Переключение табов в форме мастера
<button onClick={() => setActiveEditTab('profile')}>Профиль</button>
<button onClick={() => setActiveEditTab('schedule')}>Расписание</button>
<button onClick={() => setActiveEditTab('absences')}>Отсутствия</button>
```

## Настройки салона
Файл: `src/app/admin/settings/page.tsx`

- Аккордеоны: «Основная информация», «Telegram Bot», «Часовой пояс», «Настройки страницы записи» (брендинг, лимит на клиента)
- Смена пароля, подтверждение email, смена email

```tsx
// Заголовок секции и коллапс
<button type="button" onClick={() => setOpenTelegram(!openTelegram)} className="w-full flex items-center justify-between px-4 py-3">
  <span className="text-lg font-semibold text-gray-900">Telegram Bot</span>
  <span className="text-gray-500 text-sm">{openTelegram ? 'Свернуть' : 'Развернуть'}</span>
</button>
{openTelegram && (
  <div className="px-4 pb-4">
    <TelegramBotSettings currentToken={settings.telegramBotToken} onUpdate={updateTelegramBotToken} />
  </div>
)}
```

## Уведомления и рассылки
Файл: `src/app/admin/notifications/page.tsx`

- Коллапсы: «Отбивка», «Напоминания», «Отмена брони клиенту»
- Политика уведомлений (enable + тексты), «Справка по переменным»
- Массовая рассылка: текст/фото, планирование, тест‑отправка

API: `GET/PUT /api/admin/notifications/policy`, `POST /api/admin/notifications/broadcast`, `POST /api/admin/notifications/test-send`

## Авторизация
- В лэйауте и страницах читается `localStorage.getItem('token')` и прокидывается как `Authorization: Bearer`.
- При отсутствии токена — редирект на `/login`.

## Ожидания к новому UI
- Сохранить текущую IA и сценарии, улучшить визуальную иерархию и читабельность.
- Календарь — главный сценарий, быстрые действия по клику, компактные модалки с явными CTA.
- Формы — вертикальные, минимум полей, валидируемые, основные кнопки справа.
- Аккордеоны и табы — сделать крупнее кликабельные области, контрастнее заголовки.
- Списки — карточки/строки с действиями, пустые состояния с CTA.
- Мобайл — учесть FAB‑кнопки и адаптивную сетку.

## Ссылки на исходники
- Лэйаут: `src/app/admin/layout.tsx`
- Календарь: `src/app/admin/page.tsx`
- Услуги: `src/app/admin/services/page.tsx`
- Мастера: `src/app/admin/masters/page.tsx`
- Настройки: `src/app/admin/settings/page.tsx`
- Уведомления: `src/app/admin/notifications/page.tsx`
