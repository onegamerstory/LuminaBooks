
import React, { useState } from 'react';
import { Book, BookStatus } from '../types';
import BookCard from './BookCard';
import { Search, Filter, Library, Download, Upload, Grid3x3, Grid2x2, List, ChevronDown, Edit2, Trash2, TrendingDown, TrendingUp, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01 } from 'lucide-react';
import { translations } from '../App';
import { exportBooksToJson, importBooksFromJson, UserProfile } from '../utils/jsonUtils';
import Toast, { ToastMessage } from './Toast';

type ViewMode = 'large' | 'medium' | 'table';
type TableSortOption = 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc' | 'status-asc' | 'status-desc' | 'pages-desc' | 'pages-asc';

const VIEWMODE_STORAGE_KEY = 'lumina_catalog_viewmode';
const FILTER_STORAGE_KEY = 'lumina_catalog_filter_statuses';
const TABLE_SORT_STORAGE_KEY = 'lumina_catalog_table_sort';

interface CatalogViewProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onImport: (books: Book[], userProfile?: UserProfile) => void;
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

const BookTableRow: React.FC<{
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  lang: 'en' | 'ru';
}> = ({ book, onEdit, onDelete, lang }) => {
  const t = translations[lang];

  return (
    <div className="bg-[#F0F4F1] rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 p-4 flex gap-4 items-start">
      {/* Обложка */}
      <div className="flex-shrink-0">
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="w-16 h-24 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96"%3E%3Crect fill="%23e2e8f0" width="64" height="96"/%3E%3C/svg%3E';
            }}
          />
        )}
      </div>

      {/* Основная информация */}
      <div className="flex-grow min-w-0">
        <h3 className="font-bold text-[#1E2920] text-sm truncate">{book.title}</h3>
        <p className="text-slate-600 text-xs mb-3">{book.author} • {book.year}</p>
        
        <div className="flex flex-wrap gap-3 items-center text-xs">
          {/* Статус */}
          <span className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${getStatusColor(book.status)}`}>
            {(() => {
              switch (book.status) {
                case BookStatus.READING:
                  return lang === 'ru' ? 'Читаю' : 'Reading';
                case BookStatus.READ:
                  return lang === 'ru' ? 'Прочитано' : 'Read';
                case BookStatus.WANT_TO_READ:
                  return lang === 'ru' ? 'Буду читать' : 'To Read';
                case BookStatus.ABANDONED:
                  return lang === 'ru' ? 'Брошено' : 'Abandoned';
                case BookStatus.POSTPONED:
                  return lang === 'ru' ? 'Отложено' : 'Postponed';
                default:
                  return book.status;
              }
            })()}
          </span>

          {/* Процент прочтения */}
          <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">
            {book.currentPercentage !== undefined 
              ? `${book.currentPercentage}%` 
              : book.currentPage && book.totalPages
                ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
                : book.status === BookStatus.READ
                  ? '100%'
                  : '0%'
            }
          </div>

          {/* Оценка */}
          {book.rating > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-semibold">★</span>
              <span className="text-amber-700 font-semibold">{book.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Страницы */}
          {book.totalPages && (
            <div className="text-slate-600">
              {book.totalPages} {lang === 'ru' ? 'стр.' : 'pages'}
            </div>
          )}

          {/* Даты */}
          <div className="text-slate-500 text-xs">
            {book.startDate && <span>{book.startDate}</span>}
            {book.startDate && book.endDate && <span className="text-slate-400 mx-1">→</span>}
            {book.endDate && <span>{book.endDate}</span>}
          </div>
        </div>
      </div>

      {/* Кнопки действия */}
      <div className="flex-shrink-0 flex gap-2">
        <button
          onClick={onEdit}
          className="p-2 bg-[#A1BAA5] text-[#1E2920] rounded-lg hover:bg-[#87A68C] transition-colors font-medium"
          title={lang === 'ru' ? 'Редактировать' : 'Edit'}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium"
          title={lang === 'ru' ? 'Удалить' : 'Delete'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const CatalogView: React.FC<CatalogViewProps> = ({ books, onEdit, onDelete, onImport, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper function to load filter statuses from localStorage
  const loadSavedStatuses = (): Set<BookStatus | 'All'> => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        return new Set(parsed as (BookStatus | 'All')[]);
      }
    } catch (e) {
      console.error('Failed to load filter statuses from localStorage:', e);
    }
    return new Set(['All']);
  };

  const [selectedStatuses, setSelectedStatuses] = useState<Set<BookStatus | 'All'>>(() => loadSavedStatuses());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tableSortOption, setTableSortOption] = useState<TableSortOption>(() => {
    try {
      const saved = localStorage.getItem(TABLE_SORT_STORAGE_KEY) as TableSortOption | null;
      const validOptions: TableSortOption[] = ['rating-desc', 'rating-asc', 'title-asc', 'title-desc', 'status-asc', 'status-desc', 'pages-desc', 'pages-asc'];
      return (saved && validOptions.includes(saved)) ? saved : 'rating-desc';
    } catch (e) {
      console.error('Failed to load table sort option from localStorage:', e);
      return 'rating-desc';
    }
  });
  const [isTableSortOpen, setIsTableSortOpen] = useState(false);
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

  // Helper function to save filter statuses to localStorage
  const saveFilterStatuses = (statuses: Set<BookStatus | 'All'>) => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(Array.from(statuses)));
    } catch (e) {
      console.error('Failed to save filter statuses to localStorage:', e);
    }
  };

  // Helper function to save table sort option to localStorage
  const saveTableSortOption = (option: TableSortOption) => {
    try {
      localStorage.setItem(TABLE_SORT_STORAGE_KEY, option);
    } catch (e) {
      console.error('Failed to save table sort option to localStorage:', e);
    }
  };

  // Helper function to handle table sort option change
  const handleTableSortChange = (option: TableSortOption) => {
    setTableSortOption(option);
    saveTableSortOption(option);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatuses.has('All') || selectedStatuses.has(book.status);
    return matchesSearch && matchesStatus;
  });

  // Функция сортировки для таблицы
  const getTableSortedBooks = (booksToSort: Book[]): Book[] => {
    return [...booksToSort].sort((a, b) => {
      switch (tableSortOption) {
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'title-asc':
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        case 'title-desc':
          return b.title.toLowerCase().localeCompare(a.title.toLowerCase());
        case 'status-asc':
          return a.status.localeCompare(b.status);
        case 'status-desc':
          return b.status.localeCompare(a.status);
        case 'pages-desc':
          return (b.totalPages || 0) - (a.totalPages || 0);
        case 'pages-asc':
          return (a.totalPages || 0) - (b.totalPages || 0);
        default:
          return 0;
      }
    });
  };

  const handleStatusToggle = (status: BookStatus | 'All') => {
    const newStatuses: Set<BookStatus | 'All'> = new Set(selectedStatuses);
    
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
      
      // Если все 5 статусов выбраны, переключаемся на 'All'
      const TOTAL_STATUSES = 5; // READING, READ, WANT_TO_READ, ABANDONED, POSTPONED
      if (newStatuses.size === TOTAL_STATUSES) {
        newStatuses.clear();
        newStatuses.add('All');
      }
      
      // Если ничего не выбрано, выбираем 'All'
      if (newStatuses.size === 0) {
        newStatuses.add('All');
      }
    }
    
    setSelectedStatuses(newStatuses);
    saveFilterStatuses(newStatuses);
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
    exportBooksToJson(books);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importResult = await importBooksFromJson(file);
      onImport(importResult.books, importResult.userProfile);
      addToast(lang === 'ru' ? `Успешно импортировано ${importResult.books.length} книг(и)` : `Successfully imported ${importResult.books.length} book(s)`, 'success');
    } catch (error) {
      addToast(lang === 'ru' ? (error instanceof Error ? error.message : 'Ошибка при импорте файла') : 'Error importing file', 'error');
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
          ? 'bg-[#6b9071] text-white'
          : 'bg-[#F0F4F1] text-slate-600 hover:bg-[#D6E1D8]'
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
          <h2 className="text-2xl font-bold text-[#1E2920]">{t.library}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={books.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-[#9E8F8F] text-white rounded-lg hover:bg-[#887777] disabled:bg-[#D6E1D8] disabled:cursor-not-allowed transition-colors"
              title={lang === 'ru' ? 'Экспортировать в JSON' : 'Export to JSON'}
            >
              <Upload size={18} />
              <span className="text-sm">{lang === 'ru' ? 'Экспорт' : 'Export'}</span>
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-[#846B90]/60 text-white rounded-lg hover:bg-[#846B90] transition-colors cursor-pointer">
              <Download size={18} />
              <span className="text-sm">{lang === 'ru' ? 'Импорт' : 'Import'}</span>
              <input
                type="file"
                accept=".json"
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
              className="pl-10 pr-4 py-2 bg-[#F0F4F1] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b9071] w-full"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-[#F0F4F1] border border-slate-200 rounded-xl px-4 py-2.5 hover:border-slate-300 transition-colors"
            >
              <Filter size={18} className="text-[#D6E1D8]" />
              <span className="text-sm text-[#1E2920]">
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
                <div className="absolute top-full mt-2 left-0 bg-[#F0F4F1] border border-slate-200 rounded-xl shadow-lg z-20 min-w-max">
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle('All')}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700 font-medium">{t.allStatuses}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.READING) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.READING)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.reading}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.READ) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.READ)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.read}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.WANT_TO_READ) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.WANT_TO_READ)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.toRead}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.POSTPONED) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.POSTPONED)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.postponed}</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#D6E1D8] cursor-pointer text-sm border-b border-slate-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(BookStatus.ABANDONED) && !selectedStatuses.has('All')}
                      onChange={() => handleStatusToggle(BookStatus.ABANDONED)}
                      className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-700">{t.abandoned}</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-1 bg-[#F0F4F1] p-1 rounded-lg border border-slate-200">
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

          {/* Кнопка сортировки (только для таблицы) */}
          {viewMode === 'table' && (
            <div className="relative">
              <button
                onClick={() => setIsTableSortOpen(!isTableSortOpen)}
                className="flex items-center gap-2 bg-[#F0F4F1] border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors"
              >
                {(tableSortOption === 'rating-desc' || tableSortOption === 'rating-asc') && (
                  <>
                    <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Рейтинг' : 'Rating'}</span>
                    {tableSortOption === 'rating-desc' && <TrendingDown size={16} className="text-slate-600" />}
                    {tableSortOption === 'rating-asc' && <TrendingUp size={16} className="text-slate-600" />}
                  </>
                )}
                {(tableSortOption === 'title-asc' || tableSortOption === 'title-desc') && (
                  <>
                    <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Название' : 'Name'}</span>
                    {tableSortOption === 'title-asc' && <ArrowDownAZ size={16} className="text-slate-600" />}
                    {tableSortOption === 'title-desc' && <ArrowUpAZ size={16} className="text-slate-600" />}
                  </>
                )}
                {(tableSortOption === 'status-asc' || tableSortOption === 'status-desc') && (
                  <>
                    <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Статус' : 'Status'}</span>
                    {tableSortOption === 'status-desc' && <ArrowDownAZ size={16} className="text-slate-600" />}
                    {tableSortOption === 'status-asc' && <ArrowUpAZ size={16} className="text-slate-600" />}
                  </>
                )}
                {(tableSortOption === 'pages-asc' || tableSortOption === 'pages-desc') && (
                  <>
                    <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Страницы' : 'Pages'}</span>
                    {tableSortOption === 'pages-desc' && <ArrowDown01 size={16} className="text-slate-600" />}
                    {tableSortOption === 'pages-asc' && <ArrowUp01 size={16} className="text-slate-600" />}
                  </>
                )}
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {isTableSortOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsTableSortOpen(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 bg-[#F0F4F1] border border-slate-200 rounded-lg shadow-lg z-20 min-w-max">
                    {/* Рейтинг */}
                    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Рейтинг' : 'Rating'}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleTableSortChange('rating-desc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'rating-desc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'По убыванию' : 'Descending' }
                          >
                            <TrendingDown size={16} />
                          </button>
                          <button
                            onClick={() => {
                              handleTableSortChange('rating-asc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'rating-asc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'По возрастанию' : 'Ascending' }
                          > 
                            <TrendingUp size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Название */}
                    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Название' : 'Name'}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleTableSortChange('title-asc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'title-asc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'A-Z' : 'A-Z'}
                          >
                            <ArrowDownAZ size={16} />
                          </button>
                          <button
                            onClick={() => {
                              handleTableSortChange('title-desc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'title-desc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'Z-A' : 'Z-A'}
                          >
                            <ArrowUpAZ size={16} />
                          </button>
                          
                        </div>
                      </div>
                    </div>

                    {/* Статус */}
                    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Статус' : 'Status'}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleTableSortChange('status-desc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'status-desc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'A-Z' : 'A-Z'}
                          >
                            <ArrowDownAZ size={16} />
                          </button>
                          <button
                            onClick={() => {
                              handleTableSortChange('status-asc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'status-asc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'Z-A' : 'Z-A'}
                          >
                            <ArrowUpAZ size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Страницы */}
                    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Страницы' : 'Pages'}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleTableSortChange('pages-desc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'pages-desc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'По убыванию' : 'Descending' }
                          >
                            <ArrowDown01 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              handleTableSortChange('pages-asc');
                              setIsTableSortOpen(false);
                            }}
                            className={`p-2 rounded transition-colors ${
                              tableSortOption === 'pages-asc'
                                ? 'bg-[#6b9071] text-white'
                                : 'text-slate-600 hover:bg-[#D6E1D8]'
                            }`}
                            title={lang === 'ru' ? 'По возрастанию' : 'Ascending' }
                          >
                            <ArrowUp01 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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
            <div className="space-y-3">
              {getTableSortedBooks(filteredBooks).map(book => (
                <BookTableRow
                  key={book.id}
                  book={book}
                  onEdit={() => onEdit(book)}
                  onDelete={() => onDelete(book.id)}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#F0F4F1] rounded-2xl border-2 border-dashed border-[#6b9071]">
          <Library size={48} className="text-[#6b9071] mb-4 opacity-20" />
          <p className="text-lg text-[#6b9071]">{t.noBooks}</p>
          <p className="text-sm text-[#6b9071]">{t.tryAdding}</p>
        </div>
      )}
    </div>
  );
};

export default CatalogView;
