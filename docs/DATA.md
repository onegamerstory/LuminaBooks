# Схема данных и хранилище

> **Движок БД:** SQLite через better-sqlite3  
> **Режим:** WAL (Write-Ahead Logging) — конкурентное чтение без блокировок  
> **Плагины:** ICU для корректной сортировки по Unicode  
> **Путь (Electron):** `app.getPath('userData')/luminabooks.db`  

---

## 1. Общая архитектура данных

Приложение хранит все данные в одной SQLite-базе, состоящей из 4 таблиц. Некоторые поля содержат JSON-строки — это сознательное архитектурное решение (см. [DECISIONS.md](DECISIONS.md) — «JSON в TEXT-колонках»).

Доступ к данным реализован через единый интерфейс `ElectronDBAPI`, который может работать в трёх режимах: IPC (Electron), HTTP (Express), LocalStorage (браузерный fallback).

---

## 2. Таблицы SQLite

### 2.1 `books` — Книги

Центральная таблица приложения. Хранит все книги пользователя.

| Поле | Тип | Ограничения | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | — | UUID книги |
| `title` | TEXT | NOT NULL | — | Название книги |
| `author` | TEXT | NOT NULL | — | Автор |
| `year` | TEXT | — | `''` | Год издания (строка, т.к. может содержать диапазоны) |
| `coverUrl` | TEXT | — | `''` | URL обложки |
| `status` | TEXT | NOT NULL | `'WANT_TO_READ'` | Статус: READING / READ / WANT_TO_READ / ABANDONED / POSTPONED |
| `rating` | REAL | — | `0` | Оценка (0–10) |
| `startDate` | TEXT | — | `''` | Дата начала чтения (YYYY-MM-DD) |
| `endDate` | TEXT | — | `''` | Дата окончания чтения (YYYY-MM-DD) |
| `description` | TEXT | — | `''` | Описание/заметки |
| `totalPages` | INTEGER | — | `NULL` | Всего страниц |
| `currentPage` | INTEGER | — | `NULL` | Текущая страница |
| `currentPercentage` | REAL | — | `NULL` | Текущий процент прочтения |
| `isPartOfSeries` | INTEGER | — | `0` | Является частью цикла (0/1) |
| `franchiseIds` | TEXT | — | `'[]'` | JSON-массив ID коллекций |
| `inQueue` | INTEGER | — | `0` | В очереди чтения (0/1) |
| `sessions` | TEXT | — | `'[]'` | JSON-массив сессий чтения |
| `statusHistory` | TEXT | — | `'[]'` | JSON-массив изменений статуса |

**Замечания:**
- Все строковые поля с пустыми значениями хранятся как `''`, не `NULL`
- JSON-поля (`franchiseIds`, `sessions`, `statusHistory`) при чтении парсятся через `JSON.parse`, при записи сериализуются через `JSON.stringify`
- Булевы поля (`isPartOfSeries`, `inQueue`) хранятся как INTEGER (0/1)

### 2.2 `franchises` — Коллекции

Группировка книг в коллекции (циклы, серии, жанровые подборки).

| Поле | Тип | Ограничения | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | — | UUID коллекции |
| `name` | TEXT | NOT NULL | — | Название коллекции |
| `description` | TEXT | — | `''` | Описание |
| `coverUrl` | TEXT | — | `''` | URL обложки коллекции |
| `bookIds` | TEXT | — | `'[]'` | JSON-массив ID книг в коллекции |
| `createdAt` | TEXT | — | — | ISO timestamp создания |
| `updatedAt` | TEXT | — | — | ISO timestamp обновления |

### 2.3 `user_profile` — Профиль пользователя

Одна строка с ID = 1 (ограничено CHECK-constraint).

| Поле | Тип | Ограничения | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | — | Всегда 1 |
| `nickname` | TEXT | — | `''` | Никнейм пользователя |
| `photoUrl` | TEXT | — | `''` | URL аватара |
| `defaultCoverUrl` | TEXT | — | `''` | URL обложки по умолчанию для новых книг |
| `achievements` | TEXT | — | `'[]'` | JSON-массив ID разблокированных достижений |
| `googleApiKey` | TEXT | — | `''` | API-ключ Google Books |

### 2.4 `books_dictionary` — Словарь книг

Кеш найденных книг из Google Books API и других источников. Используется для автодополнения при добавлении книг.

| Поле | Тип | Ограничения | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Числовой ID |
| `title` | TEXT | NOT NULL | — | Название |
| `author` | TEXT | NOT NULL | — | Автор |
| `year` | TEXT | — | `''` | Год издания |
| `cover_url` | TEXT | — | `''` | URL обложки |
| `lang` | TEXT | — | `''` | Язык книги |
| `source` | TEXT | — | `''` | Источник данных (например, 'google_books') |
| `created_at` | TEXT | — | `datetime('now')` | Дата создания записи |

---

## 3. Индексы

```sql
CREATE INDEX IF NOT EXISTS idx_dict_title ON books_dictionary (title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_dict_author ON books_dictionary (author COLLATE NOCASE);
```

- **NOCASE** — регистронезависимый поиск по названию и автору
- Индексы ускоряют поиск в словаре (используется при автодополнении)

---

## 4. JSON-структуры

### 4.1 ReadingSession — Сессия чтения

Хранится в поле `books.sessions` как JSON-массив.

```typescript
interface ReadingSession {
  id: string;                  // UUID сессии
  startTime: string;           // ISO timestamp начала
  endTime: string;             // ISO timestamp окончания
  duration: number;            // Длительность в секундах
  startPage?: number | null;   // Начальная страница
  endPage?: number | null;     // Конечная страница
  pagesRead?: number | null;   // Прочитано страниц (endPage - startPage)
  startPercentage?: number | null;  // Начальный процент
  endPercentage?: number | null;    // Конечный процент
  percentageRead?: number | null;   // Прочитано процентов (endPercentage - startPercentage)
}
```

### 4.2 StatusChange — Изменение статуса

Хранится в поле `books.statusHistory` как JSON-массив.

```typescript
interface StatusChange {
  timestamp: string;              // ISO timestamp
  previousStatus: BookStatus | null;  // Предыдущий статус (null для первого)
  newStatus: BookStatus;              // Новый статус
}
```

---

## 5. TypeScript-типы

Все типы определены в `src/types.ts`:

```typescript
// Статус книги
enum BookStatus {
  READING = 'READING',
  READ = 'READ',
  WANT_TO_READ = 'WANT_TO_READ',
  ABANDONED = 'ABANDONED',
  POSTPONED = 'POSTPONED'
}

// Сессия чтения
interface ReadingSession {
  id: string;
  startTime: string;           // ISO timestamp
  endTime: string;             // ISO timestamp
  duration: number;            // секунды
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
  startPercentage?: number;
  endPercentage?: number;
  percentageRead?: number;
}

// Изменение статуса
interface StatusChange {
  timestamp: string;
  previousStatus: BookStatus;
  newStatus: BookStatus;
}

// Книга
interface Book {
  id: string;
  title: string;
  author: string;
  year: number | string;
  coverUrl: string;
  status: BookStatus;
  rating: number;
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD
  description?: string;
  totalPages?: number;
  currentPage?: number;
  currentPercentage?: number;
  isPartOfSeries?: boolean;
  franchiseIds?: string[];
  sessions?: ReadingSession[];
  statusHistory?: StatusChange[];
  inQueue?: boolean;
}

// Коллекция
interface Franchise {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  bookIds: string[];
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

// Тип активного вида
type ViewType = 'catalog' | 'collections' | 'calendar' | 'statistics' | 'reading';
```

---

## 6. Интерфейс доступа к данным (ElectronDBAPI)

Определён в `src/electron.d.ts`. Все три режима доступа реализуют этот интерфейс.

```typescript
interface ElectronDBAPI {
  // Книги
  getAllBooks(): Promise<Book[]>;
  addBook(book: Book): Promise<void>;
  updateBook(book: Book): Promise<void>;
  deleteBook(id: string): Promise<void>;

  // Коллекции
  getAllFranchises(): Promise<Franchise[]>;
  addFranchise(franchise: Franchise): Promise<void>;
  updateFranchise(franchise: Franchise): Promise<void>;
  deleteFranchise(id: string): Promise<void>;

  // Профиль
  getUserProfile(): Promise<UserProfile>;
  setUserProfile(profile: UserProfile): Promise<void>;

  // Миграция
  migrate(data?: { books: Book[]; franchises: Franchise[] }): Promise<{ books: number; franchises: number }>;

  // Словарь книг
  searchBooksDictionary(title: string, author: string): Promise<DictionaryEntry[]>;
  saveToBooksDictionary(entry: DictionaryEntry): Promise<void>;
}
```

---

## 7. Три режима хранения

### 7.1 IPC (Electron) — Основной режим

| Характеристика | Значение |
|---|---|
| Драйвер | better-sqlite3 (синхронный) |
| Путь к БД | `app.getPath('userData')/luminabooks.db` |
| Доступ | Через IPC-каналы (preload.cjs → ipcMain) |
| Миграция | IPC-запрос получает данные из localStorage рендерера |

**Инициализация БД:**
```typescript
export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'luminabooks.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Создание таблиц через CREATE TABLE IF NOT EXISTS ...
}
```

**Преобразование данных** — ключевой момент архитектуры:

При чтении из БД:
```typescript
function rowToBook(row: any): Book {
  return {
    ...row,
    isPartOfSeries: row.isPartOfSeries === 1,        // INTEGER → boolean
    inQueue: row.inQueue === 1,                       // INTEGER → boolean
    franchiseIds: safeJsonParse(row.franchiseIds, []), // TEXT → string[]
    sessions: safeJsonParse(row.sessions, []),         // TEXT → ReadingSession[]
    statusHistory: safeJsonParse(row.statusHistory, []), // TEXT → StatusChange[]
  };
}
```

При записи в БД:
```typescript
function bookToRow(book: Book): any {
  return {
    ...book,
    isPartOfSeries: book.isPartOfSeries ? 1 : 0,     // boolean → INTEGER
    inQueue: book.inQueue ? 1 : 0,                     // boolean → INTEGER
    franchiseIds: JSON.stringify(book.franchiseIds ?? []), // string[] → TEXT
    sessions: JSON.stringify(book.sessions ?? []),     // ReadingSession[] → TEXT
    statusHistory: JSON.stringify(book.statusHistory ?? []), // StatusChange[] → TEXT
  };
}
```

### 7.2 HTTP API (Express) — Браузер + сервер

| Характеристика | Значение |
|---|---|
| Реализация | `src/api.ts` (объект `httpApi`) |
| Транспорт | fetch() |
| Формат | JSON |
| Базовая URL | `''` (проксируется Vite) |

Реализация вызывает те же функции `database.ts`, но через HTTP-endpoints (см. [ARCHITECTURE.md](ARCHITECTURE.md) — REST API).

**Особенности:**
- `migrate()` возвращает `{ books: 0, franchises: 0 }` (миграция не нужна через HTTP)
- Ошибки обрабатываются через `try/catch` в Express-обработчиках

### 7.3 LocalStorage — Браузер (без сервера)

| Характеристика | Значение |
|---|---|
| Ключи | `lumina_books_v1`, `lumina_franchises_v1`, `lumina_user_profile` |
| Формат | JSON.stringify/JSON.parse |
| Ограничение | ~5MB (браузерное ограничение) |

**Дополнительные ключи localStorage:**
| Ключ | Назначение |
|---|---|
| `lumina_lang` | Выбранный язык ('en'/'ru') |
| `lumina_migrated` | Флаг миграции в SQLite |
| `lumina_auto_sync` | Включена ли автосинхронизация |
| `lumina_default_cover_url` | URL обложки по умолчанию (устаревший) |
| `lumina_achievements_unlocked` | Массив ID достижений (fallback) |
| `lumina_catalog_viewmode` | Режим просмотра каталога |
| `lumina_catalog_filter_statuses` | Выбранные фильтры статусов |
| `lumina_catalog_table_sort` | Параметр сортировки |

---

## 8. Стратегия миграции

Приложение поддерживает обратную совместимость схемы данных через последовательные миграции.

### 8.1 Миграция localStorage → SQLite

```typescript
const needMigrate = (legacyBooks || legacyFranchises) && !localStorage.getItem('lumina_migrated');
if (needMigrate) {
  const result = await window.electronAPI.db.migrate();
  localStorage.setItem('lumina_migrated', 'true');
  localStorage.removeItem('lumina_books_v1');
  localStorage.removeItem('lumina_franchises_v1');
}
```

### 8.2 Миграция колонок в БД

При добавлении новых колонок используется `try/catch`:

```typescript
try {
  db.exec(`ALTER TABLE books ADD COLUMN statusHistory TEXT DEFAULT '[]'`);
} catch { /* колонка уже существует */ }
```

Текущий набор колонок стабилен — новых миграций не требуется.

### 8.3 Миграция истории статусов

При загрузке книг автоматически выполняется:

1. `migrateAllBooksStatusHistory()` — генерация history для книг, у которых её нет
2. `updateBookStatusBasedOnDates()` — синхронизация статуса по датам
3. `syncStatusFromHistory()` — синхронизация статуса из истории

---

## 9. Экспорт/импорт JSON

Реализовано в `src/utils/jsonUtils.ts`.

### 9.1 Формат экспорта

```json
{
  "version": 1,
  "exportedAt": "2026-06-28T12:00:00.000Z",
  "userProfile": {
    "nickname": "...",
    "photoUrl": "...",
    "defaultCoverUrl": "...",
    "achievements": ["1", "2", "3"],
    "googleApiKey": ""
  },
  "books": [...],
  "franchises": [...]
}
```

### 9.2 Экспорт

- Собирает все книги, коллекции и профиль
- Скачивается через `a.download` с именем `luminabooks_backup_YYYY-MM-DD.json`
- Данные не шифруются (JSON в открытом виде)

### 9.3 Импорт

- Загружается через `<input type="file">`
- Парсится, проверяется версия
- Очищает текущие данные и загружает новые
- Поддерживается импорт только книг (без коллекций и профиля) из старого формата

---

## 10. Связанные документы

- [ARCHITECTURE.md](ARCHITECTURE.md) — архитектура приложения
- [DECISIONS.md](DECISIONS.md) — обоснование архитектурных решений
- [FEATURES.md](FEATURES.md) — описание функций
