
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, BookStatus, ViewType, Franchise } from './types';
import type { ElectronDBAPI } from './electron.d';
import { CatalogView } from './components';
import FranchiseView from './components/FranchiseView';
import CalendarView from './components/CalendarView';
import StatisticsView from './components/StatisticsView';
import ReadingView from './components/ReadingView';
import BookModal from './components/BookModal';
import BookRatingModal from './components/BookRatingModal';
import SettingsModal from './components/UserProfileModal';
import Toast, { ToastMessage } from './components/Toast';
import AchievementNotification from './components/AchievementNotification';
import { getUnlockedAchievementIds, ALL_ACHIEVEMENTS, AchievementNotificationItem } from './utils/achievements';
import ConfirmationModal from './components/ConfirmationModal';
import { UserProfile } from './utils/jsonUtils';
import { recordStatusChange, getCurrentBookStatus, migrateAllBooksStatusHistory, regenerateStatusHistoryFromDates } from './utils/statusHistoryUtils';
import { Calendar, Plus, Library, Languages, BarChart3, Zap, Settings, Link, RefreshCw } from 'lucide-react';
import { uuid } from './uuid';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { translations } from './utils/translations';
import { httpApi } from './api';
import appIcon from '../resources/icon.png';

export { translations };

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('catalog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [lang, setLang] = useState<'en' | 'ru'>('ru');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [defaultCoverUrl, setDefaultCoverUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [bookToRateId, setBookToRateId] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('lumina_auto_sync') === 'true');
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.getLoginItemSettings) {
      window.electronAPI.getLoginItemSettings().then((settings) => {
        setLaunchAtStartup(settings.openAtLogin);
      });
    }
  }, []);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<AchievementNotificationItem[]>([]);
  const achievementQueueRef = useRef<AchievementNotificationItem[]>([]);
  const notifiedAchievementsRef = useRef<Set<string>>(new Set());
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void | Promise<void>;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
  });

  const dbApiRef = useRef<ElectronDBAPI | null>(null);

  function getDbApi(): ElectronDBAPI | null {
    return dbApiRef.current;
  }

  const syncDataFromApi = useCallback(async (api: ElectronDBAPI) => {
    // Профиль загружаем первым, чтобы ref с ачивками был заполнен
    // до того, как setBooks вызовет ререндер и эффект проверки ачивок
    try {
      const profile = await api.getUserProfile();
      if (profile) {
        const dbAchievements = new Set(profile.achievements || []);

        // Подхватываем ачивки из БД (от других устройств)
        for (const id of dbAchievements) {
          notifiedAchievementsRef.current.add(id);
        }

        // Сохраняем в БД ачивки, которые есть в ref, но ещё не в БД
        const unsaved = [...notifiedAchievementsRef.current].filter(id => !dbAchievements.has(id));
        if (unsaved.length > 0) {
          profile.achievements = [...notifiedAchievementsRef.current];
          await api.setUserProfile(profile);
        }

        localStorage.setItem('lumina_user_profile', JSON.stringify(profile));
        if (profile.defaultCoverUrl) {
          setDefaultCoverUrl(profile.defaultCoverUrl);
        }
        if (profile.googleApiKey) {
          setGoogleApiKey(profile.googleApiKey);
        }
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }

    const loadedBooks = await api.getAllBooks();
    if (loadedBooks && loadedBooks.length > 0) {
      const normalizedBooks = loadedBooks.map((book: Book) => ({
        ...book,
        startDate: book.startDate?.trim() || '',
        endDate: book.endDate?.trim() || '',
      }));
      let migratedBooks = migrateAllBooksStatusHistory(normalizedBooks);
      let updatedBooks = updateBookStatusBasedOnDates(migratedBooks);
      updatedBooks = syncStatusFromHistory(updatedBooks);
      setBooks(updatedBooks);
    } else {
      setBooks([]);
    }

    const loadedFranchises = await api.getAllFranchises();
    if (loadedFranchises && loadedFranchises.length > 0) {
      setFranchises(loadedFranchises);
    } else {
      setFranchises([]);
    }
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    const api = getDbApi();
    if (!api) {
      addToast(lang === 'ru' ? 'Нет активного подключения к базе данных' : 'No active database connection', 'error');
      return;
    }
    setSyncing(true);
    try {
      await syncDataFromApi(api);
      addToast(lang === 'ru' ? 'Данные обновлены' : 'Data updated', 'success');
    } catch (e) {
      console.error('[Sync]', e);
      addToast(lang === 'ru' ? 'Ошибка синхронизации' : 'Sync failed', 'error');
    }
    setSyncing(false);
  };

  const t = translations[lang];

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = uuid();
    setToasts(prev => [...prev, { id, message, type, duration: 4000 }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDangerous: boolean = false
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      confirmText: lang === 'ru' ? 'Удалить' : 'Delete',
      cancelText: lang === 'ru' ? 'Отмена' : 'Cancel',
      onConfirm,
      isDangerous,
    });
  };

  const closeConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

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

  // Загрузка данных из SQLite (Electron) или localStorage (браузер)
  useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI?.db) {
          // === Режим Electron: IPC (SQLite через main process) ===
          dbApiRef.current = window.electronAPI.db;

          // Миграция из localStorage в SQLite (однократно)
          const legacyBooks = localStorage.getItem('lumina_books_v1');
          const legacyFranchises = localStorage.getItem('lumina_franchises_v1');
          const needMigrate = (legacyBooks || legacyFranchises) && !localStorage.getItem('lumina_migrated');

          if (needMigrate) {
            const result = await window.electronAPI.db.migrate();
            localStorage.setItem('lumina_migrated', 'true');
            localStorage.removeItem('lumina_books_v1');
            localStorage.removeItem('lumina_franchises_v1');
            console.log(`Migrated ${result.books} books and ${result.franchises} franchises to SQLite`);
          }

          // Загружаем данные через общую функцию синхронизации
          await syncDataFromApi(window.electronAPI.db);
        } else {
          // === Режим браузера ===
          let httpAvailable = false;
          try {
            const resp = await fetch('/api/status');
            httpAvailable = resp.ok;
          } catch {}

          if (httpAvailable) {
            // === Режим HTTP API (подключение к серверу LuminaBooks) ===
            dbApiRef.current = httpApi;

            try {
              await syncDataFromApi(httpApi);
            } catch (e) {
              console.error("Failed to load data via HTTP API", e);
            }
          } else {
            // === Режим браузера: localStorage (fallback) ===
            const saved = localStorage.getItem('lumina_books_v1');
            if (saved) {
              try {
                const loadedBooks = JSON.parse(saved);
                const normalizedBooks = loadedBooks.map((book: Book) => ({
                  ...book,
                  startDate: book.startDate?.trim() || '',
                  endDate: book.endDate?.trim() || '',
                }));
                let migratedBooks = migrateAllBooksStatusHistory(normalizedBooks);
                let updatedBooks = updateBookStatusBasedOnDates(migratedBooks);
                updatedBooks = syncStatusFromHistory(updatedBooks);
                setBooks(updatedBooks);
              } catch (e) {
                console.error("Failed to load books from localStorage", e);
              }
            }

            const savedFranchises = localStorage.getItem('lumina_franchises_v1');
            if (savedFranchises) {
              try {
                setFranchises(JSON.parse(savedFranchises));
              } catch (e) {
                console.error("Failed to load franchises from localStorage", e);
              }
            }

            const profileSaved = localStorage.getItem('lumina_user_profile');
            if (profileSaved) {
              try {
                const profile = JSON.parse(profileSaved);
                setDefaultCoverUrl(profile.defaultCoverUrl || '');
              } catch (e) {
                const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
                if (savedDefaultCoverUrl) setDefaultCoverUrl(savedDefaultCoverUrl);
              }
            } else {
              const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
              if (savedDefaultCoverUrl) setDefaultCoverUrl(savedDefaultCoverUrl);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }

      // Получаем URL сервера (только в Electron режиме)
      if (window.electronAPI?.getServerUrl) {
        try {
          const url = await window.electronAPI.getServerUrl();
          setServerUrl(url);
        } catch {}
      }

      // Настройки из localStorage (всегда)
      const savedLang = localStorage.getItem('lumina_lang');
      if (savedLang === 'en' || savedLang === 'ru') {
        setLang(savedLang);
      }

      if (!defaultCoverUrl) {
        const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
        if (savedDefaultCoverUrl) setDefaultCoverUrl(savedDefaultCoverUrl);
      }

      // Если ref пуст — инициализируем из localStorage (standalone fallback)
      if (notifiedAchievementsRef.current.size === 0) {
        try {
          const saved = JSON.parse(localStorage.getItem('lumina_achievements_unlocked') || '[]');
          if (Array.isArray(saved)) {
            notifiedAchievementsRef.current = new Set(saved);
          }
        } catch {}
      }
    };

    loadData();
  }, [syncDataFromApi]);

  // Периодическая синхронизация данных для кросс-устройств
  useEffect(() => {
    const api = getDbApi();
    if (!api || !autoSync) return;

    const poll = async () => {
      try {
        await syncDataFromApi(api);
      } catch {}
    };

    const interval = setInterval(poll, 30000);

    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') poll();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncDataFromApi, autoSync]);

  // Сохраняем настройки в localStorage
  useEffect(() => {
    localStorage.setItem('lumina_lang', lang);
  }, [lang]);

  // Браузерный fallback: сохраняем книги/коллекции в localStorage (только если нет API)
  useEffect(() => {
    if (!window.electronAPI?.db && !getDbApi()) {
      localStorage.setItem('lumina_books_v1', JSON.stringify(books));
    }
  }, [books]);

  useEffect(() => {
    if (!window.electronAPI?.db && !getDbApi()) {
      localStorage.setItem('lumina_franchises_v1', JSON.stringify(franchises));
    }
  }, [franchises]);

  // Проверка достижений (ref — единственный источник истины)
  useEffect(() => {
    const checkAchievements = async () => {
      const unlockedIds = getUnlockedAchievementIds(books);
      const alreadyQueuedIds = new Set(achievementQueueRef.current.map(item => item.achievementId));
      const newIds = unlockedIds.filter(id => !notifiedAchievementsRef.current.has(id) && !alreadyQueuedIds.has(id));

      if (newIds.length > 0) {
        const items: AchievementNotificationItem[] = newIds.map((id, i) => {
          const def = ALL_ACHIEVEMENTS.find(a => a.id === id)!;
          return {
            id: `${id}_${Date.now()}_${i}`,
            achievementId: id,
            title: def.title[lang],
            desc: def.desc[lang],
          };
        });
        setAchievementQueue(prev => {
          const updated = [...prev, ...items];
          achievementQueueRef.current = updated;
          return updated;
        });

        newIds.forEach(id => notifiedAchievementsRef.current.add(id));

        // Если есть БД — сохраняем (с await, чтобы запись гарантированно завершилась)
        const api = getDbApi();
        if (api) {
          try {
            const profile = await api.getUserProfile();
            profile.achievements = [...notifiedAchievementsRef.current];
            await api.setUserProfile(profile);
          } catch (e) {
            console.error("Failed to save achievements to DB profile", e);
          }
        } else {
          localStorage.setItem('lumina_achievements_unlocked', JSON.stringify([...notifiedAchievementsRef.current]));
        }
      }
    };
    checkAchievements();
  }, [books, lang]);

  const handleDismissAchievement = (id: string) => {
    setAchievementQueue(prev => {
      const updated = prev.filter(item => item.id !== id);
      achievementQueueRef.current = updated;
      return updated;
    });
  };

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
        closeConfirmation();
      },
      true
    );
  };

  const handleAddToQueue = async (book: Book) => {
    let savedBook: Book | undefined;
    setBooks(prev => prev.map(b => {
      if (b.id !== book.id) return b;
      let updatedBook = { ...b, inQueue: true };
      if (b.status === BookStatus.ABANDONED || b.status === BookStatus.POSTPONED) {
        updatedBook = { ...updatedBook, status: BookStatus.WANT_TO_READ };
      }
      savedBook = updatedBook;
      return updatedBook;
    }));
    const api = getDbApi();
    if (savedBook && api) {
      await api.updateBook(savedBook);
    }
  };

  const handleStartReadingBook = async (book: Book) => {
    let savedBook: Book | undefined;
    setBooks(prev => prev.map(b => {
      if (b.id !== book.id) return b;
      const updatedBook = {
        ...b,
        status: BookStatus.READING,
        startDate: new Date().toISOString().split('T')[0],
        inQueue: false,
      };
      savedBook = updatedBook;
      return updatedBook;
    }));
    const api = getDbApi();
    if (savedBook && api) {
      await api.updateBook(savedBook);
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
    if (importedFranchises && importedFranchises.length > 0) {
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

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ru' : 'en');

  // Handlers for franchises
  const handleAddFranchise = async (franchise: Franchise) => {
    setFranchises(prev => [...prev, franchise]);
    const api = getDbApi();
    if (api) {
      await api.addFranchise(franchise);
    }
  };

  const handleUpdateFranchise = async (updatedFranchise: Franchise) => {
    setFranchises(prev => prev.map(f => f.id === updatedFranchise.id ? updatedFranchise : f));
    const api = getDbApi();
    if (api) {
      await api.updateFranchise(updatedFranchise);
    }
  };

  const handleDeleteFranchise = async (id: string) => {
    setFranchises(prev => prev.filter(f => f.id !== id));
    const deleteApi = getDbApi();
    if (deleteApi) {
      await deleteApi.deleteFranchise(id);
    }
    let updatedBooks: Book[] = [];
    setBooks(prev => {
      updatedBooks = prev.map(b => {
        const remainingFranchiseIds = (b.franchiseIds || []).filter((fid: string) => fid !== id);
        return {
          ...b,
          franchiseIds: remainingFranchiseIds,
          isPartOfSeries: remainingFranchiseIds.length > 0,
        };
      });
      return updatedBooks;
    });
    if (deleteApi) {
      for (const book of updatedBooks) {
        await deleteApi.updateBook(book);
      }
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

  // Определяем платформу для применения macOS стилей
  const isMac = typeof window !== 'undefined' && window.electronAPI?.isMac === true;

  return (
    <MantineProvider>
      <div className="min-h-screen bg-page">
      <header
        className={`sticky top-0 z-30 ${isMac ? 'pt-8' : ''}`}
        style={{
          backgroundColor: 'color-mix(in oklab, var(--surface), transparent 8%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="LuminaBooks" className="w-9 h-9" />
            <h1 className="text-lg font-display tracking-tight" style={{ color: 'var(--fg)' }}>LuminaBooks</h1>
          </div>

          <nav className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
            <button
              onClick={() => setActiveView('statistics')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'statistics' ? 'var(--accent)' : 'transparent',
                color: activeView === 'statistics' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <BarChart3 size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Профиль' : 'Profile'}</span>
            </button>
            <button
              onClick={() => setActiveView('catalog')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'catalog' ? 'var(--accent)' : 'transparent',
                color: activeView === 'catalog' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Library size={17} />
              <span className="hidden sm:inline">{t.catalog}</span>
            </button>
            <button
              onClick={() => setActiveView('collections')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'collections' ? 'var(--accent)' : 'transparent',
                color: activeView === 'collections' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Link size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Коллекции' : 'Collections'}</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'calendar' ? 'var(--accent)' : 'transparent',
                color: activeView === 'calendar' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Calendar size={17} />
              <span className="hidden sm:inline">{t.calendar}</span>
            </button>
            <button
              onClick={() => setActiveView('reading')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'reading' ? 'var(--accent)' : 'transparent',
                color: activeView === 'reading' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Zap size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Чтение' : 'Reading'}</span>
            </button>
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--muted)' }}
              title="Switch Language"
            >
              <Languages size={17} />
              <span className="text-xs font-bold uppercase tracking-wider">{lang}</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ color: 'var(--muted)' }}
              title={lang === 'ru' ? 'Синхронизировать данные' : 'Sync data'}
            >
              <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ color: 'var(--muted)' }}
              title={lang === 'ru' ? 'Настройки' : 'Settings'}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeView === 'catalog' ? (
          <CatalogView 
            books={books} 
            franchises={franchises}
            onEdit={handleEdit} 
            onDelete={handleDelete}
            onAddToQueue={handleAddToQueue}
            onStartReading={handleStartReadingBook}
            onImport={handleImport}
            lang={lang}
            onAddBook={() => {
              setEditingBook(undefined);
              setIsModalOpen(true);
            }}
          />
        ) : activeView === 'collections' ? (
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
          googleApiKey={googleApiKey}
          onLocalSearch={async (title, author) => {
            const api = getDbApi();
            return api?.searchBooksDictionary?.(title, author) ?? [];
          }}
          onSaveToDictionary={async (entry) => {
            const api = getDbApi();
            await api?.saveToBooksDictionary?.(entry);
          }}
        />
      )}

      {isProfileOpen && (
        <SettingsModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)}
          onSave={async (profile) => {
            const api = getDbApi();
            if (api) {
              await api.setUserProfile({ ...profile, achievements: profile.achievements || [] });
            }
            setGoogleApiKey(profile.googleApiKey || '');
          }}
          autoSync={autoSync}
          onAutoSyncChange={(value) => {
            setAutoSync(value);
            localStorage.setItem('lumina_auto_sync', String(value));
          }}
          launchAtStartup={launchAtStartup}
          onLaunchAtStartupChange={(value) => {
            setLaunchAtStartup(value);
            window.electronAPI?.setLoginItemSettings?.({ openAtLogin: value });
          }}
          serverUrl={serverUrl}
          lang={lang}
        />
      )}

      {bookToRateId && (
        <BookRatingModal
          isOpen={true}
          onClose={() => setBookToRateId(null)}
          onSubmit={(rating, review) => {
            setBooks(prevBooks => prevBooks.map(b => 
              b.id === bookToRateId 
                ? { ...b, rating, ...(review ? { description: review } : {}) }
                : b
            ));
            setBookToRateId(null);
          }}
          onSkip={() => setBookToRateId(null)}
          bookTitle={books.find(b => b.id === bookToRateId)?.title || ''}
          lang={lang}
        />
      )}

      <AchievementNotification
        queue={achievementQueue}
        onDismiss={handleDismissAchievement}
        lang={lang}
      />

      <Toast messages={toasts} onRemove={removeToast} />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
        onConfirm={async () => {
          await confirmationModal.onConfirm();
          closeConfirmation();
        }}
        onCancel={closeConfirmation}
        isDangerous={confirmationModal.isDangerous}
      />
      
      <footer className="py-6 text-center text-sm" style={{ color: 'var(--meta)', borderTop: '1px solid var(--border-soft)' }}>
        &copy; {new Date().getFullYear()} LuminaBooks. {lang === 'ru' ? 'Следите за своим прогрессом чтения.' : 'Track your reading journey.'}
      </footer>
    </div>
    </MantineProvider>
  );
};

export default App;
