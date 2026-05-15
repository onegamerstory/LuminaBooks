import React, { useState, useEffect, useRef } from 'react';
import { Book, BookStatus, ReadingSession } from '../types';
import { Play, Pause, RotateCcw, CheckCircle, Clock, Zap, Link, Trash2, X, BookOpen } from 'lucide-react';
import { createPortal } from 'react-dom';
import { translations } from '../App';
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

  const readingBooks = books
    .filter(b => b.status === BookStatus.READING || b.status === BookStatus.POSTPONED)
    .sort((a, b) => {
      // Книги со статусом "Читаю" (READING) выше, "Отложено" (POSTPONED) ниже
      if (a.status === BookStatus.READING && b.status === BookStatus.POSTPONED) return -1;
      if (a.status === BookStatus.POSTPONED && b.status === BookStatus.READING) return 1;
      return 0;
    });

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
  return (
    <div className="space-y-6">
      <Toast messages={toasts} onRemove={removeToast} />
      <h2 className="text-2xl font-bold text-[#1E2920]">{lang === 'ru' ? 'Чтение' : 'Reading'}</h2>

      {/* Раздел чтения */}
      {readingBooks.length === 0 && queueBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#F0F4F1] rounded-2xl border-2 border-dashed border-slate-100">
          <Clock size={48} className="mb-4 opacity-20" />
          <p className="text-lg">{lang === 'ru' ? 'Нет книг со статусом "Читаю" или "Отложено"' : 'No books with "Reading" or "Postponed" status'}</p>
          <p className="text-sm">{lang === 'ru' ? 'Добавьте книгу или измените её статус' : 'Add a book or change its status'}</p>
        </div>
      ) : readingBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#F0F4F1] rounded-2xl border-2 border-dashed border-slate-100">
          <Clock size={48} className="mb-4 opacity-20" />
          <p className="text-lg">{lang === 'ru' ? 'Нет книг со статусом "Читаю" или "Отложено"' : 'No books with "Reading" or "Postponed" status'}</p>
          <p className="text-sm">{lang === 'ru' ? 'Начните чтение книги из очереди' : 'Start reading a book from queue'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readingBooks.map(book => (
            <div key={book.id} className="bg-[#F0F4F1] rounded-xl shadow-md border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4 gap-4">
                {book.coverUrl && (
                  <div className="flex-shrink-0 relative">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-20 h-28 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 112"%3E%3Crect fill="%23e2e8f0" width="80" height="112"/%3E%3C/svg%3E';
                      }}
                    />
                    {/* Процент прочтения - всегда показывается */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent rounded-b-lg p-2 text-white text-xs text-center">
                      <div className="font-semibold text-sm">
                        {book.currentPercentage !== undefined 
                          ? `${book.currentPercentage}%` 
                          : book.currentPage && book.totalPages
                            ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
                            : book.status === BookStatus.READ
                              ? '100%'
                              : '0%'
                        }
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="text-lg font-semibold text-[#1E2920]">{book.title}</h3>
                    {book.isPartOfSeries && (
                      <Link size={18} className="text-[#6B9071] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{book.author}</p>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider mt-1 ${
                    book.status === BookStatus.READING 
                      ? 'bg-blue-100 text-blue-700' 
                      : book.status === BookStatus.POSTPONED 
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    {book.status === BookStatus.READING ? (lang === 'ru' ? 'Читаю' : 'Reading') : (lang === 'ru' ? 'Отложено' : 'Postponed')}
                  </div>
                </div>
                {sessionState?.bookId === book.id ? (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#6B9071] font-mono mb-3">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="flex gap-2">
                      {sessionState.isRunning ? (
                        <button
                          onClick={pauseSession}
                          className="flex items-center gap-2 px-4 py-2 bg-[#B09F31] text-white rounded-lg hover:bg-[#7F7324] transition-colors"
                        >
                          <Pause size={18} />
                          <span className="text-sm">{lang === 'ru' ? 'Пауза' : 'Pause'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={resumeSession}
                          className="flex items-center gap-2 px-4 py-2 bg-[#846B90]/60 text-white rounded-lg hover:bg-[#846B90] transition-colors"
                        >
                          <Play size={18} />
                          <span className="text-sm">{lang === 'ru' ? 'Продолжить' : 'Resume'}</span>
                        </button>
                      )}
                      <button
                        onClick={cancelSession}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
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
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] transition-colors"
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm">{lang === 'ru' ? 'Завершить' : 'End'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startSession(book.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <Clock size={18} />
                      <span className="text-sm">{lang === 'ru' ? 'Добавить вручную' : 'Add Manual'}</span>
                    </button>
                    
                    {book.status === BookStatus.READING && (
                      <>
                        <button
                          onClick={() => {
                            const updatedBook = recordStatusChange(book, BookStatus.POSTPONED);
                            onUpdateBook(updatedBook);
                            addToast(lang === 'ru' ? 'Книга отложена' : 'Book postponed', 'info');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#CD853F] text-white rounded-lg hover:bg-[#D2691E] transition-colors"
                          title={lang === 'ru' ? 'Отложить' : 'Postpone'}
                        >
                          <Pause size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const updatedBook = recordStatusChange(book, BookStatus.ABANDONED);
                            onUpdateBook(updatedBook);
                            addToast(lang === 'ru' ? 'Книга брошена' : 'Book abandoned', 'info');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#800000] transition-colors"
                          title={lang === 'ru' ? 'Бросить' : 'Abandon'}
                        >
                          <X size={18} />
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
                          className="flex items-center gap-2 px-4 py-2 bg-[#6495ED] text-white rounded-lg hover:bg-[#4682B4] transition-colors"
                          title={lang === 'ru' ? 'Читать' : 'Read'}
                        >
                          <BookOpen size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const updatedBook = recordStatusChange(book, BookStatus.ABANDONED);
                            onUpdateBook(updatedBook);
                            addToast(lang === 'ru' ? 'Книга брошена' : 'Book abandoned', 'info');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#800000] transition-colors"
                          title={lang === 'ru' ? 'Бросить' : 'Abandon'}
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* История сессий */}
              {book.sessions && book.sessions.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      <span>{lang === 'ru' ? 'История сессий' : 'Session History'} ({book.sessions.length})</span>
                    </div>
                    <div className="text-xs font-normal text-[#1E2920] bg-[#DFE9E2] border border-[#B8D4C0] px-2 py-1 rounded">
                      {calculateBookTotalHours(book).toFixed(1)} {lang === 'ru' ? 'ч' : 'h'}
                    </div>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#A1BAA5] border-b border-slate-200">
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Длительность' : 'Duration'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Страницы' : 'Pages'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Прочитано страниц' : 'Pages Read'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Текущий процент' : 'Percentage'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Прочитано %' : '% Read'}</th>
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
                            <tr key={session.id} className="border-b border-slate-100 hover:bg-[#D6E1D8]">
                              <td className="p-2 text-slate-700">{dateStr}</td>
                              <td className="p-2 text-slate-700 font-medium">{durationStr}</td>
                              <td className="p-2 text-slate-700">
                                {session.startPage !== undefined && session.endPage !== undefined 
                                  ? `${session.startPage}–${session.endPage}` 
                                  : '-'}
                              </td>
                              <td className="p-2 text-slate-700 font-medium">
                                {session.pagesRead !== undefined ? `${session.pagesRead}${lang === 'ru' ? ' страниц(ы)' : ' page(s)'}` : '-'}
                              </td>
                              <td className="p-2 text-slate-700">
                                {session.startPercentage !== undefined && session.endPercentage !== undefined 
                                  ? `${session.startPercentage}–${session.endPercentage}%` 
                                  : '-'}
                              </td>
                              <td className="p-2 text-slate-700 font-medium">
                                {session.percentageRead !== undefined ? `${session.percentageRead}%` : '-'}
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
                      className="mt-3 px-3 py-1 text-sm text-[#6B9071] hover:text-[#59785E] font-medium hover:bg-[#F0F4F1] rounded transition-colors"
                    >
                      {lang === 'ru' ? '+ Показать все' : '+ Show All'} ({book.sessions.length - 3} {lang === 'ru' ? 'ещё' : 'more'})
                    </button>
                  )}
                  {expandedBookId === book.id && book.sessions.length > 3 && (
                    <button
                      onClick={() => setExpandedBookId(null)}
                      className="mt-3 px-3 py-1 text-sm text-[#6B9071] hover:text-[#59785E] font-medium hover:bg-[#F0F4F1] rounded transition-colors"
                    >
                      {lang === 'ru' ? '− Скрыть' : '− Hide'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Раздел очереди */}
      {queueBooks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-[#1E2920]">{lang === 'ru' ? 'Очередь' : 'Queue'}</h3>
          <div className="space-y-3">
            {queueBooks.map(book => (
              <div key={book.id} className="bg-cyan-50 rounded-xl shadow-md border border-cyan-200 p-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  {book.coverUrl && (
                    <div className="flex-shrink-0 relative">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 112"%3E%3Crect fill="%23e2e8f0" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-lg font-semibold text-[#1E2920]">{book.title}</h4>
                      {book.isPartOfSeries && (
                        <Link size={18} className="text-[#6B9071] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{book.author} • {book.year}</p>
                    {book.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{book.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={() => {
                        const updatedBook: Book = {
                          ...book,
                          status: BookStatus.READING,
                          startDate: dayjs().format('YYYY-MM-DD'),
                          inQueue: false
                        };
                        // Очищаем историю дат и записываем новый статус
                        const bookWithHistory = recordStatusChange(book, BookStatus.READING);
                        const finalBook = {
                          ...bookWithHistory,
                          startDate: dayjs().format('YYYY-MM-DD'),
                          inQueue: false
                        };
                        onUpdateBook(finalBook);
                        addToast(lang === 'ru' ? 'Начато чтение' : 'Reading started', 'success');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Play size={16} />
                      <span>{lang === 'ru' ? 'Читать' : 'Read'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const updatedBook = { ...book, inQueue: false };
                        onUpdateBook(updatedBook);
                        addToast(lang === 'ru' ? 'Книга удалена из очереди' : 'Book removed from queue', 'success');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Trash2 size={16} />
                      <span>{lang === 'ru' ? 'Убрать' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно завершения сессии */}
      {sessionModalOpen && sessionState && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-[#F0F4F1] rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#6B9071] mb-4">
              {lang === 'ru' ? 'Завершить сессию' : 'End Session'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {lang === 'ru' ? 'Время сессии: ' : 'Session time: '}
              <span className="font-bold text-[#6B9071]">{formatTime(elapsedSeconds)}</span>
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === 'ru' ? 'Процент, на котором закончили (опционально)' : 'Current Percentage (optional)'}
                </label>
                <div className="flex flex-col gap-2">
                  {books.find(b => b.id === sessionState.bookId)?.currentPercentage !== undefined && (
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={endSession}
                className="flex-1 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] transition-colors font-medium"
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setManualSessionModalOpen(false);
              setManualSessionBookId(null);
              setManualSessionData({});
            }
          }}
        >
          <div className="bg-[#F0F4F1] rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-[#1E2920] mb-4">
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
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
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={saveManualSession}
                className="flex-1 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] transition-colors font-medium"
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
