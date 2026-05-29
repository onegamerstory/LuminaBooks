import { Book, BookStatus } from '../types';

export interface AchievementDef {
  id: string;
  title: { en: string; ru: string };
  desc: { en: string; ru: string };
}

export interface AchievementNotificationItem {
  id: string;
  achievementId: string;
  title: string;
  desc: string;
}

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  { id: '1', title: { ru: 'Начало пути', en: 'First Steps' }, desc: { ru: 'Прочитайте свою первую книгу', en: 'Read your first book' } },
  { id: '2', title: { ru: 'Книжный червь', en: 'Bookworm' }, desc: { ru: 'Прочитайте 5 книг', en: 'Read 5 books' } },
  { id: '3', title: { ru: 'Заядлый читатель', en: 'Avid Reader' }, desc: { ru: 'Прочитайте 15 книг', en: 'Read 15 books' } },
  { id: '4', title: { ru: 'Библиофил', en: 'Bibliophile' }, desc: { ru: 'Прочитайте 30 книг', en: 'Read 30 books' } },
  { id: '5', title: { ru: 'Книжный маньяк', en: 'Book Maniac' }, desc: { ru: 'Прочитайте 50 книг', en: 'Read 50 books' } },
  { id: '6', title: { ru: '100 часов', en: '100 Hours' }, desc: { ru: 'Проведите 100 часов за чтением', en: 'Spend 100 hours reading' } },
  { id: '7', title: { ru: 'Книжный странник', en: 'Book Wanderer' }, desc: { ru: 'Проведите 500 часов за чтением', en: 'Spend 500 hours reading' } },
  { id: '8', title: { ru: 'Ценитель', en: 'Connoisseur' }, desc: { ru: 'Поставьте книге оценку 10', en: 'Rate a book 10 stars' } },
  { id: '9', title: { ru: 'Коллекционер', en: 'Collector' }, desc: { ru: 'Начните читать книги из цикла', en: 'Start reading books from a series' } },
  { id: '10', title: { ru: 'Постоянный читатель', en: 'Consistent Reader' }, desc: { ru: 'Читайте книги в течение 6 разных месяцев', en: 'Read books in 6 different months' } },
];

export function getUnlockedAchievementIds(books: Book[]): string[] {
  const readCount = books.filter(b => b.status === BookStatus.READ || b.endDate?.trim() !== '').length;
  const strictReadBooks = books.filter(b => b.status === BookStatus.READ);

  const totalReadSeconds = books.reduce((total, book) => {
    return total + (book.sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
  }, 0);
  const totalReadHours = totalReadSeconds / 3600;

  const maxRating = strictReadBooks.length > 0 ? Math.max(...strictReadBooks.map(b => b.rating)) : 0;

  const activeMonths = books.reduce((set, book) => {
    book.sessions?.forEach(s => {
      const d = new Date(s.startTime);
      if (!isNaN(d.getTime())) set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return set;
  }, new Set<string>());

  const hasSeries = strictReadBooks.some(b => b.franchiseIds && b.franchiseIds.length > 0);

  const conditions: [string, boolean][] = [
    ['1', readCount >= 1],
    ['2', readCount >= 5],
    ['3', readCount >= 15],
    ['4', readCount >= 30],
    ['5', readCount >= 50],
    ['6', totalReadHours >= 100],
    ['7', totalReadHours >= 500],
    ['8', maxRating === 10],
    ['9', hasSeries],
    ['10', activeMonths.size >= 6],
  ];

  return conditions.filter(([, unlocked]) => unlocked).map(([id]) => id);
}
