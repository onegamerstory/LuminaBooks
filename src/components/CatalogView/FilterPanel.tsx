import React from 'react';
import { TrendingDown, TrendingUp, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01 } from 'lucide-react';
import { BookStatus, Book } from '../../types';
import { translations } from '../../utils/translations';
import { getStatusColor } from '../../utils/statusUtils';

type TableSortOption = 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc' | 'status-asc' | 'status-desc' | 'pages-desc' | 'pages-asc';

const STATUS_LIST: BookStatus[] = [
  BookStatus.READING,
  BookStatus.READ,
  BookStatus.WANT_TO_READ,
  BookStatus.POSTPONED,
  BookStatus.ABANDONED,
];

const statusLabels: Record<BookStatus, keyof typeof translations.en> = {
  [BookStatus.READING]: 'reading',
  [BookStatus.READ]: 'read',
  [BookStatus.WANT_TO_READ]: 'toRead',
  [BookStatus.POSTPONED]: 'postponed',
  [BookStatus.ABANDONED]: 'abandoned',
};

interface SortField {
  key: string;
  label: string;
  ascOption: TableSortOption;
  descOption: TableSortOption;
  ascIcon: React.ReactNode;
  descIcon: React.ReactNode;
}

interface FilterPanelProps {
  books: Book[];
  selectedStatuses: Set<BookStatus | 'All'>;
  onToggleStatus: (status: BookStatus | 'All') => void;
  currentSortOption: TableSortOption;
  onSortChange: (option: TableSortOption) => void;
  lang: 'en' | 'ru';
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  books,
  selectedStatuses,
  onToggleStatus,
  currentSortOption,
  onSortChange,
  lang,
}) => {
  const t = translations[lang];
  const isAllSelected = selectedStatuses.has('All');

  const getStatusCount = (status: BookStatus): number => {
    return books.filter(b => b.status === status).length;
  };

  const sortFields: SortField[] = [
    {
      key: 'rating',
      label: lang === 'ru' ? 'Рейтинг' : 'Rating',
      ascOption: 'rating-asc',
      descOption: 'rating-desc',
      ascIcon: <TrendingUp size={15} />,
      descIcon: <TrendingDown size={15} />,
    },
    {
      key: 'title',
      label: lang === 'ru' ? 'Название' : 'Name',
      ascOption: 'title-asc',
      descOption: 'title-desc',
      ascIcon: <ArrowDownAZ size={15} />,
      descIcon: <ArrowUpAZ size={15} />,
    },
    {
      key: 'status',
      label: lang === 'ru' ? 'Статус' : 'Status',
      ascOption: 'status-asc',
      descOption: 'status-desc',
      ascIcon: <ArrowDownAZ size={15} />,
      descIcon: <ArrowUpAZ size={15} />,
    },
    {
      key: 'pages',
      label: lang === 'ru' ? 'Страницы' : 'Pages',
      ascOption: 'pages-asc',
      descOption: 'pages-desc',
      ascIcon: <ArrowDown01 size={15} />,
      descIcon: <ArrowUp01 size={15} />,
    },
  ];

  return (
    <div className="w-full shrink-0 space-y-6 rounded-2xl border border-default bg-surface p-4 shadow-md md:sticky md:top-20 md:max-h-[calc(100vh-8rem)] md:w-60 md:self-start md:overflow-y-auto">
      {/* Sort section */}
      <div>
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wide mb-3">
          {lang === 'ru' ? 'Сортировка' : 'Sort'}
        </h3>
        <div className="space-y-1">
          {sortFields.map(field => {
            const isAsc = currentSortOption === field.ascOption;
            const isDesc = currentSortOption === field.descOption;
            return (
              <div
                key={field.key}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent-soft transition-colors"
              >
                <span className="text-sm text-fg">{field.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onSortChange(field.ascOption)}
                    className={`p-1.5 rounded transition-colors ${
                      isAsc
                        ? 'bg-accent text-accent-on'
                        : 'text-muted'
                    }`}
                    onMouseEnter={e => { if (!isAsc) e.currentTarget.style.backgroundColor = 'var(--accent-soft)' }}
                    onMouseLeave={e => { if (!isAsc) e.currentTarget.style.backgroundColor = '' }}
                    title={lang === 'ru' ? 'По возрастанию' : 'Ascending'}
                  >
                    {field.ascIcon}
                  </button>
                  <button
                    onClick={() => onSortChange(field.descOption)}
                    className={`p-1.5 rounded transition-colors ${
                      isDesc
                        ? 'bg-accent text-accent-on'
                        : 'text-muted'
                    }`}
                    onMouseEnter={e => { if (!isDesc) e.currentTarget.style.backgroundColor = 'var(--accent-soft)' }}
                    onMouseLeave={e => { if (!isDesc) e.currentTarget.style.backgroundColor = '' }}
                    title={lang === 'ru' ? 'По убыванию' : 'Descending'}
                  >
                    {field.descIcon}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status filter section */}
      <div>
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wide mb-3">
          {t.status}
        </h3>
        <div className="space-y-1">
          <label className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent-soft cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => onToggleStatus('All')}
                    className="w-4 h-4 rounded border-default cursor-pointer accent-[var(--accent)]"
              />
              <span className="text-sm text-fg font-medium">{t.allStatuses}</span>
            </div>
            <span className="text-xs text-muted">{books.length}</span>
          </label>

          {STATUS_LIST.map(status => {
            const count = getStatusCount(status);
            const isChecked = selectedStatuses.has(status) && !isAllSelected;
            return (
              <label
                key={status}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent-soft cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleStatus(status)}
                className="w-4 h-4 rounded border-default cursor-pointer accent-[var(--accent)]"
                  />
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(status)}`}>
                    {t[statusLabels[status]]}
                  </span>
                </div>
                <span className="text-xs text-muted">{count}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
