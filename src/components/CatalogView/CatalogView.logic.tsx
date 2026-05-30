/**
 * CatalogView - Main Container Component
 * 
 * This is the refactored main container that manages state and delegates rendering to sub-components.
 * All business logic, filtering, sorting, and event handling are contained here.
 */

import React, { useState } from 'react';
import { Book, BookStatus, Franchise } from '../../types';
import BookCard from './../BookCard';
import Toast, { ToastMessage } from './../Toast';
import RandomBookModal from './../RandomBookModal';
import FilterDropdown from './FilterDropdown';
import FilterPanel from './FilterPanel';
import ViewModeButtons from './ViewModeButtons';
import EmptyState from './EmptyState';
import BookTableRow from './BookTableRow';
import { Search, Dices, Upload, Download, Plus } from 'lucide-react';
import { exportBooksToJson, importBooksFromJson, UserProfile } from '../../utils/jsonUtils';
import { translations } from '../../utils/translations';

type ViewMode = 'large' | 'table';
type TableSortOption = 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc' | 'status-asc' | 'status-desc' | 'pages-desc' | 'pages-asc';

const VIEWMODE_STORAGE_KEY = 'lumina_catalog_viewmode';
const FILTER_STORAGE_KEY = 'lumina_catalog_filter_statuses';
const TABLE_SORT_STORAGE_KEY = 'lumina_catalog_table_sort';

interface CatalogViewProps {
  books: Book[];
  franchises?: Franchise[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onAddToQueue: (book: Book) => void;
  onStartReading: (book: Book) => void;
  onImport: (books: Book[], userProfile?: UserProfile, franchises?: Franchise[]) => void;
  onAddBook: () => void;
  lang: 'en' | 'ru';
}

const CatalogView: React.FC<CatalogViewProps> = ({ 
  books, 
  franchises, 
  onEdit, 
  onDelete, 
  onAddToQueue, 
  onStartReading, 
  onImport, 
  onAddBook, 
  lang 
}) => {
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

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEWMODE_STORAGE_KEY) as ViewMode | null;
    return (saved && ['large', 'table'].includes(saved)) ? saved : 'large';
  });
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [randomBook, setRandomBook] = useState<Book | null>(null);

  const t = translations[lang];

  // Toast handlers
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Random book handler
  const handleRandomBook = () => {
    const eligibleStatuses = [BookStatus.WANT_TO_READ, BookStatus.ABANDONED, BookStatus.POSTPONED];
    const eligibleBooks = books.filter(book => eligibleStatuses.includes(book.status));
    
    if (eligibleBooks.length === 0) {
      addToast(t.noBooksToRandomize, 'info');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * eligibleBooks.length);
    setRandomBook(eligibleBooks[randomIndex]);
    setIsRandomModalOpen(true);
  };

  // View mode change handler
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

  // Filtering logic
  const filteredBooks = books.filter(book => {
    const matchesSearch = searchTerm === '' || book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatuses.has('All') || selectedStatuses.has(book.status);
    return matchesSearch && matchesStatus;
  });

  // Sorting logic for table view
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

  // General sort logic for large view
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

  // Column sort handler
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

  // Export handler
  const handleExport = () => {
    exportBooksToJson(books, franchises);
  };

  // Import handler
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importResult = await importBooksFromJson(file);
      onImport(importResult.books, importResult.userProfile, importResult.franchises);
      addToast(lang === 'ru' ? `Успешно импортировано ${importResult.books.length} книг(и)` : `Successfully imported ${importResult.books.length} book(s)`, 'success');
    } catch (error) {
      addToast(lang === 'ru' ? (error instanceof Error ? error.message : 'Ошибка при импорте файла') : 'Error importing file', 'error');
      console.error(error);
    } finally {
      setIsImporting(false);
      // Clear input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Toast messages={toasts} onRemove={removeToast} />
      
      {/* Top bar with actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#1E2920]">{t.library}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRandomBook}
              disabled={books.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#5A7A60] disabled:bg-[#D6E1D8] disabled:cursor-not-allowed transition-colors"
              title={lang === 'ru' ? 'Случайная книга' : 'Random Book'}
            >
              <Dices size={18} />
            </button>
            
            <button
              onClick={handleExport}
              disabled={books.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-[#9E8F8F] text-white rounded-lg hover:bg-[#887777] disabled:bg-[#D6E1D8] disabled:cursor-not-allowed transition-colors"
              title={lang === 'ru' ? 'Экспортировать в JSON' : 'Export to JSON'}
            >
              <Upload size={18} />
            </button>
            
            <label
              className="flex items-center gap-2 px-3 py-2 bg-[#846B90]/60 text-white rounded-lg hover:bg-[#846B90] transition-colors cursor-pointer"
              title="Импорт в формате JSON"
            >
              <Download size={18} />
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
        
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b9071] w-full"
            />
          </div>
          
          {/* Filter dropdown (grid view only) */}
          {viewMode !== 'table' && (
            <FilterDropdown
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
              selectedStatuses={selectedStatuses}
              onToggleStatus={(status: BookStatus | 'All') => {
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
                  // Remove 'All' if selecting specific status
                  newStatuses.delete('All');
                  
                  if (newStatuses.has(status)) {
                    newStatuses.delete(status);
                  } else {
                    newStatuses.add(status);
                  }
                  
                  // If all 5 statuses selected, switch to 'All'
                  const TOTAL_STATUSES = 5;
                  if (newStatuses.size === TOTAL_STATUSES) {
                    newStatuses.clear();
                    newStatuses.add('All');
                  }
                  
                  // If nothing selected, select 'All'
                  if (newStatuses.size === 0) {
                    newStatuses.add('All');
                  }
                }
                
                setSelectedStatuses(newStatuses);
                saveFilterStatuses(newStatuses);
              }}
              lang={lang}
            />
          )}

          {/* View mode buttons */}
          <ViewModeButtons
            currentMode={viewMode}
            onModeChange={handleViewModeChange}
            lang={lang}
          />

          {/* Add book button */}
          <button
            onClick={onAddBook}
            className="flex items-center gap-2 bg-[#6B9071] hover:bg-[#59785E] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t.addBook}</span>
          </button>
        </div>
      </div>

      {/* Content area */}
      {viewMode === 'table' ? (
        <div className="flex gap-6">
          <FilterPanel
            books={books}
            selectedStatuses={selectedStatuses}
            onToggleStatus={(status: BookStatus | 'All') => {
              const newStatuses = new Set(selectedStatuses);
              
              if (status === 'All') {
                newStatuses.clear();
                newStatuses.add('All');
              } else {
                newStatuses.delete('All');
                
                if (newStatuses.has(status)) {
                  newStatuses.delete(status);
                } else {
                  newStatuses.add(status);
                }
                
                const TOTAL_STATUSES = 5;
                if (newStatuses.size === TOTAL_STATUSES) {
                  newStatuses.clear();
                  newStatuses.add('All');
                }
                
                if (newStatuses.size === 0) {
                  newStatuses.add('All');
                }
              }
              
              setSelectedStatuses(newStatuses);
              saveFilterStatuses(newStatuses);
            }}
            currentSortOption={tableSortOption}
            onSortChange={handleTableSortChange}
            lang={lang}
          />
          <div className="flex-1 space-y-3 min-w-0">
            {filteredBooks.length > 0 ? getTableSortedBooks(filteredBooks).map(book => (
              <BookTableRow
                key={book.id}
                book={book}
                onEdit={() => onEdit(book)}
                onDelete={() => onDelete(book.id)}
                onAddToQueue={() => onAddToQueue(book)}
                lang={lang}
              />
            )) : (
              <EmptyState lang={lang} hasBooks={books.length > 0} />
            )}
          </div>
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onEdit={() => onEdit(book)} 
              onDelete={() => onDelete(book.id)}
              onAddToQueue={() => onAddToQueue(book)}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <EmptyState lang={lang} hasBooks={books.length > 0} />
      )}

      {/* Random book modal */}
      <RandomBookModal
        isOpen={isRandomModalOpen}
        book={randomBook}
        onClose={() => setIsRandomModalOpen(false)}
        onAddToQueue={onAddToQueue}
        onStartReading={onStartReading}
        lang={lang}
      />
    </div>
  );
};

export default CatalogView;
