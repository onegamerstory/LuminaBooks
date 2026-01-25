
import React, { useState } from 'react';
import { Book, BookStatus } from '../types';
import BookCard from './BookCard';
import { Search, Filter, Library, Download, Upload, Grid3x3, Grid2x2, List, ChevronUp, ChevronDown } from 'lucide-react';
import { translations } from '../App';
import { exportBooksToExcel, importBooksFromExcel } from '../utils/excelUtils';
import Toast, { ToastMessage } from './Toast';

type ViewMode = 'large' | 'medium' | 'table';

const VIEWMODE_STORAGE_KEY = 'lumina_catalog_viewmode';

interface CatalogViewProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onImport: (books: Book[]) => void;
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
    default:
      return 'text-slate-600 bg-slate-50';
  }
};

const BookTableRow: React.FC<{
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  lang: 'en' | 'ru';
}> = ({ book, onEdit, onDelete, lang }) => {
  const t = translations[lang];

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="p-4">
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="w-12 h-16 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64"%3E%3Crect fill="%23e2e8f0" width="48" height="64"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23cbd5e1" text-anchor="middle" dy=".3em"%3E%3C/text%3E%3C/svg%3E';
            }}
          />
        )}
      </td>
      <td className="p-4 font-medium text-slate-800">{book.title}</td>
      <td className="p-4 text-slate-600">{book.author}</td>
      <td className="p-4 text-slate-600">{book.year}</td>
      <td className="p-4 text-center font-medium text-slate-700">
        {book.totalPages ? `${book.totalPages}` : '-'}
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(book.status)}`}>
          {(() => {
            switch (book.status) {
              case BookStatus.READING:
                return lang === 'ru' ? 'Читаю' : 'Reading';
              case BookStatus.READ:
                return lang === 'ru' ? 'Прочитано' : 'Read';
              case BookStatus.WANT_TO_READ:
                return lang === 'ru' ? 'Буду читать' : 'To Read';
              default:
                return book.status;
            }
          })()}
        </span>
      </td>
      <td className="p-4 text-center">
        <span className="font-semibold text-amber-600">★ {book.rating}</span>
      </td>
      <td className="p-4 text-slate-600 text-sm">{book.startDate || '-'}</td>
      <td className="p-4 text-slate-600 text-sm">{book.endDate || '-'}</td>
      <td className="p-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
          >
            {lang === 'ru' ? 'Ред.' : 'Edit'}
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
          >
            {lang === 'ru' ? 'Удал.' : 'Del'}
          </button>
        </div>
      </td>
    </tr>
  );
};

const CatalogView: React.FC<CatalogViewProps> = ({ books, onEdit, onDelete, onImport, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<BookStatus | 'All'>>(new Set(['All']));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEWMODE_STORAGE_KEY) as ViewMode | null;
    return (saved && ['large', 'medium', 'table'].includes(saved)) ? saved : 'large';
  });
  const t = translations[lang];

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Сохранение режима отображения при изменении
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewModeState(newMode);
    localStorage.setItem(VIEWMODE_STORAGE_KEY, newMode);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatuses.has('All') || selectedStatuses.has(book.status);
    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = (status: BookStatus | 'All') => {
    const newStatuses = new Set(selectedStatuses);
    
    if (status === 'All') {
      if (newStatuses.has('All')) {
        newStatuses.clear();
        newStatuses.add('All');
      } else {
        newStatuses.clear();
        newStatuses.add('All');
      }
    } else {
      // Удаляем 'All' если выбираем конкретный статус
      newStatuses.delete('All');
      
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
      } else {
        newStatuses.add(status);
      }
      
      // Если все статусы выбраны, переключаемся на 'All'
      if (newStatuses.size === 3) {
        newStatuses.clear();
        newStatuses.add('All');
      }
      
      // Если ничего не выбрано, выбираем 'All'
      if (newStatuses.size === 0) {
        newStatuses.add('All');
      }
    }
    
    setSelectedStatuses(newStatuses);
  };

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn as keyof Book];
    let bValue: any = b[sortColumn as keyof Book];

    // Handle undefined values
    if (aValue === undefined || aValue === null) aValue = '';
    if (bValue === undefined || bValue === null) bValue = '';

    // Convert to string for comparison if necessary
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and reset to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    exportBooksToExcel(books);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedBooks = await importBooksFromExcel(file);
      onImport(importedBooks);
      addToast(lang === 'ru' ? `Успешно импортировано ${importedBooks.length} книг(и)` : `Successfully imported ${importedBooks.length} book(s)`, 'success');
    } catch (error) {
      addToast(lang === 'ru' ? 'Ошибка при импорте файла' : 'Error importing file', 'error');
      console.error(error);
    } finally {
      setIsImporting(false);
      // Очистка input
      event.target.value = '';
    }
  };

  const ViewModeButton: React.FC<{
    mode: ViewMode;
    icon: React.ReactNode;
    title: string;
  }> = ({ mode, icon, title }) => (
    <button
      onClick={() => handleViewModeChange(mode)}
      className={`p-2 rounded-lg transition-colors ${
        viewMode === mode
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-6">
      <Toast messages={toasts} onRemove={removeToast} />
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">{t.library}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={books.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              title={lang === 'ru' ? 'Экспортировать в Excel' : 'Export to Excel'}
            >
              <Upload size={18} />
              <span className="text-sm">{lang === 'ru' ? 'Экспорт' : 'Export'}</span>
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer">
              <Download size={18} />
              <span className="text-sm">{lang === 'ru' ? 'Импорт' : 'Import'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-slate-300 transition-colors"
            >
              <Filter size={18} className="text-slate-400" />
              <span className="text-sm text-slate-700">
                {selectedStatuses.has('All') 
                  ? t.allStatuses 
                  : `${selectedStatuses.size} ${lang === 'ru' ? 'выбрано' : 'selected'}`
                }
              </span>
            </button>
            
            {isFilterOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-max">
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle('All')}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700 font-medium">{t.allStatuses}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.READING) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.READING)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.reading}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.READ) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.READ)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.read}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.WANT_TO_READ) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.WANT_TO_READ)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.toRead}</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
            <ViewModeButton
              mode="large"
              icon={<Grid3x3 size={18} />}
              title={lang === 'ru' ? 'Крупная сетка' : 'Large grid'}
            />
            <ViewModeButton
              mode="medium"
              icon={<Grid2x2 size={18} />}
              title={lang === 'ru' ? 'Средняя сетка' : 'Medium grid'}
            />
            <ViewModeButton
              mode="table"
              icon={<List size={18} />}
              title={lang === 'ru' ? 'Таблица' : 'Table'}
            />
          </div>
        </div>
      </div>

      {filteredBooks.length > 0 ? (
        <>
          {viewMode === 'large' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onEdit={() => onEdit(book)} 
                  onDelete={() => onDelete(book.id)}
                  lang={lang}
                />
              ))}
            </div>
          )}

          {viewMode === 'medium' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onEdit={() => onEdit(book)} 
                  onDelete={() => onDelete(book.id)}
                  lang={lang}
                />
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-left text-sm font-semibold text-slate-600">{lang === 'ru' ? 'Обложка' : 'Cover'}</th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        {t.title}
                        {sortColumn === 'title' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('author')}
                    >
                      <div className="flex items-center gap-2">
                        {t.author}
                        {sortColumn === 'author' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('year')}
                    >
                      <div className="flex items-center gap-2">
                        {t.year}
                        {sortColumn === 'year' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-center text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('totalPages')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        {lang === 'ru' ? 'Страниц' : 'Pages'}
                        {sortColumn === 'totalPages' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        {t.status}
                        {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-center text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('rating')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        {t.rating}
                        {sortColumn === 'rating' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('startDate')}
                    >
                      <div className="flex items-center gap-2">
                        {t.startDate}
                        {sortColumn === 'startDate' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleColumnSort('endDate')}
                    >
                      <div className="flex items-center gap-2">
                        {t.endDate}
                        {sortColumn === 'endDate' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </div>
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-600">{lang === 'ru' ? 'Действия' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBooks.map(book => (
                    <BookTableRow
                      key={book.id}
                      book={book}
                      onEdit={() => onEdit(book)}
                      onDelete={() => onDelete(book.id)}
                      lang={lang}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-100">
          <Library size={48} className="mb-4 opacity-20" />
          <p className="text-lg">{t.noBooks}</p>
          <p className="text-sm">{t.tryAdding}</p>
        </div>
      )}
    </div>
  );
};

export default CatalogView;
