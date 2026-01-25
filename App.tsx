
import React, { useState, useEffect } from 'react';
import { Book, BookStatus, ViewType } from './types';
import CatalogView from './components/CatalogView';
import CalendarView from './components/CalendarView';
import StatisticsView from './components/StatisticsView';
import ReadingView from './components/ReadingView';
import BookModal from './components/BookModal';
import { BookOpen, Calendar, Plus, Library, Languages, BarChart3, Zap, Settings, X } from 'lucide-react';

const STORAGE_KEY = 'lumina_books_v1';

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
    defaultCoverSettings: 'Default Cover Settings',
    defaultCoverUrl: 'Default Cover URL',
    enterCoverUrl: 'Enter default cover URL...',
    save: 'Save',
    coverUrlSaved: 'Default cover URL saved',
    coverUrlCleared: 'Default cover URL cleared'
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
    defaultCoverSettings: 'Настройки обложки по умолчанию',
    defaultCoverUrl: 'URL обложки по умолчанию',
    enterCoverUrl: 'Введите URL обложки по умолчанию...',
    save: 'Сохранить',
    coverUrlSaved: 'URL обложки сохранён',
    coverUrlCleared: 'URL обложки очищен'
  }
};

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('catalog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [lang, setLang] = useState<'en' | 'ru'>('ru');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultCoverUrl, setDefaultCoverUrl] = useState('');

  const t = translations[lang];

  // Функция для автоматического обновления статусов на основе наличия дат
  // Правила:
  // 1. Если есть дата начала И дата окончания → статус "Прочитано"
  // 2. Если есть только дата начала (без даты окончания) → статус "Читаю"
  // 3. Если нет никаких дат → статус "Буду читать"
  // Эти правила применяются ВСЕГДА, независимо от текущего статуса книги
  const updateBookStatusBasedOnDates = (books: Book[]): Book[] => {
    return books.map(book => {
      let updatedBook = { ...book };
      
      // Проверяем наличие дат (исключаем пустые строки и null/undefined)
      const hasStartDate = book.startDate && 
                          typeof book.startDate === 'string' && 
                          book.startDate.trim() !== '';
      const hasEndDate = book.endDate && 
                        typeof book.endDate === 'string' && 
                        book.endDate.trim() !== '';

      // Правило 1: Если есть и дата начала, и дата окончания → статус "Прочитано"
      if (hasStartDate && hasEndDate) {
        updatedBook.status = BookStatus.READ;
      }
      // Правило 2: Если есть только дата начала (без даты окончания) → статус "Читаю"
      else if (hasStartDate && !hasEndDate) {
        updatedBook.status = BookStatus.READING;
      }
      // Правило 3: Если нет никаких дат → статус "Буду читать"
      else {
        updatedBook.status = BookStatus.WANT_TO_READ;
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
        // Обновляем статусы при загрузке книг на основе наличия дат
        const updatedBooks = updateBookStatusBasedOnDates(normalizedBooks);
        setBooks(updatedBooks);
      } catch (e) {
        console.error("Failed to load books", e);
      }
    }
    const savedLang = localStorage.getItem('lumina_lang');
    if (savedLang === 'en' || savedLang === 'ru') {
      setLang(savedLang);
    }
    
    // Load default cover URL
    const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
    if (savedDefaultCoverUrl) {
      setDefaultCoverUrl(savedDefaultCoverUrl);
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
      const normalizedBook: Book = {
        ...book,
        startDate: book.startDate?.trim() || '',
        endDate: book.endDate?.trim() || '',
      };
      
      let updatedBooks: Book[];
      if (editingBook) {
        updatedBooks = prev.map(b => b.id === normalizedBook.id ? normalizedBook : b);
      } else {
        updatedBooks = [...prev, normalizedBook];
      }
      
      // Обновляем статусы на основе дат после добавления/редактирования
      // Это автоматически установит правильный статус на основе наличия дат
      return updateBookStatusBasedOnDates(updatedBooks);
    });
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

  const handleImport = (importedBooks: Book[]) => {
    setBooks(prev => {
      const updatedBooks = prev.map(existingBook => {
        // Проверяем, есть ли в импортированных книгах такая же комбинация название + автор
        const duplicateImportedBook = importedBooks.find(
          importedBook => 
            importedBook.title.toLowerCase().trim() === existingBook.title.toLowerCase().trim() &&
            importedBook.author.toLowerCase().trim() === existingBook.author.toLowerCase().trim()
        );

        // Если найдена дубликат - обновляем все параметры, но сохраняем историю сессий
        if (duplicateImportedBook) {
          // Вычисляем часы из существующих сессий
          let existingSessionHours = 0;
          if (existingBook.sessions && existingBook.sessions.length > 0) {
            const totalSeconds = existingBook.sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            existingSessionHours = Math.round((totalSeconds / 3600) * 10) / 10;
          }

          // Вычитаем часы из существующих сессий из импортированного значения
          // Это предотвращает двойной учет часов при переимпорте
          let adjustedTotalHours = duplicateImportedBook.totalHours || 0;
          if (existingSessionHours > 0 && adjustedTotalHours > existingSessionHours) {
            adjustedTotalHours = Math.round((adjustedTotalHours - existingSessionHours) * 10) / 10;
          }

          return {
            ...duplicateImportedBook,
            id: existingBook.id, // Сохраняем оригинальный ID
            totalHours: adjustedTotalHours, // Используем скорректированное значение часов
            currentPage: existingBook.currentPage, // Сохраняем текущую страницу
            currentPercentage: existingBook.currentPercentage, // Сохраняем текущий процент
            sessions: existingBook.sessions // Сохраняем историю сессий
          };
        }

        return existingBook;
      });

      // Добавляем новые книги, которые не являются дубликатами
      const existingTitlesAuthors = new Set(
        updatedBooks.map(b => `${b.title.toLowerCase().trim()}_${b.author.toLowerCase().trim()}`)
      );

      const newBooks = importedBooks.filter(
        importedBook => 
          !existingTitlesAuthors.has(
            `${importedBook.title.toLowerCase().trim()}_${importedBook.author.toLowerCase().trim()}`
          )
      );

      const finalBooks = [...updatedBooks, ...newBooks];
      return updateBookStatusBasedOnDates(finalBooks);
    });
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
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

  // Определяем платформу для применения macOS стилей
  const isMac = typeof window !== 'undefined' && window.electronAPI?.isMac === true;

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`bg-white border-b sticky top-0 z-30 ${isMac ? 'pt-8' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <h1 className="text-xl font-bold font-serif tracking-tight text-slate-800">LuminaBooks</h1>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveView('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'catalog' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Library size={18} />
                <span className="hidden sm:inline">{t.catalog}</span>
              </button>
              <button
                onClick={() => setActiveView('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'calendar' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">{t.calendar}</span>
              </button>
              <button
                onClick={() => setActiveView('statistics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'statistics' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">{t.statistics}</span>
              </button>
              <button
                onClick={() => setActiveView('reading')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'reading' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap size={18} />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Чтение' : 'Reading'}</span>
              </button>
            </nav>

            <button
              onClick={toggleLang}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 flex items-center gap-2 transition-colors border border-transparent hover:border-slate-200"
              title="Switch Language"
            >
              <Languages size={18} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              title={lang === 'ru' ? 'Настройки обложки' : 'Cover settings'}
            >
              <Settings size={18} />
            </button>

            <button
              onClick={() => {
                setEditingBook(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-100"
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
        />
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold font-serif text-slate-800">
                {t.defaultCoverSettings}
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.defaultCoverUrl}</label>
                <input 
                  type="text" 
                  placeholder={t.enterCoverUrl}
                  value={defaultCoverUrl}
                  onChange={(e) => setDefaultCoverUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {defaultCoverUrl && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-600 mb-2">{lang === 'ru' ? 'Предпросмотр:' : 'Preview:'}</p>
                    <img 
                      src={defaultCoverUrl} 
                      alt="Cover preview"
                      className="w-20 h-28 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"%3E%3Crect fill="%23e2e8f0" width="60" height="80"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23cbd5e1" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (defaultCoverUrl.trim()) {
                      localStorage.setItem('lumina_default_cover_url', defaultCoverUrl);
                    }
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => {
                    setDefaultCoverUrl('');
                    localStorage.removeItem('lumina_default_cover_url');
                  }}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-semibold transition-colors"
                >
                  {lang === 'ru' ? 'Очистить' : 'Clear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="py-8 border-t bg-white text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} LuminaBooks. {lang === 'ru' ? 'Следите за своим прогрессом чтения.' : 'Track your reading journey.'}
      </footer>
    </div>
  );
};

export default App;
