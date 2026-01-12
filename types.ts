
export enum BookStatus {
  READING = 'Reading',
  READ = 'Read',
  WANT_TO_READ = 'To Read'
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
}

export type ViewType = 'catalog' | 'calendar' | 'statistics';
