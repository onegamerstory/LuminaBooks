# Архитектура LuminaBooks

**Версия:** 1.10.5  
**Автор:** История Одного Геймера <gamecuts0412@gmail.com>  
**Лицензия:** MIT (см. package.json)

---

## 1. Обзор проекта

LuminaBooks — десктопное приложение для учёта книг. Пользователь может вести личную библиотеку, отслеживать сеансы чтения с таймером, просматривать статистику и достижения, организовывать книги в коллекции, просматривать календарь чтения в стиле GitHub и синхронизировать данные между устройствами по локальной сети.

Приложение построено на **Electron 33** с **React 19** в качестве рендерера. Данные хранятся в **SQLite** (WAL-режим) через библиотеку **better-sqlite3**. Для кросс-устройственной синхронизации встроен **Express 5** HTTP-сервер.

---

## 2. Технологический стек

| Категория | Технология |
|---|---|
| Фреймворк | React 19 + TypeScript |
| Сборка | Vite 6 |
| UI-кит | Mantine UI v7 |
| Стилизация | Tailwind CSS (CDN) + CSS-переменные |
| Иконки | Lucide React |
| Даты | dayjs |
| Десктоп | Electron 33 |
| База данных | better-sqlite3 (SQLite WAL) |
| HTTP-сервер | Express 5 |
| Генерация UUID | crypto.randomUUID с fallback |
| Языки | Русский, Английский (полная локализация) |

---

## 3. Структура директорий

```
LuminaBooks/
├── electron/                          # Main process (backend)
│   ├── main.ts                        # Жизненный цикл окна, трей, IPC
│   ├── preload.cjs                    # contextBridge — безопасный IPC
│   ├── database.ts                    # SQLite CRUD
│   ├── server.ts                      # Express HTTP API (порт 3456)
│   ├── tsconfig.json
│   └── metadata.json
├── src/                               # Renderer process (фронтенд)
│   ├── index.tsx                      # Точка входа
│   ├── App.tsx                        # Главный компонент, состояние, логика
│   ├── api.ts                         # HTTP-клиент (альтернатива IPC)
│   ├── types.ts                       # Core TypeScript типы
│   ├── electron.d.ts                  # Типы для Electron API
│   ├── uuid.ts                        # Генератор UUID
│   ├── components/                    # React-компоненты
│   │   ├── index.ts                   # Barrel-экспорты
│   │   ├── BookModal.tsx              # Модальное окно добавления/редактирования книги
│   │   ├── BookCard.tsx               # Карточка книги (режим сетки)
│   │   ├── BookRatingModal.tsx        # Модальное окно оценки книги
│   │   ├── RandomBookModal.tsx        # Модальное окно случайной книги
│   │   ├── ConfirmationModal.tsx      # Подтверждение удаления
│   │   ├── Toast.tsx                  # Система уведомлений
│   │   ├── AchievementNotification.tsx # Уведомления о достижениях (очередь)
│   │   ├── ErrorBoundary.tsx          # React Error Boundary
│   │   ├── UserProfileModal.tsx       # Настройки профиля
│   │   ├── GitHubCalendar.tsx         # GitHub-стиль календарь активности
│   │   ├── FranchiseSelectModal.tsx   # Выбор коллекции для книги
│   │   ├── FranchiseModal.tsx         # Создание/редактирование коллекции
│   │   ├── CatalogView/              # Просмотр каталога
│   │   │   ├── index.tsx             # Главный компонент каталога
│   │   │   ├── CatalogView.logic.tsx # Бизнес-логика каталога
│   │   │   ├── FilterPanel.tsx       # Панель фильтров
│   │   │   ├── FilterDropdown.tsx    # Выпадающий фильтр
│   │   │   ├── SortDropdown.tsx      # Выпадающая сортировка
│   │   │   ├── ViewModeButtons.tsx   # Переключение таблица/сетка
│   │   │   ├── BookTableRow.tsx      # Строка таблицы книги
│   │   │   └── EmptyState.tsx        # Пустое состояние
│   │   ├── FranchiseView.tsx         # Просмотр коллекций
│   │   ├── CalendarView.tsx          # Календарь чтения
│   │   ├── StatisticsView.tsx        # Статистика и достижения
│   │   └── ReadingView.tsx           # Чтение: таймер, сессии, очередь
│   ├── utils/                        # Утилиты
│   │   ├── translations.ts           # Локализация (en/ru)
│   │   ├── bookUtils.ts              # Вспомогательные функции для книг
│   │   ├── bookSearch.ts             # Поиск книг (Google Books + словарь)
│   │   ├── googleBooksApi.ts         # Клиент Google Books API
│   │   ├── statusUtils.ts            # Цвета/стили статусов
│   │   ├── statusHistoryUtils.ts     # История статусов, миграция, генерация фаз
│   │   ├── achievements.ts           # Система достижений (10 штук)
│   │   ├── dateUtils.ts              # Работа с датами, подсчёт часов
│   │   ├── coverUtils.ts            # Обработка ошибок загрузки обложек
│   │   └── jsonUtils.ts              # JSON экспорт/импорт
│   └── assets/achivements/           # PNG-иконки для 10 достижений
├── docs/                             # Документация
├── resources/                        # Иконки приложения
├── release/                          # Собранные установщики
├── index.html                        # HTML-вход (Tailwind CDN, шрифты)
├── package.json                      # Зависимости, скрипты, electron-builder
├── vite.config.ts                    # Vite: порт 3000, proxy /api → 3456
├── tsconfig.json
├── AGENTS.md                         # Конфигурация opencode-агентов
└── opencode.json                     # MCP-серверы и оркестратор
```

---

## 4. Многослойная архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                    React SPA (Renderer Process)                     │
│                                                                     │
│  App.tsx — глобальное состояние, бизнес-логика, навигация          │
│  ├── CatalogView     — каталог книг, поиск, фильтры                │
│  ├── FranchiseView   — коллекции книг                              │
│  ├── CalendarView    — календарь чтения                            │
│  ├── ReadingView     — трекинг чтения, таймер, очередь              │
│  ├── StatisticsView  — профиль, статистика, достижения              │
│  └── Modals          — BookModal, UserProfileModal,                │
│                        FranchiseModal, ConfirmationModal,           │
│                        BookRatingModal, RandomBookModal             │
│         │                                                          │
│         ▼                                                          │
├─────────────────────────────────────────────────────────────────────┤
│  api.ts — слой абстракции доступа к данным                         │
│  (реализует интерфейс ElectronDBAPI через IPC / HTTP / LS)         │
├─────────────────────────────────────────────────────────────────────┤
│                   Electron Main Process                             │
│                                                                     │
│  main.ts — IPC-обработчики, управление окном, системный трей       │
│  database.ts — SQLite CRUD (better-sqlite3)                         │
│  server.ts — Express REST API (порт 3456)                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Слои детально:

#### 4.1 Слой представления (Renderer)
- **index.tsx** — монтирует React-приложение в DOM, оборачивает в `<ErrorBoundary>`
- **App.tsx** — содержит всё состояние приложения (useState), всю бизнес-логику (addBook, updateBook, deleteBook, checkAchievements, syncData), и рендерит активный вид в зависимости от `activeView`
- **Компоненты** — каждая вкладка вынесена в отдельный компонент; модальные окна открываются условно

#### 4.2 Слой доступа к данным (api.ts)
- Реализует контракт `ElectronDBAPI` (см. `DATA.md`)
- В рантайме выбирает один из трёх режимов (см. раздел 6)
- Позволяет остальному приложению не знать, откуда берутся данные

#### 4.3 Слой данных (Main Process)
- **database.ts** — прямое обращение к SQLite через better-sqlite3 (синхронное API)
- **server.ts** — Express-сервер, который через HTTP вызывает те же функции database.ts
- **main.ts** — регистрирует IPC-обработчики, которые вызывают database.ts

---

## 5. Компонентное дерево и описание

```
<ErrorBoundary>
  <App>
    ├── <Toast>                          // Система всплывающих уведомлений
    ├── <AchievementNotification>         // Очередь уведомлений о достижениях
    ├── <ConfirmationModal>               // Модальное окно подтверждения
    │
    ├── [activeView='catalog']
    │   └── <CatalogView>
    │       ├── <FilterPanel>             // Фильтры по статусу и рейтингу
    │       ├── <FilterDropdown>          // Выпадающий список фильтров
    │       ├── <SortDropdown>            // Сортировка
    │       ├── <ViewModeButtons>         // Переключение таблица/сетка
    │       ├── <BookTableRow> / <BookCard> // Карточка/строка книги
    │       └── <EmptyState>              // Пустое состояние
    │
    ├── [activeView='collections']
    │   └── <FranchiseView>
    │       └── <FranchiseCard>           // Карточка коллекции
    │
    ├── [activeView='calendar']
    │   └── <CalendarView>
    │       └── <GitHubCalendar>          // Тепловая карта активности
    │
    ├── [activeView='reading']
    │   └── <ReadingView>                 // Таймер, сессии, очередь
    │
    ├── [activeView='statistics']
    │   └── <StatisticsView>              // Статистика и достижения
    │
    ├── <BookModal>                       // Добавление/редактирование книги
    │   └── <FranchiseSelectModal>        // Выбор коллекции
    ├── <FranchiseModal>                  // Создание/редактирование коллекции
    ├── <UserProfileModal>                // Настройки профиля
    ├── <BookRatingModal>                 // Оценка книги
    └── <RandomBookModal>                 // Случайная книга
```

---

## 6. Управление состоянием

Приложение использует **чистое React-состояние** (useState) без Redux, Zustand или других библиотек. Все данные хранятся в `App.tsx`:

```typescript
const [books, setBooks] = useState<Book[]>([]);
const [franchises, setFranchises] = useState<Franchise[]>([]);
const [activeView, setActiveView] = useState<ViewType>('catalog');
const [lang, setLang] = useState<'en' | 'ru'>('ru');
const [defaultCoverUrl, setDefaultCoverUrl] = useState('');
const [googleApiKey, setGoogleApiKey] = useState('');
const [serverUrl, setServerUrl] = useState('');
const [autoSync, setAutoSync] = useState(false);
const [launchAtStartup, setLaunchAtStartup] = useState(false);
const [syncing, setSyncing] = useState(false);
```

**Refs используются для:**
- `dbApiRef` — ссылка на активный API (ElectronDBAPI)
- `achievementQueueRef` — очередь уведомлений о достижениях
- `notifiedAchievementsRef` — уже показанные достижения (Set<string>)

**Кастомные хуки (в src/hooks/):**

| Хук | Описание | Ключевая особенность |
|---|---|---|
| `useToast` | Система уведомлений | 18 строк, минимальный API |
| `useConfirmation` | Модальные подтверждения | 45 строк, isDangerous опция |
| `useSettings` | Язык, обложка, API-ключ, автозапуск | 44 строки |
| `useDbApi` | Ref + getter для API | **Ленивое разрешение** через `getDbApi()` — возвращает актуальный API в момент вызова, не при инициализации хука |
| `useFranchises` | CRUD коллекций | **Ленивый геттер `getSetBooks`** — `setBooks` передаётся не напрямую, а через геттер, разрешающий зависимость в момент вызова (решает проблему циклической зависимости: `useFranchises` инициализируется раньше `useBooks`, но может вызвать `setBooks` после инициализации обоих) |
| `useBooks` | CRUD книг, импорт/экспорт, очередь | 385 строк. Содержит **sync-эффект для `editingBook`**: при изменении массива `books` находит книгу, совпадающую с редактируемой, и обновляет `editingBook` — это гарантирует, что открытый `BookModal` всегда отображает актуальные данные |
| `useAchievements` | Система достижений | 73 строки |
| `useSync` | Загрузка, синхронизация, polling | 234 строки |

**Бизнес-логика в App.tsx включает:**
- `syncDataFromApi(api)` — загрузка всех данных через переданный API
- `handleAddBook`, `handleUpdateBook`, `handleDeleteBook` — CRUD операции
- `checkAchievements` — проверка и разблокировка достижений
- `handleManualSync` — ручная синхронизация
- `updateBookStatusBasedOnDates` — авто-обновление статуса по датам
- `syncStatusFromHistory` — синхронизация статуса из истории

---

## 7. Потоки данных (3 режима)

Приложение поддерживает три режима доступа к данным, выбираемых автоматически при загрузке:

### 7.1 Режим Electron IPC (основной)

```
React Component → App.tsx → dbApiRef.current
  → window.electronAPI.db.* (preload.cjs)
    → ipcRenderer.invoke('db:someMethod')
      → main.ts (ipcMain.handle)
        → database.ts (better-sqlite3 SQLite)
```

**Каналы IPC:**
| Метод | IPC-канал |
|---|---|
| getAllBooks | `db:getAllBooks` |
| addBook | `db:addBook` |
| updateBook | `db:updateBook` |
| deleteBook | `db:deleteBook` |
| getAllFranchises | `db:getAllFranchises` |
| addFranchise | `db:addFranchise` |
| updateFranchise | `db:updateFranchise` |
| deleteFranchise | `db:deleteFranchise` |
| getUserProfile | `db:getUserProfile` |
| setUserProfile | `db:setUserProfile` |
| migrate | `db:migrate` |
| searchBooksDictionary | `db:searchBooksDictionary` |
| saveToBooksDictionary | `db:saveToBooksDictionary` |
| getLoginItemSettings | `app:getLoginItemSettings` |
| setLoginItemSettings | `app:setLoginItemSettings` |

### 7.2 Режим HTTP API (браузер с сервером)

```
React Component → App.tsx → httpApi (src/api.ts)
  → fetch('/api/books') / fetch('/api/franchises') / etc.
    → Express server (port 3456)
      → database.ts (better-sqlite3 SQLite)
```

Используется, когда приложение запущено в браузере и доступен сервер по `/api/status`.

### 7.3 Режим LocalStorage (браузер без сервера)

```
React Component → App.tsx
  → localStorage.getItem/JSON.parse/JSON.stringify
  → прямой доступ к 'lumina_books_v1', 'lumina_franchises_v1'
```

Используется как fallback, когда нет ни Electron, ни HTTP API.

### Определение режима при загрузке:

```typescript
if (window.electronAPI?.db) {
  // Режим 1: Electron IPC
} else {
  try { fetch('/api/status'); httpAvailable = true; }
  if (httpAvailable) {
    // Режим 2: HTTP API
  } else {
    // Режим 3: LocalStorage
  }
}
```

---

## 8. IPC Bridge (Безопасность)

Electron настроен с максимальными мерами безопасности:

- **contextIsolation: true** — изоляция контекста рендерера
- **nodeIntegration: false** — запрет Node.js в рендерере
- **preload.cjs** — единственный мост через `contextBridge.exposeInMainWorld`

**Что экспортирует preload:**

```typescript
window.electronAPI = {
  platform, isMac, isWindows, isLinux,
  db: {
    getAllBooks, addBook, updateBook, deleteBook,
    getAllFranchises, addFranchise, updateFranchise, deleteFranchise,
    getUserProfile, setUserProfile,
    migrate,
    searchBooksDictionary, saveToBooksDictionary
  },
  getServerUrl,
  getLoginItemSettings,
  setLoginItemSettings
}
```

Все IPC-вызовы — через `ipcMain.handle` / `ipcRenderer.invoke` (асинхронные).

---

## 9. Навигация

Приложение **не использует React Router**. Вместо этого применяется условный рендеринг на основе состояния `activeView`:

```typescript
const [activeView, setActiveView] = useState<ViewType>('catalog');

// В JSX:
{activeView === 'catalog' && <CatalogView ... />}
{activeView === 'collections' && <FranchiseView ... />}
{activeView === 'calendar' && <CalendarView ... />}
{activeView === 'reading' && <ReadingView ... />}
{activeView === 'statistics' && <StatisticsView ... />}
```

Тип `ViewType`: `'catalog' | 'collections' | 'calendar' | 'statistics' | 'reading'`

При переключении вкладки окно прокручивается вверх (`window.scrollTo(0, 0)`).

---

## 10. Electron-специфичная архитектура

### 10.1 Жизненный цикл окна

1. **Запуск:** `app.whenReady()` → `initDatabase()` → `registerIpcHandlers()` → запуск Express-сервера → `createWindow()`
2. **Создание окна:** `new BrowserWindow({ ... })` с загрузкой `index.html` (dev) или файла из `dist/` (prod)
3. **Закрытие:** событие `close` → скрытие окна и сворачивание в трей (если не `isQuiting`)
4. **Выход:** `app.on('before-quit')` → установка флага `isQuiting` → реальное закрытие

### 10.2 Системный трей

- Иконка в трее с меню: Показать/Скрыть, Выход
- Локализованное контекстное меню
- Поддержка `nativeImage.createFromPath` с fallback на `Tray`
- macOS: template image

### 10.3 Single-instance lock

- Используется `app.requestSingleInstanceLock()`
- При попытке второго запуска фокус переключается на существующее окно

### 10.4 Автозагрузка

- Через `app.getLoginItemSettings()` / `app.setLoginItemSettings()`
- Настройка доступна в профиле пользователя

### 10.5 Навигация и логирование

- Перехват всех внешних переходов через `mainWindow.webContents.setWindowOpenHandler`
- Логирование ошибок через `process.on('uncaughtException')` и `process.on('unhandledRejection')`

---

## 11. Архитектура синхронизации

### 11.1 Express-сервер

- Запускается внутри Electron main process
- Порт: 3456 (на всех сетевых интерфейсах: `0.0.0.0`)
- CORS: разрешены все источники
- JSON body limit: 10mb
- Статическая раздача `dist/` в production-режиме

**REST API:**

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/books` | Все книги |
| POST | `/api/books` | Добавить книгу |
| PUT | `/api/books/:id` | Обновить книгу |
| DELETE | `/api/books/:id` | Удалить книгу |
| GET | `/api/franchises` | Все коллекции |
| POST | `/api/franchises` | Добавить коллекцию |
| PUT | `/api/franchises/:id` | Обновить коллекцию |
| DELETE | `/api/franchises/:id` | Удалить коллекцию |
| GET | `/api/profile` | Профиль |
| PUT | `/api/profile` | Обновить профиль |
| POST | `/api/profile/achievements` | Объединить достижения без перезаписи остальных полей профиля |
| GET | `/api/books-dictionary/search?title=&author= | Поиск в словаре |
| POST | `/api/books-dictionary` | Сохранить в словарь |
| GET | `/api/status` | Health check |
| GET | `/*` | Статические файлы (production) |

### 11.2 Автосинхронизация

- Интервал: **30 секунд**
- Срабатывает также при фокусе окна и при `visibilitychange` → `visible`
- Синхронизация запускается только для активной вкладки и повторные запуски объединяются в один запрос
- Отключается через настройку `autoSync` в профиле

### 11.3 URL сервера

- Вычисляется через `networkInterfaces()` → первый не-internal IPv4 адрес
- Отображается в настройках профиля для подключения с других устройств
- В production: `http://<local-ip>:3456`
- Vite dev server проксирует `/api` на `localhost:3456`

### 11.4 Миграция localStorage → SQLite

- Однократная операция при первом запуске в Electron
- Переносит `lumina_books_v1` и `lumina_franchises_v1` в SQLite
- Устанавливает флаг `lumina_migrated`

---

## 12. Статусная модель и авто-определение

### 12.1 Статусы книг

```typescript
enum BookStatus {
  READING = 'READING',         // Читаю
  READ = 'READ',               // Прочитано
  WANT_TO_READ = 'WANT_TO_READ', // Буду читать
  ABANDONED = 'ABANDONED',     // Брошено
  POSTPONED = 'POSTPONED'      // Отложено
}
```

### 12.2 Автоматическое обновление статуса

Правила (жестко зашиты в `updateBookStatusBasedOnDates`):

1. Есть startDate + endDate → **READ**
2. Есть только startDate → **READING**
3. Нет дат → **WANT_TO_READ**
4. **Исключения:** ABANDONED и POSTPONED никогда не перезаписываются
5. Если в истории статусов последний статус READ — статус не изменяется

### 12.3 История статусов (StatusHistory)

Каждый переход статуса записывается в массив `statusHistory[]`:
```typescript
{
  timestamp: string;           // ISO timestamp
  previousStatus: BookStatus | null;
  newStatus: BookStatus;
}
```

История генерируется автоматически:
- При установке дат → создаются переходы WANT_TO_READ → READING → READ
- При прямом переходе WANT_TO_READ → READ → промежуточный READING записывается автоматически

---

## 13. Конвейер сборки и дистрибуции

### 13.1 Режим разработки

```bash
npm run electron:dev
# Запускает Vite dev server (порт 3000) + Electron одновременно
# Vite проксирует /api → localhost:3456
```

### 13.2 Сборка

```bash
npm run electron:build
# 1. tsc — компиляция electron/ → dist-electron/
# 2. Vite сборка src/ → dist/
# 3. electron-builder — упаковка в установщик
```

### 13.3 Платформы

| Платформа | Формат | Установщик |
|---|---|---|
| Windows | NSIS | `.exe` |
| macOS | DMG | `.dmg` |
| Linux | AppImage | `.AppImage` |

**App ID:** `com.onegamerstory.luminabooks`

### 13.4 Vite конфигурация

- Порт разработки: 3000
- Прокси: `/api` → `http://localhost:3456`
- Алиас: `@/*` → `src/*`
- React SWC plugin для быстрой компиляции

---

## 14. Локализация

Полная поддержка двух языков: **русский** и **английский**.

- Файл: `src/utils/translations.ts` — объект с переводами
- Язык выбирается через настройки и сохраняется в `localStorage('lumina_lang')`
- Все компоненты принимают проп `lang: 'en' | 'ru'`
- Форматирование чисел с учётом правил русского языка (1 книга, 2 книги, 5 книг)
- Локализован системный трей в Electron

---

## 15. Безопасность

- **Electron:** contextIsolation, nodeIntegration=false, CSP в meta-тегах
- **IPC:** только белый список методов через contextBridge
- **Express:** CORS заголовки, валидация через try/catch
- **Синхронизация:** только в локальной сети (нет внешнего API)
- **Google Books API:** ключ хранится локально, не передаётся третьим лицам

---

## 16. Зависимости (ключевые)

| Пакет | Версия | Назначение |
|---|---|---|
| react | ^19.0.0 | UI-фреймворк |
| @mantine/core | ^7.17.x | UI-компоненты |
| @mantine/dates | ^7.17.x | Дата-пикеры |
| @mantine/hooks | ^7.17.x | Хуки (useDisclosure и др.) |
| lucide-react | ^0.485.x | Иконки |
| dayjs | ^1.11.x | Работа с датами |
| better-sqlite3 | ^11.8.x | SQLite драйвер |
| express | ^5.1.x | HTTP-сервер |
| electron | ^33.4.x | Десктоп-оболочка |
| vite | ^6.3.x | Сборщик |
| electron-builder | ^25.1.x | Установщики |

---

## Связанные документы

- [DATA.md](DATA.md) — схема данных и TypeScript типы
- [DECISIONS.md](DECISIONS.md) — архитектурные решения
- [FEATURES.md](FEATURES.md) — описание всех функций
- [CHANGELOG.md](CHANGELOG.md) — история изменений
