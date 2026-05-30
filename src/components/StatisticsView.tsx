
import React, { useState, useEffect, useRef } from 'react';
import { Book, BookStatus } from '../types';
import { translations, formatHoursText } from '../utils/translations';
import { calculateDaysDifference, calculateBookTotalHours } from '../utils/dateUtils';
import GitHubCalendar from './GitHubCalendar';
import {
  BookOpen,
  TrendingUp,
  Star,
  Clock,
  Award,
  AlertCircle,
  User,
  Link,
  Hourglass,
  ListTodo
} from 'lucide-react';
import { ALL_ACHIEVEMENTS, getUnlockedAchievementIds } from '../utils/achievements';
import achievement1Png from '../assets/achivements/1.png';
import achievement2Png from '../assets/achivements/2.png';
import achievement3Png from '../assets/achivements/3.png';
import achievement4Png from '../assets/achivements/4.png';
import achievement5Png from '../assets/achivements/5.png';
import achievement6Png from '../assets/achivements/6.png';
import achievement7Png from '../assets/achivements/7.png';
import achievement8Png from '../assets/achivements/8.png';
import achievement9Png from '../assets/achivements/9.png';
import achievement10Png from '../assets/achivements/10.png';

interface StatisticsViewProps {
  books: Book[];
  lang: 'en' | 'ru';
}

interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
  achievements?: string[];
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ books, lang }) => {
  const t = translations[lang];
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Load user profile from SQLite via IPC, fallback to localStorage
    const loadProfile = async () => {
      try {
        if (window.electronAPI?.db) {
          const savedProfile = await window.electronAPI.db.getUserProfile();
          if (savedProfile && (savedProfile.nickname || savedProfile.photoUrl)) {
            setProfile(savedProfile);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to load profile from SQLite", e);
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      }
    };
    loadProfile();
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

  // Donut chart: процент прочитанных книг
  const percentage = totalBooks > 0 ? Math.round((readCount / totalBooks) * 100) : 0;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Гистограмма: часы чтения по месяцам (последние 6 месяцев)
  const monthNames = lang === 'ru'
    ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyHours = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    let seconds = 0;
    books.forEach(book => {
      book.sessions?.forEach(s => {
        const sd = new Date(s.startTime);
        if (sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear()) {
          seconds += s.duration || 0;
        }
      });
    });
    return {
      shortLabel: monthNames[d.getMonth()],
      hours: Math.round((seconds / 3600) * 10) / 10,
    };
  });
  const maxMonthlyHours = Math.max(...monthlyHours.map(m => m.hours), 1);

  // Достижения
  const totalReadSeconds = books.reduce((sum, book) =>
    sum + (book.sessions?.reduce((s, session) => s + (session.duration || 0), 0) || 0), 0);
  const totalReadHours = totalReadSeconds / 3600;
  const unlockedIds = new Set(getUnlockedAchievementIds(books));
  const achievementsList = ALL_ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: unlockedIds.has(ach.id),
  }));

  return (
    <div className="space-y-6">
      {/* Profile Section with Stats */}
      <div className="bg-gradient-to-r from-[#6B9071] to-[#59785E] rounded-2xl p-8 shadow-lg border border-[#4A6B50]">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {profile?.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={50} className="text-slate-400" />
            )}
          </div>

          {/* Name */}
          <h2 className="text-2xl font-bold text-white mt-4">
            {profile?.nickname || (lang === 'ru' ? 'Читатель' : 'Reader')}
          </h2>

          {/* 5 stats — без подложек */}
          <div className="grid grid-cols-5 gap-6 w-full mt-6">
            <div className="text-center">
              <BookOpen className="text-white/70 mx-auto mb-1" size={18} />
              <p className="text-xs text-white/50 uppercase tracking-wider">{t.totalBooks}</p>
              <p className="text-2xl font-bold text-white mt-1">{totalBooks}</p>
            </div>
            <div className="text-center">
              <TrendingUp className="text-white/70 mx-auto mb-1" size={18} />
              <p className="text-xs text-white/50 uppercase tracking-wider">{t.reading}</p>
              <p className="text-2xl font-bold text-white mt-1">{readingCount}</p>
            </div>
            <div className="text-center">
              <Award className="text-white/70 mx-auto mb-1" size={18} />
              <p className="text-xs text-white/50 uppercase tracking-wider">{t.read}</p>
              <p className="text-2xl font-bold text-white mt-1">{readCount}</p>
            </div>
            <div className="text-center">
              <Hourglass className="text-white/70 mx-auto mb-1" size={18} />
              <p className="text-xs text-white/50 uppercase tracking-wider">{t.totalHours}</p>
              <p className="text-2xl font-bold text-white mt-1">{Math.round(totalReadHours)}</p>
            </div>
            <div className="text-center">
              <ListTodo className="text-white/70 mx-auto mb-1" size={18} />
              <p className="text-xs text-white/50 uppercase tracking-wider">{t.toRead}</p>
              <p className="text-2xl font-bold text-white mt-1">{toReadCount}</p>
            </div>
          </div>
        </div>
      </div>

      {totalBooks > 0 && (
        <>
      <h2 className="text-2xl font-bold text-[#1E2920]">{lang === 'ru' ? 'Статистика' : 'Statistics'}</h2>

      {/* Круговой прогресс и гистограмма */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* Donut — прогресс чтения */}
        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
          <h3 className="text-lg font-semibold text-[#1E2920] mb-4">{t.readProgress}</h3>
          <div className="flex items-center gap-8">
            <div className="relative flex-shrink-0">
              <svg width={160} height={160} viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="66" fill="none" stroke="#D6E1D8" strokeWidth={14} />
                <circle
                  cx="80" cy="80" r="66"
                  fill="none" stroke="#6B9071" strokeWidth={14}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                  className="transition-all duration-500"
                />
                <text
                  x="80" y="80"
                  textAnchor="middle" dominantBaseline="central"
                  fill="#6B9071" fontSize="32" fontWeight="bold" fontFamily="sans-serif"
                >
                  {percentage}%
                </text>
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1E2920]">{readCount} <span className="text-lg font-normal text-slate-500">{t.booksReadOf}</span> {totalBooks}</p>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'ru' ? 'прочитанных книг' : 'books read'}
              </p>
            </div>
          </div>
        </div>

        {/* Гистограмма — время чтения по месяцам */}
        <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
          <h3 className="text-lg font-semibold text-[#1E2920] mb-4">{t.readingTimeChart}</h3>
          {monthlyHours.some(m => m.hours > 0) ? (
            <div className="relative">
              <svg width="100%" height="190" viewBox="0 0 420 190" className="overflow-visible">
                {/* Y-axis gridlines */}
                {[0, 1, 2].map(i => {
                  const y = 160 - (i / 2) * 135;
                  return (
                    <g key={i}>
                      <line x1="45" y1={y} x2="400" y2={y} stroke="#D6E1D8" strokeWidth="1" />
                      <text x="40" y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
                        {Math.round((maxMonthlyHours / 2) * i)}
                      </text>
                    </g>
                  );
                })}
                {/* Bars */}
                {monthlyHours.map((m, i) => {
                  const barHeight = maxMonthlyHours > 0 ? (m.hours / maxMonthlyHours) * 135 : 0;
                  const x = 50 + i * 58;
                  const y = 160 - barHeight;
                  return (
                    <g key={i}>
                      <rect
                        x={x} y={y} width={40} height={barHeight}
                        rx={4} ry={4}
                        fill="#6B9071"
                        className="transition-all duration-500"
                      />
                      <text
                        x={x + 20} y={177}
                        textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif"
                      >
                        {m.shortLabel}
                      </text>
                    </g>
                  );
                })}
                {/* Baseline */}
                <line x1="45" y1="160" x2="400" y2="160" stroke="#D6E1D8" strokeWidth="2" />
              </svg>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Clock size={18} />
              <p className="text-sm">{t.noBooksWithDates}</p>
            </div>
          )}
        </div>
      </div>

      {/* Календарь активности — на всю ширину */}
      <GitHubCalendar books={books} lang={lang} />

      {/* Достижения + Средняя скорость прочтения */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 min-w-0 min-h-[260px]">
        {/* Достижения */}
        <div className="h-full bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB] relative min-w-0">
          <h3 className="text-lg font-semibold text-[#1E2920] mb-4 flex items-center gap-3">
            {lang === 'ru' ? 'Достижения' : 'Achievements'}
            <span className="text-sm font-medium text-[#4A6B50] bg-[#C8D6CB]/50 px-2.5 py-0.5 rounded-full">
              {unlockedIds.size} {lang === 'ru' ? 'из' : 'of'} {ALL_ACHIEVEMENTS.length}
            </span>
          </h3>

          <div className="relative min-w-0 pt-4">
            <button
              onClick={() => {
                const el = document.getElementById('ach-scroll');
                if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-[#4A6B50] transition-colors -ml-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <div id="ach-scroll" className="overflow-hidden">
              <div className="flex gap-4 min-w-0">
                {[...achievementsList].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0)).map(ach => (
                  <div
                    key={ach.id}
                    className="flex flex-col items-center flex-shrink-0 w-[160px]"
                  >
                    {(() => {
                      const images = { '1': achievement1Png, '2': achievement2Png, '3': achievement3Png, '4': achievement4Png, '5': achievement5Png, '6': achievement6Png, '7': achievement7Png, '8': achievement8Png, '9': achievement9Png, '10': achievement10Png } as Record<string, string | undefined>;
                      const imgSrc = images[ach.id];
                      return imgSrc ? (
                        ach.unlocked ? (
                          <div className="w-20 h-20 rounded-full mb-3 overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] shadow-lg shadow-amber-500/20">
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#F0F4F1]">
                              <img src={imgSrc} alt={ach.title[lang]} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full mb-3 overflow-hidden bg-slate-100 border-2 border-slate-200">
                            <img src={imgSrc} alt={ach.title[lang]} className="w-full h-full object-cover opacity-40 grayscale" />
                          </div>
                        )
                      ) : (
                        ach.unlocked ? (
                          <div className="w-20 h-20 rounded-full mb-3 bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] shadow-lg shadow-amber-500/20">
                            <div className="w-full h-full rounded-full bg-[#F0F4F1]" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full mb-3 bg-slate-100 border-2 border-slate-200" />
                        )
                      );
                    })()}
                    <h4 className={`text-sm font-semibold text-center mb-1 leading-tight ${ach.unlocked ? 'text-[#1E2920]' : 'text-slate-400'}`}>
                      {ach.title[lang]}
                    </h4>
                    <p className={`text-xs text-center leading-tight ${ach.unlocked ? 'text-slate-500' : 'text-slate-300'}`}>
                      {ach.desc[lang]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('ach-scroll');
                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-[#4A6B50] transition-colors -mr-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        {/* Средняя скорость прочтения */}
        <div className="h-full bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-[#6B9071]" size={24} />
            <h3 className="text-lg font-semibold text-[#1E2920]">{t.averageReadingSpeed}</h3>
          </div>
          {booksWithHours.length > 0 ? (
            <div className="pt-8">
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
            <div className="flex items-center gap-2 text-slate-400 pt-8">
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
            <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
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
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-[#1E2920]">{book.title}</p>
                        {book.isPartOfSeries && (
                          <Link size={14} className="text-[#6B9071] flex-shrink-0" />
                        )}
                      </div>
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
            <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
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
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-[#1E2920]">{book.title}</p>
                        {book.isPartOfSeries && (
                          <Link size={14} className="text-[#6B9071] flex-shrink-0" />
                        )}
                      </div>
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
        </>
      )}
    </div>
  );
};

export default StatisticsView;

