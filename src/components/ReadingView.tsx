import React, { useState, useEffect, useRef } from 'react';
import { Book, BookStatus, ReadingSession } from '../types';
import { Play, Pause, RotateCcw, CheckCircle, Clock, Zap, Link, Trash2, X, BookOpen, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { createPortal } from 'react-dom';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';
import { getBookPercentage } from '../utils/bookUtils';
import Toast, { ToastMessage } from './Toast';
import { DateInput } from '@mantine/dates';
import { NumberInput } from '@mantine/core';
import dayjs from 'dayjs';
import { recordStatusChange } from '../utils/statusHistoryUtils';
import { calculateBookTotalHours } from '../utils/dateUtils';

interface ReadingViewProps {
  books: Book[];
  onUpdateBook: (book: Book) => void;
  lang: 'en' | 'ru';
}

interface SessionState {
  bookId: string;
  startTime: Date;
  isRunning: boolean;
}

const ReadingView: React.FC<ReadingViewProps> = ({ books, onUpdateBook, lang }) => {
  const t = translations[lang];
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState<{
    endPage?: string;
    percentageRead?: string;
  }>({});
  const [manualSessionModalOpen, setManualSessionModalOpen] = useState(false);
  const [manualSessionBookId, setManualSessionBookId] = useState<string | null>(null);
  const [manualSessionData, setManualSessionData] = useState<{
    date?: string;
    durationHours?: string;
    durationMinutes?: string;
    endPage?: string;
    endPercentage?: string;
  }>({});
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pagesInputRef = useRef<HTMLInputElement>(null);

  const deleteSession = (book: Book, sessionId: string) => {
    const remainingSessions = book.sessions.filter(s => s.id !== sessionId);

    let currentPage = 0;
    let currentPercentage = 0;

    if (remainingSessions.length > 0) {
      const sorted = [...remainingSessions].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      );
      const latest = sorted[0];
      currentPage = latest.endPage ?? 0;
      currentPercentage = latest.endPercentage ?? 0;
    }

    const updatedBook = {
      ...book,
      sessions: remainingSessions,
      currentPage,
      currentPercentage
    };
    onUpdateBook(updatedBook);
    addToast(lang === 'ru' ? 'Сессия удалена' : 'Session deleted', 'success');
  };
  const carouselRef = useRef<HTMLDivElement>(null);

  const currentlyReading = books.filter(b => b.status === BookStatus.READING);
  const postponedBooks = books.filter(b => b.status === BookStatus.POSTPONED);
  const queueBooks = books.filter(b => b.inQueue === true && b.status === BookStatus.WANT_TO_READ);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Обновление секундомера
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (sessionState?.isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [sessionState?.isRunning]);

  // Фокусировка на input при открытии модального окна
  useEffect(() => {
    if (sessionModalOpen && sessionState && pagesInputRef.current) {
      // Даем DOM время перерисоваться
      requestAnimationFrame(() => {
        pagesInputRef.current?.focus();
        // Проверяем что фокус действительно установлен
        if (document.activeElement !== pagesInputRef.current) {
          console.warn('Focus was not set properly, retrying...');
          pagesInputRef.current?.focus();
        }
      });

      // Глобальный обработчик для восстановления фокуса если он теряется
      const handleFocusLoss = () => {
        if (sessionModalOpen && document.activeElement === document.body && pagesInputRef.current) {
          console.warn('Focus was lost, restoring...');
          pagesInputRef.current.focus();
        }
      };

      // Слушаем mousedown, чтобы восстановить фокус если пользователь кликнул
      window.addEventListener('mousedown', handleFocusLoss);

      return () => {
        window.removeEventListener('mousedown', handleFocusLoss);
      };
    }
  }, [sessionModalOpen, sessionState]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (bookId: string) => {
    setSessionState({
      bookId,
      startTime: new Date(),
      isRunning: true
    });
    setElapsedSeconds(0);
    setSessionData({});
  };

  const pauseSession = () => {
    if (sessionState) {
      setSessionState({ ...sessionState, isRunning: false });
    }
  };

  const resumeSession = () => {
    if (sessionState) {
      setSessionState({ ...sessionState, isRunning: true });
    }
  };

  const cancelSession = () => {
    setSessionState(null);
    setElapsedSeconds(0);
    setSessionData({});
  };

  const endSession = () => {
    if (!sessionState || (!sessionData.endPage && !sessionData.percentageRead)) {
      addToast(lang === 'ru' ? 'Заполните хотя бы одно поле' : 'Fill in at least one field', 'error');
      return;
    }

    const book = books.find(b => b.id === sessionState.bookId);
    if (!book) return;

    // Проверяем что конечная страница не меньше текущей
    if (sessionData.endPage) {
      const endPage = parseInt(sessionData.endPage);
      const currentPage = book.currentPage || 0;
      if (endPage < currentPage) {
        addToast(lang === 'ru' ? `Страница не может быть меньше текущей (${currentPage})` : `Page cannot be less than current (${currentPage})`, 'error');
        return;
      }
    }

    // Проверяем что конечный процент не меньше текущего
    if (sessionData.percentageRead) {
      const endPercentage = parseInt(sessionData.percentageRead);
      const currentPercentage = book.currentPercentage || 0;
      if (endPercentage < currentPercentage) {
        addToast(lang === 'ru' ? `Процент не может быть меньше текущего (${currentPercentage}%)` : `Percentage cannot be less than current (${currentPercentage}%)`, 'error');
        return;
      }
    }

    // Вычисляем количество прочитанных страниц и финальные значения
    let finalEndPage: number | undefined = undefined;
    let finalEndPercentage: number | undefined = undefined;
    let pagesRead: number | undefined = undefined;
    let percentageReadValue: number | undefined = undefined;

    if (sessionData.endPage && book.totalPages) {
      // Если указаны страницы - вычисляем процент
      finalEndPage = parseInt(sessionData.endPage);
      finalEndPercentage = Math.round((finalEndPage / book.totalPages) * 100);
      const startPage = book.currentPage || 0;
      pagesRead = Math.max(0, finalEndPage - startPage);
      const startPercentage = book.currentPercentage || 0;
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
    } else if (sessionData.percentageRead && book.totalPages) {
      // Если указаны проценты - вычисляем страницы
      finalEndPercentage = parseInt(sessionData.percentageRead);
      finalEndPage = Math.round((finalEndPercentage / 100) * book.totalPages);
      const startPercentage = book.currentPercentage || 0;
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
      const startPage = book.currentPage || 0;
      pagesRead = Math.max(0, finalEndPage - startPage);
    } else if (sessionData.endPage) {
      // Если не указано всего страниц, но указаны страницы
      finalEndPage = parseInt(sessionData.endPage);
      const startPage = book.currentPage || 0;
      pagesRead = Math.max(0, finalEndPage - startPage);
    } else if (sessionData.percentageRead) {
      // Если не указано всего страниц, но указаны проценты
      finalEndPercentage = parseInt(sessionData.percentageRead);
      const startPercentage = book.currentPercentage || 0;
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
    }

    const newSession: ReadingSession = {
      id: `session_${Date.now()}`,
      startTime: sessionState.startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: elapsedSeconds,
      startPage: book.currentPage || 0,
      endPage: finalEndPage,
      pagesRead: pagesRead,
      startPercentage: book.currentPercentage || 0,
      endPercentage: finalEndPercentage,
      percentageRead: percentageReadValue
    };

    // Вычисляем финальный текущий процент
    let finalCurrentPercentage: number | undefined = undefined;
    if (finalEndPercentage !== undefined) {
      finalCurrentPercentage = finalEndPercentage;
    } else if (finalEndPage !== undefined && book.totalPages) {
      finalCurrentPercentage = Math.round((finalEndPage / book.totalPages) * 100);
    } else if (book.currentPercentage !== undefined) {
      finalCurrentPercentage = book.currentPercentage;
    }

    let updatedBook: Book = {
      ...book,
      // Обновляем текущую страницу если была указана конечная страница
      currentPage: finalEndPage || book.currentPage,
      // Обновляем текущий процент (всегда вычисляем если возможно)
      currentPercentage: finalCurrentPercentage,
      sessions: [...(book.sessions || []), newSession],
      // Если статус "Отложено", переводим в "Читаю" при добавлении сессии
      // Если достигнута 100% прочитанность, автоматически устанавливаем статус "Прочитано"
      status: finalCurrentPercentage === 100 
        ? BookStatus.READ 
        : book.status === BookStatus.POSTPONED 
          ? BookStatus.READING 
          : book.status,
      // Если достигнута 100%, устанавливаем дату окончания на дату последней сессии
      endDate: finalCurrentPercentage === 100 ? dayjs(newSession.endTime).format('YYYY-MM-DD') : book.endDate
    };

    // Записываем в историю если статус изменился
    if (updatedBook.status !== book.status) {
      updatedBook = recordStatusChange(book, updatedBook.status);
      // Восстанавливаем другие изменения (сессии, проценты, даты), которые были добавлены выше
      updatedBook = {
        ...updatedBook,
        currentPage: finalEndPage || book.currentPage,
        currentPercentage: finalCurrentPercentage,
        sessions: [...(book.sessions || []), newSession],
        endDate: finalCurrentPercentage === 100 ? dayjs(newSession.endTime).format('YYYY-MM-DD') : book.endDate
      };
    }

    onUpdateBook(updatedBook);
    
    // Полное очищение состояния
    setSessionState(null);
    setElapsedSeconds(0);
    setSessionData({});
    setSessionModalOpen(false);
  };

  const handleCloseModal = () => {
    setSessionModalOpen(false);
  };

  const saveManualSession = () => {
    if (!manualSessionBookId || !manualSessionData.date) {
      addToast(lang === 'ru' ? 'Заполните дату' : 'Fill in the date', 'error');
      return;
    }

    const book = books.find(b => b.id === manualSessionBookId);
    if (!book) return;

    // Валидация продолжительности
    const hours = parseInt(manualSessionData.durationHours || '0');
    const minutes = parseInt(manualSessionData.durationMinutes || '0');
    
    if (isNaN(hours) || isNaN(minutes) || (hours === 0 && minutes === 0)) {
      addToast(lang === 'ru' ? 'Заполните продолжительность сессии' : 'Fill in session duration', 'error');
      return;
    }

    if (minutes < 0 || minutes > 59 || hours < 0) {
      addToast(lang === 'ru' ? 'Неверный формат продолжительности' : 'Invalid duration format', 'error');
      return;
    }

    // Валидация конечных страниц/процентов - требуется минимум одно значение
    if (!manualSessionData.endPage && !manualSessionData.endPercentage) {
      addToast(lang === 'ru' ? 'Заполните конечную страницу или процент' : 'Fill in end page or percentage', 'error');
      return;
    }

    // Вычисляем продолжительность в секундах
    const duration = (hours * 3600) + (minutes * 60);

    // Создаем дату окончания (начинаем с полночи текущей даты и добавляем длительность)
    const [year, month, day] = manualSessionData.date.split('-').map(Number);
    const startDateTime = new Date(year, month - 1, day, 0, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + duration * 1000);

    // Начальные значения берутся из текущего прогресса книги
    const startPage = book.currentPage || 0;
    const startPercentage = book.currentPercentage || 0;

    // Вычисляем конечные значения с преобразованием
    let finalEndPage: number | undefined = undefined;
    let finalEndPercentage: number | undefined = undefined;
    let pagesRead: number | undefined = undefined;
    let percentageReadValue: number | undefined = undefined;

    if (manualSessionData.endPage && book.totalPages) {
      // Если указаны конечные страницы - вычисляем конечный процент
      finalEndPage = parseInt(manualSessionData.endPage);
      finalEndPercentage = Math.round((finalEndPage / book.totalPages) * 100);
      pagesRead = Math.max(0, finalEndPage - startPage);
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
    } else if (manualSessionData.endPercentage && book.totalPages) {
      // Если указаны конечные проценты - вычисляем конечные страницы
      finalEndPercentage = parseInt(manualSessionData.endPercentage);
      finalEndPage = Math.round((finalEndPercentage / 100) * book.totalPages);
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
      pagesRead = Math.max(0, finalEndPage - startPage);
    } else if (manualSessionData.endPage) {
      // Если не указано всего страниц, но указаны конечные страницы
      finalEndPage = parseInt(manualSessionData.endPage);
      pagesRead = Math.max(0, finalEndPage - startPage);
    } else if (manualSessionData.endPercentage) {
      // Если не указано всего страниц, но указаны конечные проценты
      finalEndPercentage = parseInt(manualSessionData.endPercentage);
      percentageReadValue = Math.max(0, finalEndPercentage - startPercentage);
    }

    const newSession: ReadingSession = {
      id: `session_${Date.now()}`,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration: duration,
      startPage: startPage,
      endPage: finalEndPage,
      pagesRead: pagesRead,
      startPercentage: startPercentage,
      endPercentage: finalEndPercentage,
      percentageRead: percentageReadValue
    };

    // Вычисляем финальный текущий процент
    let finalCurrentPercentage: number | undefined = undefined;
    if (finalEndPercentage !== undefined) {
      finalCurrentPercentage = finalEndPercentage;
    } else if (finalEndPage !== undefined && book.totalPages) {
      finalCurrentPercentage = Math.round((finalEndPage / book.totalPages) * 100);
    } else if (book.currentPercentage !== undefined) {
      finalCurrentPercentage = book.currentPercentage;
    }

    let updatedBook: Book = {
      ...book,
      currentPage: finalEndPage || book.currentPage,
      currentPercentage: finalCurrentPercentage,
      sessions: [...(book.sessions || []), newSession],
      // Если статус "Отложено", переводим в "Читаю" при добавлении сессии
      // Если достигнута 100% прочитанность, автоматически устанавливаем статус "Прочитано"
      status: finalCurrentPercentage === 100 
        ? BookStatus.READ 
        : book.status === BookStatus.POSTPONED 
          ? BookStatus.READING 
          : book.status,
      // Если достигнута 100%, устанавливаем дату окончания на дату последней сессии
      endDate: finalCurrentPercentage === 100 ? dayjs(newSession.endTime).format('YYYY-MM-DD') : book.endDate
    };

    // Записываем в историю если статус изменился
    if (updatedBook.status !== book.status) {
      updatedBook = recordStatusChange(book, updatedBook.status);
      // Восстанавливаем другие изменения (сессии, проценты, даты), которые были добавлены выше
      updatedBook = {
        ...updatedBook,
        currentPage: finalEndPage || book.currentPage,
        currentPercentage: finalCurrentPercentage,
        sessions: [...(book.sessions || []), newSession],
        endDate: finalCurrentPercentage === 100 ? dayjs(newSession.endTime).format('YYYY-MM-DD') : book.endDate
      };
    }

    onUpdateBook(updatedBook);

    addToast(lang === 'ru' ? 'Сессия добавлена' : 'Session added', 'success');
    
    // Очищение состояния
    setManualSessionModalOpen(false);
    setManualSessionBookId(null);
    setManualSessionData({});
  };

  const renderBookCard = (book: Book) => (
    <div key={book.id} className="bg-page rounded-xl shadow-md border border-default p-6">
      <div className="grid grid-cols-[35fr_65fr] gap-6">
        {/* LEFT: Book info */}
        <div className="flex gap-5">
          {book.coverUrl && (
            <div className="flex-shrink-0">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-20 h-28 object-cover rounded-lg shadow-md"
                onError={handleCoverError}
              />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-lg font-semibold text-fg">{book.title}</h3>
                {book.isPartOfSeries && (
                  <Link size={18} className="text-accent flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-slate-600">{book.author}</p>
            </div>
            <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
              book.status === BookStatus.READING 
                ? 'bg-blue-100 text-blue-700' 
                : book.status === BookStatus.POSTPONED 
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {book.status === BookStatus.READING ? (lang === 'ru' ? 'Читаю' : 'Reading') : (lang === 'ru' ? 'Отложено' : 'Postponed')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all duration-500" style={{ width: `${getBookPercentage(book)}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-600 w-8 text-right">{getBookPercentage(book)}%</span>
              </div>
            </div>

            {/* Progress info */}
            {book.totalPages ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium text-slate-600">{lang === 'ru' ? 'Прочитано' : 'Read'}</div>
                  <div className="text-slate-500">
                    {(book.currentPage || 0)} {lang === 'ru' ? 'стр.' : 'p.'} {lang === 'ru' ? 'из' : 'of'} {book.totalPages} {lang === 'ru' ? 'стр.' : 'p.'}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-600">{lang === 'ru' ? 'Осталось' : 'Remaining'}</div>
                  <div className="text-slate-500">
                    {Math.max(0, book.totalPages - (book.currentPage || 0))} {lang === 'ru' ? 'стр.' : 'p.'}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Status change buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {book.status === BookStatus.READING && (
                <>
                  <button
                    onClick={() => {
                      const updatedBook = recordStatusChange(book, BookStatus.POSTPONED);
                      onUpdateBook(updatedBook);
                      addToast(lang === 'ru' ? 'Книга отложена' : 'Book postponed', 'info');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#CD853F] text-[#CD853F] rounded-lg hover:bg-[#CD853F]/10 transition-colors text-sm"
                    title={lang === 'ru' ? 'Отложить' : 'Postpone'}
                  >
                    <Pause size={16} />
                    <span>{lang === 'ru' ? 'Отложить' : 'Postpone'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const updatedBook = recordStatusChange(book, BookStatus.ABANDONED);
                      onUpdateBook(updatedBook);
                      addToast(lang === 'ru' ? 'Книга брошена' : 'Book abandoned', 'info');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#8B0000] text-[#8B0000] rounded-lg hover:bg-[#8B0000]/10 transition-colors text-sm"
                    title={lang === 'ru' ? 'Бросить' : 'Abandon'}
                  >
                    <X size={16} />
                    <span>{lang === 'ru' ? 'Бросить' : 'Abandon'}</span>
                  </button>
                </>
              )}

              {book.status === BookStatus.POSTPONED && (
                <>
                  <button
                    onClick={() => {
                      const updatedBook = recordStatusChange(book, BookStatus.READING);
                      onUpdateBook(updatedBook);
                      addToast(lang === 'ru' ? 'Статус изменен на "Читаю"' : 'Status changed to "Reading"', 'info');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#6495ED] text-[#6495ED] rounded-lg hover:bg-[#6495ED]/10 transition-colors text-sm"
                    title={lang === 'ru' ? 'Читать' : 'Read'}
                  >
                    <BookOpen size={16} />
                    <span>{lang === 'ru' ? 'Читать' : 'Read'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const updatedBook = recordStatusChange(book, BookStatus.ABANDONED);
                      onUpdateBook(updatedBook);
                      addToast(lang === 'ru' ? 'Книга брошена' : 'Book abandoned', 'info');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#8B0000] text-[#8B0000] rounded-lg hover:bg-[#8B0000]/10 transition-colors text-sm"
                    title={lang === 'ru' ? 'Бросить' : 'Abandon'}
                  >
                    <X size={16} />
                    <span>{lang === 'ru' ? 'Бросить' : 'Abandon'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Timer controls + Sessions */}
        <div className="space-y-4 relative before:content-[''] before:absolute before:-left-3 before:top-6 before:bottom-6 before:w-px before:bg-gradient-to-b before:from-transparent before:to-transparent" style={{ '--tw-gradient-via': 'var(--border)' } as React.CSSProperties}>
          {/* Timer controls */}
          {sessionState?.bookId === book.id ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Timer size={24} className="text-accent" />
                <div className="text-3xl font-bold text-accent font-mono">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
              <div className="flex gap-2">
                {sessionState.isRunning ? (
                  <button
                    onClick={pauseSession}
                    className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#B09F31] text-[#B09F31] rounded-lg hover:bg-[#B09F31]/10 transition-colors"
                  >
                    <Pause size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'Пауза' : 'Pause'}</span>
                  </button>
                ) : (
                  <button
                    onClick={resumeSession}
                    className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#846B90] text-[#846B90] rounded-lg hover:bg-[#846B90]/10 transition-colors"
                  >
                    <Play size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'Продолжить' : 'Resume'}</span>
                  </button>
                )}
                <button
                  onClick={cancelSession}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent border border-slate-400 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw size={18} />
                  <span className="text-sm">{lang === 'ru' ? 'Отмена' : 'Cancel'}</span>
                </button>
                <button
                  onClick={() => {
                    if (sessionState) {
                      setSessionState({ ...sessionState, isRunning: false });
                    }
                    setSessionModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent border border-accent text-accent rounded-lg hover:bg-accent-soft transition-colors"
                >
                  <CheckCircle size={18} />
                  <span className="text-sm">{lang === 'ru' ? 'Завершить' : 'End'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => startSession(book.id)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Play size={18} />
                <span className="text-sm">{lang === 'ru' ? 'Начать сессию' : 'Start Session'}</span>
              </button>
              <button
                onClick={() => {
                  setManualSessionBookId(book.id);
                  setManualSessionData({ date: new Date().toISOString().split('T')[0] });
                  setManualSessionModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-transparent border border-slate-500 text-slate-500 rounded-lg hover:bg-slate-500/10 transition-colors"
              >
                <Clock size={18} />
                <span className="text-sm">{lang === 'ru' ? 'Добавить вручную' : 'Add Manual'}</span>
              </button>
            </div>
          )}

          {/* История сессий */}
          {book.sessions && book.sessions.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  <span>{lang === 'ru' ? 'История сессий' : 'Session History'}</span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-accent-soft text-accent">
                    {book.sessions.length} {lang === 'ru'
                      ? (book.sessions.length === 1
                        ? 'запись'
                        : (book.sessions.length >= 2 && book.sessions.length <= 4
                          ? 'записи'
                          : 'записей'))
                      : (book.sessions.length === 1 ? 'entry' : 'entries')}
                  </span>
                </div>
                <div className="text-xs font-normal text-fg bg-accent-soft border border-default px-2 py-1 rounded">
                  {calculateBookTotalHours(book).toFixed(1)} {lang === 'ru' ? 'ч' : 'h'}
                </div>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-accent-soft">
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? 'Длит.' : 'Dur.'}</th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? 'Стр.' : 'Pages'}</th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? 'Прочит.' : 'Read'}</th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? 'Процент' : 'Pct.'}</th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500 border-b border-default">{lang === 'ru' ? '%' : '%'}</th>
                      <th className="px-2 py-1 border-b border-default w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expandedBookId === book.id ? book.sessions : book.sessions.slice(-3)).map(session => {
                      const startDate = new Date(session.startTime);
                      const dateStr = startDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');
                      const hours = Math.floor(session.duration / 3600);
                      const minutes = Math.floor((session.duration % 3600) / 60);
                      const durationStr = hours > 0 
                        ? `${hours}${lang === 'ru' ? 'ч' : 'h'} ${minutes}${lang === 'ru' ? 'м' : 'm'}` 
                        : `${minutes}${lang === 'ru' ? 'м' : 'm'}`;

                      return (
                        <tr key={session.id} className="group" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-soft)' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}>
                          <td className="px-2 py-1 text-slate-700 border-b border-default">{dateStr}</td>
                          <td className="px-2 py-1 text-slate-700 font-medium border-b border-default">{durationStr}</td>
                          <td className="px-2 py-1 text-slate-700 border-b border-default">
                            {session.startPage !== undefined && session.endPage !== undefined 
                              ? `${session.startPage}–${session.endPage}` 
                              : '-'}
                          </td>
                          <td className="px-2 py-1 text-slate-700 font-medium border-b border-default">
                            {session.pagesRead !== undefined ? `${session.pagesRead}${lang === 'ru' ? ' стр.' : ' p.'}` : '-'}
                          </td>
                          <td className="px-2 py-1 text-slate-700 border-b border-default">
                            {session.startPercentage !== undefined && session.endPercentage !== undefined 
                              ? `${session.startPercentage}–${session.endPercentage}%` 
                              : '-'}
                          </td>
                          <td className="px-2 py-1 text-slate-700 font-medium border-b border-default">
                            {session.percentageRead !== undefined ? `${session.percentageRead}%` : '-'}
                          </td>
                          <td className="px-2 py-1 border-b border-default">
                            <button
                              onClick={() => deleteSession(book, session.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title={lang === 'ru' ? 'Удалить сессию' : 'Delete session'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {book.sessions.length > 3 && expandedBookId !== book.id && (
                <button
                  onClick={() => setExpandedBookId(book.id)}
                  className="mt-3 px-3 py-1 text-sm text-accent hover:text-accent-hover font-medium rounded transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                >
                  {lang === 'ru' ? '+ Показать все' : '+ Show All'} ({book.sessions.length - 3} {lang === 'ru' ? 'ещё' : 'more'})
                </button>
              )}
              {expandedBookId === book.id && book.sessions.length > 3 && (
                <button
                  onClick={() => setExpandedBookId(null)}
                  className="mt-3 px-3 py-1 text-sm text-accent hover:text-accent-hover font-medium rounded transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                >
                  {lang === 'ru' ? '− Скрыть' : '− Hide'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Toast messages={toasts} onRemove={removeToast} />

      {/* Пустое состояние */}
      {currentlyReading.length === 0 && queueBooks.length === 0 && postponedBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-page rounded-2xl border-2 border-dashed border-slate-100">
          <Clock size={48} className="mb-4 opacity-20" />
          <p className="text-lg">{lang === 'ru' ? 'Нет книг со статусом "Читаю" или "Отложено"' : 'No books with "Reading" or "Postponed" status'}</p>
          <p className="text-sm">{lang === 'ru' ? 'Добавьте книгу или измените её статус' : 'Add a book or change its status'}</p>
        </div>
      )}

      {/* 1. Очередь — карусель */}
      {queueBooks.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-fg">{lang === 'ru' ? 'Очередь' : 'Queue'}</h3>
          <div className="relative group">
            {/* Стрелка влево */}
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute left-0 top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-100 hover:bg-white"
            >
              <ChevronLeft size={20} className="text-fg" />
            </button>

            {/* Карусель */}
            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto scroll-smooth pb-2 px-14"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {queueBooks.map(book => (
                <div key={book.id} className="flex-shrink-0 w-36">
                  {/* Обложка */}
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 shadow-md mb-3 relative group/cover">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={handleCoverError}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                        <span className="font-semibold text-sm line-clamp-2">{book.title}</span>
                        <span className="mt-1">{book.author}</span>
                      </div>
                    )}
                    {/* Подсказка при наведении */}
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 text-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-bold line-clamp-2">{book.title}</span>
                      <span className="text-white/80 text-xs mt-1 line-clamp-1">{book.author}</span>
                    </div>
                  </div>
                  {/* Кнопки */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const bookWithHistory = recordStatusChange(book, BookStatus.READING);
                        const finalBook = {
                          ...bookWithHistory,
                          startDate: dayjs().format('YYYY-MM-DD'),
                          inQueue: false
                        };
                        onUpdateBook(finalBook);
                        addToast(lang === 'ru' ? 'Начато чтение' : 'Reading started', 'success');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors text-xs font-medium"
                    >
                      <Play size={14} />
                      <span>{lang === 'ru' ? 'Читать' : 'Read'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const updatedBook = { ...book, inQueue: false };
                        onUpdateBook(updatedBook);
                        addToast(lang === 'ru' ? 'Книга удалена из очереди' : 'Book removed from queue', 'success');
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                      title={lang === 'ru' ? 'Убрать' : 'Remove'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Стрелка вправо */}
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute right-0 top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-100 hover:bg-white"
            >
              <ChevronRight size={20} className="text-fg" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Сейчас читаю */}
      {currentlyReading.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-fg flex items-center gap-2">
            {lang === 'ru' ? 'Читаю' : 'Reading'}
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-accent-soft text-accent">
              {currentlyReading.length} {lang === 'ru'
                ? (currentlyReading.length === 1
                  ? 'книга'
                  : (currentlyReading.length >= 2 && currentlyReading.length <= 4
                    ? 'книги'
                    : 'книг'))
                : (currentlyReading.length === 1 ? 'book' : 'books')}
            </span>
          </h3>
          {currentlyReading.map(book => renderBookCard(book))}
        </div>
      )}

      {/* 3. Отложено */}
      {postponedBooks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-fg flex items-center gap-2">
            {lang === 'ru' ? 'Отложено' : 'Postponed'}
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-accent-soft text-accent">
              {postponedBooks.length} {lang === 'ru'
                ? (postponedBooks.length === 1
                  ? 'книга'
                  : (postponedBooks.length >= 2 && postponedBooks.length <= 4
                    ? 'книги'
                    : 'книг'))
                : (postponedBooks.length === 1 ? 'book' : 'books')}
            </span>
          </h3>
          {postponedBooks.map(book => renderBookCard(book))}
        </div>
      )}

      {/* Модальное окно завершения сессии */}
      {sessionModalOpen && sessionState && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-accent mb-4">
              {lang === 'ru' ? 'Завершить сессию' : 'End Session'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {lang === 'ru' ? 'Время сессии: ' : 'Session time: '}
              <span className="font-bold text-accent">{formatTime(elapsedSeconds)}</span>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === 'ru' ? 'Страница, на которой закончили (опционально)' : 'Current Page (optional)'}
                </label>
                <div className="flex flex-col gap-2">
                  {books.find(b => b.id === sessionState.bookId)?.currentPage !== undefined && (
                    <p className="text-xs text-slate-500">
                      {lang === 'ru' ? 'Текущая страница: ' : 'Previous page: '}
                      <span className="font-semibold text-slate-700">{books.find(b => b.id === sessionState.bookId)?.currentPage || 0}</span>
                    </p>
                  )}
                  <input
                    ref={pagesInputRef}
                    type="number"
                    min={books.find(b => b.id === sessionState.bookId)?.currentPage || 0}
                    value={sessionData.endPage || ''}
                    onChange={(e) => setSessionData({ ...sessionData, endPage: e.target.value })}
                    placeholder={lang === 'ru' ? 'Номер страницы' : 'Page number'}
                    className="w-full px-3 py-2 bg-white border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === 'ru' ? 'Процент, на котором закончили (опционально)' : 'Current Percentage (optional)'}
                </label>
                <div className="flex flex-col gap-2">
                  {books.find(b => b.id === sessionState.bookId)?.currentPercentage != null && (
                    <p className="text-xs text-slate-500">
                      {lang === 'ru' ? 'Текущий процент: ' : 'Previous percentage: '}
                      <span className="font-semibold text-slate-700">{books.find(b => b.id === sessionState.bookId)?.currentPercentage || 0}%</span>
                    </p>
                  )}
                  <input
                    type="number"
                    min={books.find(b => b.id === sessionState.bookId)?.currentPercentage || 0}
                    max="100"
                    value={sessionData.percentageRead || ''}
                    onChange={(e) => setSessionData({ ...sessionData, percentageRead: e.target.value })}
                    placeholder={lang === 'ru' ? 'Процент от 0 до 100' : 'Percentage 0-100'}
                    className="w-full px-3 py-2 bg-white border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={endSession}
                className="flex-1 px-4 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors font-medium"
              >
                {lang === 'ru' ? 'Сохранить' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно ручного добавления сессии */}
      {manualSessionModalOpen && manualSessionBookId && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setManualSessionModalOpen(false);
              setManualSessionBookId(null);
              setManualSessionData({});
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-fg mb-4">
              {lang === 'ru' ? 'Добавить сессию вручную' : 'Add Manual Session'}
            </h3>

            <div className="space-y-4 mb-6">
              {/* Дата */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === 'ru' ? 'Дата' : 'Date'} *
                </label>
                <DateInput
                  value={manualSessionData.date ? dayjs(manualSessionData.date).toDate() : null}
                  onChange={(date) => setManualSessionData({ ...manualSessionData, date: date ? dayjs(date).format('YYYY-MM-DD') : '' })}
                  placeholder={lang === 'ru' ? 'Выберите дату' : 'Select date'}
                  valueFormat="YYYY-MM-DD"
                  clearable
                  className="w-full"
                />
              </div>

              {/* Продолжительность сессии */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === 'ru' ? 'Продолжительность сессии' : 'Session Duration'} *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <NumberInput
                      label={lang === 'ru' ? 'Часы' : 'Hours'}
                      value={manualSessionData.durationHours ? parseInt(manualSessionData.durationHours) : undefined}
                      onChange={(val) => {
                        setManualSessionData({
                          ...manualSessionData,
                          durationHours: String(val || 0)
                        });
                      }}
                      min={0}
                      max={24}
                      placeholder="0"
                    />
                  </div>
                  <div className="text-lg font-semibold text-slate-700">:</div>
                  <div className="flex-1">
                    <NumberInput
                      label={lang === 'ru' ? 'Минуты' : 'Minutes'}
                      value={manualSessionData.durationMinutes ? parseInt(manualSessionData.durationMinutes) : undefined}
                      onChange={(val) => {
                        setManualSessionData({
                          ...manualSessionData,
                          durationMinutes: String(val || 0)
                        });
                      }}
                      min={0}
                      max={59}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Информация о текущем прогрессе */}
              <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-200">
                <p className="font-medium">{lang === 'ru' ? 'Начальные значения:' : 'Start values:'}</p>
                <p>{lang === 'ru' ? 'Страница: ' : 'Page: '}
                  <span className="font-semibold">{books.find(b => b.id === manualSessionBookId)?.currentPage || 0}</span>
                </p>
                <p>{lang === 'ru' ? 'Процент: ' : 'Percentage: '}
                  <span className="font-semibold">{books.find(b => b.id === manualSessionBookId)?.currentPercentage || 0}%</span>
                </p>
              </div>

              {/* Конечная страница / процент - обязательно минимум одно */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {lang === 'ru' ? 'Конечная страница' : 'End Page'} {lang === 'ru' ? '(опционально)' : '(optional)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualSessionData.endPage || ''}
                    onChange={(e) => setManualSessionData({ ...manualSessionData, endPage: e.target.value })}
                    placeholder={lang === 'ru' ? 'Номер страницы' : 'Page number'}
                    className="w-full px-3 py-2 bg-white border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {lang === 'ru' ? 'Конечный процент' : 'End Percentage'} {lang === 'ru' ? '(опционально)' : '(optional)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={manualSessionData.endPercentage || ''}
                    onChange={(e) => setManualSessionData({ ...manualSessionData, endPercentage: e.target.value })}
                    placeholder={lang === 'ru' ? 'От 0 до 100' : '0-100'}
                    className="w-full px-3 py-2 bg-white border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">{lang === 'ru' ? '* Заполните хотя бы одно из полей выше' : '* Fill in at least one field above'}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setManualSessionModalOpen(false);
                  setManualSessionBookId(null);
                  setManualSessionData({});
                }}
                className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={saveManualSession}
                className="flex-1 px-4 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors font-medium"
              >
                {lang === 'ru' ? 'Сохранить' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReadingView;
