
import React from 'react';
import { Book, BookStatus } from '../types';
import { Star, Edit2, Trash2, Calendar, User } from 'lucide-react';
import { translations } from '../App';
import { calculateDaysDifference } from '../utils/dateUtils';

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
  };

  const getStatusLabel = (status: BookStatus) => {
    if (status === BookStatus.READING) return t.reading;
    if (status === BookStatus.READ) return t.read;
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
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100">
        <img 
          src={book.coverUrl || `https://picsum.photos/seed/${book.title}/400/600`} 
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-between">
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-lg text-white transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-lg text-white transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[book.status]}`}>
          {getStatusLabel(book.status)}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-800 line-clamp-1 text-lg leading-tight" title={book.title}>
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
                // Вычисляем общее количество часов из сессий
                if (book.sessions && book.sessions.length > 0) {
                  const totalSeconds = book.sessions.reduce((sum, session) => sum + session.duration, 0);
                  const hours = totalSeconds / 3600;
                  return hours > 0 ? ` • ${formatHoursText(hours, lang)}` : '';
                }
                return '';
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
