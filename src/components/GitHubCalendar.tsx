
import React, { useMemo } from 'react';
import { Book } from '../types';

interface GitHubCalendarProps {
  books: Book[];
  lang: 'en' | 'ru';
}

const CELL_SIZE = 14;
const CELL_GAP = 3;
const COL_WIDTH = CELL_SIZE + CELL_GAP;

const GitHubCalendar: React.FC<GitHubCalendarProps> = ({ books, lang }) => {
  const currentYear = new Date().getFullYear();

  const dailyHours = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach(book => {
      book.sessions?.forEach(s => {
        const d = new Date(s.startTime);
        if (d.getFullYear() !== currentYear) return;
        const key = d.toISOString().split('T')[0];
        map.set(key, (map.get(key) || 0) + (s.duration || 0));
      });
    });
    return map;
  }, [books, currentYear]);

  const allDays = useMemo(() => {
    const days: Date[] = [];
    for (let d = new Date(currentYear, 0, 1); d.getFullYear() === currentYear; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [currentYear]);

  const weeks = useMemo(() => {
    const result: (Date | null)[][] = [];
    const firstDow = new Date(currentYear, 0, 1).getDay();
    let week: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) week.push(null);
    allDays.forEach(day => {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    });
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [allDays]);

  const maxHours = useMemo(() => {
    const vals = Array.from(dailyHours.values());
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  }, [dailyHours]);

  const getCellColor = (hours: number): string => {
    if (hours === 0) return 'bg-slate-100';
    const intensity = hours / maxHours;
    if (intensity <= 0.25) return 'bg-[#D6E1D8]';
    if (intensity <= 0.5) return 'bg-[#B8CCBC]';
    if (intensity <= 0.75) return 'bg-[#8AAB90]';
    return 'bg-[#6B9071]';
  };

  const monthLabels = lang === 'ru'
    ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthStartCols = useMemo(() => {
    const firstDay = new Date(currentYear, 0, 1);
    const startDow = firstDay.getDay();
    return monthLabels.map((label, m) => {
      const first = new Date(currentYear, m, 1);
      const doy = Math.floor((first.getTime() - firstDay.getTime()) / 86400000);
      const col = Math.floor((doy + startDow) / 7);
      return { label, col };
    });
  }, [currentYear, monthLabels]);

  const dayLabels: (string | null)[] = [null, 'Пн', null, 'Ср', null, 'Пт', null];

  const formatDate = (d: Date): string =>
    d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const formatHours = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  const getTooltip = (d: Date, hours: number): string => {
    const dateStr = formatDate(d);
    if (lang === 'ru') {
      return hours > 0
        ? `${dateStr}\n${formatHours(hours)} чтения`
        : `${dateStr}\nНет чтения`;
    }
    return hours > 0
      ? `${dateStr}\n${formatHours(hours)} of reading`
      : `${dateStr}\nNo reading`;
  };

  const getKey = (d: Date): string => d.toISOString().split('T')[0];

  return (
    <div className="bg-[#D6E1D8]/30 rounded-xl p-6 shadow-md border border-[#C8D6CB]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#1E2920] mb-2">
          {lang === 'ru' ? 'Активность чтения' : 'Reading Activity'}
        </h3>
        <p className="text-sm text-slate-500">
          {lang === 'ru'
            ? 'Чем больше часов чтения в день, тем темнее ячейка'
            : 'The more hours read per day, the darker the cell'}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col">
          <div style={{ position: 'relative', height: `${CELL_SIZE}px`, marginLeft: '22px', marginBottom: '2px' }}>
            {monthStartCols
              .filter((m, i, arr) => i === 0 || m.col !== arr[i - 1].col)
              .map((m) => (
                <div
                  key={m.label}
                  className="text-xs text-slate-500 absolute top-0"
                  style={{ left: `${m.col * COL_WIDTH}px`, whiteSpace: 'nowrap', lineHeight: `${CELL_SIZE}px` }}
                >
                  {m.label}
                </div>
              ))}
          </div>

          <div className="flex">
            <div className="flex flex-col gap-[3px] mr-[3px]">
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-xs text-slate-500 text-right pr-1"
                  style={{ width: '22px', height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}
                >
                  {label || ''}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    if (!day) {
                      return (
                        <div
                          key={`${wi}-${di}`}
                          style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                        />
                      );
                    }
                    const key = getKey(day);
                    const hours = dailyHours.get(key) || 0;
                    return (
                      <div
                        key={key}
                        className={`rounded-sm border border-slate-500/30 ${getCellColor(hours)} transition-colors hover:ring-2 hover:ring-[#6B9071] cursor-pointer`}
                        style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                        title={getTooltip(day, hours)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
        <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-100" />
          <div className="w-3 h-3 rounded-sm bg-[#D6E1D8]" />
          <div className="w-3 h-3 rounded-sm bg-[#B8CCBC]" />
          <div className="w-3 h-3 rounded-sm bg-[#8AAB90]" />
          <div className="w-3 h-3 rounded-sm bg-[#6B9071]" />
        </div>
        <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
      </div>
    </div>
  );
};

export default GitHubCalendar;
