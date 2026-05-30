import { Book, BookStatus, StatusChange, Franchise } from '../types';
import { migrateBookStatusHistory, enrichBookStatusHistory } from './statusHistoryUtils';

export interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
  achievements?: string[];
}

export interface ExportData {
  version: '1.0';
  exportDate: string;
  totalBooks: number;
  userProfile?: UserProfile;
  franchises?: Franchise[];
  books: Book[];
}

export interface ImportResult {
  books: Book[];
  userProfile?: UserProfile;
  franchises?: Franchise[];
}

/**
 * Экспортирует все книги со всеми данными (сессии, проценты, даты), коллекции и информацию о пользователе в JSON формате
 */
export const exportBooksToJson = (books: Book[], franchises?: Franchise[]) => {
  // Получаем профиль пользователя из localStorage
  let userProfile: UserProfile | undefined = undefined;
  try {
    const savedProfile = localStorage.getItem('lumina_user_profile');
    if (savedProfile) {
      userProfile = JSON.parse(savedProfile);
    }
  } catch (e) {
    console.error("Failed to load user profile for export", e);
  }

  // Пополняем историю статусов из дат, если её нет и нормализуем inQueue
  const enrichedBooks = books.map(book => ({
    ...enrichBookStatusHistory(book),
    inQueue: book.inQueue === true ? true : false,
  }));

  const exportData: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalBooks: enrichedBooks.length,
    ...(userProfile && { userProfile }),
    ...(franchises && franchises.length > 0 && { franchises }),
    books: enrichedBooks
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
 * Импортирует книги и информацию о пользователе из JSON файла со всеми данными
 */
export const importBooksFromJson = (file: File): Promise<ImportResult> => {
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

          // Валидация и обработка истории статусов
          const validatedStatusHistory = Array.isArray(book.statusHistory) 
            ? book.statusHistory.filter((change: any) => {
                // Валидируем каждое изменение статуса
                return (
                  change.timestamp && 
                  typeof change.timestamp === 'string' &&
                  change.previousStatus && 
                  Object.values(BookStatus).includes(change.previousStatus) &&
                  change.newStatus && 
                  Object.values(BookStatus).includes(change.newStatus)
                );
              })
            : undefined;

          // Определяем текущий статус: если есть история, берем последний статус из неё
          // Иначе используем статус из JSON
          let finalStatus = status;
          if (validatedStatusHistory && validatedStatusHistory.length > 0) {
            finalStatus = validatedStatusHistory[validatedStatusHistory.length - 1].newStatus;
          }

          // Валидация очереди
          const inQueue = typeof book.inQueue === 'boolean' ? book.inQueue : false;

          // Валидация коллекцию
          const franchiseIds = Array.isArray(book.franchiseIds)
            ? book.franchiseIds.filter(id => typeof id === 'string')
            : undefined;

          const isPartOfSeries = typeof book.isPartOfSeries === 'boolean' ? book.isPartOfSeries : (franchiseIds && franchiseIds.length > 0);

          const importedBook: Book = {
            id: book.id || `imported_${Date.now()}_${index}`,
            title: book.title,
            author: book.author,
            year: book.year || new Date().getFullYear(),
            coverUrl: book.coverUrl || '',
            status: finalStatus,
            rating,
            startDate: book.startDate || '',
            endDate: book.endDate || '',
            description: book.description || '',
            totalPages,
            currentPage,
            currentPercentage: currentPercentage ?? (sessions && sessions.length > 0 ? sessions[sessions.length - 1].endPercentage : undefined),
            sessions: sessions && sessions.length > 0 ? sessions : undefined,
            statusHistory: validatedStatusHistory,
            inQueue,
            franchiseIds,
            isPartOfSeries
          };

          return importedBook;
        });

        // Сохраняем профиль пользователя в localStorage, если он есть в импортированном файле
        if (data.userProfile) {
          localStorage.setItem('lumina_user_profile', JSON.stringify(data.userProfile));
        }

        // Мигрируем старые форматы статусов
        let migratedBooks = importedBooks.map(book => migrateBookStatusHistory(book));
        
        // Пополняем историю статусов из дат, если её нет
        const enrichedBooks = migratedBooks.map(book => enrichBookStatusHistory(book));

        // Валидация коллекцию
        const importedFranchises: Franchise[] = [];
        if (data.franchises && Array.isArray(data.franchises)) {
          for (const franchise of data.franchises) {
            if (franchise.id && franchise.name && Array.isArray(franchise.bookIds)) {
              importedFranchises.push({
                id: franchise.id,
                name: franchise.name,
                description: franchise.description || undefined,
                bookIds: franchise.bookIds.filter(id => typeof id === 'string'),
                createdAt: franchise.createdAt || new Date().toISOString(),
                updatedAt: franchise.updatedAt || new Date().toISOString(),
              });
            }
          }
        }

        resolve({
          books: enrichedBooks,
          userProfile: data.userProfile,
          franchises: importedFranchises.length > 0 ? importedFranchises : undefined
        });
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
