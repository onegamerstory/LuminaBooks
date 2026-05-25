import React, { useState, useRef } from 'react';
import { X, Star } from 'lucide-react';
import { translations } from '../utils/translations';

interface BookRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => void;
  onSkip?: () => void;
  bookTitle: string;
  lang: 'en' | 'ru';
}

const BookRatingModal: React.FC<BookRatingModalProps> = ({ isOpen, onClose, onSubmit, onSkip, bookTitle, lang }) => {
  const t = translations[lang];
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!isOpen) return null;

  const handleStarHover = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    
    // Рейтинг: если левая половина, то index + 0.5, если правая - то index + 1
    const ratingValue = isLeftHalf ? (index + 0.5) : (index + 1);
    setHoveredRating(ratingValue);
  };

  const handleStarClick = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    
    const ratingValue = isLeftHalf ? (index + 0.5) : (index + 1);
    setRating(ratingValue);
  };

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, review.trim());
      setRating(0);
      setReview('');
    }
  };

  const handleSkip = () => {
    setRating(0);
    setReview('');
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const renderStar = (index: number) => {
    const currentRating = hoveredRating || rating;
    const isFilled = index + 1 <= currentRating;
    const isHalfFilled = currentRating - index === 0.5;

    return (
      <button
        key={index}
        ref={(el: HTMLButtonElement | null) => {
          if (el) starRefs.current[index] = el;
        }}
        onMouseMove={(e) => handleStarHover(index, e)}
        onMouseLeave={() => setHoveredRating(0)}
        onClick={(e) => handleStarClick(index, e)}
        className="relative transition-transform hover:scale-110 focus:outline-none"
        title={`${(index + 1)} / 10`}
      >
        {/* Фоновая звезда (пустая) */}
        <Star
          size={42}
          className="text-slate-300 transition-colors"
        />
        
        {/* Закрашенная звезда (целая или половина) */}
        {(isFilled || isHalfFilled) && (
          <div
            className="absolute top-0 left-0 overflow-hidden transition-all"
            style={{
              width: isHalfFilled ? '50%' : '100%'
            }}
          >
            <Star
              size={42}
              className="fill-amber-400 text-amber-400"
            />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-[#F0F4F1] rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold font-serif text-[#1E2920]">
            {lang === 'ru' ? 'Оцените книгу' : 'Rate the Book'}
          </h2>
          <button 
            onClick={() => onSkip ? onSkip() : onClose()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-2">
              {lang === 'ru' ? 'Вы только что закончили' : 'You just finished reading'}
            </p>
            <p className="text-lg font-semibold text-[#1E2920] truncate px-4">
              "{bookTitle}"
            </p>
          </div>

          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: 10 }, (_, i) => renderStar(i))}
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-amber-500">
              {(hoveredRating || rating).toFixed(1)}
            </div>
            <p className="text-sm text-slate-400 mt-2">/ 10</p>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {lang === 'ru' ? 'Ваш отзыв (опционально)' : 'Your review (optional)'}
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={lang === 'ru' ? 'Напишите, что вы думаете об этой книге...' : 'Share your thoughts about this book...'}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none resize-none h-24 text-sm"
            />
          </div>

          <div className="flex gap-3 w-full pt-4">
            {onSkip && (
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2.5 bg-[#BCCDBE] border border-slate-200 text-slate-600 rounded-xl hover:bg-[#87A68C] transition-colors font-medium"
              >
                {lang === 'ru' ? 'Пропустить' : 'Skip'}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className={`${onSkip ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-[#6B9071] text-white rounded-xl hover:bg-[#5A7A60] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-[#6B9071]/20`}
            >
              {lang === 'ru' ? 'Готово' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookRatingModal;
