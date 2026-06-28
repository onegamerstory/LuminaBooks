# План рефакторинга: устранение god-компонентов

> **Дата:** 2026-06-28
> **Основание:** Анализ кодовой базы на god-компоненты
> **Метрика:** Файл считается god-компонентом при превышении ~400 строк с множеством независимых ответственностей.

---

## Сводка результатов анализа

| Уровень | Файл | Строк | Проблема |
|---|---|---|---|
| 🚨 **Критично** | `src/App.tsx` | 1102 | Всё в одном: состояние, CRUD, синхронизация, достижения, навигация, уведомления |
| 🚨 **Критично** | `src/components/ReadingView.tsx` | 1099 | Таймер + сессии + карусель + хоткеи + модалки + тосты |
| ⚠️ **Серьёзно** | `src/components/CalendarView.tsx` | 534 | Два режима + тепловая карта + боковая статистика |
| ⚠️ **Серьёзно** | `src/components/BookModal.tsx` | 523 | Форма + Google Books API + словарь + коллекции |
| ⚠️ **Серьёзно** | `electron/main.ts` | 490 | Окно + трей + 15 IPC-каналов + локализация |
| ⚠️ **Серьёзно** | `src/components/StatisticsView.tsx` | 474 | Статистика + достижения + SVG-график + календарь |
| ⚠️ **Серьёзно** | `src/components/CatalogView/CatalogView.logic.tsx` | 450 | Фильтры + сортировка + импорт/экспорт + режимы |
| ⚠️ **Серьёзно** | `src/utils/statusHistoryUtils.ts` | 425 | 10 экспортов: миграция, генерация, трекинг, фазы |
| 👀 **Крупный** | `src/components/FranchiseModal.tsx` | 450 | CRUD коллекций + привязка книг |
| 👀 **Крупный** | `src/components/UserProfileModal.tsx` | 361 | Настройки + синхронизация + автозапуск |

---

## Приоритет 1: `src/App.tsx` (1102 строк)

### Текущая архитектура
```
App.tsx
├── 11 useState (books, franchises, activeView, isModalOpen, editingBook,
│               lang, isProfileOpen, defaultCoverUrl, googleApiKey,
│               bookToRateId, serverUrl, autoSync, launchAtStartup, syncing)
├── 4 useRef (dbApiRef, achievementQueueRef, notifiedAchievementsRef, modal)
├── 8 useEffect (login, loadData, poll, lang, booksLS, franchisesLS,
│               achievements, scroll)
└── ~20 функций (syncDataFromApi, handleManualSync, handleAddBook,
                 handleEdit, handleDelete, handleAddToQueue, handleStartReading,
                 handleImport, toggleLang, handleAddFranchise, ...)
```

### План рефакторинга

#### Шаг 1: Выделить кастомные хуки

| Хук | Выносимые функции/состояния | Новая директория |
|---|---|---|
| `useBooks()` | `books`, `setBooks`, `handleAddBook`, `handleEdit`, `handleDelete` | `src/hooks/useBooks.ts` |
| `useFranchises()` | `franchises`, `setFranchises`, `handleAddFranchise`, `handleUpdateFranchise`, `handleDeleteFranchise` | `src/hooks/useFranchises.ts` |
| `useSync()` | `syncDataFromApi`, `handleManualSync`, `autoSync`, `syncing`, `dbApiRef` | `src/hooks/useSync.ts` |
| `useToast()` | `toasts`, `addToast`, `removeToast` | `src/hooks/useToast.ts` |
| `useConfirmation()` | `confirmationModal`, `showConfirmation`, `closeConfirmation` | `src/hooks/useConfirmation.ts` |
| `useAchievements()` | `achievementQueue`, `achievementQueueRef`, `notifiedAchievementsRef`, `handleDismissAchievement` | `src/hooks/useAchievements.ts` |
| `useSettings()` | `lang`, `defaultCoverUrl`, `googleApiKey`, `serverUrl`, `launchAtStartup`, `toggleLang` | `src/hooks/useSettings.ts` |

#### Шаг 2: Создать контекст для данных

```typescript
// src/contexts/AppContext.tsx
interface AppContextValue {
  books: Book[];
  franchises: Franchise[];
  addBook: (book: Book) => Promise<void>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  addFranchise: (franchise: Franchise) => Promise<void>;
  // ...
}
```

#### Шаг 3: Упростить App.tsx

После рефакторинга App.tsx должен содержать только:
- Подключение хуков и контекста
- JSX-разметку (хедер, навигация, маршрутизация по вкладкам)
- Рендеринг компонентов и модалок

Ожидаемый размер: **~200–300 строк** (вместо 1102).

---

## Приоритет 2: `src/components/ReadingView.tsx` (1099 строк)

### Текущая архитектура
```
ReadingView.tsx
├── Таймер: sessionState, elapsedSeconds, startSession, pauseSession,
│           resumeSession, cancelSession, endSession, formatTime
├── Сессии: sessionData, manualSessionData, deleteSession,
│           saveManualSession, handleCloseModal
├── Карусель: queueBooks, carouselRef
├── Хоткеи: useEffect с keydown listener
├── Тосты: toasts, addToast, removeToast
└── Фильтрация: currentlyReading, postponedBooks, queueBooks
```

### План рефакторинга

#### Шаг 1: Выделить хук таймера

```typescript
// src/hooks/useReadingTimer.ts
interface UseReadingTimerReturn {
  sessionState: SessionState | null;
  elapsedSeconds: number;
  startSession: (bookId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  cancelSession: () => void;
  endSession: () => ReadingSession | null;
  formatTime: (seconds: number) => string;
}
```

#### Шаг 2: Разделить на подкомпоненты

| Компонент | Ответственность |
|---|---|
| `ReadingQueue.tsx` | Карусель книг в очереди |
| `ActiveReadingCard.tsx` | Карточка текущей книги с таймером |
| `TimerDisplay.tsx` | Отображение таймера (часы:минуты:секунды) |
| `TimerControls.tsx` | Кнопки Play/Pause/Complete |
| `SessionHistory.tsx` | Таблица истории сессий |
| `ManualSessionForm.tsx` | Форма ручного добавления сессии |
| `PostponedBooks.tsx` | Список отложенных книг |

#### Шаг 3: Убрать тосты

Использовать глобальный `useToast()` из App вместо локального.

Ожидаемый размер App.tsx + ReadingView.tsx после Шагов 1-2: **чтение — ~500 строк, App — ~200 строк**.

---

## Приоритет 3: Прочие крупные компоненты

### `electron/main.ts` (490 строк)

```typescript
// Разделить на модули:
// electron/main.ts           — точка входа, жизненный цикл
// electron/window-manager.ts — управление окном (macOS inset, логи)
// electron/tray-manager.ts   — системный трей, меню
// electron/ipc-handlers.ts   — регистрация IPC-каналов
```

### `src/components/CalendarView.tsx` (534 строки)

```typescript
// Разделить на подкомпоненты:
// CalendarView.tsx — контейнер, переключение режимов
// ReadingPhasesView.tsx — отображение фаз чтения
// SessionCalendarView.tsx — отображение сессий
// MonthlyStats.tsx — боковая статистика за месяц
```

### `src/components/BookModal.tsx` (523 строки)

```typescript
// Вынести API-интеграцию:
// src/utils/googleBooksSearch.ts — поиск через Google Books API
// src/utils/bookDictionarySearch.ts — поиск в локальном словаре
// BookModal.tsx — остаётся только UI формой
```

### `src/components/StatisticsView.tsx` (474 строки)

```typescript
// Разделить на подкомпоненты:
// StatsOverview.tsx — 8 метрик (total, read, hours, streak...)
// AchievementList.tsx — сетка достижений
// MonthlyChart.tsx — SVG-гистограмма
```

### `src/utils/statusHistoryUtils.ts` (425 строк, 10 export)

```typescript
// Разделить по назначению:
// src/utils/statusMigration.ts — migrateOldStatusValue, migrateBookStatusHistory
// src/utils/statusHistoryGenerator.ts — generateStatusHistoryFromDates,
//                                        regenerateStatusHistoryFromDates
// src/utils/statusTracker.ts — recordStatusChange, getCurrentBookStatus,
//                               getActiveReadingPhases
```

---

## Критерии завершения рефакторинга

| Метрика | Цель |
|---|---|
| Размер App.tsx | ≤ 300 строк |
| Размер ReadingView.tsx | ≤ 500 строк |
| Размер остальных компонентов | ≤ 300 строк |
| Количество export-функций в утилите | ≤ 5 на файл |
| Все тосты — через единый `useToast()` | ✅ |
| Все подтверждения — через единый `useConfirmation()` | ✅ |
| Все данные — через контекст или пропсы (не дублировать) | ✅ |
| Тесты проходят | ✅ |

---

## Процесс рефакторинга

Каждый шаг выполняется через цикл оркестратора:

```
@architect → @developer → @reviewer → @tester → @documentarian
```

1. **Architect** — уточняет план для конкретного модуля
2. **Developer** — реализует изменения
3. **Reviewer** — проверяет соответствие архитектуре
4. **Tester** — запускает тесты
5. **Documentarian** — обновляет docs/

> ⚠️ Рефакторинг не должен менять поведение приложения. Каждый шаг должен завершаться успешным запуском.
