import React from 'react';
import { createPortal } from 'react-dom';
import { Book, BookStatus } from '../types';
import { X, Play } from 'lucide-react';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';

interface RandomBookModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onAddToQueue: (book: Book) => void;
  onStartReading: (book: Book) => void;
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
      return 'text-muted bg-page';
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
  onStartReading,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !book) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'color-mix(in oklab, var(--fg), transparent 50%)', backdropFilter: 'blur(4px)'}}>
      <div className="bg-surface rounded-xl shadow-overlay max-w-xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between p-4 border-b border-default">
          <h2 className="text-lg font-bold text-fg">{t.randomBook}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg transition-colors"
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
                  className="w-32 h-48 object-cover rounded-lg shadow-card"
                  onError={handleCoverError}
                />
              ) : (
                <div className="w-32 h-48 bg-accent-soft rounded-lg flex items-center justify-center">
                  <span className="text-accent text-sm">No cover</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-bold text-fg">{book.title}</h3>
                {book.author && (
                  <p className="text-muted mt-1">{book.author}</p>
                )}
                {book.year && (
                  <p className="text-muted text-sm">{book.year}</p>
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

        <div className="flex gap-3 p-4 border-t border-default bg-page">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-fg hover:text-fg font-medium text-sm rounded-lg hover:bg-surface transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => {
              onStartReading(book);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-on font-medium text-sm rounded-lg transition-colors"
          >
            <Play size={16} />
            <span>{lang === 'ru' ? 'Читать' : 'Read'}</span>
          </button>
          <button
            onClick={() => {
              onAddToQueue(book);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-accent-soft hover:bg-accent text-accent hover:text-accent-on font-medium text-sm rounded-lg transition-colors"
          >
            {t.addToQueue}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RandomBookModal;