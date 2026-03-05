
import React, { useState, useMemo } from 'react';
import { Book, BookStatus } from '../types';
import { ChevronLeft, ChevronRight, HelpCircle, X, Search } from 'lucide-react';
import { translations } from '../App';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';

interface CalendarViewProps {
  books: Book[];
  lang: 'en' | 'ru';
  onStartReading: (bookId: string, startDate: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ books, lang, onStartReading }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBookSelectionModalOpen, setIsBookSelectionModalOpen] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const t = translations[lang];

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill leading empty days
    const firstDayIndex = date.getDay();
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

  /**
   * Helper to get local date string YYYY-MM-DD to match the format stored in books
   */
  const toLocalISOString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getBooksForDay = (day: Date) => {
    const dayStr = toLocalISOString(day);
    const todayStr = toLocalISOString(new Date());
    
    return books.filter(book => {
      if (!book.startDate) return false;
      
      const start = book.startDate;
      // If no end date, we assume the book is still being read up to today
      const end = book.endDate || todayStr;
      
      return dayStr >= start && dayStr <= end;
    });
  };

  // Получаем список книг со статусом "Буду читать"
  const getBooksToStart = () => {
    return books.filter(book => book.status === BookStatus.WANT_TO_READ);
  };

  // Обработчик правого клика на день
  const handleDayContextMenu = (e: React.MouseEvent, day: Date) => {
    e.preventDefault();
    setSelectedDate(day);
    setBookSearchTerm('');
    setIsBookSelectionModalOpen(true);
  };

  // Обработчик выбора книги для начала чтения
  const handleBookSelect = (book: Book) => {
    if (selectedDate) {
      const dateStr = toLocalISOString(selectedDate);
      onStartReading(book.id, dateStr);
      setIsBookSelectionModalOpen(false);
      setSelectedDate(null);
      setBookSearchTerm('');
    }
  };

  // Фильтруем книги для начала чтения по поисковому запросу
  const getFilteredBooksToStart = () => {
    const booksToStart = getBooksToStart();
    if (!bookSearchTerm.trim()) {
      return booksToStart;
    }
    const searchLower = bookSearchTerm.toLowerCase();
    return booksToStart.filter(book => 
      book.title.toLowerCase().includes(searchLower) || 
      book.author.toLowerCase().includes(searchLower)
    );
  };

  const weekDays = lang === 'ru' 
    ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[#F0F4F1] rounded-2xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-6 border-b flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold font-serif text-[#1E2920]">{t.readingCalendar}</h2>
            <div className="group relative">
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#BCCDBE] p-1 rounded-xl">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-[#87A68C] rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-700 min-w-[140px] text-center capitalize">
              {monthName} {year}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-[#87A68C] rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">{lang === 'ru' ? 'Перейти к дате:' : 'Go to date:'}</label>
          <DateInput
            value={new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())}
            onChange={(date) => {
              if (date) {
                setCurrentDate(new Date(dayjs(date).format('YYYY-MM-DD')));
              }
            }}
            placeholder={lang === 'ru' ? 'Выберите дату' : 'Select date'}
            format="DD.MM.YYYY"
            valueFormat="YYYY-MM-DD"
            clearable={false}
            className="w-40"
          />
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#5A7A60] transition-colors text-sm font-medium"
          >
            {lang === 'ru' ? 'Сегодня' : 'Today'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-[#BCCDBE]">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[140px] sm:auto-rows-[180px]">
        {daysInMonth.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="bg-slate-50/50 border-r border-b border-slate-100" />;
          
          const booksToday = getBooksForDay(day);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div 
              key={day.toISOString()} 
              className={`relative border-r border-b border-slate-100 p-1 group hover:bg-[#87A68C]/20 transition-colors cursor-pointer ${isToday ? 'bg-[#87A68C]/40' : ''}`}
              onContextMenu={(e) => handleDayContextMenu(e, day)}
              title={lang === 'ru' ? 'Правый клик для начала чтения книги' : 'Right click to start reading a book'}
            >
              <span className={`absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${
                isToday ? 'bg-[#6B9071] text-white' : 'text-slate-400'
              }`}>
                {day.getDate()}
              </span>
              
              {/* Стопка обложек со смещением */}
              <div className="mt-7 relative h-full flex flex-col items-start justify-center w-full">
                {booksToday.slice(0, 4).length > 2 ? (
                  // Для более чем 2 обложек - стопка со смещением, поднята вверх
                  <div className="relative w-full flex items-start justify-center" style={{ height: '115px', marginTop: '-30px' }}>
                    {booksToday.slice(0, 4).map((book, idx) => (
                      <div 
                        key={book.id} 
                        className="absolute group/cover aspect-[2/3] w-[60px] shadow-md border border-slate-200 rounded"
                        style={{
                          zIndex: idx,
                          transform: `translateY(${idx * 10}px) translateX(${(idx - (Math.min(booksToday.length, 4) - 1) / 2) * 10}px)`,
                        }}
                      >
                        <img 
                          src={book.coverUrl} 
                          className="w-full h-full object-cover rounded"
                          alt={book.title}
                        />
                        <div className="absolute inset-0 bg-black/80 text-[8px] text-white p-1 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-center font-bold rounded">
                          {book.title}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Для 2 и менее обложек - обычное отображение в ряд
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {booksToday.slice(0, 4).map(book => (
                      <div key={book.id} className="relative group/cover w-[calc(50%-4px)] aspect-[2/3] max-w-[60px]">
                        <img 
                          src={book.coverUrl} 
                          className="w-full h-full object-cover rounded shadow-md border border-slate-200"
                          alt={book.title}
                        />
                        <div className="absolute inset-0 bg-black/80 text-[8px] text-white p-1 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-center font-bold">
                          {book.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {booksToday.length > 4 && (
                  <div className="w-full text-center text-[10px] font-bold text-[#6B9071] mt-1">
                    +{booksToday.length - 4} {lang === 'ru' ? 'еще' : 'more'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно для выбора книги */}
      {isBookSelectionModalOpen && selectedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => {
            setIsBookSelectionModalOpen(false);
            setSelectedDate(null);
          }}
        >
          <div 
            className="bg-[#F0F4F1] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#F0F4F1] border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold font-serif text-[#1E2920]">
                {t.selectBookToStart}
              </h2>
              <button 
                onClick={() => {
                  setIsBookSelectionModalOpen(false);
                  setSelectedDate(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="text-sm text-slate-600 mb-4">
                {lang === 'ru' 
                  ? `Выберите книгу для начала чтения ${selectedDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}`
                  : `Select a book to start reading on ${selectedDate.toLocaleDateString('en-US')}`
                }
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder={lang === 'ru' ? 'Поиск по названию/автору...' : 'Search by title/author...'}
                  value={bookSearchTerm}
                  onChange={(e) => setBookSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FFFFFF] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b9071] text-sm"
                  autoFocus
                />
              </div>

              {getBooksToStart().length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {t.noBooksToStart}
                </div>
              ) : getFilteredBooksToStart().length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {lang === 'ru' ? 'Книги не найдены' : 'No books found'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {getFilteredBooksToStart().map(book => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F0F4F1] border border-slate-200 hover:border-[#6B9071] transition-colors text-left"
                    >
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded shadow-md border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#1E2920] truncate">{book.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{book.author}</p>
                        {book.year && (
                          <p className="text-xs text-slate-400 mt-1">{book.year}</p>
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
