
import React, { useState, useEffect } from 'react';
import { Book, BookStatus, ViewType, Franchise } from './types';
import CatalogView from './components/CatalogView';
import FranchiseView from './components/FranchiseView';
import CalendarView from './components/CalendarView';
import StatisticsView from './components/StatisticsView';
import ReadingView from './components/ReadingView';
import BookModal from './components/BookModal';
import BookRatingModal from './components/BookRatingModal';
import UserProfileModal from './components/UserProfileModal';
import { UserProfile } from './utils/jsonUtils';
import { recordStatusChange, getCurrentBookStatus, migrateAllBooksStatusHistory, enrichAllBooksStatusHistory } from './utils/statusHistoryUtils';
import { BookOpen, Calendar, Plus, Library, Languages, BarChart3, Zap, Settings, Link } from 'lucide-react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

const STORAGE_KEY = 'lumina_books_v1';
const FRANCHISES_STORAGE_KEY = 'lumina_franchises_v1';

export const translations = {
  en: {
    catalog: 'Catalog',
    calendar: 'Calendar',
    addBook: 'Add Book',
    library: 'My Library',
    searchPlaceholder: 'Search title or author...',
    allStatuses: 'All Statuses',
    reading: 'Reading',
    read: 'Read',
    toRead: 'To Read',
    abandoned: 'Abandoned',
    postponed: 'Postponed',
    editBook: 'Edit Book',
    addNewBook: 'Add New Book',
    title: 'Title',
    author: 'Author',
    year: 'Year',
    status: 'Status',
    rating: 'Rating',
    description: 'Description',
    startDate: 'Start Date',
    endDate: 'End Date',
    cancel: 'Cancel',
    updateBook: 'Update Book',
    addToLibrary: 'Add to Library',
    noBooks: 'No books found in your library.',
    tryAdding: 'Try adding a new book to start tracking!',
    readingCalendar: 'Reading Calendar',
    deleteConfirm: 'Are you sure you want to delete this book?',
    inProgress: '(In Progress)',
    preview: 'Preview',
    imageUrl: 'Image URL...',
    selectBookToStart: 'Select book to start reading',
    noBooksToStart: 'No books to start reading',
    startReading: 'Start reading',
    days: 'days',
    day: 'day',
    statistics: 'Statistics',
    totalBooks: 'Total Books',
    highestRatedBooks: 'Highest Rated Books',
    lowestRatedBooks: 'Lowest Rated Books',
    averageReadingSpeed: 'Average Reading Speed',
    averageReadingSpeedDesc: 'Average hours per book',
    noBooksWithDates: 'No books with reading sessions',
    book: 'book',
    books: 'books',
    booksPlural: 'books',
    userProfile: 'User Profile',
    nickname: 'Nickname',
    enterNickname: 'Enter your nickname...',
    profilePhoto: 'Profile Photo',
    defaultCoverSettings: 'Default Cover Settings',
    defaultCoverUrl: 'Default Cover URL',
    enterCoverUrl: 'Enter default cover URL...',
    save: 'Save',
    coverUrlSaved: 'Default cover URL saved',
    coverUrlCleared: 'Default cover URL cleared',
    profileSaved: 'Profile saved successfully'
  },
  ru: {
    catalog: 'Каталог',
    calendar: 'Календарь',
    addBook: 'Добавить книгу',
    library: 'Моя библиотека',
    searchPlaceholder: 'Поиск по названию или автору...',
    allStatuses: 'Все статусы',
    reading: 'Читаю',
    read: 'Прочитано',
    toRead: 'Буду читать',
    abandoned: 'Брошено',
    postponed: 'Отложено',
    editBook: 'Редактировать',
    addNewBook: 'Новая книга',
    title: 'Название',
    author: 'Автор',
    year: 'Год',
    status: 'Статус',
    rating: 'Оценка',
    description: 'Описание',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    cancel: 'Отмена',
    updateBook: 'Обновить',
    addToLibrary: 'Добавить',
    noBooks: 'В вашей библиотеке пока нет книг.',
    tryAdding: 'Добавьте свою первую книгу!',
    readingCalendar: 'Календарь чтения',
    deleteConfirm: 'Вы уверены, что хотите удалить эту книгу?',
    inProgress: '(В процессе)',
    preview: 'Превью',
    imageUrl: 'Ссылка на обложку...',
    selectBookToStart: 'Выберите книгу для начала чтения',
    noBooksToStart: 'Нет книг для начала чтения',
    startReading: 'Начать читать',
    days: 'дней',
    day: 'день',
    statistics: 'Статистика',
    totalBooks: 'Всего книг',
    highestRatedBooks: 'Книги с максимальной оценкой',
    lowestRatedBooks: 'Книги с минимальной оценкой',
    averageReadingSpeed: 'Средняя скорость прочтения',
    averageReadingSpeedDesc: 'Среднее количество часов на книгу',
    noBooksWithDates: 'Нет книг с историей чтения',
    book: 'книга',
    books: 'книг',
    booksPlural: 'книги',
    userProfile: 'Профиль пользователя',
    nickname: 'Никнейм',
    enterNickname: 'Введите ваш никнейм...',
    profilePhoto: 'Фотография профиля',
    defaultCoverSettings: 'Настройки обложки по умолчанию',
    defaultCoverUrl: 'URL обложки по умолчанию',
    enterCoverUrl: 'Введите URL обложки по умолчанию...',
    save: 'Сохранить',
    coverUrlSaved: 'URL обложки сохранён',
    coverUrlCleared: 'URL обложки очищен',
    profileSaved: 'Профиль успешно сохранён'
  }
};

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('catalog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [lang, setLang] = useState<'en' | 'ru'>('ru');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [defaultCoverUrl, setDefaultCoverUrl] = useState('');
  const [bookToRateId, setBookToRateId] = useState<string | null>(null);

  const t = translations[lang];

  // Функция для синхронизации текущего статуса из истории статусов
  // Берет последний (самый свежий) статус из statusHistory
  // Если истории нет, оставляет установленный пользователем статус
  const syncStatusFromHistory = (books: Book[]): Book[] => {
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

  // Функция для автоматического обновления статусов на основе наличия дат
  // Правила:
  // 1. Если есть дата начала И дата окончания → статус "Прочитано"
  // 2. Если есть только дата начала (без даты окончания) → статус "Читаю"
  // 3. Если нет никаких дат → статус "Буду читать"
  // Эти правила применяются ВСЕГДА, независимо от текущего статуса книги
  // ИСКЛЮЧЕНИЕ: если статус "Брошено" или "Отложено", они не изменяются
  // ИСКЛЮЧЕНИЕ 2: если в истории статусов последний статус READ, не изменять его
  const updateBookStatusBasedOnDates = (books: Book[]): Book[] => {
    return books.map(book => {
      let updatedBook = { ...book };

      // Не изменяем статусы "Брошено" и "Отложено"
      if (book.status === BookStatus.ABANDONED || book.status === BookStatus.POSTPONED) {
        return updatedBook;
      }

      // Не изменяем статус READ, если он уже зафиксирован в истории статусов
      // Это нужно для случаев, когда пользователь явно установил статус READ
      if (book.statusHistory && book.statusHistory.length > 0) {
        const lastStatus = book.statusHistory[book.statusHistory.length - 1].newStatus;
        if (lastStatus === BookStatus.READ && book.status === BookStatus.READ) {
          return updatedBook;
        }
      }

      // Проверяем наличие дат (исключаем пустые строки и null/undefined)
      const hasStartDate = book.startDate &&
                          typeof book.startDate === 'string' &&
                          book.startDate.trim() !== '';
      const hasEndDate = book.endDate &&
                        typeof book.endDate === 'string' &&
                        book.endDate.trim() !== '';

      let newStatus: BookStatus | null = null;

      // Правило 1: Если есть и дата начала, и дата окончания → статус "Прочитано"
      if (hasStartDate && hasEndDate) {
        newStatus = BookStatus.READ;
      }
      // Правило 2: Если есть только дата начала (без даты окончания) → статус "Читаю"
      else if (hasStartDate && !hasEndDate) {
        newStatus = BookStatus.READING;
      }
      // Правило 3: Если нет никаких дат → статус "Буду читать"
      else {
        newStatus = BookStatus.WANT_TO_READ;
      }

      // Если статус изменился, используем recordStatusChange для записи в историю
      if (newStatus && newStatus !== book.status) {
        updatedBook = recordStatusChange(updatedBook, newStatus);
      } else if (newStatus) {
        updatedBook.status = newStatus;
      }

      return updatedBook;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loadedBooks = JSON.parse(saved);
        // Нормализуем даты: пустые строки, null, undefined → пустая строка
        const normalizedBooks = loadedBooks.map((book: Book) => ({
          ...book,
          startDate: book.startDate?.trim() || '',
          endDate: book.endDate?.trim() || '',
        }));
        // Мигрируем старые форматы статусов
        let migratedBooks = migrateAllBooksStatusHistory(normalizedBooks);
        // Обновляем статусы при загрузке книг на основе наличия дат
        let updatedBooks = updateBookStatusBasedOnDates(migratedBooks);
        // Синхронизируем статусы из истории (приоритет у истории)
        updatedBooks = syncStatusFromHistory(updatedBooks);
        setBooks(updatedBooks);
      } catch (e) {
        console.error("Failed to load books", e);
      }
    }

    // Load franchises
    const savedFranchises = localStorage.getItem(FRANCHISES_STORAGE_KEY);
    if (savedFranchises) {
      try {
        const loadedFranchises = JSON.parse(savedFranchises);
        setFranchises(loadedFranchises);
      } catch (e) {
        console.error("Failed to load franchises", e);
      }
    }

    const savedLang = localStorage.getItem('lumina_lang');
    if (savedLang === 'en' || savedLang === 'ru') {
      setLang(savedLang);
    }
    
    // Load default cover URL from profile or legacy storage
    const profileSaved = localStorage.getItem('lumina_user_profile');
    if (profileSaved) {
      try {
        const profile = JSON.parse(profileSaved);
        setDefaultCoverUrl(profile.defaultCoverUrl || '');
      } catch (e) {
        // Fallback to legacy storage
        const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
        if (savedDefaultCoverUrl) {
          setDefaultCoverUrl(savedDefaultCoverUrl);
        }
      }
    } else {
      // Load legacy default cover URL if it exists
      const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
      if (savedDefaultCoverUrl) {
        setDefaultCoverUrl(savedDefaultCoverUrl);
      }
    }
  }, []);

  // Периодическая проверка статусов на основе наличия дат
  // (теперь не зависит от текущей даты, только от наличия дат)
  useEffect(() => {
    // Проверяем статусы сразу при монтировании
    const checkAndUpdateStatuses = () => {
      setBooks(prevBooks => {
        if (prevBooks.length === 0) return prevBooks;
        
        // Нормализуем даты перед проверкой
        const normalizedBooks = prevBooks.map(book => ({
          ...book,
          startDate: book.startDate?.trim() || '',
          endDate: book.endDate?.trim() || '',
        }));
        
        const updated = updateBookStatusBasedOnDates(normalizedBooks);
        
        // Обновляем только если есть изменения в статусах
        const hasChanges = updated.some((book, index) => 
          book.status !== prevBooks[index]?.status
        );
        
        return hasChanges ? updated : prevBooks;
      });
    };

    // Проверяем сразу
    checkAndUpdateStatuses();

    // Периодически проверяем каждые 5 минут (на случай изменений через localStorage в другой вкладке)
    const interval = setInterval(checkAndUpdateStatuses, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(FRANCHISES_STORAGE_KEY, JSON.stringify(franchises));
  }, [franchises]);

  useEffect(() => {
    localStorage.setItem('lumina_lang', lang);
  }, [lang]);

  // Обработчик для восстановления фокуса на события клавиатуры в Electron
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Если событие не обрабатывается по умолчанию, это может быть сигналом потери фокуса
      // Пробуем вернуть фокус активному элементу
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleAddBook = (book: Book) => {
    setBooks(prev => {
      // Нормализуем даты: пустые строки, null, undefined → пустая строка
      let normalizedBook: Book = {
        ...book,
        startDate: book.startDate?.trim() || '',
        endDate: book.endDate?.trim() || '',
      };

      let updatedBooks: Book[];
      if (editingBook) {
        // При редактировании проверяем, изменился ли статус вручную
        const oldStatus = editingBook.status;
        const newStatus = normalizedBook.status;

        // Сначала обновляем статусы на основе дат (это создаст историю из дат если нужно)
        const booksWithUpdatedDates = updateBookStatusBasedOnDates(prev.map(b => 
          b.id === normalizedBook.id ? { ...normalizedBook, status: oldStatus } : b
        ));
        
        // Находим обновленную книгу
        const dateUpdatedBook = booksWithUpdatedDates.find(b => b.id === normalizedBook.id)!;
        
        // Если пользователь явно изменил статус вручную (отличается от того, что установили даты)
        // и это не было учтено в updateBookStatusBasedOnDates, записываем в историю
        if (oldStatus !== newStatus && dateUpdatedBook.status !== newStatus) {
          normalizedBook = recordStatusChange({ ...dateUpdatedBook, status: oldStatus }, newStatus);
          updatedBooks = prev.map(b => b.id === normalizedBook.id ? normalizedBook : b);
        } else {
          // Используем книгу с обновленными датами
          updatedBooks = booksWithUpdatedDates;
        }
      } else {
        updatedBooks = [...prev, normalizedBook];
        // Для новых книг сразу применяем логику на основе дат
        updatedBooks = updateBookStatusBasedOnDates(updatedBooks);
      }

      return updatedBooks;
    });

    // Update franchises based on book's new franchiseIds
    setFranchises(prev =>
      prev.map(franchise => {
        const shouldIncludeBook = book.franchiseIds?.includes(franchise.id) ?? false;
        const currentlyIncludesBook = franchise.bookIds.includes(book.id);

        if (shouldIncludeBook && !currentlyIncludesBook) {
          // Add book to franchise
          return {
            ...franchise,
            bookIds: [...franchise.bookIds, book.id],
            updatedAt: new Date().toISOString(),
          };
        } else if (!shouldIncludeBook && currentlyIncludesBook) {
          // Remove book from franchise
          return {
            ...franchise,
            bookIds: franchise.bookIds.filter(bid => bid !== book.id),
            updatedAt: new Date().toISOString(),
          };
        }

        // No change needed
        return franchise;
      })
    );

    setIsModalOpen(false);
    setEditingBook(undefined);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.deleteConfirm)) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleImport = (importedBooks: Book[], userProfile?: UserProfile) => {
    // Если в импорте есть информация о пользователе, обновляем его в localStorage
    if (userProfile) {
      localStorage.setItem('lumina_user_profile', JSON.stringify(userProfile));
    }

    setBooks(prev => {
      // Мигрируем импортированные книги на всякий случай
      const migratedImportedBooks = migrateAllBooksStatusHistory(importedBooks);

      const updatedBooks = prev.map(existingBook => {
        // Проверяем, есть ли в импортированных книгах такая же комбинация название + автор
        const duplicateImportedBook = migratedImportedBooks.find(
          importedBook => 
            importedBook.title.toLowerCase().trim() === existingBook.title.toLowerCase().trim() &&
            importedBook.author.toLowerCase().trim() === existingBook.author.toLowerCase().trim()
        );

        // Если найдена дубликат - заменяем локальные данные на импортированные
        // Приоритет отдается JSON файлу
        if (duplicateImportedBook) {
          return {
            ...duplicateImportedBook,
            id: existingBook.id, // Сохраняем оригинальный ID, все остальное берем из JSON
            sessions: duplicateImportedBook.sessions, // Сессии из JSON (авторитетный источник)
            statusHistory: duplicateImportedBook.statusHistory, // История статусов из JSON (авторитетный источник)
            currentPage: duplicateImportedBook.currentPage, // Текущая страница из JSON
            currentPercentage: duplicateImportedBook.currentPercentage, // Процент из JSON
            totalHours: duplicateImportedBook.totalHours // Часы из JSON
          };
        }

        return existingBook;
      });

      // Добавляем новые книги, которые не являются дубликатами
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
      // Сначала обновляем статусы по датам, потом синхронизируем из истории
      let finalBooks = updateBookStatusBasedOnDates(combinedBooks);
      finalBooks = syncStatusFromHistory(finalBooks);
      return finalBooks;
    });
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    
    // Проверяем если книга достигла 100% прогресса и у нее нет оценки
    if ((updatedBook.status === BookStatus.READ || updatedBook.currentPercentage === 100) && updatedBook.rating === 0) {
      setBookToRateId(updatedBook.id);
    }
  };

  const handleStartReading = (bookId: string, startDate: string) => {
    setBooks(prev => {
      const updatedBooks = prev.map(book => {
        if (book.id === bookId) {
          // Обновляем дату начала, дата окончания остается без изменений
          const updatedBook: Book = {
            ...book,
            startDate: startDate,
            endDate: book.endDate || '', // Сохраняем существующую дату окончания или пустую строку
          };
          return updatedBook;
        }
        return book;
      });
      // Обновляем статусы на основе дат (автоматически изменит статус на "Читаю")
      return updateBookStatusBasedOnDates(updatedBooks);
    });
  };

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ru' : 'en');

  // Handlers for franchises
  const handleAddFranchise = (franchise: Franchise) => {
    setFranchises(prev => [...prev, franchise]);
  };

  const handleUpdateFranchise = (updatedFranchise: Franchise) => {
    setFranchises(prev => prev.map(f => f.id === updatedFranchise.id ? updatedFranchise : f));
  };

  const handleDeleteFranchise = (id: string) => {
    setFranchises(prev => prev.filter(f => f.id !== id));
    // Remove franchise from books and update isPartOfSeries flag
    setBooks(prev => 
      prev.map(b => {
        const remainingFranchiseIds = (b.franchiseIds || []).filter(fid => fid !== id);
        return {
          ...b,
          franchiseIds: remainingFranchiseIds,
          isPartOfSeries: remainingFranchiseIds.length > 0, // Флаг false если нет больше франшиз
        };
      })
    );
  };

  const handleBooksUpdated = (updatedBooks: Book[]) => {
    setBooks(updatedBooks);
  };

  // Определяем платформу для применения macOS стилей
  const isMac = typeof window !== 'undefined' && window.electronAPI?.isMac === true;

  return (
    <MantineProvider>
      <div className="min-h-screen bg-[#F0F4F1] flex flex-col">
      <header className={`bg-[#F0F4F1] border-b sticky top-0 z-30 ${isMac ? 'pt-8' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#6B9071] rounded-lg flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <h1 className="text-xl font-bold font-serif tracking-tight text-[#1E2920]">LuminaBooks</h1>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-[#F0F4F1] p-1 rounded-xl">
              <button
                onClick={() => setActiveView('statistics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'statistics' 
                  ? 'bg-[#6B9071] text-[#F0F4F1] shadow-md'  
                  : 'text-slate-600 hover:text-[#1E2920]'
                }`}
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Профиль' : 'Profile'}</span>
              </button>
              <button
                onClick={() => setActiveView('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'catalog' 
                  ? 'bg-[#6B9071] text-[#F0F4F1] shadow-md' 
                  : 'text-slate-600 hover:text-[#1E2920]'
                }`}
              >
                <Library size={18} />
                <span className="hidden sm:inline">{t.catalog}</span>
              </button>
              <button
                onClick={() => setActiveView('franchises')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'franchises' 
                  ? 'bg-[#6B9071] text-[#F0F4F1] shadow-md' 
                  : 'text-slate-600 hover:text-[#1E2920]'
                }`}
              >
                <Link size={18} />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Франшизы' : 'Franchises'}</span>
              </button>
              <button
                onClick={() => setActiveView('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'calendar' 
                  ? 'bg-[#6B9071] text-[#F0F4F1] shadow-md'  
                  : 'text-slate-600 hover:text-[#1E2920]'
                }`}
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">{t.calendar}</span>
              </button>
              <button
                onClick={() => setActiveView('reading')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'reading' 
                  ? 'bg-[#6B9071] text-[#F0F4F1] shadow-md' 
                  : 'text-slate-600 hover:text-[#1E2920]'
                }`}
              >
                <Zap size={18} />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Чтение' : 'Reading'}</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="p-2 hover:bg-[#D6E1D8] rounded-xl text-slate-600 flex items-center gap-2 transition-colors"
              title="Switch Language"
            >
              <Languages size={18} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 bg-[#F0F4F1] hover:bg-[#D6E1D8] text-slate-600 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              title={lang === 'ru' ? 'Профиль пользователя' : 'User profile'}
            >
              <Settings size={18} />
            </button>

            <button
              onClick={() => {
                setEditingBook(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#6B9071] hover:bg-[#59785E] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-[#59785E]/50"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t.addBook}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeView === 'catalog' ? (
          <CatalogView 
            books={books} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            onImport={handleImport}
            lang={lang}
          />
        ) : activeView === 'franchises' ? (
          <FranchiseView 
            franchises={franchises}
            books={books}
            onAddFranchise={handleAddFranchise}
            onUpdateFranchise={handleUpdateFranchise}
            onDeleteFranchise={handleDeleteFranchise}
            onBooksUpdated={handleBooksUpdated}
            lang={lang}
          />
        ) : activeView === 'calendar' ? (
          <CalendarView 
            books={books} 
            lang={lang}
            onStartReading={handleStartReading}
          />
        ) : activeView === 'reading' ? (
          <ReadingView 
            books={books} 
            onUpdateBook={handleUpdateBook}
            lang={lang}
          />
        ) : (
          <StatisticsView 
            books={books} 
            lang={lang}
          />
        )}
      </main>

      {isModalOpen && (
        <BookModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleAddBook}
          initialData={editingBook}
          lang={lang}
          defaultCoverUrl={defaultCoverUrl}
          franchises={franchises}
          onFranchisesUpdated={handleAddFranchise}
        />
      )}

      {isProfileOpen && (
        <UserProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)}
          lang={lang}
        />
      )}

      {bookToRateId && (
        <BookRatingModal
          isOpen={true}
          onClose={() => setBookToRateId(null)}
          onSubmit={(rating) => {
            setBooks(prevBooks => prevBooks.map(b => 
              b.id === bookToRateId 
                ? { ...b, rating }
                : b
            ));
            setBookToRateId(null);
          }}
          onSkip={() => setBookToRateId(null)}
          bookTitle={books.find(b => b.id === bookToRateId)?.title || ''}
          lang={lang}
        />
      )}
      
      <footer className="py-8 border-t bg-[#F0F4F1] text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} LuminaBooks. {lang === 'ru' ? 'Следите за своим прогрессом чтения.' : 'Track your reading journey.'}
      </footer>
    </div>
    </MantineProvider>
  );
};

export default App;
