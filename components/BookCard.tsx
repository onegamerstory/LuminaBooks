
import React from 'react';
import { Book, BookStatus } from '../types';
import { Star, Edit2, Trash2, Calendar, User } from 'lucide-react';
import { translations } from '../App';
import { calculateDaysDifference, calculateBookTotalHours } from '../utils/dateUtils';

interface BookCardProps {
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  lang: 'en' | 'ru';
}

const BookCard: React.FC<BookCardProps> = ({ book, onEdit, onDelete, lang }) => {
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

  return (
    <div className="group bg-[#F0F4F1] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100">
        <img 
          src={book.coverUrl || `https://picsum.photos/seed/${book.title}/400/600`} 
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Кнопки в верхнем правом углу */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-[#F0F4F1]/90 hover:bg-[#F0F4F1] backdrop-blur-md rounded-lg text-[#1E2920] transition-colors shadow-md"
            title={lang === 'ru' ? 'Редактировать' : 'Edit'}
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-red-500/90 hover:bg-red-500 backdrop-blur-md rounded-lg text-white transition-colors shadow-md"
            title={lang === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash2 size={16} />
          </button>
        </div>
        {/* Hover эффект */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[book.status]}`}>
          {getStatusLabel(book.status)}
        </div>
        {/* Процент прочтения под обложкой */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent rounded-b-2xl p-2 text-white text-xs text-center">
          <div className="font-semibold text-sm">
            {book.currentPercentage !== undefined 
              ? `${book.currentPercentage}%` 
              : book.currentPage && book.totalPages
                ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
                : book.status === BookStatus.READ
                  ? '100%'
                  : '0%'
            }
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#1E2920] line-clamp-1 text-lg leading-tight" title={book.title}>
            {book.title}
          </h3>
          <div className="flex items-center gap-1 text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded text-sm font-bold">
            <Star size={14} fill="currentColor" />
            {book.rating}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <User size={14} />
          <span className="line-clamp-1">{book.author} • {book.year}</span>
        </div>

        {book.startDate && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
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
          <p className="text-slate-500 text-xs line-clamp-2 italic pt-2 border-t border-slate-50">
            "{book.description}"
          </p>
        )}
      </div>
    </div>
  );
};

export default BookCard;
