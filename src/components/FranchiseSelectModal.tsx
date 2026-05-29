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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#1E2920]">
            {lang === 'ru' ? 'Выбрать коллекции' : 'Select Collections'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Существующие коллекции */}
          {franchises.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-3">
                {lang === 'ru' ? 'Добавить в существующие коллекции' : 'Add to existing collections'}
              </label>
              <div className="space-y-2">
                {franchises.map((franchise) => (
                  <label
                    key={franchise.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(franchise.id)}
                      onChange={() => handleToggleFranchise(franchise.id)}
                      className="w-4 h-4 rounded text-[#6B9071] cursor-pointer"
                    />
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-[#1E2920]">{franchise.name}</p>
                      <p className="text-xs text-slate-500">
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
              <p className="text-sm text-slate-500 mb-3">
                {lang === 'ru' ? 'Нет доступных коллекций' : 'No collections available'}
              </p>
            </div>
          )}

          {/* Создать новую коллекцию */}
          <div className="border-t pt-4">
            {!createNew ? (
              <button
                onClick={() => setCreateNew(true)}
                className="w-full flex items-center gap-2 justify-center p-2 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">
                  {lang === 'ru' ? 'Или создать новую коллекцию' : 'Or create new collection'}
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-600">
                  {lang === 'ru' ? 'Название новой коллекции' : 'New collection name'}
                </label>
                <input
                  type="text"
                  value={newFranchiseName}
                  onChange={(e) => setNewFranchiseName(e.target.value)}
                  placeholder={lang === 'ru' ? 'Введите название...' : 'Enter name...'}
                  className="w-full px-4 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:ring-2 focus:ring-[#6B9071] outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setCreateNew(false);
                    setNewFranchiseName('');
                  }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
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
              className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#5A7A60] transition-colors font-medium"
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
