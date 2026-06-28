import { useState, useEffect } from 'react';
import { Book, BookStatus, Franchise } from '../types';
import type { ElectronDBAPI } from '../electron.d';
import type { UserProfile } from '../utils/jsonUtils';
import { migrateAllBooksStatusHistory, regenerateStatusHistoryFromDates, recordStatusChange } from '../utils/statusHistoryUtils';
import { syncStatusFromHistory, updateBookStatusBasedOnDates } from '../utils/statusUtils';

interface UseBooksDeps {
  getDbApi: () => ElectronDBAPI | null;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>, isDangerous?: boolean) => void;
  lang: 'en' | 'ru';
  t: { deleteConfirm: string };
  setFranchises?: React.Dispatch<React.SetStateAction<Franchise[]>>;
}

export function useBooks({ getDbApi, addToast, showConfirmation, lang, t, setFranchises }: UseBooksDeps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookToRateId, setBookToRateId] = useState<string | null>(null);

  const handleAddBook = async (book: Book) => {
    let resultBook: Book | undefined;

    setBooks(prev => {
      // Нормализуем даты: пустые строки, null, undefined → пустая строка
      let normalizedBook: Book = {
        ...book,
        startDate: book.startDate?.trim() || '',
        endDate: book.endDate?.trim() || '',
      };

      let updatedBooks: Book[];
      if (editingBook) {
        // При редактировании проверяем, изменились ли даты
        const datesChanged = 
          editingBook.startDate !== normalizedBook.startDate || 
          editingBook.endDate !== normalizedBook.endDate;

        // ВАЖНО: Если даты изменились, регенерируем историю статусов из новых дат
        if (datesChanged) {
          const newStatusHistory = regenerateStatusHistoryFromDates(normalizedBook);
          if (newStatusHistory.length > 0) {
            normalizedBook = {
              ...normalizedBook,
              statusHistory: newStatusHistory
            };
          }
        }

        // При редактировании проверяем, изменился ли статус вручную
        const oldStatus = editingBook.status;
        const newStatus = normalizedBook.status;

        // Сначала обновляем статусы на основе дат
        const booksWithUpdatedDates = updateBookStatusBasedOnDates(prev.map(b => 
          b.id === normalizedBook.id ? { ...normalizedBook, status: oldStatus } : b
        ));
        
        // Находим обновленную книгу
        const dateUpdatedBook = booksWithUpdatedDates.find(b => b.id === normalizedBook.id)!;
        
        // Если пользователь явно изменил статус вручную
        if (oldStatus !== newStatus && dateUpdatedBook.status !== newStatus) {
          normalizedBook = recordStatusChange({ ...dateUpdatedBook, status: oldStatus }, newStatus);
          updatedBooks = prev.map(b => b.id === normalizedBook.id ? normalizedBook : b);
        } else {
          updatedBooks = booksWithUpdatedDates;
        }

        resultBook = updatedBooks.find(b => b.id === normalizedBook.id);
      } else {
        updatedBooks = [...prev, normalizedBook];
        updatedBooks = updateBookStatusBasedOnDates(updatedBooks);
        resultBook = updatedBooks.find(b => b.id === normalizedBook.id);
      }

      return updatedBooks;
    });

    // Сохраняем книгу через активное API
    const saveApi = getDbApi();
    if (resultBook && saveApi) {
      if (editingBook) {
        await saveApi.updateBook(resultBook);
      } else {
        await saveApi.addBook(resultBook);
      }
    }

    // Update franchises based on book's new franchiseIds
    if (setFranchises) {
      setFranchises(prev => {
        let updated = prev.map(franchise => {
          const shouldIncludeBook = book.franchiseIds?.includes(franchise.id) ?? false;
          const currentlyIncludesBook = franchise.bookIds.includes(book.id);

          if (shouldIncludeBook && !currentlyIncludesBook) {
            return {
              ...franchise,
              bookIds: [...franchise.bookIds, book.id],
              updatedAt: new Date().toISOString(),
            };
          } else if (!shouldIncludeBook && currentlyIncludesBook) {
            return {
              ...franchise,
              bookIds: franchise.bookIds.filter((bid: string) => bid !== book.id),
              updatedAt: new Date().toISOString(),
            };
          }
          return franchise;
        });
        return updated;
      });
    }

    // Сохраняем измененные коллекции через активное API
    if (saveApi && resultBook) {
      const allFranchises = await saveApi.getAllFranchises();
      for (const f of allFranchises) {
        const shouldInclude = book.franchiseIds?.includes(f.id) ?? false;
        const currentlyIncludes = f.bookIds.includes(book.id);
        if (shouldInclude !== currentlyIncludes) {
          const updatedF = {
            ...f,
            bookIds: shouldInclude ? [...f.bookIds, book.id] : f.bookIds.filter((id: string) => id !== book.id),
            updatedAt: new Date().toISOString(),
          };
          await saveApi.updateFranchise(updatedF);
        }
      }
    }

    setIsModalOpen(false);
    setEditingBook(undefined);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    showConfirmation(
      lang === 'ru' ? 'Удалить книгу' : 'Delete Book',
      t.deleteConfirm,
      async () => {
        const api = getDbApi();
        if (api) {
          await api.deleteBook(id);
        }
        setBooks(prev => prev.filter(b => b.id !== id));
        addToast(
          lang === 'ru' ? 'Книга удалена' : 'Book deleted',
          'success'
        );
      },
      true
    );
  };

  const handleAddToQueue = async (book: Book) => {
    const updatedBook: Book = {
      ...book,
      inQueue: true,
      status: book.status === BookStatus.ABANDONED || book.status === BookStatus.POSTPONED
        ? BookStatus.WANT_TO_READ
        : book.status,
    };

    setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));

    const api = getDbApi();
    if (api) {
      try {
        await api.updateBook(updatedBook);
      } catch (e) {
        console.error('Failed to add book to queue:', e);
        setBooks(prev => prev.map(b =>
          b.id === book.id ? { ...b, inQueue: false, status: book.status } : b
        ));
        addToast(
          lang === 'ru' ? 'Ошибка при добавлении в очередь' : 'Failed to add to queue',
          'error'
        );
      }
    }
  };

  const handleStartReadingBook = async (book: Book) => {
    const updatedBook: Book = {
      ...book,
      status: BookStatus.READING,
      startDate: new Date().toISOString().split('T')[0],
      inQueue: false,
    };

    setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));

    const api = getDbApi();
    if (api) {
      await api.updateBook(updatedBook);
    }
  };

  const handleImport = async (importedBooks: Book[], userProfile?: UserProfile, importedFranchises?: Franchise[]) => {
    const importApi = getDbApi();
    // Если в импорте есть информация о пользователе, обновляем
    if (userProfile && importApi) {
      await importApi.setUserProfile({ ...userProfile, achievements: userProfile.achievements || [], googleApiKey: '' });
      localStorage.setItem('lumina_user_profile', JSON.stringify(userProfile));
    }

    // Обновляем коллекции если они есть в импортированных данных
    if (importedFranchises && importedFranchises.length > 0 && setFranchises) {
      setFranchises(prev => {
        let updated = prev.map(existingFranchise => {
          const importedFranchise = importedFranchises.find(f => f.id === existingFranchise.id);
          if (importedFranchise) {
            return {
              ...importedFranchise,
              createdAt: existingFranchise.createdAt,
            };
          }
          return existingFranchise;
        });

        const existingIds = new Set(updated.map(f => f.id));
        const newFranchises = importedFranchises.filter(f => !existingIds.has(f.id));
        return [...updated, ...newFranchises];
      });

      // Сохраняем коллекции через активное API
      if (importApi) {
        const allExistingFranchises = await importApi.getAllFranchises();
        for (const f of importedFranchises) {
          const existing = allExistingFranchises.find(ef => ef.id === f.id);
          if (existing) {
            await importApi.updateFranchise({ ...f, createdAt: existing.createdAt });
          } else {
            await importApi.addFranchise(f);
          }
        }
      }
    }

    // Вычисляем финальный список книг ДО вызова setBooks (React 18+ батчит setState)
    const migratedImportedBooks = migrateAllBooksStatusHistory(importedBooks);

    const updatedBooks = books.map(existingBook => {
      const duplicateImportedBook = migratedImportedBooks.find(
        importedBook =>
          importedBook.title.toLowerCase().trim() === existingBook.title.toLowerCase().trim() &&
          importedBook.author.toLowerCase().trim() === existingBook.author.toLowerCase().trim()
      );

      if (duplicateImportedBook) {
        return {
          ...duplicateImportedBook,
          id: existingBook.id,
          sessions: duplicateImportedBook.sessions,
          statusHistory: duplicateImportedBook.statusHistory,
          currentPage: duplicateImportedBook.currentPage,
          currentPercentage: duplicateImportedBook.currentPercentage,
          inQueue: duplicateImportedBook.inQueue,
          franchiseIds: duplicateImportedBook.franchiseIds,
          isPartOfSeries: duplicateImportedBook.isPartOfSeries,
        };
      }

      return existingBook;
    });

    const existingTitlesAuthors = new Set(
      updatedBooks.map(b => `${b.title.toLowerCase().trim()}_${b.author.toLowerCase().trim()}`)
    );

    const newBooks = migratedImportedBooks.filter(
      importedBook =>
        !existingTitlesAuthors.has(
          `${importedBook.title.toLowerCase().trim()}_${importedBook.author.toLowerCase().trim()}`
        )
    );

    const combinedBooks = [...updatedBooks, ...newBooks];
    let final = updateBookStatusBasedOnDates(combinedBooks);
    final = syncStatusFromHistory(final);

    // Сохраняем книги через активное API ДО обновления состояния
    if (importApi && final.length > 0) {
      for (const book of final) {
        await importApi.updateBook(book);
      }
    }

    // Обновляем состояние после сохранения
    setBooks(final);
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    
    const api = getDbApi();
    if (api) {
      await api.updateBook(updatedBook);
    }

    // Проверяем если книга достигла 100% прогресса и у нее нет оценки
    if ((updatedBook.status === BookStatus.READ || updatedBook.currentPercentage === 100) && updatedBook.rating === 0) {
      setBookToRateId(updatedBook.id);
    }
  };

  const handleStartReading = async (bookId: string, startDate: string) => {
    let savedBook: Book | undefined;
    setBooks(prev => {
      const updatedBooks = prev.map(book => {
        if (book.id === bookId) {
          const updatedBook: Book = {
            ...book,
            startDate: startDate,
            endDate: book.endDate || '',
          };
          savedBook = updatedBook;
          return updatedBook;
        }
        return book;
      });
      return updateBookStatusBasedOnDates(updatedBooks);
    });
    const api = getDbApi();
    if (savedBook && api) {
      await api.updateBook(savedBook);
    }
  };

  const handleBooksUpdated = async (updatedBooks: Book[]) => {
    setBooks(updatedBooks);
    const api = getDbApi();
    if (api) {
      for (const book of updatedBooks) {
        await api.updateBook(book);
      }
    }
  };

  // Синхронизируем editingBook с обновлённым массивом books
  // (например, при удалении коллекции — franchiseIds в книге очищаются)
  useEffect(() => {
    if (editingBook) {
      const updated = books.find(b => b.id === editingBook.id);
      if (updated && updated !== editingBook) {
        setEditingBook(updated);
      }
    }
  }, [books, editingBook]);

  // Браузерный fallback: сохраняем книги в localStorage (только если нет API)
  useEffect(() => {
    if (!window.electronAPI?.db && !getDbApi()) {
      localStorage.setItem('lumina_books_v1', JSON.stringify(books));
    }
  }, [books, getDbApi]);

  return {
    books,
    setBooks,
    editingBook,
    setEditingBook,
    isModalOpen,
    setIsModalOpen,
    bookToRateId,
    setBookToRateId,
    handleEdit,
    handleDelete,
    handleAddBook,
    handleAddToQueue,
    handleStartReadingBook,
    handleImport,
    handleUpdateBook,
    handleStartReading,
    handleBooksUpdated,
  };
}
