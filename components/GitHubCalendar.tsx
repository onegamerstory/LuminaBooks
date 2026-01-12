
import React, { useMemo } from 'react';
import { Book } from '../types';

interface GitHubCalendarProps {
  books: Book[];
  lang: 'en' | 'ru';
}

const GitHubCalendar: React.FC<GitHubCalendarProps> = ({ books, lang }) => {
  // Последние 5 лет и месяцы
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  }, []);

  const monthLabels = lang === 'ru'
    ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Подсчет завершенных книг по месяцам за последние 5 лет
  const monthlyCounts = useMemo(() => {
    const counts = new Map<string, number>(); // key: `${year}-${month}`
    const minYear = years[0];
    const maxYear = years[years.length - 1];

    books.forEach(book => {
      if (!book.endDate || !book.endDate.trim()) return;
      const date = new Date(book.endDate);
      if (isNaN(date.getTime())) return;

      const y = date.getFullYear();
      const m = date.getMonth();
      if (y < minYear || y > maxYear) return;

      const key = `${y}-${m}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [books, years]);

  const maxCount = useMemo(() => {
    const values: number[] = Array.from(monthlyCounts.values());
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  }, [monthlyCounts]);

  // Функция для получения цвета ячейки
  const getCellColor = (count: number): string => {
    if (count === 0) return 'bg-slate-100';
    
    const intensity = count / maxCount;
    
    if (intensity <= 0.25) return 'bg-emerald-200';
    if (intensity <= 0.5) return 'bg-emerald-400';
    if (intensity <= 0.75) return 'bg-emerald-600';
    return 'bg-emerald-700';
  };

  // Функция для форматирования даты для tooltip
  const formatDate = (date: Date, lang: 'en' | 'ru'): string => {
    return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // Tooltip для месячной ячейки
  const getMonthTooltip = (year: number, month: number, count: number) => {
    const monthName = monthLabels[month];
    const bookWord = lang === 'ru'
      ? count === 1 ? 'книга' : count < 5 ? 'книги' : 'книг'
      : count === 1 ? 'book' : 'books';

    if (count === 0) {
      return lang === 'ru'
        ? `${monthName} ${year}\nНет завершенных книг`
        : `${monthName} ${year}\nNo books finished`;
    }

    return lang === 'ru'
      ? `${monthName} ${year}\n${count} ${bookWord} завершено`
      : `${monthName} ${year}\n${count} ${bookWord} finished`;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {lang === 'ru' ? 'Активность чтения' : 'Reading Activity'}
        </h3>
        <p className="text-sm text-slate-500">
          {lang === 'ru' 
            ? 'Чем больше книг прочитано в месяц, тем темнее ячейка'
            : 'The more books finished per month, the darker the cell'}
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-max">
          {/* Месяцы сверху */}

          {/*<div className="grid grid-cols-12 gap-1 mb-2 ml-12">
            {monthLabels.map((label, idx) => (
              <div key={idx} className="text-xs text-slate-500 font-medium text-center">
                {label}
              </div>
            ))}
          </div>*/}

          <div className="flex flex-col gap-2">
            {years.map(year => (
              <div key={year} className="flex items-center gap-2">
                <div className="w-10 text-xs text-slate-500 text-left">{year}</div>
                <div className="grid grid-cols-12 gap-1">
                  {monthLabels.map((_, month) => {
                    const key = `${year}-${month}`;
                    const count = monthlyCounts.get(key) || 0;
                    return (
                      <div
                        key={key}
                        className={`w-4 h-4 rounded-sm ${getCellColor(count)} transition-colors hover:ring-2 hover:ring-emerald-500 cursor-pointer`}
                        title={getMonthTooltip(year, month, count)}
                      />
                    );
                  })}
                </div>
                
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
        <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-100"></div>
          <div className="w-3 h-3 rounded-sm bg-emerald-200"></div>
          <div className="w-3 h-3 rounded-sm bg-emerald-400"></div>
          <div className="w-3 h-3 rounded-sm bg-emerald-600"></div>
          <div className="w-3 h-3 rounded-sm bg-emerald-700"></div>
        </div>
        <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
      </div>
    </div>
  );
};

export default GitHubCalendar;

