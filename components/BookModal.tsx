
import React, { useState, useEffect } from 'react';
import { Book, BookStatus } from '../types';
import { X } from 'lucide-react';
import { translations } from '../App';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (book: Book) => void;
  initialData?: Book;
  lang: 'en' | 'ru';
}

const BookModal: React.FC<BookModalProps> = ({ isOpen, onClose, onSubmit, initialData, lang }) => {
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
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
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
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBook: Book = {
      ...formData as Book,
      id: initialData?.id || crypto.randomUUID(),
      title: formData.title || 'Untitled',
      author: formData.author || 'Unknown',
      year: formData.year || 'N/A',
      coverUrl: formData.coverUrl || `https://picsum.photos/seed/${formData.title}/400/600`,
      status: formData.status as BookStatus,
      rating: Number(formData.rating) || 0,
    };
    onSubmit(newBook);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold font-serif text-slate-800">
            {initialData ? t.editBook : t.addNewBook}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-1/3 flex flex-col gap-2">
               <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 relative group">
                  {formData.coverUrl ? (
                    <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Preview" />
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
                 className="text-xs px-2 py-1 border rounded"
               />
            </div>

            <div className="flex-grow space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.title}</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. The Great Gatsby"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.author}</label>
                  <input 
                    type="text" 
                    value={formData.author}
                    onChange={e => setFormData({...formData, author: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.year}</label>
                  <input 
                    type="text" 
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.status}</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as BookStatus})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                <option value={BookStatus.WANT_TO_READ}>{t.toRead}</option>
                <option value={BookStatus.READING}>{t.reading}</option>
                <option value={BookStatus.READ}>{t.read}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.rating}</label>
              <input 
                type="number" 
                min="0" max="10" step="0.5"
                value={formData.rating}
                onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.description}</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-[42px]"
                rows={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.startDate}</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t.endDate}</label>
              <input 
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              {initialData ? t.updateBook : t.addToLibrary}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookModal;
