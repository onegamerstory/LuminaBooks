
import React, { useState, useEffect } from 'react';
import { Book, BookStatus } from '../types';
import { translations, formatHoursText } from '../utils/translations';
import { calculateBookTotalHours } from '../utils/dateUtils';
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
  ListTodo,
  ChevronLeft,
  ChevronRight,
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

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-6)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--elev-raised)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-lg)',
  fontWeight: 600,
  color: 'var(--fg)',
  fontFamily: 'var(--font-display)',
};

const subtleBgStyle: React.CSSProperties = {
  backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-3)',
};

const StatisticsView: React.FC<StatisticsViewProps> = ({ books, lang }) => {
  const t = translations[lang];
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
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

  const totalBooks = books.length;
  const readingCount = books.filter(b => b.status === BookStatus.READING).length;
  const readCount = books.filter(b => b.status === BookStatus.READ).length;
  const toReadCount = books.filter(b => b.status === BookStatus.WANT_TO_READ).length;

  const readBooks = books.filter(b => b.status === BookStatus.READ);
  const maxRating = readBooks.length > 0 ? Math.max(...readBooks.map(b => b.rating)) : 0;
  const maxRatingBooks = readBooks.filter(b => b.rating === maxRating);
  const minRating = readBooks.length > 0 ? Math.min(...readBooks.map(b => b.rating)) : 0;
  const minRatingBooks = readBooks.filter(b => b.rating === minRating);

  const booksWithHours = books.filter(b => calculateBookTotalHours(b) > 0);
  const totalHours = booksWithHours.reduce((sum, book) => sum + calculateBookTotalHours(book), 0);
  const averageHours = booksWithHours.length > 0
    ? Math.round((totalHours / booksWithHours.length) * 10) / 10
    : 0;

  const percentage = totalBooks > 0 ? Math.round((readCount / totalBooks) * 100) : 0;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

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
    return { shortLabel: monthNames[d.getMonth()], hours: Math.round((seconds / 3600) * 10) / 10 };
  });
  const maxMonthlyHours = Math.max(...monthlyHours.map(m => m.hours), 1);

  const totalReadSeconds = books.reduce((sum, book) =>
    sum + (book.sessions?.reduce((s, session) => s + (session.duration || 0), 0) || 0), 0);
  const unlockedIds = new Set(getUnlockedAchievementIds(books));
  const achievementsList = ALL_ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: unlockedIds.has(ach.id) }));

  const [achIndex, setAchIndex] = useState(0);
  const maxAchIndex = Math.max(0, achievementsList.length - 3);

  const images: Record<string, string | undefined> = {
    '1': achievement1Png, '2': achievement2Png, '3': achievement3Png,
    '4': achievement4Png, '5': achievement5Png, '6': achievement6Png,
    '7': achievement7Png, '8': achievement8Png, '9': achievement9Png, '10': achievement10Png,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #4A6B50 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-10)',
          boxShadow: 'var(--elev-overlay)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: '50%',
              backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '3px solid var(--surface)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={44} style={{ color: 'var(--meta)' }} />
            )}
          </div>
          <h2 className="font-display" style={{ fontSize: 'var(--text-2xl)', color: 'var(--accent-on)', margin: 0 }}>
            {profile?.nickname || (lang === 'ru' ? 'Читатель' : 'Reader')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)', width: '100%', maxWidth: 600, marginTop: 'var(--space-2)' }}>
            {[
              { icon: BookOpen, label: t.totalBooks, value: totalBooks },
              { icon: TrendingUp, label: t.reading, value: readingCount },
              { icon: Award, label: t.read, value: readCount },
              { icon: Hourglass, label: t.totalHours, value: Math.round(totalReadSeconds / 3600) },
              { icon: ListTodo, label: t.toRead, value: toReadCount },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <stat.icon size={16} style={{ color: 'color-mix(in oklab, white 70%, transparent)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: 10, color: 'color-mix(in oklab, white 50%, transparent)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{stat.label}</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--accent-on)', margin: '2px 0 0' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalBooks > 0 && (
        <>
      <h2 className="font-display" style={{ fontSize: 'var(--text-2xl)', color: 'var(--fg)', marginBottom: 'var(--space-1)' }}>
        {lang === 'ru' ? 'Статистика' : 'Statistics'}
      </h2>

      {/* Donut + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]" style={{ gap: 'var(--space-6)' }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>{t.readProgress}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
            <div style={{ flexShrink: 0 }}>
              <svg width={150} height={150} viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="66" fill="none" stroke="var(--accent-soft)" strokeWidth={14} />
                <circle
                  cx="80" cy="80" r="66" fill="none"
                  stroke="var(--accent)" strokeWidth={14}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'all 0.5s' }}
                />
                <text x="80" y="80" textAnchor="middle" dominantBaseline="central" fill="var(--accent)" fontSize="32" fontWeight="bold" fontFamily="var(--font-body)">{percentage}%</text>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
                {readCount} <span style={{ fontSize: 'var(--text-base)', fontWeight: 400, color: 'var(--muted)' }}>{t.booksReadOf}</span> {totalBooks}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--meta)', marginTop: 'var(--space-1)' }}>
                {lang === 'ru' ? 'прочитанных книг' : 'books read'}
              </p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>{t.readingTimeChart}</h3>
          {monthlyHours.some(m => m.hours > 0) ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <svg width="100%" height="180" viewBox="0 0 420 180" style={{ overflow: 'visible' }}>
                {[0, 1, 2].map(i => {
                  const y = 150 - (i / 2) * 125;
                  return (
                    <g key={i}>
                      <line x1="45" y1={y} x2="400" y2={y} stroke="var(--border)" strokeWidth="1" />
                      <text x="40" y={y + 4} textAnchor="end" fill="var(--meta)" fontSize="11" fontFamily="var(--font-mono)">{Math.round((maxMonthlyHours / 2) * i)}</text>
                    </g>
                  );
                })}
                {monthlyHours.map((m, i) => {
                  const barHeight = maxMonthlyHours > 0 ? (m.hours / maxMonthlyHours) * 125 : 0;
                  const x = 50 + i * 58;
                  const y = 150 - barHeight;
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={40} height={barHeight} rx={4} ry={4} fill="var(--accent)" style={{ transition: 'all 0.5s' }} />
                      <text x={x + 20} y={167} textAnchor="middle" fill="var(--meta)" fontSize="11" fontFamily="var(--font-body)">{m.shortLabel}</text>
                    </g>
                  );
                })}
                <line x1="45" y1="150" x2="400" y2="150" stroke="var(--border)" strokeWidth="2" />
              </svg>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--meta)', padding: 'var(--space-8)', justifyContent: 'center' }}>
              <Clock size={18} />
              <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{t.noBooksWithDates}</p>
            </div>
          )}
        </div>
      </div>

      {/* GitHub-style calendar */}
      <GitHubCalendar books={books} lang={lang} />

      {/* Achievements + Speed */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]" style={{ gap: 'var(--space-6)', minHeight: 260 }}>
        <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ ...cardTitleStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {lang === 'ru' ? 'Достижения' : 'Achievements'}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--accent)', backgroundColor: 'var(--accent-soft)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-pill)' }}>
              {unlockedIds.size} {lang === 'ru' ? 'из' : 'of'} {ALL_ACHIEVEMENTS.length}
            </span>
          </h3>

          <div style={{ position: 'relative', marginTop: 'var(--space-4)' }}>
            <button
              onClick={() => setAchIndex(Math.max(0, achIndex - 1))}
              disabled={achIndex === 0}
              style={{
                position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)', boxShadow: 'var(--elev-raised)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', cursor: achIndex === 0 ? 'default' : 'pointer',
                opacity: achIndex === 0 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <div style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', gap: 'var(--space-4)', transition: 'transform 0.3s ease',
                transform: `translateX(-${achIndex * 180}px)`,
              }}>
                {[...achievementsList].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0)).map(ach => {
                  const imgSrc = images[ach.id];
                  return (
                    <div key={ach.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 160 }}>
                      {imgSrc ? (
                        ach.unlocked ? (
                          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', marginBottom: 'var(--space-3)', background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: 2, boxShadow: '0 4px 16px rgba(245,158,11,0.2)' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
                              <img src={imgSrc} alt={ach.title[lang]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', marginBottom: 'var(--space-3)', backgroundColor: 'color-mix(in oklab, var(--accent) 10%, transparent)', border: '2px solid var(--border)' }}>
                            <img src={imgSrc} alt={ach.title[lang]} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'grayscale(1)' }} />
                          </div>
                        )
                      ) : ach.unlocked ? (
                        <div style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 'var(--space-3)', background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: 2 }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--surface)' }} />
                        </div>
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 'var(--space-3)', backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)', border: '2px solid var(--border)' }} />
                      )}
                      <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'center', marginBottom: 4, lineHeight: 1.3, color: ach.unlocked ? 'var(--fg)' : 'var(--meta)', margin: 0 }}>{ach.title[lang]}</h4>
                      <p style={{ fontSize: 'var(--text-xs)', textAlign: 'center', lineHeight: 1.3, color: ach.unlocked ? 'var(--muted)' : 'var(--border)', margin: '2px 0 0' }}>{ach.desc[lang]}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setAchIndex(Math.min(maxAchIndex, achIndex + 1))}
              disabled={achIndex >= maxAchIndex}
              style={{
                position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)', boxShadow: 'var(--elev-raised)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', cursor: achIndex >= maxAchIndex ? 'default' : 'pointer',
                opacity: achIndex >= maxAchIndex ? 0.3 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Clock size={22} style={{ color: 'var(--accent)' }} />
            <h3 style={cardTitleStyle}>{t.averageReadingSpeed}</h3>
          </div>
          {booksWithHours.length > 0 ? (
            <div style={{ paddingTop: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent)', marginBottom: 'var(--space-2)' }}>
                {formatHoursText(averageHours, lang)}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                {t.averageReadingSpeedDesc} ({booksWithHours.length} {(() => {
                  if (lang === 'ru') {
                    const count = booksWithHours.length;
                    const lastDigit = count % 10;
                    const lastTwoDigits = count % 100;
                    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return t.books;
                    if (lastDigit === 1) return t.book;
                    if (lastDigit >= 2 && lastDigit <= 4) return t.booksPlural;
                    return t.books;
                  } else {
                    return booksWithHours.length === 1 ? t.book : t.books;
                  }
                })()})
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--meta)', paddingTop: 'var(--space-4)' }}>
              <AlertCircle size={18} />
              <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{t.noBooksWithDates}</p>
            </div>
          )}
        </div>
      </div>

      {/* Highest & Lowest rated */}
      {(maxRatingBooks.length > 0 || (minRatingBooks.length > 0 && maxRating !== minRating)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-6)' }}>
          {maxRatingBooks.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <Star size={22} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                <div style={{ flex: 1 }}>
                  <h3 style={cardTitleStyle}>{t.highestRatedBooks}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                    {maxRatingBooks.length > 5
                      ? `${lang === 'ru' ? 'Показаны первые 5 из' : 'Showing first 5 of'} ${maxRatingBooks.length}`
                      : `${maxRatingBooks.length} ${lang === 'ru' ? 'книг' : 'books'}`
                    }
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {maxRatingBooks.slice(0, 5).map(book => (
                  <div key={book.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', backgroundColor: 'color-mix(in oklab, #F59E0B 8%, transparent)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <p style={{ fontWeight: 500, color: 'var(--fg)', margin: 0 }}>{book.title}</p>
                        {book.isPartOfSeries && <Link size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: 0 }}>{book.author}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontWeight: 700 }}>
                      <Star size={16} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                      {book.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {minRatingBooks.length > 0 && maxRating !== minRating && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <Star size={22} style={{ color: 'var(--meta)' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={cardTitleStyle}>{t.lowestRatedBooks}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                    {minRatingBooks.length > 5
                      ? `${lang === 'ru' ? 'Показаны первые 5 из' : 'Showing first 5 of'} ${minRatingBooks.length}`
                      : `${minRatingBooks.length} ${lang === 'ru' ? 'книг' : 'books'}`
                    }
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {minRatingBooks.slice(0, 5).map(book => (
                  <div key={book.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', backgroundColor: 'color-mix(in oklab, var(--accent) 6%, transparent)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <p style={{ fontWeight: 500, color: 'var(--fg)', margin: 0 }}>{book.title}</p>
                        {book.isPartOfSeries && <Link size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: 0 }}>{book.author}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--meta)', fontWeight: 700 }}>
                      <Star size={16} style={{ color: 'var(--meta)' }} />
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

