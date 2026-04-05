
export enum BookStatus {
  READING = 'READING',
  READ = 'READ',
  WANT_TO_READ = 'WANT_TO_READ',
  ABANDONED = 'ABANDONED',
  POSTPONED = 'POSTPONED'
}

export interface ReadingSession {
  id: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // в секундах
  startPage?: number; // Страница, с которой начали сессию
  endPage?: number; // Страница, на которой закончили сессию
  pagesRead?: number; // Вычисленное количество прочитанных страниц (endPage - startPage)
  startPercentage?: number; // Процент, с которого начали сессию
  endPercentage?: number; // Процент, на котором закончили сессию
  percentageRead?: number; // Вычисленное количество прочитанных процентов (endPercentage - startPercentage)
}

export interface StatusChange {
  timestamp: string; // ISO timestamp
  previousStatus: BookStatus;
  newStatus: BookStatus;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number | string;
  coverUrl: string;
  status: BookStatus;
  rating: number;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string;   // ISO string YYYY-MM-DD
  description?: string;
  totalPages?: number; // Всего страниц в книге
  currentPage?: number; // Текущая страница прочитанной книги
  currentPercentage?: number; // Текущий процент прочитанной книги
  totalHours?: number; // Базовое значение часов, установленное пользователем или импортированное
  isPartOfSeries?: boolean; // Является ли книга частью цикла/франшизы
  franchiseIds?: string[]; // IDs франшиз, к которым принадлежит книга
  sessions?: ReadingSession[];
  statusHistory?: StatusChange[]; // История смены статусов
}

export interface Franchise {
  id: string;
  name: string;
  description?: string;
  bookIds: string[]; // IDs книг в этой франшизе
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type ViewType = 'catalog' | 'franchises' | 'calendar' | 'statistics' | 'reading';
