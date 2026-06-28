/**
 * Status color utilities for catalog components
 */

import { Book, BookStatus } from '../types';
import { getCurrentBookStatus, recordStatusChange } from './statusHistoryUtils';

export const getStatusColor = (status: BookStatus): string => {
  switch (status) {
    case BookStatus.READING:
      return 'text-blue-600 bg-blue-50';
    case BookStatus.READ:
      return 'text-emerald-600 bg-emerald-50';
    case BookStatus.WANT_TO_READ:
      return 'text-amber-600 bg-amber-50';
    case BookStatus.ABANDONED:
      return 'text-red-600 bg-red-50';
    case BookStatus.POSTPONED:
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-muted bg-page';
  }
};

export const syncStatusFromHistory = (books: Book[]): Book[] => {
  return books.map(book => {
    const currentStatus = getCurrentBookStatus(book);
    if (currentStatus !== book.status) {
      return {
        ...book,
        status: currentStatus
      };
    }
    return book;
  });
};

export const updateBookStatusBasedOnDates = (books: Book[]): Book[] => {
  return books.map(book => {
    let updatedBook = { ...book };

    // Не изменяем статусы "Брошено" и "Отложено"
    if (book.status === BookStatus.ABANDONED || book.status === BookStatus.POSTPONED) {
      return updatedBook;
    }

    // Не изменяем статус READ, если он уже зафиксирован в истории статусов
    if (book.statusHistory && book.statusHistory.length > 0) {
      const lastStatus = book.statusHistory[book.statusHistory.length - 1].newStatus;
      if (lastStatus === BookStatus.READ && book.status === BookStatus.READ) {
        return updatedBook;
      }
    }

    const hasStartDate = book.startDate &&
                        typeof book.startDate === 'string' &&
                        book.startDate.trim() !== '';
    const hasEndDate = book.endDate &&
                      typeof book.endDate === 'string' &&
                      book.endDate.trim() !== '';

    let newStatus: BookStatus | null = null;

    if (hasStartDate && hasEndDate) {
      newStatus = BookStatus.READ;
    }
    else if (hasStartDate && !hasEndDate) {
      newStatus = BookStatus.READING;
    }
    else {
      newStatus = BookStatus.WANT_TO_READ;
    }

    if (newStatus && newStatus !== book.status) {
      updatedBook = recordStatusChange(updatedBook, newStatus);
    } else if (newStatus) {
      updatedBook.status = newStatus;
    }

    return updatedBook;
  });
};
