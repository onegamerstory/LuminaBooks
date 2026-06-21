
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Book, BookStatus, ReadingSession } from '../types';
import { ChevronLeft, ChevronRight, HelpCircle, X, Search, Link, BookOpen, Clock, Flame, CalendarDays } from 'lucide-react';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { getActiveReadingPhases } from '../utils/statusHistoryUtils';

interface CalendarViewProps {
  books: Book[];
  lang: 'en' | 'ru';
  onStartReading: (bookId: string, startDate: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ books, lang, onStartReading }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBookSelectionModalOpen, setIsBookSelectionModalOpen] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'phases' | 'sessions'>(() => {
    const saved = localStorage.getItem('calendarViewMode');
    return (saved as 'phases' | 'sessions') || 'phases';
  });
  const t = translations[lang as 'en' | 'ru'];

  useEffect(() => {
    localStorage.setItem('calendarViewMode', viewMode);
  }, [viewMode]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];

    const firstDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const toLocalISOString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const dailyHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let totalSeconds = 0;

      books.forEach((book: Book) => {
        if (!book.sessions || book.sessions.length === 0) return;
        book.sessions.forEach((session: ReadingSession) => {
          const sessionDate = dayjs(session.startTime).format('YYYY-MM-DD');
          if (sessionDate === dayStr) {
            totalSeconds += session.duration || 0;
          }
        });
      });

      map.set(dayStr, Math.round((totalSeconds / 3600) * 10) / 10);
    }

    return map;
  }, [books, currentDate.getFullYear(), currentDate.getMonth()]);

  const getDailyHours = useCallback((day: Date): number => {
    return dailyHoursMap.get(toLocalISOString(day)) || 0;
  }, [dailyHoursMap]);

  const monthlyHours = useMemo(() => {
    let totalSeconds = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}`;

    books.forEach((book: Book) => {
      if (!book.sessions || book.sessions.length === 0) return;
      book.sessions.forEach((session: ReadingSession) => {
        const sessionDate = dayjs(session.startTime).format('YYYY-MM');
        if (sessionDate === monthStart) {
          totalSeconds += session.duration || 0;
        }
      });
    });

    return Math.round((totalSeconds / 3600) * 10) / 10;
  }, [books, currentDate.getFullYear(), currentDate.getMonth()]);

  const booksByDayMap = useMemo(() => {
    const map = new Map<string, Book[]>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const dayBooks = books.filter((book: Book) => {
        if (viewMode === 'sessions') {
          if (!book.sessions || book.sessions.length === 0) return false;
          return book.sessions.some((session: ReadingSession) => {
            return dayjs(session.startTime).format('YYYY-MM-DD') === dayStr;
          });
        } else {
          const activePhases = getActiveReadingPhases(book);
          return activePhases.some((phase: { startDate: string; endDate: string }) =>
            dayStr >= phase.startDate && dayStr <= phase.endDate
          );
        }
      });

      map.set(dayStr, dayBooks);
    }

    return map;
  }, [books, viewMode, currentDate.getFullYear(), currentDate.getMonth()]);

  const getBooksForDay = useCallback((day: Date): Book[] => {
    return booksByDayMap.get(toLocalISOString(day)) || [];
  }, [booksByDayMap]);

  const getBooksToStart = () => {
    return books.filter((book: Book) => book.status === BookStatus.WANT_TO_READ);
  };

  const handleDayContextMenu = (e: React.MouseEvent, day: Date) => {
    e.preventDefault();
    setSelectedDate(day);
    setBookSearchTerm('');
    setIsBookSelectionModalOpen(true);
  };

  const handleBookSelect = (book: Book) => {
    if (selectedDate) {
      const dateStr = toLocalISOString(selectedDate);
      onStartReading(book.id, dateStr);
      setIsBookSelectionModalOpen(false);
      setSelectedDate(null);
      setBookSearchTerm('');
    }
  };

  const getFilteredBooksToStart = () => {
    const booksToStart = getBooksToStart();
    if (!bookSearchTerm.trim()) {
      return booksToStart;
    }
    const searchLower = bookSearchTerm.toLowerCase();
    return booksToStart.filter((book: Book) => 
      book.title.toLowerCase().includes(searchLower) || 
      book.author.toLowerCase().includes(searchLower)
    );
  };

  const weekDays = lang === 'ru' 
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Monthly statistics computations
  const booksReadInMonth = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return books.filter(book => {
      if (book.status !== BookStatus.READ || !book.endDate) return false;
      const end = dayjs(book.endDate);
      return end.year() === y && end.month() === m;
    }).length;
  }, [books, currentDate.getFullYear(), currentDate.getMonth()]);

  const { longestStreak, daysReadInMonth } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const datesWithSessions = new Set<string>();

    books.forEach(book => {
      book.sessions?.forEach(session => {
        const d = dayjs(session.startTime);
        if (d.year() === y && d.month() === m) {
          datesWithSessions.add(d.format('YYYY-MM-DD'));
        }
      });
    });

    const sorted = Array.from(datesWithSessions).sort();
    let streak = sorted.length > 0 ? 1 : 0;
    let currentStreak = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prev = dayjs(sorted[i - 1]);
      const curr = dayjs(sorted[i]);
      if (curr.diff(prev, 'day') === 1) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return { longestStreak: streak, daysReadInMonth: sorted.length };
  }, [books, currentDate.getFullYear(), currentDate.getMonth()]);

  return (
    <div className="flex bg-page rounded-2xl shadow-md border border-default overflow-hidden">
      {/* Left: Calendar */}
      <div className="flex-1 flex flex-col bg-page overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-default flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-xl font-bold font-serif text-fg shrink-0">{t.readingCalendar}</h2>

          <div className="flex items-center gap-2 p-1 rounded-xl" style={{backgroundColor: 'var(--border)'}}>
              <button
                onClick={() => setViewMode('phases')}
                className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  viewMode === 'phases'
                    ? 'bg-accent text-accent-on'
                  : 'text-muted hover:bg-accent-soft'
                }`}
              >
                {lang === 'ru' ? 'Фазы' : 'Phases'}
              </button>
              <button
                onClick={() => setViewMode('sessions')}
                className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  viewMode === 'sessions'
                    ? 'bg-accent text-accent-on'
                    : 'text-muted hover:bg-accent-soft'
                }`}
              >
                {lang === 'ru' ? 'Сессии' : 'Sessions'}
              </button>
            </div>

          {/* Month Navigation + Phases / Sessions Toggle + Today */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Left Arrow Button */}
            <button 
              onClick={() => changeMonth(-1)} 
              className="p-1.5 bg-page border border-default hover:bg-accent-soft rounded-lg transition-colors"
            >
              <ChevronLeft size={18} className="text-muted" />
            </button>

            {/* Month and Year */}
            <button className="p-1 bg-page border border-default hover:bg-accent-soft rounded-lg transition-colors font-bold text-fg min-w-[130px] text-center capitalize text-sm">
              {monthName} {year}
            </button>

            {/* Right Arrow Button */}
            <button 
              onClick={() => changeMonth(1)} 
              className="p-1.5 bg-page border border-default hover:bg-accent-soft rounded-lg transition-colors"
            >
              <ChevronRight size={18} className="text-muted" />
            </button>

            

            <button
              onClick={() => setCurrentDate(new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-page border border-default hover:bg-accent-soft rounded-lg transition-colors text-sm font-medium text-muted"
            >
              <CalendarDays size={16} />
              {t.today}
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-page border-b border-default">
          {weekDays.map((day: string) => (
            <div key={day} className="py-2 text-center text-xs font-bold text-muted uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - cells in light olive */}
        <div className="grid grid-cols-7 auto-rows-[130px] sm:auto-rows-[160px] flex-1">
          {daysInMonth.map((day: Date | null, idx: number) => {
            if (!day) return (
              <div key={`empty-${idx}`} className="bg-surface border-r border-b border-default" />
            );

            const booksToday = getBooksForDay(day);
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <div 
                key={day.toISOString()} 
                className={`relative border-r border-b border-default p-1 group hover:border-accent hover:border-[2px] hover:z-10 transition-colors cursor-pointer bg-surface ${
                  isToday ? 'ring-1 ring-[var(--accent)] ring-inset' : ''
                }`}
                onContextMenu={(e: React.MouseEvent) => handleDayContextMenu(e, day)}
                title={lang === 'ru' ? 'Правый клик для начала чтения книги' : 'Right click to start reading a book'}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`z-10 w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full 'text-muted'`}>
                    {day.getDate()}
                  </span>

                  {getDailyHours(day) > 0 && (
                    <div className="bg-accent text-accent-on rounded px-1.5 py-0.5 flex items-center justify-center text-[10px] font-bold whitespace-nowrap">
                      {getDailyHours(day)}h
                    </div>
                  )}
                </div>

                {/* Book covers stack */}
                <div className="mt-0.5 relative h-full flex flex-col items-start justify-center w-full pb-8">
                  {booksToday.slice(0, 4).length > 2 ? (
                    <div className="relative w-full flex items-start justify-center" style={{ height: '80px', marginTop: '-20px' }}>
                      {booksToday.slice(0, 4).map((book: Book, idx: number) => (
                        <div 
                          key={book.id} 
                          className="absolute group/cover aspect-[2/3] w-[45px] shadow-md rounded"
                          style={{
                            zIndex: idx,
                            transform: `translateY(${idx * 8}px) translateX(${(idx - (Math.min(booksToday.length, 4) - 1) / 2) * 8}px)`,
                          }}
                        >
                          <img 
                            src={book.coverUrl} 
                            className="w-full h-full object-cover rounded"
                            alt={book.title}
                            onError={handleCoverError}
                          />
                          <div className="absolute inset-0 bg-black/80 text-[7px] text-white p-0.5 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-center font-bold rounded">
                            {book.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 justify-center w-full">
                      {booksToday.slice(0, 4).map((book: Book) => (
                        <div key={book.id} className="relative group/cover w-[calc(50%-2px)] aspect-[2/3] max-w-[45px]">
                          <img 
                            src={book.coverUrl} 
                            className="w-full h-full object-cover rounded shadow-sm"
                            alt={book.title}
                            onError={handleCoverError}
                          />
                          <div className="absolute inset-0 bg-black/80 text-[7px] text-white p-0.5 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-center font-bold">
                            {book.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px" style={{backgroundColor: 'var(--border)'}}></div>

      {/* Right: Statistics */}
      <div className="w-[280px] shrink-0 bg-page overflow-auto flex flex-col">
        <div className="p-4 border-b border-default">
          <h3 className="text-base font-bold font-serif text-fg">
            {t.statisticsFor} {monthName}
          </h3>
        </div>
        <div className="p-4 space-y-3 flex-1">
          <div className="flex items-center gap-3 bg-surface border border-default rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <Clock size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{t.hoursRead}</div>
              <div className="text-lg font-bold text-fg">{monthlyHours} <span className="text-sm font-normal text-muted">ч</span></div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface border border-default rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{t.booksRead}</div>
              <div className="text-lg font-bold text-fg">{booksReadInMonth}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface border border-default rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <Flame size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{t.longestStreak}</div>
              <div className="text-lg font-bold text-fg">{longestStreak} <span className="text-sm font-normal text-muted">{lang === 'ru' ? 'дн.' : 'days'}</span></div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface border border-default rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">{t.daysRead}</div>
              <div className="text-lg font-bold text-fg">{daysReadInMonth} <span className="text-sm font-normal text-muted">{lang === 'ru' ? 'дн.' : 'days'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for book selection */}
      {isBookSelectionModalOpen && selectedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{backgroundColor: 'color-mix(in srgb, var(--fg) 60%, transparent)'}}
          onClick={() => {
            setIsBookSelectionModalOpen(false);
            setSelectedDate(null);
          }}
        >
          <div 
            className="bg-surface rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold font-serif text-fg">
                {t.selectBookToStart}
              </h2>
              <button 
                onClick={() => {
                  setIsBookSelectionModalOpen(false);
                  setSelectedDate(null);
                }} 
                className="p-2 hover:bg-accent-soft rounded-full text-muted"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="text-sm text-muted mb-4">
                {lang === 'ru' 
                  ? `Выберите книгу для начала чтения ${selectedDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}`
                  : `Select a book to start reading on ${selectedDate.toLocaleDateString('en-US')}`
                }
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input 
                  type="text" 
                  placeholder={lang === 'ru' ? 'Поиск по названию/автору...' : 'Search by title/author...'}
                  value={bookSearchTerm}
                  onChange={(e) => setBookSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface rounded-lg focus:outline-none text-sm border"
                  style={{borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)'}}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 30%, transparent)'; e.currentTarget.style.boxShadow = '' }}
                  autoFocus
                />
              </div>

              {getBooksToStart().length === 0 ? (
                <div className="text-center py-8 text-muted">
                  {t.noBooksToStart}
                </div>
              ) : getFilteredBooksToStart().length === 0 ? (
                <div className="text-center py-8 text-muted">
                  {lang === 'ru' ? 'Книги не найдены' : 'No books found'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {getFilteredBooksToStart().map((book: Book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-page border border-default hover:border-accent transition-colors text-left"
                    >
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded shadow-md border border-default"
                        onError={handleCoverError}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-fg truncate">{book.title}</h3>
                          {book.isPartOfSeries && (
                            <Link size={14} className="text-accent flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted truncate">{book.author}</p>
                        {book.year && (
                          <p className="text-xs text-muted mt-1">{book.year}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
