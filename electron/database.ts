import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';

let db: Database.Database;

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number | string;
  coverUrl: string;
  status: string;
  rating: number;
  startDate: string;
  endDate: string;
  description?: string;
  totalPages?: number;
  currentPage?: number;
  currentPercentage?: number;
  isPartOfSeries?: boolean;
  franchiseIds?: string[];
  inQueue?: boolean;
  sessions?: any[];
  statusHistory?: any[];
}

export interface Franchise {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  bookIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
  achievements: string[];
  googleApiKey: string;
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'luminabooks.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS books_dictionary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      year TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      lang TEXT DEFAULT '',
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_dict_title ON books_dictionary(title COLLATE NOCASE)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_dict_author ON books_dictionary(author COLLATE NOCASE)`);
  } catch { /* indexes may already exist */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      year TEXT DEFAULT '',
      coverUrl TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'WANT_TO_READ',
      rating REAL DEFAULT 0,
      startDate TEXT DEFAULT '',
      endDate TEXT DEFAULT '',
      description TEXT DEFAULT '',
      totalPages INTEGER,
      currentPage INTEGER,
      currentPercentage REAL,
      isPartOfSeries INTEGER DEFAULT 0,
      franchiseIds TEXT DEFAULT '[]',
      inQueue INTEGER DEFAULT 0,
      sessions TEXT DEFAULT '[]',
      statusHistory TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS franchises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      coverUrl TEXT DEFAULT '',
      bookIds TEXT DEFAULT '[]',
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      nickname TEXT DEFAULT '',
      photoUrl TEXT DEFAULT '',
      defaultCoverUrl TEXT DEFAULT ''
    );
  `);

  // Migration: add coverUrl column to franchises if missing (upgrade from older schema)
  try {
    db.exec(`ALTER TABLE franchises ADD COLUMN coverUrl TEXT DEFAULT ''`);
  } catch {
    // Column already exists
  }

  // Migration: add achievements column to user_profile if missing
  try {
    db.exec(`ALTER TABLE user_profile ADD COLUMN achievements TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists
  }

  // Migration: add googleApiKey column to user_profile if missing
  try {
    db.exec(`ALTER TABLE user_profile ADD COLUMN googleApiKey TEXT DEFAULT ''`);
  } catch {
    // Column already exists
  }

  db.prepare(`INSERT OR IGNORE INTO user_profile (id, nickname, photoUrl, defaultCoverUrl, achievements, googleApiKey) VALUES (1, '', '', '', '[]', '')`).run();
}

// --- Book CRUD ---

export function getAllBooks(): Book[] {
  const rows = db.prepare('SELECT * FROM books').all() as any[];
  return rows.map(rowToBook);
}

export function getBook(id: string): Book | null {
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any;
  return row ? rowToBook(row) : null;
}

export function addBook(book: Book): Book {
  const stmt = db.prepare(`
    INSERT INTO books (id, title, author, year, coverUrl, status, rating, startDate, endDate, description,
      totalPages, currentPage, currentPercentage, isPartOfSeries, franchiseIds, inQueue, sessions, statusHistory)
    VALUES (:id, :title, :author, :year, :coverUrl, :status, :rating, :startDate, :endDate, :description,
      :totalPages, :currentPage, :currentPercentage, :isPartOfSeries, :franchiseIds, :inQueue, :sessions, :statusHistory)
  `);
  stmt.run(bookToRow(book));
  return book;
}

export function updateBook(book: Book): Book {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO books (id, title, author, year, coverUrl, status, rating, startDate, endDate, description,
      totalPages, currentPage, currentPercentage, isPartOfSeries, franchiseIds, inQueue, sessions, statusHistory)
    VALUES (:id, :title, :author, :year, :coverUrl, :status, :rating, :startDate, :endDate, :description,
      :totalPages, :currentPage, :currentPercentage, :isPartOfSeries, :franchiseIds, :inQueue, :sessions, :statusHistory)
  `);
  stmt.run(bookToRow(book));
  return book;
}

export function deleteBook(id: string): void {
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
}

// --- Franchise CRUD ---

export function getAllFranchises(): Franchise[] {
  const rows = db.prepare('SELECT * FROM franchises').all() as any[];
  return rows.map(rowToFranchise);
}

export function addFranchise(f: Franchise): Franchise {
  const stmt = db.prepare(`
    INSERT INTO franchises (id, name, description, coverUrl, bookIds, createdAt, updatedAt)
    VALUES (:id, :name, :description, :coverUrl, :bookIds, :createdAt, :updatedAt)
  `);
  stmt.run(franchiseToRow(f));
  return f;
}

export function updateFranchise(f: Franchise): Franchise {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO franchises (id, name, description, coverUrl, bookIds, createdAt, updatedAt)
    VALUES (:id, :name, :description, :coverUrl, :bookIds, :createdAt, :updatedAt)
  `);
  stmt.run(franchiseToRow(f));
  return f;
}

export function deleteFranchise(id: string): void {
  db.prepare('DELETE FROM franchises WHERE id = ?').run(id);
}

// --- User Profile CRUD ---

export function getUserProfile(): UserProfile {
  const row = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;
  let achievements: string[] = [];
  try {
    achievements = JSON.parse(row?.achievements || '[]');
  } catch { /* ignore */ }
  return {
    nickname: row?.nickname || '',
    photoUrl: row?.photoUrl || '',
    defaultCoverUrl: row?.defaultCoverUrl || '',
    achievements,
    googleApiKey: row?.googleApiKey || '',
  };
}

export function setUserProfile(profile: UserProfile): void {
  const achievements = [...new Set([
    ...getUserProfile().achievements,
    ...(profile.achievements || []),
  ])];
  db.prepare(`
    UPDATE user_profile SET nickname = ?, photoUrl = ?, defaultCoverUrl = ?, achievements = ?, googleApiKey = ? WHERE id = 1
  `).run(profile.nickname, profile.photoUrl, profile.defaultCoverUrl, JSON.stringify(achievements), profile.googleApiKey || '');
}

export function mergeUserAchievements(achievements: string[]): UserProfile {
  const profile = getUserProfile();
  const mergedAchievements = [...new Set([...profile.achievements, ...achievements])];
  db.prepare('UPDATE user_profile SET achievements = ? WHERE id = 1')
    .run(JSON.stringify(mergedAchievements));
  return { ...profile, achievements: mergedAchievements };
}

// --- Migration ---

export function migrateFromLocalStorage(data: { books: Book[], franchises: Franchise[] }): { books: number, franchises: number } {
  const bookStmt = db.prepare(`
    INSERT OR REPLACE INTO books (id, title, author, year, coverUrl, status, rating, startDate, endDate, description,
      totalPages, currentPage, currentPercentage, isPartOfSeries, franchiseIds, inQueue, sessions, statusHistory)
    VALUES (:id, :title, :author, :year, :coverUrl, :status, :rating, :startDate, :endDate, :description,
      :totalPages, :currentPage, :currentPercentage, :isPartOfSeries, :franchiseIds, :inQueue, :sessions, :statusHistory)
  `);

  const franchiseStmt = db.prepare(`
    INSERT OR REPLACE INTO franchises (id, name, description, coverUrl, bookIds, createdAt, updatedAt)
    VALUES (:id, :name, :description, :coverUrl, :bookIds, :createdAt, :updatedAt)
  `);

  const transaction = db.transaction(() => {
    for (const book of data.books) {
      bookStmt.run(bookToRow(book));
    }
    for (const f of data.franchises) {
      franchiseStmt.run(franchiseToRow(f));
    }
  });

  transaction();

  return { books: data.books.length, franchises: data.franchises.length };
}

// --- Books Dictionary ---

export interface BookDictEntry {
  title: string;
  author: string;
  year: string;
  coverUrl: string;
  lang: string;
  source: string;
}

export function searchBooksDictionary(title: string, author?: string): BookDictEntry[] {
  let query = `SELECT DISTINCT title, author, year, cover_url AS coverUrl, lang, source FROM books_dictionary WHERE 1=1`;
  const params: any[] = [];

  if (title.trim()) {
    query += ` AND title LIKE ? COLLATE NOCASE`;
    params.push(`%${title.trim()}%`);
  }
  if (author?.trim()) {
    query += ` AND author LIKE ? COLLATE NOCASE`;
    params.push(`%${author.trim()}%`);
  }

  query += ` LIMIT 10`;
  return db.prepare(query).all(...params) as BookDictEntry[];
}

export function saveToBooksDictionary(entry: BookDictEntry): void {
  const exists = db.prepare(`
    SELECT id FROM books_dictionary WHERE title = ? AND author = ? LIMIT 1
  `).get(entry.title, entry.author);

  if (exists) return;

  db.prepare(`
    INSERT INTO books_dictionary (title, author, year, cover_url, lang, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.title, entry.author, entry.year, entry.coverUrl, entry.lang, entry.source);
}

// --- Helpers ---

function rowToBook(row: any): Book {
  return {
    ...row,
    year: row.year || '',
    isPartOfSeries: row.isPartOfSeries === 1,
    inQueue: row.inQueue === 1,
    franchiseIds: safeJsonParse(row.franchiseIds, []),
    sessions: safeJsonParse(row.sessions, []),
    statusHistory: safeJsonParse(row.statusHistory, []),
  };
}

function bookToRow(book: Book): any {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    year: String(book.year ?? ''),
    coverUrl: book.coverUrl || '',
    status: book.status || 'WANT_TO_READ',
    rating: book.rating ?? 0,
    startDate: book.startDate ?? '',
    endDate: book.endDate ?? '',
    description: book.description ?? '',
    totalPages: book.totalPages ?? null,
    currentPage: book.currentPage ?? null,
    currentPercentage: book.currentPercentage ?? null,
    isPartOfSeries: book.isPartOfSeries ? 1 : 0,
    franchiseIds: JSON.stringify(book.franchiseIds ?? []),
    inQueue: book.inQueue ? 1 : 0,
    sessions: JSON.stringify(book.sessions ?? []),
    statusHistory: JSON.stringify(book.statusHistory ?? []),
  };
}

function rowToFranchise(row: any): Franchise {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverUrl: row.coverUrl || undefined,
    bookIds: safeJsonParse(row.bookIds, []),
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
  };
}

function franchiseToRow(f: Franchise): any {
  return {
    id: f.id,
    name: f.name,
    description: f.description ?? '',
    coverUrl: f.coverUrl ?? '',
    bookIds: JSON.stringify(f.bookIds ?? []),
    createdAt: f.createdAt || new Date().toISOString(),
    updatedAt: f.updatedAt || new Date().toISOString(),
  };
}

function safeJsonParse(str: string, fallback: any): any {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
