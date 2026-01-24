
import React, { useState } from 'react';
import { Book, BookStatus } from '../types';
import BookCard from './BookCard';
import { Search, Filter, Library, Download, Upload } from 'lucide-react';
import { translations } from '../App';
import { exportBooksToExcel, importBooksFromExcel } from '../utils/excelUtils';

interface CatalogViewProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onImport: (books: Book[]) => void;
  lang: 'en' | 'ru';
}

const CatalogView: React.FC<CatalogViewProps> = ({ books, onEdit, onDelete, onImport, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'All'>('All');
  const [isImporting, setIsImporting] = useState(false);
  const t = translations[lang];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || book.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      alert(lang === 'ru' ? `Успешно импортировано ${importedBooks.length} книг(и)` : `Successfully imported ${importedBooks.length} book(s)`);
    } catch (error) {
      alert(lang === 'ru' ? 'Ошибка при импорте файла' : 'Error importing file');
      console.error(error);
    } finally {
      setIsImporting(false);
      // Очистка input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
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
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none w-full"
            >
              <option value="All">{t.allStatuses}</option>
              <option value={BookStatus.READING}>{t.reading}</option>
              <option value={BookStatus.READ}>{t.read}</option>
              <option value={BookStatus.WANT_TO_READ}>{t.toRead}</option>
            </select>
          </div>
        </div>
      </div>

      {filteredBooks.length > 0 ? (
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
