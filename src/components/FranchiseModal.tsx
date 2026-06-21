import React, { useState, useEffect, useMemo } from 'react';
import { Book, BookStatus, Franchise } from '../types';
import { X, Search, Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';
import { uuid } from '../uuid';

interface FranchiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (franchise: Franchise, updatedBooks: Book[]) => void;
  initialData?: Franchise;
  books: Book[];
  lang: 'en' | 'ru';
}

const STATUS_LIST: (BookStatus | 'All')[] = [
  'All',
  BookStatus.READING,
  BookStatus.READ,
  BookStatus.WANT_TO_READ,
  BookStatus.ABANDONED,
  BookStatus.POSTPONED,
];

const statusColors: Record<string, string> = {
  [BookStatus.READING]: 'bg-blue-100 text-blue-700',
  [BookStatus.READ]: 'bg-emerald-100 text-emerald-700',
  [BookStatus.WANT_TO_READ]: 'bg-amber-100 text-amber-700',
  [BookStatus.ABANDONED]: 'bg-red-100 text-red-700',
  [BookStatus.POSTPONED]: 'bg-orange-100 text-orange-700',
};

function getStatusLabel(t: Record<string, string>, status: BookStatus): string {
  switch (status) {
    case BookStatus.READING: return t.reading;
    case BookStatus.READ: return t.read;
    case BookStatus.WANT_TO_READ: return t.toRead;
    case BookStatus.ABANDONED: return t.abandoned;
    case BookStatus.POSTPONED: return t.postponed;
  }
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'All'>('All');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setCoverUrl(initialData.coverUrl || '');
      setSelectedBookIds(initialData.bookIds);
    } else {
      setName('');
      setDescription('');
      setCoverUrl('');
      setSelectedBookIds([]);
    }
    setSearchTerm('');
    setStatusFilter('All');
    setError('');
  }, [initialData, isOpen]);

  const selectedBooks = useMemo(
    () => {
      const bookMap = new Map(books.map(b => [b.id, b]));
      return selectedBookIds.map(id => bookMap.get(id)).filter((b): b is Book => !!b);
    },
    [books, selectedBookIds]
  );

  const availableBooks = useMemo(
    () => books.filter(book => {
      const matchesSearch = searchTerm === '' ||
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || book.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [books, searchTerm, statusFilter]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'ru' ? 'Введите название коллекции' : 'Enter collection name');
      return;
    }
    setError('');

    const newFranchise: Franchise = {
      id: initialData?.id || uuid(),
      name: name.trim(),
      description: description.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      bookIds: selectedBookIds,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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
        const remainingFranchiseIds = (book.franchiseIds || []).filter((id) => id !== initialData.id);
        return {
          ...book,
          franchiseIds: remainingFranchiseIds,
          isPartOfSeries: remainingFranchiseIds.length > 0,
        };
      }
      return book;
    });

    onSubmit(newFranchise, updatedBooks);
    onClose();
  };

  const moveBookUp = (index: number) => {
    if (index === 0) return;
    const newIds = [...selectedBookIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setSelectedBookIds(newIds);
  };

  const moveBookDown = (index: number) => {
    if (index === selectedBookIds.length - 1) return;
    const newIds = [...selectedBookIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setSelectedBookIds(newIds);
  };

  const toggleBook = (bookId: string) => {
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(selectedBookIds.filter(id => id !== bookId));
    } else {
      setSelectedBookIds([...selectedBookIds, bookId]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'color-mix(in oklab, var(--fg), transparent 50%)', backdropFilter: 'blur(4px)'}}>
      <div className="bg-surface rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-overlay animate-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-default px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold font-display text-fg">
            {initialData
              ? lang === 'ru' ? 'Редактировать коллекцию' : 'Edit Collection'
              : lang === 'ru' ? 'Новая коллекция' : 'New Collection'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-page rounded-full text-muted">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm font-medium flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
          {/* Left Panel - Collection Info */}
          <div className="w-1/2 border-r border-default p-6 overflow-y-auto flex flex-col gap-5 bg-surface">
            <div>
              <h3 className="text-lg font-bold font-display text-fg mb-4">
                {lang === 'ru' ? 'Информация о коллекции' : 'Collection Info'}
              </h3>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase mb-1">
                {lang === 'ru' ? 'Название' : 'Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'ru' ? 'e.g. Гарри Поттер' : 'e.g. Harry Potter'}
                className="w-full px-4 py-2 bg-surface border border-accent/30 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase mb-1">
                {lang === 'ru' ? 'Описание' : 'Description'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'ru' ? 'Опишите эту коллекцию...' : 'Describe this collection...'}
                className="w-full px-4 py-2 bg-surface border border-accent/30 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none h-20"
              />
            </div>

            {/* Cover */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase mb-1">
                {lang === 'ru' ? 'Обложка' : 'Cover'}
              </label>
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-accent bg-accent-soft flex-shrink-0">
                  <img
                    src={coverUrl || undefined}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={handleCoverError}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder={lang === 'ru' ? 'Ссылка на обложку...' : 'Cover image URL...'}
                    className="w-full px-4 py-2 bg-surface border border-accent/30 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                  />
                  <p className="text-xs text-muted mt-1">
                    {lang === 'ru' ? 'Формат 1:1 для превью' : '1:1 aspect ratio recommended'}
                  </p>
                </div>
              </div>
            </div>

            {/* Books in collection */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-xs font-semibold text-muted uppercase mb-2">
                {lang === 'ru' ? 'Книги в коллекции' : 'Books in collection'} ({selectedBooks.length})
              </label>
              {selectedBooks.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-1.5 bg-surface rounded-lg p-2 border border-default">
                  {selectedBooks.map((book, index) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-default"
                    >
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-8 h-12 object-cover rounded flex-shrink-0"
                        onError={handleCoverError}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{book.title}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveBookUp(index)}
                          disabled={index === 0}
                          className="p-0.5 text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBookDown(index)}
                          disabled={index === selectedBooks.length - 1}
                          className="p-0.5 text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBookIds(selectedBookIds.filter((id) => id !== book.id))}
                        className="p-1 text-danger hover:bg-danger/10 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-surface rounded-lg border border-dashed border-default p-4">
                  <p className="text-sm text-muted">
                    {lang === 'ru' ? 'Нет книг в коллекции' : 'No books in collection'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Add Books */}
          <div className="w-1/2 p-6 overflow-y-auto flex flex-col gap-4 bg-surface">
            <div>
              <h3 className="text-lg font-bold font-display text-fg mb-4">
                {lang === 'ru' ? 'Добавить книги в коллекцию' : 'Add Books to Collection'}
              </h3>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={lang === 'ru' ? 'Поиск по названию или автору...' : 'Search by title or author...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-accent/30 rounded focus:ring-2 focus:ring-accent outline-none"
              />
            </div>

            {/* Status filters */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_LIST.map((status) => {
                const isAll = status === 'All';
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      isActive
                        ? isAll
                          ? 'bg-accent text-accent-on'
                          : `${statusColors[status]} ring-2 ring-accent`
                        : isAll
                          ? 'bg-accent-soft/50 text-muted hover:bg-accent-soft'
                          : 'bg-surface text-muted border border-default hover:bg-page'
                    }`}
                  >
                    {isAll
                      ? lang === 'ru' ? 'Все' : 'All'
                      : getStatusLabel(t, status as BookStatus)}
                  </button>
                );
              })}
            </div>

            {/* Books table */}
            <div className="flex-1 flex flex-col min-h-0">
              {availableBooks.length > 0 ? (
                <div className="flex-1 overflow-y-auto border border-default rounded-xl bg-surface">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted uppercase border-b bg-surface">
                        <th className="text-left py-2 px-3 w-12"></th>
                        <th className="text-left py-2 px-2">{lang === 'ru' ? 'Название' : 'Title'}</th>
                        <th className="text-left py-2 px-2 w-28">{lang === 'ru' ? 'Статус' : 'Status'}</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableBooks.map((book) => {
                        const isAdded = selectedBookIds.includes(book.id);
                        return (
                          <tr key={book.id} className="border-b border-default last:border-b-0 hover:bg-page">
                            <td className="py-2 px-3">
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-8 h-12 object-cover rounded"
                                onError={handleCoverError}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <p className="text-sm font-medium text-fg truncate max-w-[200px]">
                                {book.title}
                              </p>
                            </td>
                            <td className="py-2 px-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusColors[book.status]}`}>
                                {getStatusLabel(t, book.status)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleBook(book.id)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isAdded
                                    ? 'bg-accent text-accent-on hover:bg-accent-hover'
                                    : 'bg-accent-soft text-accent hover:bg-accent-soft/70'
                                }`}
                              >
                                {isAdded ? <Check size={18} /> : <Plus size={18} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-surface rounded-xl border border-dashed border-default">
                  <p className="text-sm text-muted">
                    {searchTerm || statusFilter !== 'All'
                      ? lang === 'ru' ? 'Книги не найдены' : 'No books found'
                      : lang === 'ru' ? 'В библиотеке нет книг' : 'No books in library'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-default px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-surface border border-default text-fg rounded-lg hover:bg-page transition-colors"
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-8 py-2 bg-accent text-accent-on font-semibold rounded-lg hover:bg-accent-hover shadow-card transition-all active:scale-95"
          >
            {initialData
              ? lang === 'ru' ? 'Обновить' : 'Update'
              : lang === 'ru' ? 'Создать' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FranchiseModal;
