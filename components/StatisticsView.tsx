
import React from 'react';
import { Book, BookStatus } from '../types';
import { translations } from '../App';
import { calculateDaysDifference } from '../utils/dateUtils';
import { 
  BookOpen, 
  TrendingUp, 
  Star, 
  Clock, 
  Library,
  Award,
  AlertCircle
} from 'lucide-react';

interface StatisticsViewProps {
  books: Book[];
  lang: 'en' | 'ru';
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ books, lang }) => {
  const t = translations[lang];

  // Общее количество книг
  const totalBooks = books.length;

  // Количество книг по статусам
  const readingCount = books.filter(b => b.status === BookStatus.READING).length;
  const readCount = books.filter(b => b.status === BookStatus.READ).length;
  const toReadCount = books.filter(b => b.status === BookStatus.WANT_TO_READ).length;

  // Книги с максимальной оценкой
  const maxRating = books.length > 0 ? Math.max(...books.map(b => b.rating)) : 0;
  const maxRatingBooks = books.filter(b => b.rating === maxRating);

  // Книги с минимальной оценкой
  const minRating = books.length > 0 ? Math.min(...books.map(b => b.rating)) : 0;
  const minRatingBooks = books.filter(b => b.rating === minRating);

  // Средняя скорость прочтения (только для книг с датами начала)
  const booksWithDates = books.filter(b => b.startDate && b.startDate.trim() !== '');
  const totalDays = booksWithDates.reduce((sum, book) => {
    const days = calculateDaysDifference(book.startDate, book.endDate);
    return sum + (days || 0);
  }, 0);
  const averageDays = booksWithDates.length > 0 
    ? Math.round((totalDays / booksWithDates.length) * 10) / 10 
    : 0;

  const formatDaysText = (days: number, lang: 'en' | 'ru'): string => {
    if (lang === 'ru') {
      const lastDigit = Math.floor(days) % 10;
      const lastTwoDigits = Math.floor(days) % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return `${days} ${t.days}`;
      }
      if (lastDigit === 1) {
        return `${days} день`;
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `${days} дня`;
      }
      return `${days} ${t.days}`;
    } else {
      return days === 1 ? `${days} ${t.day}` : `${days} ${t.days}`;
    }
  };

  if (totalBooks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-100">
        <Library size={48} className="mb-4 opacity-20" />
        <p className="text-lg">{t.noBooks}</p>
        <p className="text-sm">{t.tryAdding}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">{t.statistics}</h2>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.totalBooks}</h3>
            <BookOpen className="text-indigo-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalBooks}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.reading}</h3>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-blue-600">{readingCount}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.read}</h3>
            <Award className="text-emerald-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{readCount}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.toRead}</h3>
            <BookOpen className="text-amber-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-amber-600">{toReadCount}</p>
        </div>
      </div>

      {/* Средняя скорость прочтения */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-indigo-600" size={24} />
          <h3 className="text-lg font-semibold text-slate-800">{t.averageReadingSpeed}</h3>
        </div>
        {booksWithDates.length > 0 ? (
          <div>
            <p className="text-3xl font-bold text-indigo-600 mb-2">
              {formatDaysText(averageDays, lang)}
            </p>
            <p className="text-sm text-slate-500">
              {t.averageReadingSpeedDesc} ({booksWithDates.length} {(() => {
                if (lang === 'ru') {
                  const count = booksWithDates.length;
                  const lastDigit = count % 10;
                  const lastTwoDigits = count % 100;
                  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                    return t.books;
                  }
                  if (lastDigit === 1) {
                    return t.book;
                  }
                  if (lastDigit >= 2 && lastDigit <= 4) {
                    return t.booksPlural;
                  }
                  return t.books;
                } else {
                  return booksWithDates.length === 1 ? t.book : t.books;
                }
              })()})
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <AlertCircle size={18} />
            <p className="text-sm">{t.noBooksWithDates}</p>
          </div>
        )}
      </div>

      {/* Книги с максимальной оценкой */}
      {maxRatingBooks.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-amber-500" size={24} fill="currentColor" />
            <h3 className="text-lg font-semibold text-slate-800">{t.highestRatedBooks}</h3>
          </div>
          <div className="space-y-2">
            {maxRatingBooks.map(book => (
              <div key={book.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{book.title}</p>
                  <p className="text-sm text-slate-500">{book.author}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={16} fill="currentColor" />
                  {book.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Книги с минимальной оценкой */}
      {minRatingBooks.length > 0 && maxRating !== minRating && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-slate-400" size={24} />
            <h3 className="text-lg font-semibold text-slate-800">{t.lowestRatedBooks}</h3>
          </div>
          <div className="space-y-2">
            {minRatingBooks.map(book => (
              <div key={book.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{book.title}</p>
                  <p className="text-sm text-slate-500">{book.author}</p>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-bold">
                  <Star size={16} />
                  {book.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsView;

