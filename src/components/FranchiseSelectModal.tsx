import React, { useState, useEffect } from 'react';
import { Franchise, Book } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';
import { translations } from '../utils/translations';

interface FranchiseSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedFranchiseIds: string[], newFranchiseName?: string) => void;
  franchises: Franchise[];
  selectedFranchiseIds: string[];
  lang: 'en' | 'ru';
}

const FranchiseSelectModal: React.FC<FranchiseSelectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  franchises,
  selectedFranchiseIds,
  lang,
}) => {
  const t = translations[lang];
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFranchiseIds);
  const [newFranchiseName, setNewFranchiseName] = useState('');
  const [createNew, setCreateNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(selectedFranchiseIds);
      setNewFranchiseName('');
      setCreateNew(false);
    }
  }, [isOpen, selectedFranchiseIds]);

  const handleToggleFranchise = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedIds, createNew ? newFranchiseName : undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'color-mix(in oklab, var(--fg), transparent 50%)', backdropFilter: 'blur(4px)'}}>
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-overlay animate-in zoom-in duration-200">
        <div className="sticky top-0 bg-surface border-b border-default px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-fg">
            {lang === 'ru' ? 'Выбрать коллекции' : 'Select Collections'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-page rounded-full text-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Существующие коллекции */}
          {franchises.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-fg mb-3">
                {lang === 'ru' ? 'Добавить в существующие коллекции' : 'Add to existing collections'}
              </label>
              <div className="space-y-2">
                {franchises.map((franchise) => (
                  <label
                    key={franchise.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-page cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(franchise.id)}
                      onChange={() => handleToggleFranchise(franchise.id)}
                      className="w-4 h-4 rounded text-accent cursor-pointer"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-fg">{franchise.name}</p>
                      <p className="text-xs text-muted">
                        {franchise.bookIds.length} {lang === 'ru' ? 'книг' : 'books'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {franchises.length === 0 && !createNew && (
            <div className="text-center py-4">
              <p className="text-sm text-muted mb-3">
                {lang === 'ru' ? 'Нет доступных коллекций' : 'No collections available'}
              </p>
            </div>
          )}

          {/* Создать новую коллекцию */}
          <div className="border-t border-default pt-4">
            {!createNew ? (
              <button
                onClick={() => setCreateNew(true)}
                className="w-full flex items-center gap-2 justify-center p-2 border border-dashed border-default rounded-lg hover:bg-page text-muted transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">
                  {lang === 'ru' ? 'Или создать новую коллекцию' : 'Or create new collection'}
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-fg">
                  {lang === 'ru' ? 'Название новой коллекции' : 'New collection name'}
                </label>
                <input
                  type="text"
                  value={newFranchiseName}
                  onChange={(e) => setNewFranchiseName(e.target.value)}
                  placeholder={lang === 'ru' ? 'Введите название...' : 'Enter name...'}
                  className="w-full px-4 py-2 bg-surface border border-accent/30 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setCreateNew(false);
                    setNewFranchiseName('');
                  }}
                  className="w-full text-sm text-muted hover:text-fg py-2"
                >
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
              </div>
            )}
          </div>

          {/* Кнопки действия */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface border border-default text-fg rounded-lg hover:bg-page transition-colors font-medium"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover transition-colors font-medium"
            >
              {lang === 'ru' ? 'Применить' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FranchiseSelectModal;
