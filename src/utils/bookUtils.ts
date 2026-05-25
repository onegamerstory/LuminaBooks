import { Book, BookStatus } from '../types';

export const getBookPercentage = (book: Book): number => {
  if (book.currentPercentage !== undefined) return book.currentPercentage;
  if (book.currentPage && book.totalPages) return Math.round((book.currentPage / book.totalPages) * 100);
  if (book.status === BookStatus.READ) return 100;
  return 0;
};
