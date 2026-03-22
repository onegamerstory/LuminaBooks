import { Book, BookStatus } from '../types';

export interface ExportData {
  version: '1.0';
  exportDate: string;
  totalBooks: number;
  books: Book[];
}

/**
 * Экспортирует все книги со всеми данными (сессии, проценты, даты) в JSON формате
 */
export const exportBooksToJson = (books: Book[]) => {
  const exportData: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalBooks: books.length,
    books: books
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `LuminaBooks_${new Date().toISOString().split('T')[0]}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Импортирует книги из JSON файла со всеми данными
 */
export const importBooksFromJson = (file: File): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const data = JSON.parse(jsonString) as ExportData;

        // Проверка версии файла
        if (!data.version || !data.books || !Array.isArray(data.books)) {
          throw new Error('Неверный формат JSON файла. Возможно, это не файл из LuminaBooks.');
        }

        // Валидация и нормализация данных книг
        const importedBooks: Book[] = data.books.map((book, index) => {
          // Проверка обязательных полей
          if (!book.title || !book.author) {
            throw new Error(`Книга ${index + 1}: отсутствуют обязательные поля (название или автор)`);
          }

          // Валидация статуса
          let status = BookStatus.WANT_TO_READ;
          if (Object.values(BookStatus).includes(book.status)) {
            status = book.status;
          }

          // Валидация оценки (0-10)
          let rating = book.rating || 0;
          if (typeof rating !== 'number') {
            rating = parseFloat(String(rating)) || 0;
          }
          rating = Math.min(10, Math.max(0, rating));

          // Валидация страниц и процентов
          const totalPages = typeof book.totalPages === 'number' && book.totalPages > 0 ? book.totalPages : undefined;
          const currentPage = typeof book.currentPage === 'number' && book.currentPage > 0 ? book.currentPage : undefined;
          const currentPercentage = typeof book.currentPercentage === 'number' && book.currentPercentage >= 0 && book.currentPercentage <= 100 ? book.currentPercentage : undefined;
          
          // Валидация часов
          const totalHours = typeof book.totalHours === 'number' && book.totalHours >= 0 ? Math.round(book.totalHours * 10) / 10 : undefined;

          // Валидация сессий чтения
          const sessions = Array.isArray(book.sessions) 
            ? book.sessions.map((session, sessionIndex) => {
                // Проверка обязательных полей сессии
                if (!session.startTime || !session.endTime) {
                  console.warn(`Сессия ${sessionIndex + 1} в книге "${book.title}": отсутствуют время начала или окончания, сессия пропущена`);
                  return null;
                }

                const duration = typeof session.duration === 'number' && session.duration >= 0 ? session.duration : 0;
                const startPage = typeof session.startPage === 'number' && session.startPage >= 0 ? session.startPage : undefined;
                const endPage = typeof session.endPage === 'number' && session.endPage >= 0 ? session.endPage : undefined;
                const pagesRead = endPage && startPage ? endPage - startPage : session.pagesRead;
                
                const startPercentage = typeof session.startPercentage === 'number' && session.startPercentage >= 0 && session.startPercentage <= 100 ? session.startPercentage : undefined;
                const endPercentage = typeof session.endPercentage === 'number' && session.endPercentage >= 0 && session.endPercentage <= 100 ? session.endPercentage : undefined;
                const percentageRead = endPercentage && startPercentage ? endPercentage - startPercentage : session.percentageRead;

                return {
                  id: session.id || `session_${Date.now()}_${sessionIndex}`,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  duration,
                  startPage,
                  endPage,
                  pagesRead,
                  startPercentage,
                  endPercentage,
                  percentageRead
                };
              })
              .filter((session): session is any => session !== null)
            : undefined;

          const importedBook: Book = {
            id: book.id || `imported_${Date.now()}_${index}`,
            title: book.title,
            author: book.author,
            year: book.year || new Date().getFullYear(),
            coverUrl: book.coverUrl || '',
            status,
            rating,
            startDate: book.startDate || '',
            endDate: book.endDate || '',
            description: book.description || '',
            totalPages,
            currentPage,
            currentPercentage,
            totalHours,
            sessions: sessions && sessions.length > 0 ? sessions : undefined
          };

          return importedBook;
        });

        resolve(importedBooks);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('Ошибка при парсинге JSON файла. Убедитесь, что файл является корректным JSON.'));
        } else if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Неизвестная ошибка при импорте файла'));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка при загрузке файла'));
    };

    reader.readAsText(file);
  });
};
