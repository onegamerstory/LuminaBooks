/**
 * FilterDropdown - Status Filter Dropdown Component
 * 
 * Allows users to filter books by status (Reading, Read, Want to Read, etc.).
 * Handles click-outside-to-close behavior and checkbox state management.
 */

import React, { useEffect } from 'react';
import { Filter } from 'lucide-react';
import { BookStatus } from '../../types';
import { translations } from '../../utils/translations';

interface FilterDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedStatuses: Set<BookStatus | 'All'>;
  onToggleStatus: (status: BookStatus | 'All') => void;
  lang: 'en' | 'ru';
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ 
  isOpen, 
  onToggle, 
  selectedStatuses, 
  onToggleStatus,
  lang 
}) => {
  const t = translations[lang];

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.filter-dropdown-container')) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const isAllSelected = selectedStatuses.has('All');
  const specificStatusesCount = Array.from(selectedStatuses).filter(s => s !== 'All').length;

  return (
    <div className="relative filter-dropdown-container">
      {/* Filter Button */}
      <button
        aria-label={isAllSelected ? t.allStatuses : `${specificStatusesCount} ${lang === 'ru' ? 'выбрано' : 'selected'}`}
        title={isAllSelected ? t.allStatuses : `${specificStatusesCount} ${lang === 'ru' ? 'выбрано' : 'selected'}`}
        onClick={onToggle}
        className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-2 py-2.5 transition-colors hover:border-accent sm:px-4"
      >
        <Filter size={18} className="text-accent" />
        <span className="hidden text-sm text-fg sm:inline">
          {isAllSelected 
            ? t.allStatuses 
            : `${specificStatusesCount} ${lang === 'ru' ? 'выбрано' : 'selected'}`
          }
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={onToggle}
          />
          <div className="absolute top-full mt-2 left-0 bg-surface border border-default rounded-xl shadow-lg z-20 min-w-max">
            {/* All Statuses */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => onToggleStatus('All')}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg font-medium">{t.allStatuses}</span>
            </label>

            {/* Reading */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={selectedStatuses.has(BookStatus.READING) && !isAllSelected}
                onChange={() => onToggleStatus(BookStatus.READING)}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg">{t.reading}</span>
            </label>

            {/* Read */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={selectedStatuses.has(BookStatus.READ) && !isAllSelected}
                onChange={() => onToggleStatus(BookStatus.READ)}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg">{t.read}</span>
            </label>

            {/* Want to Read */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={selectedStatuses.has(BookStatus.WANT_TO_READ) && !isAllSelected}
                onChange={() => onToggleStatus(BookStatus.WANT_TO_READ)}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg">{t.toRead}</span>
            </label>

            {/* Postponed */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={selectedStatuses.has(BookStatus.POSTPONED) && !isAllSelected}
                onChange={() => onToggleStatus(BookStatus.POSTPONED)}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg">{t.postponed}</span>
            </label>

            {/* Abandoned */}
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft cursor-pointer text-sm border-b border-default last:border-0">
              <input
                type="checkbox"
                checked={selectedStatuses.has(BookStatus.ABANDONED) && !isAllSelected}
                onChange={() => onToggleStatus(BookStatus.ABANDONED)}
                className="w-4 h-4 rounded-sm border-default cursor-pointer"
              />
              <span className="text-fg">{t.abandoned}</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterDropdown;
