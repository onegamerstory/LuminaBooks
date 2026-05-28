
import React, { useState, useEffect } from 'react';
import { Book, BookStatus, Franchise } from '../types';
import { X, Star, Link, Clock, Search, Loader2 } from 'lucide-react';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import BookRatingModal from './BookRatingModal';
import FranchiseSelectModal from './FranchiseSelectModal.tsx';
import { calculateBookTotalHours } from '../utils/dateUtils';
import { searchBookOnOpenLibrary } from '../utils/openLibraryApi';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (book: Book) => void;
  onFranchisesUpdated?: (franchise: Franchise) => void;
  initialData?: Book;
  franchises?: Franchise[];
  lang: 'en' | 'ru';
  defaultCoverUrl?: string;
}

const BookModal: React.FC<BookModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onFranchisesUpdated,
  initialData, 
  franchises = [],
  lang, 
  defaultCoverUrl = '' 
}) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    year: '',
    coverUrl: '',
    status: BookStatus.WANT_TO_READ,
    rating: 0,
    startDate: '',
    endDate: '',
    description: '',
    isPartOfSeries: false,
    franchiseIds: [],
  });
  const [showFranchiseSelect, setShowFranchiseSelect] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const isEditingExistingBook = !!initialData;
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingEditModal, setShowRatingEditModal] = useState(false);
  const [pendingBook, setPendingBook] = useState<Partial<Book> | null>(null);

  useEffect(() => {
    if (initialData) {
      const franchiseIds = initialData.franchiseIds ?? [];
      setFormData({
        ...initialData,
        isPartOfSeries: franchiseIds.length > 0 || (initialData.isPartOfSeries ?? false),
        franchiseIds: franchiseIds,

      });
    } else {
      setFormData({
        title: '',
        author: '',
        year: '',
        coverUrl: '',
        status: BookStatus.WANT_TO_READ,
        rating: 0,
        startDate: '',
        endDate: '',
        description: '',
        isPartOfSeries: false,
        franchiseIds: [],

      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine cover URL: use provided one, then default, then fallback
    let finalCoverUrl = formData.coverUrl;
    if (!finalCoverUrl && defaultCoverUrl) {
      finalCoverUrl = defaultCoverUrl;
    }
    if (!finalCoverUrl) {
      finalCoverUrl = `https://picsum.photos/seed/${formData.title}/400/600`;
    }
    
    const newBook: Book = {
      ...formData as Book,
      id: initialData?.id || crypto.randomUUID(),
      title: formData.title || 'Untitled',
      author: formData.author || 'Unknown',
      year: formData.year || 'N/A',
      coverUrl: finalCoverUrl,
      status: formData.status as BookStatus,
      rating: Number(formData.rating) || 0,
      isPartOfSeries: ((formData.franchiseIds && formData.franchiseIds.length > 0) || formData.isPartOfSeries) ?? false,
      franchiseIds: formData.franchiseIds ?? [],
    };

    // Проверяем, нужна ли оценка книги
    // Книга считается завершённой, если:
    // 1. Статус = "Прочитано" ИЛИ прогресс = 100%
    // 2. ИЛИ есть и дата начала, и дата окончания (книга прочитана, но статус ещё не обновлён)
    const hasStartDate = newBook.startDate && newBook.startDate.trim() !== '';
    const hasEndDate = newBook.endDate && newBook.endDate.trim() !== '';
    
    const isBookCompleted = 
      ((newBook.status === BookStatus.READ || newBook.currentPercentage === 100) ||
       (hasStartDate && hasEndDate)) &&
      newBook.rating === 0;

    if (isBookCompleted) {
      // Сохраняем книгу для последующего submit с оценкой
      setPendingBook(newBook);
      setShowRatingModal(true);
    } else {
      // Сразу submit если оценка уже есть или книга не завершена
      onSubmit(newBook);
      onClose();
    }
  };

  const handleRatingSubmit = (rating: number) => {
    if (pendingBook) {
      const bookWithRating = { ...pendingBook, rating };
      onSubmit(bookWithRating as Book);
      setShowRatingModal(false);
      setPendingBook(null);
      onClose();
    }
  };

  const handleRatingSkip = () => {
    if (pendingBook) {
      // Сохраняем книгу с рейтингом 0 (без оценки)
      onSubmit(pendingBook as Book);
      setShowRatingModal(false);
      setPendingBook(null);
      onClose();
    }
  };

  const handleRatingEditSubmit = (rating: number) => {
    // Обновляем форму с новой оценкой при редактировании
    setFormData(prev => ({ ...prev, rating }));
    setShowRatingEditModal(false);
  };

  const handleFranchiseSelect = (selectedIds: string[], newFranchiseName?: string) => {
    setFormData(prev => ({
      ...prev,
      franchiseIds: selectedIds,
      isPartOfSeries: selectedIds.length > 0, // Auto-update isPartOfSeries based on franchise count
    }));

    // Если пользователь хочет создать новую коллекцию
    if (newFranchiseName && newFranchiseName.trim() && onFranchisesUpdated) {
      const newFranchise: Franchise = {
        id: crypto.randomUUID(),
        name: newFranchiseName,
        bookIds: [], // Книга будет добавлена при сохранении
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Добавляем только новую коллекцию в приложение
      onFranchisesUpdated(newFranchise);

      // Добавляем новую коллекцию в selectedIds
      setFormData(prev => ({
        ...prev,
        franchiseIds: [...selectedIds, newFranchise.id],
        isPartOfSeries: true,
      }));
    }

    setShowFranchiseSelect(false);
  };

  const handleSearchBook = async () => {
    if (!formData.title?.trim()) return;

    setIsSearching(true);
    setSearchMessage(null);

    try {
      const result = await searchBookOnOpenLibrary(formData.title, formData.author);

      if (result) {
        setFormData(prev => ({
          ...prev,
          title: result.title,
          author: result.author,
          year: String(result.year),
          coverUrl: result.coverUrl,
          totalPages: result.totalPages ?? undefined,
        }));
        setSearchMessage({ text: t.bookInfoFilled, type: 'success' });
      } else {
        setSearchMessage({ text: t.bookNotFound, type: 'error' });
      }
    } catch {
      setSearchMessage({ text: lang === 'ru' ? 'Ошибка запроса' : 'Request error', type: 'error' });
    } finally {
      setIsSearching(false);
      setTimeout(() => setSearchMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-[#F0F4F1] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
          <div className="sticky top-0 bg-[#F0F4F1] border-b px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold font-serif text-[#1E2920]">
              {initialData ? t.editBook : t.addNewBook}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-1/3 flex flex-col gap-2">
               <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#F0F4F1] border-2 border-dashed border-slate-200 relative group">
                  {formData.coverUrl ? (
                    <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Preview" onError={handleCoverError} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      {t.preview}
                    </div>
                  )}
               </div>
               <input 
                 type="text" 
                 placeholder={t.imageUrl}
                 value={formData.coverUrl}
                 onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                 className="text-xs px-2 py-1 bg-[#F0F4F1] border rounded "
               />
               {isEditingExistingBook && (formData.rating || 0) > 0 && (
                 <button
                   type="button"
                   onClick={() => setShowRatingEditModal(true)}
                   className="flex items-center justify-center gap-1 py-2 px-3 bg-[#F9F3E6] border border-amber-200 rounded-lg hover:bg-[#FFF5E1] transition-colors group w-full"
                   title={lang === 'ru' ? 'Изменить оценку' : 'Change rating'}
                 >
                   <Star size={18} className="fill-amber-400 text-amber-400" />
                   <span className="font-semibold text-amber-900">{(formData.rating || 0).toFixed(1)}</span>
                   <span className="text-xs text-amber-700 group-hover:underline">
                     {lang === 'ru' ? 'изменить' : 'edit'}
                   </span>
                 </button>
               )}
               {isEditingExistingBook && initialData && (
                 <div className="flex items-center justify-center gap-2 py-2 px-3 bg-[#DFE9E2] border border-[#B8D4C0] rounded-lg w-full">
                   <Clock size={18} className="text-[#6B9071]" />
                   <span className="font-semibold text-[#1E2920]">{calculateBookTotalHours(initialData).toFixed(1)}</span>
                   <span className="text-xs text-[#4A7056]">
                     {lang === 'ru' ? 'часов' : 'hours'}
                   </span>
                 </div>
               )}
            </div>

            <div className="flex-grow space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-grow">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.title}</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                      placeholder="e.g. The Great Gatsby"
                    />
                  </div>
                  <div className="flex items-center justify-end h-full pt-6 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFranchiseSelect(true)}
                      className={`p-2 rounded-lg transition-all relative ${
                        (formData.franchiseIds && formData.franchiseIds.length > 0) || formData.isPartOfSeries
                          ? 'bg-[#6B9071] text-white shadow-md' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                      title={lang === 'ru' ? 'Добавить в коллекцию' : 'Add to collection'}
                    >
                      <Link size={18} />
                      {formData.franchiseIds && formData.franchiseIds.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">
                          {formData.franchiseIds.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSearchBook}
                      disabled={isSearching || !formData.title?.trim()}
                      className={`p-2 rounded-lg transition-all ${
                        formData.title?.trim()
                          ? 'bg-[#6B9071] text-white hover:bg-[#5A7A60]'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      } ${isSearching ? 'opacity-60 cursor-wait' : ''}`}
                      title={t.findBook}
                    >
                      {isSearching ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Search size={18} />
                      )}
                    </button>
                  </div>
                </div>
                {searchMessage && (
                  <p className={`text-xs mt-1.5 ${searchMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {searchMessage.text}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.author}</label>
                  <input 
                    type="text" 
                    value={formData.author}
                    onChange={e => setFormData({...formData, author: e.target.value})}
                    className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.year}</label>
                  <input 
                    type="text" 
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: e.target.value})}
                    className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{lang === 'ru' ? 'Всего страниц' : 'Total Pages'}</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.totalPages || ''}
                  onChange={e => setFormData({...formData, totalPages: e.target.value ? parseInt(e.target.value) : undefined})}
                  placeholder={lang === 'ru' ? 'Количество страниц в книге' : 'Total number of pages'}
                  className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.status}</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as BookStatus})}
                    className="w-full px-4 bg-[#F0F4F1] py-2 border border-slate-200 text-slate-500 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none appearance-none"
                  >
                    <option value={BookStatus.WANT_TO_READ}>{t.toRead}</option>
                    <option value={BookStatus.READING}>{t.reading}</option>
                    <option value={BookStatus.READ}>{t.read}</option>
                    <option value={BookStatus.POSTPONED}>{t.postponed}</option>
                    <option value={BookStatus.ABANDONED}>{t.abandoned}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.description}</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 bg-[#F0F4F1] py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none resize-none h-[42px]"
                    rows={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.startDate}</label>
                  <DateInput
                    value={formData.startDate ? dayjs(formData.startDate).toDate() : null}
                    onChange={(date) => setFormData({...formData, startDate: date ? dayjs(date).format('YYYY-MM-DD') : ''})}
                    placeholder={lang === 'ru' ? 'Выберите дату' : 'Select date'}
                    valueFormat="YYYY-MM-DD"
                    clearable
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.endDate}</label>
                  <DateInput
                    value={formData.endDate ? dayjs(formData.endDate).toDate() : null}
                    onChange={(date) => setFormData({...formData, endDate: date ? dayjs(date).format('YYYY-MM-DD') : ''})}
                    placeholder={lang === 'ru' ? 'Выберите дату' : 'Select date'}
                    valueFormat="YYYY-MM-DD"
                    clearable
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 bg-[#BCCDBE] border border-slate-200 text-slate-600 rounded-xl hover:bg-[#87A68C] transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-[#6B9071] text-white font-semibold rounded-xl hover:bg-[#5A7A60] shadow-lg shadow-[#6B9071]/20 transition-all active:scale-95"
            >
              {initialData ? t.updateBook : t.addToLibrary}
            </button>
          </div>
        </form>
        </div>
      </div>

      <BookRatingModal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setPendingBook(null);
        }}
        onSubmit={handleRatingSubmit}
        onSkip={handleRatingSkip}
        bookTitle={formData.title || ''}
        lang={lang}
      />

      <BookRatingModal
        isOpen={showRatingEditModal}
        onClose={() => setShowRatingEditModal(false)}
        onSubmit={handleRatingEditSubmit}
        bookTitle={formData.title || ''}
        lang={lang}
      />

      <FranchiseSelectModal
        isOpen={showFranchiseSelect}
        onClose={() => setShowFranchiseSelect(false)}
        onSubmit={handleFranchiseSelect}
        selectedFranchiseIds={formData.franchiseIds ?? []}
        franchises={franchises}
        lang={lang}
      />
    </>
  );
};

export default BookModal;
