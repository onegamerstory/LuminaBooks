
import React from 'react';
import { Book, BookStatus } from '../types';
import { getBookPercentage } from '../utils/bookUtils';
import { Star, Edit2, Trash2, Calendar, User, Link, ListTodo, Check } from 'lucide-react';
import { translations, formatHoursText } from '../utils/translations';
import { calculateDaysDifference, calculateBookTotalHours } from '../utils/dateUtils';
import { handleCoverError } from '../utils/coverUtils';

interface BookCardProps {
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  onAddToQueue?: () => void;
  lang: 'en' | 'ru';
}

const BookCard: React.FC<BookCardProps> = React.memo(({ book, onEdit, onDelete, onAddToQueue, lang }) => {
  const t = translations[lang];
  
  const statusColors = {
    [BookStatus.READING]: 'bg-blue-100 text-blue-700',
    [BookStatus.READ]: 'bg-emerald-100 text-emerald-700',
    [BookStatus.WANT_TO_READ]: 'bg-amber-100 text-amber-700',
    [BookStatus.ABANDONED]: 'bg-red-100 text-red-700',
    [BookStatus.POSTPONED]: 'bg-orange-100 text-orange-700',
  };

  const getStatusLabel = (status: BookStatus) => {
    if (status === BookStatus.READING) return t.reading;
    if (status === BookStatus.READ) return t.read;
    if (status === BookStatus.ABANDONED) return t.abandoned;
    if (status === BookStatus.POSTPONED) return t.postponed;
    return t.toRead;
  };

  return (
    <div className="group bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-300 border border-default flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden bg-accent-soft">
        <img 
          src={book.coverUrl || `https://picsum.photos/seed/${book.title}/400/600`} 
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleCoverError}
        />
        {/* Кнопки в верхнем правом углу */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          {onAddToQueue && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (book.status === BookStatus.WANT_TO_READ && !book.inQueue) {
                  onAddToQueue();
                }
              }}
              disabled={book.status !== BookStatus.WANT_TO_READ || book.inQueue}
              className={`p-2 backdrop-blur-md rounded-lg transition-colors shadow-md ${
      book.status === BookStatus.WANT_TO_READ && !book.inQueue
        ? 'bg-accent-soft hover:bg-accent text-accent-on hover:text-accent-on cursor-pointer'
        : 'bg-accent-soft/30 text-muted cursor-not-allowed'
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
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-surface/80 hover:bg-surface backdrop-blur-md rounded-lg text-fg transition-colors shadow-card"
            title={lang === 'ru' ? 'Редактировать' : 'Edit'}
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-danger/80 hover:bg-danger backdrop-blur-md rounded-lg text-white transition-colors shadow-card"
            title={lang === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash2 size={16} />
          </button>
        </div>
        {/* Hover эффект */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[book.status]}`}>
          {getStatusLabel(book.status)}
        </div>
        {/* Процент прочтения — прогресс бар */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
          <div className="w-full bg-white/20 rounded-full h-1.5 mb-1">
            <div className="bg-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${getBookPercentage(book)}%` }} />
          </div>
          <div className="text-white text-xs font-semibold text-center">{getBookPercentage(book)}%</div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1 flex-grow min-w-0">
            <h3 className="font-bold text-fg line-clamp-1 text-lg leading-tight" title={book.title}>
              {book.title}
            </h3>
            {book.isPartOfSeries && (
              <div className="flex-shrink-0 pt-1" title={lang === 'ru' ? 'Часть цикла/коллекции' : 'Part of series/collection'}>
                <Link size={16} className="text-accent" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded text-sm font-bold">
            <Star size={14} fill="currentColor" />
            {book.rating}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-muted text-sm">
          <User size={14} />
          <span className="line-clamp-1">{book.author} • {book.year}</span>
        </div>

        {book.startDate && (
          <div className="flex items-center gap-1.5 text-muted text-xs">
            <Calendar size={14} />
            <span>
              {book.startDate} 
              {book.endDate ? ` — ${book.endDate}` : ` ${t.inProgress}`}
              {(() => {
                const hours = calculateBookTotalHours(book);
                return hours > 0 ? ` • ${formatHoursText(hours, lang)}` : '';
              })()}
            </span>
          </div>
        )}

        {book.description && (
          <p className="text-muted text-xs line-clamp-2 italic pt-2 border-t border-default">
            "{book.description}"
          </p>
        )}
      </div>
    </div>
  );
});

export default BookCard;
