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
    <div className="bg-[#F0F4F1] rounded-xl shadow-sm border border-[#C8D6CB] hover:shadow-md hover:border-[#B8CCBC] transition-all duration-200 p-4 flex gap-4 items-start">
      {/* Обложка */}
      <div className="flex-shrink-0">
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="w-16 h-24 object-cover rounded-lg"
            onError={handleCoverError}
          />
        )}
      </div>

      {/* Основная информация */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-bold text-[#1E2920] text-sm truncate">{book.title}</h3>
          {book.isPartOfSeries && (
            <span className="text-[#6B9071] flex-shrink-0">🔗</span>
          )}
        </div>
        <p className="text-slate-600 text-xs mb-3">{book.author} • {book.year}</p>
        
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
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div className="bg-[#6B9071] h-2 rounded-full transition-all duration-500" style={{ width: `${getBookPercentage(book)}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600 w-8 text-right">{getBookPercentage(book)}%</span>
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
            <div className="text-slate-600">
              {book.totalPages} {lang === 'ru' ? 'стр.' : 'pages'}
            </div>
          )}

          {/* Даты */}
          <div className="text-slate-500 text-xs">
            {book.startDate && <span>{book.startDate}</span>}
            {book.startDate && book.endDate && <span className="text-slate-400 mx-1">→</span>}
            {book.endDate && <span>{book.endDate}</span>}
          </div>
        </div>
      </div>

      {/* Кнопки действия */}
      <div className="flex-shrink-0 flex gap-2">
        {onAddToQueue && (
          <button
            onClick={() => {
              if (book.status === BookStatus.WANT_TO_READ && !book.inQueue) {
                onAddToQueue();
              }
            }}
            disabled={book.status !== BookStatus.WANT_TO_READ || book.inQueue}
            className={`p-2 rounded-lg transition-colors font-medium ${
              book.status === BookStatus.WANT_TO_READ && !book.inQueue
                ? 'bg-[#D6E1D8] hover:bg-[#B8CCBC] text-[#1E2920]'
                : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
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
          className="p-2 bg-white border border-slate-300 rounded-lg text-[#1E2920] hover:bg-slate-100 transition-colors"
          title={lang === 'ru' ? 'Редактировать' : 'Edit'}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium"
          title={lang === 'ru' ? 'Удалить' : 'Delete'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default BookTableRow;
