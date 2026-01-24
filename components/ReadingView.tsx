import React, { useState, useEffect, useRef } from 'react';
import { Book, BookStatus, ReadingSession } from '../types';
import { Play, Pause, RotateCcw, CheckCircle, Clock, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';
import { translations } from '../App';
import Toast, { ToastMessage } from './Toast';

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
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pagesInputRef = useRef<HTMLInputElement>(null);

  const readingBooks = books.filter(b => b.status === BookStatus.READING);

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

    const updatedBook: Book = {
      ...book,
      // Обновляем текущую страницу если была указана конечная страница
      currentPage: finalEndPage || book.currentPage,
      // Обновляем текущий процент (всегда вычисляем если возможно)
      currentPercentage: finalCurrentPercentage,
      sessions: [...(book.sessions || []), newSession]
    };

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

  return (
    <div className="space-y-6">
      <Toast messages={toasts} onRemove={removeToast} />
      <h2 className="text-2xl font-bold text-slate-800">{lang === 'ru' ? 'Чтение' : 'Reading'}</h2>

      {readingBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-100">
          <Clock size={48} className="mb-4 opacity-20" />
          <p className="text-lg">{lang === 'ru' ? 'Нет книг со статусом "Читаю"' : 'No books with "Reading" status'}</p>
          <p className="text-sm">{lang === 'ru' ? 'Добавьте книгу или измените её статус' : 'Add a book or change its status'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readingBooks.map(book => (
            <div key={book.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
                    {(book.currentPage !== undefined || book.currentPercentage !== undefined) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent rounded-b-lg p-2 text-white text-xs text-center">
                        <div className="font-semibold text-sm">
                          {book.currentPercentage !== undefined 
                            ? `${book.currentPercentage}%` 
                            : book.currentPage && book.totalPages
                              ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
                              : book.currentPage !== undefined 
                                ? `${lang === 'ru' ? 'Стр.' : 'P.'} ${book.currentPage}`
                                : '-'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">{book.title}</h3>
                  <p className="text-sm text-slate-600">{book.author}</p>
                </div>
                {sessionState?.bookId === book.id ? (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600 font-mono mb-3">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="flex gap-2">
                      {sessionState.isRunning ? (
                        <button
                          onClick={pauseSession}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          <Pause size={18} />
                          <span className="text-sm">{lang === 'ru' ? 'Пауза' : 'Pause'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={resumeSession}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm">{lang === 'ru' ? 'Завершить' : 'End'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startSession(book.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Play size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'Начать сессию' : 'Start Session'}</span>
                  </button>
                )}
              </div>

              {/* История сессий */}
              {book.sessions && book.sessions.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    {lang === 'ru' ? 'История сессий' : 'Session History'} ({book.sessions.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Начало' : 'Start'}</th>
                          <th className="p-2 text-left text-xs font-semibold text-slate-600">{lang === 'ru' ? 'Конец' : 'End'}</th>
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
                          const endDate = new Date(session.endTime);
                          const dateStr = startDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');
                          const startTimeStr = startDate.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const endTimeStr = endDate.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const hours = Math.floor(session.duration / 3600);
                          const minutes = Math.floor((session.duration % 3600) / 60);
                          const durationStr = hours > 0 
                            ? `${hours}${lang === 'ru' ? 'ч' : 'h'} ${minutes}${lang === 'ru' ? 'м' : 'm'}` 
                            : `${minutes}${lang === 'ru' ? 'м' : 'm'}`;

                          return (
                            <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-2 text-slate-700">{dateStr}</td>
                              <td className="p-2 text-slate-700">{startTimeStr}</td>
                              <td className="p-2 text-slate-700">{endTimeStr}</td>
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
                      className="mt-3 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 rounded transition-colors"
                    >
                      {lang === 'ru' ? '+ Показать все' : '+ Show All'} ({book.sessions.length - 3} {lang === 'ru' ? 'ещё' : 'more'})
                    </button>
                  )}
                  {expandedBookId === book.id && book.sessions.length > 3 && (
                    <button
                      onClick={() => setExpandedBookId(null)}
                      className="mt-3 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 rounded transition-colors"
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
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              {lang === 'ru' ? 'Завершить сессию' : 'End Session'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {lang === 'ru' ? 'Время сессии: ' : 'Session time: '}
              <span className="font-bold text-indigo-600">{formatTime(elapsedSeconds)}</span>
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
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
