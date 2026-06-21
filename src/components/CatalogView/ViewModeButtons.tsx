/**
 * ViewModeButtons - Grid/Table Toggle Buttons Component
 * 
 * Provides toggle buttons to switch between large grid and table view modes.
 */

import React from 'react';
import { Grid2x2, List } from 'lucide-react';
import { translations } from '../../utils/translations';

type ViewMode = 'large' | 'table';

interface ViewModeButtonsProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  lang: 'en' | 'ru';
}

const ViewModeButtons: React.FC<ViewModeButtonsProps> = ({ 
  currentMode, 
  onModeChange, 
  lang 
}) => {
  const t = translations[lang];

  return (
    <div className="flex gap-1 bg-page p-1 rounded-lg border border-slate-200">
      <button
        onClick={() => onModeChange('large')}
        className={`p-2 rounded-lg transition-colors ${
          currentMode === 'large'
            ? 'bg-accent text-accent-on'
            : 'bg-page text-slate-600 hover:bg-accent-soft'
        }`}
        title={lang === 'ru' ? 'Крупная сетка' : 'Large grid'}
      >
        <Grid2x2 size={18} />
      </button>
      <button
        onClick={() => onModeChange('table')}
        className={`p-2 rounded-lg transition-colors ${
          currentMode === 'table'
            ? 'bg-accent text-accent-on'
            : 'bg-page text-slate-600 hover:bg-accent-soft'
        }`}
        title={lang === 'ru' ? 'Таблица' : 'Table'}
      >
        <List size={18} />
      </button>
    </div>
  );
};

export default ViewModeButtons;
