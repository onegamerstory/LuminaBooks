/**
 * EmptyState - Empty Library Message Component
 * 
 * Displays when no books are found after filtering/searching.
 */

import React from 'react';
import { Library } from 'lucide-react';
import { translations } from '../../utils/translations';

interface EmptyStateProps {
  lang: 'en' | 'ru';
  hasBooks?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ lang, hasBooks }) => {
  const t = translations[lang];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-page rounded-2xl border-2 border-dashed border-accent">
      <Library size={48} className="text-accent mb-4 opacity-20" />
      {hasBooks ? (
        <p className="text-lg text-accent">{t.noBooksFiltered}</p>
      ) : (
        <>
          <p className="text-lg text-accent">{t.noBooks}</p>
          <p className="text-sm text-accent">{t.tryAdding}</p>
        </>
      )}
    </div>
  );
};

export default EmptyState;
