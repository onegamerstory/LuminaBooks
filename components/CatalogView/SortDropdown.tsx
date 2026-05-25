/**
 * SortDropdown - Column Sort Dropdown Component
 * 
 * Provides sorting options for table view:
 * - Rating (ascending/descending)
 * - Title (A-Z / Z-A)
 * - Status (A-Z / Z-A)  
 * - Pages (ascending/descending)
 */

import React, { useEffect } from 'react';
import { ChevronDown, TrendingDown, TrendingUp, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01 } from 'lucide-react';
import { translations } from '../../utils/translations';

type TableSortOption = 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc' | 'status-asc' | 'status-desc' | 'pages-desc' | 'pages-asc';

interface SortDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  currentOption: TableSortOption;
  onChange: (option: TableSortOption) => void;
  lang: 'en' | 'ru';
}

const SortDropdown: React.FC<SortDropdownProps> = ({ 
  isOpen, 
  onToggle, 
  currentOption, 
  onChange,
  lang 
}) => {
  const t = translations[lang];

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.sort-dropdown-container')) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const renderRatingSection = () => (
    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Рейтинг' : 'Rating'}</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onChange('rating-desc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'rating-desc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'По убыванию' : 'Descending'}
          >
            <TrendingDown size={16} />
          </button>
          <button
            onClick={() => {
              onChange('rating-asc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'rating-asc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'По возрастанию' : 'Ascending'}
          > 
            <TrendingUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderTitleSection = () => (
    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Название' : 'Name'}</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onChange('title-asc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'title-asc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'A-Z' : 'A-Z'}
          >
            <ArrowDownAZ size={16} />
          </button>
          <button
            onClick={() => {
              onChange('title-desc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'title-desc'
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
  );

  const renderStatusSection = () => (
    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Статус' : 'Status'}</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onChange('status-desc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'status-desc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'A-Z' : 'A-Z'}
          >
            <ArrowDownAZ size={16} />
          </button>
          <button
            onClick={() => {
              onChange('status-asc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'status-asc'
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
  );

  const renderPagesSection = () => (
    <div className="border-b border-slate-100 last:border-0 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-700 font-medium">{lang === 'ru' ? 'Страницы' : 'Pages'}</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onChange('pages-desc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'pages-desc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'По убыванию' : 'Descending'}
          >
            <ArrowDown01 size={16} />
          </button>
          <button
            onClick={() => {
              onChange('pages-asc');
              onToggle();
            }}
            className={`p-2 rounded transition-colors ${
              currentOption === 'pages-asc'
                ? 'bg-[#6b9071] text-white'
                : 'text-slate-600 hover:bg-[#D6E1D8]'
            }`}
            title={lang === 'ru' ? 'По возрастанию' : 'Ascending'}
          >
            <ArrowUp01 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative sort-dropdown-container">
      {/* Sort Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 bg-[#F0F4F1] border border-slate-200 rounded-lg px-3 py-2.5 hover:border-slate-300 transition-colors"
      >
        {(currentOption === 'rating-desc' || currentOption === 'rating-asc') && (
          <>
            <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Рейтинг' : 'Rating'}</span>
            {currentOption === 'rating-desc' && <TrendingDown size={16} className="text-slate-600" />}
            {currentOption === 'rating-asc' && <TrendingUp size={16} className="text-slate-600" />}
          </>
        )}
        {(currentOption === 'title-asc' || currentOption === 'title-desc') && (
          <>
            <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Название' : 'Name'}</span>
            {currentOption === 'title-asc' && <ArrowDownAZ size={16} className="text-slate-600" />}
            {currentOption === 'title-desc' && <ArrowUpAZ size={16} className="text-slate-600" />}
          </>
        )}
        {(currentOption === 'status-asc' || currentOption === 'status-desc') && (
          <>
            <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Статус' : 'Status'}</span>
            {currentOption === 'status-desc' && <ArrowDownAZ size={16} className="text-slate-600" />}
            {currentOption === 'status-asc' && <ArrowUpAZ size={16} className="text-slate-600" />}
          </>
        )}
        {(currentOption === 'pages-asc' || currentOption === 'pages-desc') && (
          <>
            <span className="text-sm text-[#1E2920] font-medium">{lang === 'ru' ? 'Страницы' : 'Pages'}</span>
            {currentOption === 'pages-desc' && <ArrowDown01 size={16} className="text-slate-600" />}
            {currentOption === 'pages-asc' && <ArrowUp01 size={16} className="text-slate-600" />}
          </>
        )}
        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={onToggle}
          />
          <div className="absolute top-full mt-2 right-0 bg-[#F0F4F1] border border-slate-200 rounded-lg shadow-lg z-20 min-w-max">
            {renderRatingSection()}
            {renderTitleSection()}
            {renderStatusSection()}
            {renderPagesSection()}
          </div>
        </>
      )}
    </div>
  );
};

export default SortDropdown;
