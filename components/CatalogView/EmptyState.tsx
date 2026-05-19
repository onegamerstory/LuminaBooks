/**
 * EmptyState - Empty Library Message Component
 * 
 * Displays when no books are found after filtering/searching.
 */

import React from 'react';
import { Library } from 'lucide-react';
import { translations } from '../../App';

interface EmptyStateProps {
  lang: 'en' | 'ru';
}

const EmptyState: React.FC<EmptyStateProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#F0F4F1] rounded-2xl border-2 border-dashed border-[#6b9071]">
      <Library size={48} className="text-[#6b9071] mb-4 opacity-20" />
      <p className="text-lg text-[#6b9071]">{t.noBooks}</p>
      <p className="text-sm text-[#6b9071]">{t.tryAdding}</p>
    </div>
  );
};

export default EmptyState;
