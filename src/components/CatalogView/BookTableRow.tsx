/**
 * BookTableRow - Table Row Display Component
 * 
 * Renders a single row in the table view with book information and action buttons.
 */

import React from 'react';
import { Book, BookStatus } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';
import { ListTodo, Edit2, Trash2, Check } from 'lucide-react';
import { translations } from '../../utils/translations';
import { handleCoverError } from '../../utils/coverUtils';
import { getBookPercentage } from '../../utils/bookUtils';

interface BookTableRowProps {
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  onAddToQueue?: () => void;
  lang: 'en' | 'ru';
}

const BookTableRow: React.FC<BookTableRowProps> = ({ 
  book, 
  onEdit, 
  onDelete, 
  onAddToQueue, 
  lang 
}) => {
  const t = translations[lang];

  return (
    <div className="flex items-start gap-2 rounded-xl border border-default bg-surface p-2 shadow-sm transition-all duration-200 hover:border-accent hover:shadow-md sm:gap-4 sm:p-4">
      {/* Обложка */}
      <div className="flex-shrink-0">
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="h-20 w-14 rounded-lg object-cover sm:h-24 sm:w-16"
            onError={handleCoverError}
          />
        )}
      </div>

      {/* Основная информация */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-bold text-fg text-sm truncate">{book.title}</h3>
          {book.isPartOfSeries && (
            <span className="text-accent flex-shrink-0">🔗</span>
          )}
        </div>
        <p className="text-muted text-xs mb-3">{book.author} • {book.year}</p>
        
        <div className="flex flex-wrap gap-3 items-center text-xs">
          {/* Статус */}
          <span className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${getStatusColor(book.status)}`}>
            {(() => {
              switch (book.status) {
                case BookStatus.READING:
                  return lang === 'ru' ? 'Читаю' : 'Reading';
                case BookStatus.READ:
                  return lang === 'ru' ? 'Прочитано' : 'Read';
                case BookStatus.WANT_TO_READ:
                  return lang === 'ru' ? 'Буду читать' : 'To Read';
                case BookStatus.ABANDONED:
                  return lang === 'ru' ? 'Брошено' : 'Abandoned';
                case BookStatus.POSTPONED:
                  return lang === 'ru' ? 'Отложено' : 'Postponed';
                default:
                  return book.status;
              }
            })()}
          </span>

          {/* Процент прочтения — прогресс бар */}
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 bg-page rounded-full h-2">
              <div className="bg-accent h-2 rounded-full transition-all duration-500" style={{ width: `${getBookPercentage(book)}%` }} />
            </div>
            <span className="text-xs font-medium text-muted w-8 text-right">{getBookPercentage(book)}%</span>
          </div>

          {/* Оценка */}
          {book.rating > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-semibold">★</span>
              <span className="text-amber-700 font-semibold">{book.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Страницы */}
          {book.totalPages && (
            <div className="text-muted">
              {book.totalPages} {lang === 'ru' ? 'стр.' : 'pages'}
            </div>
          )}

          {/* Даты */}
          <div className="text-muted text-xs">
            {book.startDate && <span>{book.startDate}</span>}
            {book.startDate && book.endDate && <span className="text-muted mx-1">→</span>}
            {book.endDate && <span>{book.endDate}</span>}
          </div>
        </div>
      </div>

      {/* Кнопки действия */}
      <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row sm:gap-2">
        {onAddToQueue && (
          <button
            onClick={() => {
              if (book.status === BookStatus.WANT_TO_READ && !book.inQueue) {
                onAddToQueue();
              }
            }}
            disabled={book.status !== BookStatus.WANT_TO_READ || book.inQueue}
            className={`flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 transition-colors font-medium ${
              book.status === BookStatus.WANT_TO_READ && !book.inQueue
                ? 'bg-accent-soft text-fg hover:bg-accent-hover'
                : 'bg-page/50 text-muted cursor-not-allowed'
            }`}
            title={lang === 'ru' ? 'В очередь' : 'To Queue'}
          >
            {book.status === BookStatus.WANT_TO_READ && book.inQueue ? (
              <Check size={16} />
            ) : (
              <ListTodo size={16} />
            )}
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-default bg-surface p-2 text-fg transition-colors hover:bg-page"
          title={lang === 'ru' ? 'Редактировать' : 'Edit'}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-red-100 p-2 font-medium text-red-600 transition-colors hover:bg-red-200"
          title={lang === 'ru' ? 'Удалить' : 'Delete'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default BookTableRow;
