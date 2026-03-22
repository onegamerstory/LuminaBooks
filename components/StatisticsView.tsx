
import React, { useState, useEffect } from 'react';
import { Book, BookStatus } from '../types';
import { translations } from '../App';
import { calculateDaysDifference, calculateBookTotalHours } from '../utils/dateUtils';
import GitHubCalendar from './GitHubCalendar';
import { 
  BookOpen, 
  TrendingUp, 
  Star, 
  Clock, 
  Library,
  Award,
  AlertCircle,
  User
} from 'lucide-react';

interface StatisticsViewProps {
  books: Book[];
  lang: 'en' | 'ru';
}

interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ books, lang }) => {
  const t = translations[lang];
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Load user profile from localStorage
    const saved = localStorage.getItem('lumina_user_profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
  }, []);

  // Общее количество книг
  const totalBooks = books.length;

  // Количество книг по статусам
  const readingCount = books.filter(b => b.status === BookStatus.READING).length;
  const readCount = books.filter(b => b.status === BookStatus.READ).length;
  const toReadCount = books.filter(b => b.status === BookStatus.WANT_TO_READ).length;

  // Книги с максимальной оценкой (только прочитанные)
  const readBooks = books.filter(b => b.status === BookStatus.READ);
  const maxRating = readBooks.length > 0 ? Math.max(...readBooks.map(b => b.rating)) : 0;
  const maxRatingBooks = readBooks.filter(b => b.rating === maxRating);

  // Книги с минимальной оценкой (только прочитанные)
  const minRating = readBooks.length > 0 ? Math.min(...readBooks.map(b => b.rating)) : 0;
  const minRatingBooks = readBooks.filter(b => b.rating === minRating);

  // Средняя скорость прочтения (на основе часов из истории сессий или сохраненного значения)
  const booksWithHours = books.filter(b => calculateBookTotalHours(b) > 0);
  const totalHours = booksWithHours.reduce((sum, book) => {
    return sum + calculateBookTotalHours(book);
  }, 0);
  const averageHours = booksWithHours.length > 0 
    ? Math.round((totalHours / booksWithHours.length) * 10) / 10 
    : 0;

  const formatHoursText = (hours: number, lang: 'en' | 'ru'): string => {
    const roundedHours = Math.round(hours * 10) / 10;
    if (lang === 'ru') {
      const lastDigit = Math.floor(roundedHours) % 10;
      const lastTwoDigits = Math.floor(roundedHours) % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return `${roundedHours} часов`;
      }
      if (lastDigit === 1) {
        return `${roundedHours} час`;
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `${roundedHours} часа`;
      }
      return `${roundedHours} часов`;
    } else {
      return roundedHours === 1 ? `${roundedHours} hour` : `${roundedHours} hours`;
    }
  };

  if (totalBooks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#F0F4F1] rounded-2xl border-2 border-dashed border-slate-100">
        <Library size={48} className="mb-4 opacity-20" />
        <p className="text-lg">{t.noBooks}</p>
        <p className="text-sm">{t.tryAdding}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      {profile && (profile.nickname || profile.photoUrl) && (
        <div className="bg-gradient-to-r from-[#6B9071] to-[#59785E] rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {profile.photoUrl ? (
                  <img 
                    src={profile.photoUrl} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={60} className="text-slate-400" />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-grow">
              <h2 className="text-3xl font-bold text-white mb-2">
                {profile.nickname || (lang === 'ru' ? 'Читатель' : 'Reader')}
              </h2>
              <p className="text-white/80">
                {lang === 'ru' 
                  ? `Ты прочитал ${books.filter(b => b.status === BookStatus.READ).length} книг`
                  : `You've read ${books.filter(b => b.status === BookStatus.READ).length} books`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-[#1E2920]">{lang === 'ru' ? 'Статистика' : 'Statistics'}</h2>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.totalBooks}</h3>
            <BookOpen className="text-[#6B9071]" size={20} />
          </div>
          <p className="text-3xl font-bold text-[#6B9071]">{totalBooks}</p>
        </div>

        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.reading}</h3>
            <TrendingUp className="text-[#6B8A90]" size={20} />
          </div>
          <p className="text-3xl font-bold text-[#6B8A90]">{readingCount}</p>
        </div>

        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.read}</h3>
            <Award className="text-[#906B8A]" size={20} />
          </div>
          <p className="text-3xl font-bold text-[#906B8A]">{readCount}</p>
        </div>

        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">{t.toRead}</h3>
            <BookOpen className="text-[#B09F31]" size={20} />
          </div>
          <p className="text-3xl font-bold text-[#B09F31]">{toReadCount}</p>
        </div>
      </div>

      {/* Календарь активности и Средняя скорость прочтения */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Календарь активности */}
        <GitHubCalendar books={books} lang={lang} />

        {/* Средняя скорость прочтения */}
        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-[#6B9071]" size={24} />
            <h3 className="text-lg font-semibold text-[#1E2920]">{t.averageReadingSpeed}</h3>
          </div>
          {booksWithHours.length > 0 ? (
            <div>
              <p className="text-3xl font-bold text-[#6B9071] mb-2">
                {formatHoursText(averageHours, lang)}
              </p>
              <p className="text-sm text-slate-500">
                {t.averageReadingSpeedDesc} ({booksWithHours.length} {(() => {
                  if (lang === 'ru') {
                    const count = booksWithHours.length;
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
                    return booksWithHours.length === 1 ? t.book : t.books;
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
      </div>

      {/* Книги с максимальной и минимальной оценкой */}
      {(maxRatingBooks.length > 0 || (minRatingBooks.length > 0 && maxRating !== minRating)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Книги с максимальной оценкой */}
          {maxRatingBooks.length > 0 && (
            <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Star className="text-amber-500" size={24} fill="currentColor" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1E2920]">{t.highestRatedBooks}</h3>
                  <p className="text-sm text-slate-500">
                    {maxRatingBooks.length > 5 
                      ? `${lang === 'ru' ? 'Показаны первые 5 из' : 'Showing first 5 of'} ${maxRatingBooks.length}`
                      : `${maxRatingBooks.length} ${lang === 'ru' ? 'книг' : 'books'}`
                    }
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {maxRatingBooks.slice(0, 5).map(book => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#1E2920]">{book.title}</p>
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
            <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Star className="text-slate-400" size={24} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1E2920]">{t.lowestRatedBooks}</h3>
                  <p className="text-sm text-slate-500">
                    {minRatingBooks.length > 5 
                      ? `${lang === 'ru' ? 'Показаны первые 5 из' : 'Showing first 5 of'} ${minRatingBooks.length}`
                      : `${minRatingBooks.length} ${lang === 'ru' ? 'книг' : 'books'}`
                    }
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {minRatingBooks.slice(0, 5).map(book => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#1E2920]">{book.title}</p>
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
      )}
    </div>
  );
};

export default StatisticsView;

