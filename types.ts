
export enum BookStatus {
  READING = 'Reading',
  READ = 'Read',
  WANT_TO_READ = 'To Read'
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
  sessions?: ReadingSession[];
}

export type ViewType = 'catalog' | 'calendar' | 'statistics' | 'reading';
