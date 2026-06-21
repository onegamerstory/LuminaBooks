
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
    if (hours === 0) return 'color-mix(in oklab, var(--accent) 10%, var(--surface))';
    const intensity = hours / maxHours;
    if (intensity <= 0.25) return 'var(--accent-soft)';
    if (intensity <= 0.5) return 'color-mix(in oklab, var(--accent) 40%, var(--surface))';
    if (intensity <= 0.75) return 'color-mix(in oklab, var(--accent) 65%, var(--surface))';
    return 'var(--accent)';
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

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--elev-raised)',
  };

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--fg)', margin: 0, marginBottom: 'var(--space-2)' }}>
          {lang === 'ru' ? 'Активность чтения' : 'Reading Activity'}
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          {lang === 'ru'
            ? 'Чем больше часов чтения в день, тем темнее ячейка'
            : 'The more hours read per day, the darker the cell'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', height: CELL_SIZE, marginLeft: 22, marginBottom: 2 }}>
            {monthStartCols
              .filter((m, i, arr) => i === 0 || m.col !== arr[i - 1].col)
              .map((m) => (
                <div
                  key={m.label}
                  style={{
                    position: 'absolute', top: 0, left: m.col * COL_WIDTH,
                    whiteSpace: 'nowrap', lineHeight: `${CELL_SIZE}px`,
                    fontSize: 'var(--text-xs)', color: 'var(--meta)',
                  }}
                >
                  {m.label}
                </div>
              ))}
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP, marginRight: CELL_GAP }}>
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  style={{
                    width: 22, height: CELL_SIZE, lineHeight: `${CELL_SIZE}px`,
                    fontSize: 'var(--text-xs)', color: 'var(--meta)', textAlign: 'right',
                    paddingRight: 4,
                  }}
                >
                  {label || ''}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: CELL_GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP }}>
                  {week.map((day, di) => {
                    if (!day) {
                      return (
                        <div
                          key={`${wi}-${di}`}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        />
                      );
                    }
                    const key = getKey(day);
                    const hours = dailyHours.get(key) || 0;
                    return (
                      <div
                        key={key}
                        title={getTooltip(day, hours)}
                        style={{
                          width: CELL_SIZE, height: CELL_SIZE,
                          borderRadius: 2,
                          backgroundColor: getCellColor(hours),
                          border: '1px solid color-mix(in oklab, var(--accent) 20%, transparent)',
                          transition: 'all 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.outline = '2px solid var(--accent)'; e.currentTarget.style.outlineOffset = '1px'; }}
                        onMouseLeave={e => { e.currentTarget.style.outline = 'none'; }}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--meta)' }}>
        <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'color-mix(in oklab, var(--accent) 10%, var(--surface))' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--accent-soft)' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'color-mix(in oklab, var(--accent) 40%, var(--surface))' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'color-mix(in oklab, var(--accent) 65%, var(--surface))' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--accent)' }} />
        </div>
        <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
      </div>
    </div>
  );
};

export default GitHubCalendar;
