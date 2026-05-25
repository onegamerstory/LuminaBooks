import React from 'react';
import { Book, BookStatus } from '../types';
import { X } from 'lucide-react';
import { translations } from '../utils/translations';

interface RandomBookModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onAddToQueue: (book: Book) => void;
  lang: 'en' | 'ru';
}

const getStatusColor = (status: BookStatus): string => {
  switch (status) {
    case BookStatus.READING:
      return 'text-blue-600 bg-blue-50';
    case BookStatus.READ:
      return 'text-emerald-600 bg-emerald-50';
    case BookStatus.WANT_TO_READ:
      return 'text-amber-600 bg-amber-50';
    case BookStatus.ABANDONED:
      return 'text-red-600 bg-red-50';
    case BookStatus.POSTPONED:
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
};

const getStatusLabel = (status: BookStatus, lang: 'en' | 'ru'): string => {
  const t = translations[lang];
  switch (status) {
    case BookStatus.READING:
      return t.reading;
    case BookStatus.READ:
      return t.read;
    case BookStatus.WANT_TO_READ:
      return t.toRead;
    case BookStatus.ABANDONED:
      return t.abandoned;
    case BookStatus.POSTPONED:
      return t.postponed;
    default:
      return status;
  }
};

const RandomBookModal: React.FC<RandomBookModalProps> = ({
  isOpen,
  book,
  onClose,
  onAddToQueue,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[#1E2920]">{t.randomBook}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-32 h-48 bg-[#D6E1D8] rounded-lg flex items-center justify-center">
                  <span className="text-[#6B9071] text-sm">No cover</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E2920]">{book.title}</h3>
                {book.author && (
                  <p className="text-slate-600 mt-1">{book.author}</p>
                )}
                {book.year && (
                  <p className="text-slate-500 text-sm">{book.year}</p>
                )}
              </div>

              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(book.status)}`}>
                  {getStatusLabel(book.status, lang)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-700 hover:text-slate-900 font-medium text-sm rounded-lg hover:bg-slate-100 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => {
              onAddToQueue(book);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-[#6B9071] hover:bg-[#5A7A60] text-white font-medium text-sm rounded-lg transition-colors"
          >
            {t.addToQueue}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RandomBookModal;