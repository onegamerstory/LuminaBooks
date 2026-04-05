import React, { useState, useEffect } from 'react';
import { Book, Franchise } from '../types';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { translations } from '../App';

interface FranchiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (franchise: Franchise, updatedBooks: Book[]) => void;
  initialData?: Franchise;
  books: Book[];
  lang: 'en' | 'ru';
}

const FranchiseModal: React.FC<FranchiseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  books,
  lang,
}) => {
  const t = translations[lang];
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
      });
      setSelectedBookIds(initialData.bookIds);
    } else {
      setFormData({
        name: '',
        description: '',
      });
      setSelectedBookIds([]);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert(lang === 'ru' ? 'Введите название франшизы' : 'Enter franchise name');
      return;
    }

    const newFranchise: Franchise = {
      id: initialData?.id || crypto.randomUUID(),
      name: formData.name,
      description: formData.description || undefined,
      bookIds: selectedBookIds,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Обновляем книги: добавляем франшизу к их franchiseIds и устанавливаем isPartOfSeries
    const updatedBooks = books.map((book) => {
      if (selectedBookIds.includes(book.id)) {
        return {
          ...book,
          isPartOfSeries: true,
          franchiseIds: [
            ...(book.franchiseIds || []).filter((id) => id !== newFranchise.id),
            newFranchise.id,
          ],
        };
      } else if (initialData && initialData.bookIds.includes(book.id)) {
        // Удаляем франшизу из книг, которые были раньше, но сейчас не выбраны
        const remainingFranchiseIds = (book.franchiseIds || []).filter((id) => id !== initialData.id);
        return {
          ...book,
          franchiseIds: remainingFranchiseIds,
          isPartOfSeries: remainingFranchiseIds.length > 0, // Флаг false если нет больше франшиз
        };
      }
      return book;
    });

    onSubmit(newFranchise, updatedBooks);
    onClose();
  };

  const filteredBooks = books.filter(
    (book) =>
      (book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !selectedBookIds.includes(book.id)
  );

  const selectedBooks = books.filter((book) => selectedBookIds.includes(book.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-[#F0F4F1] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
        <div className="sticky top-0 bg-[#F0F4F1] border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold font-serif text-[#1E2920]">
            {initialData
              ? lang === 'ru'
                ? 'Редактировать франшизу'
                : 'Edit Franchise'
              : lang === 'ru'
              ? 'Новая франшиза'
              : 'New Franchise'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Название и описание */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                {lang === 'ru' ? 'Название' : 'Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang === 'ru' ? 'e.g. Гарри Поттер' : 'e.g. Harry Potter'}
                className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                {lang === 'ru' ? 'Описание' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={lang === 'ru' ? 'Опишите эту франшизу...' : 'Describe this franchise...'}
                className="w-full px-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none resize-none h-20"
              />
            </div>
          </div>

          {/* Выбранные книги */}
          {selectedBooks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-3">
                {lang === 'ru' ? 'Книги в франшизе' : 'Books in franchise'} ({selectedBooks.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 rounded-lg p-3">
                {selectedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-8 h-12 object-cover rounded"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1E2920] truncate">
                          {book.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{book.author}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBookIds(selectedBookIds.filter((id) => id !== book.id))
                      }
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Поиск и добавление книг */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-3">
              {lang === 'ru' ? 'Добавить книги' : 'Add Books'}
            </label>
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder={
                    lang === 'ru' ? 'Поиск по названию или автору...' : 'Search by title or author...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6B9071] outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-50 rounded-lg p-3">
                {filteredBooks.length > 0 ? (
                  filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBookIds([...selectedBookIds, book.id])}
                      className="w-full flex items-center justify-between gap-3 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-8 h-12 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1E2920] truncate">
                            {book.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{book.author}</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-[#6B9071] flex-shrink-0" />
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {searchTerm
                      ? lang === 'ru'
                        ? 'Книги не найдены'
                        : 'No books found'
                      : lang === 'ru'
                      ? 'Все книги добавлены'
                      : 'All books added'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки действия */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#BCCDBE] border border-slate-200 text-slate-600 rounded-xl hover:bg-[#87A68C] transition-colors"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-8 py-2 bg-[#6B9071] text-white font-semibold rounded-xl hover:bg-[#5A7A60] shadow-lg shadow-[#6B9071]/20 transition-all active:scale-95"
            >
              {initialData
                ? lang === 'ru'
                  ? 'Обновить'
                  : 'Update'
                : lang === 'ru'
                ? 'Создать'
                : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FranchiseModal;
