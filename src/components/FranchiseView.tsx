import React, { useState } from 'react';
import { Book, Franchise } from '../types';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { translations } from '../utils/translations';
import { handleCoverError } from '../utils/coverUtils';
import FranchiseModal from './FranchiseModal.tsx';
import Toast, { ToastMessage } from './Toast';
import ConfirmationModal from './ConfirmationModal';

interface FranchiseViewProps {
  franchises: Franchise[];
  books: Book[];
  onAddFranchise: (franchise: Franchise) => void;
  onUpdateFranchise: (franchise: Franchise) => void;
  onDeleteFranchise: (id: string) => void;
  onBooksUpdated: (books: Book[]) => void;
  lang: 'en' | 'ru';
}

const FranchiseCard: React.FC<{
  franchise: Franchise;
  books: Book[];
  onEdit: () => void;
  onDelete: () => void;
  lang: 'en' | 'ru';
}> = ({ franchise, books, onEdit, onDelete, lang }) => {
  const franchiseBooks = books.filter(b => franchise.bookIds.includes(b.id));
  const displayBooks = franchiseBooks.slice(0, 3);
  const remainingCount = franchiseBooks.length - displayBooks.length;

  return (
    <div className="bg-[#F0F4F1] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#C8D6CB] flex flex-col h-full">
      {/* Обложка коллекции или стопка обложек книг */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden">
        {franchise.coverUrl ? (
          <img
            src={franchise.coverUrl}
            alt={franchise.name}
            className="w-full h-full object-cover"
            onError={handleCoverError}
          />
        ) : displayBooks.length > 0 ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {displayBooks.map((book, idx) => (
              <div
                key={book.id}
                className="absolute transition-transform hover:scale-105"
                style={{
                  transform: `rotate(${(idx - 1) * 8}deg) translateY(${(idx - 1) * 15}px)`,
                  zIndex: idx,
                }}
              >
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-40 w-24 object-cover rounded-lg shadow-lg border-2 border-white"
                  onError={handleCoverError}
                />
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="absolute bottom-4 right-4 bg-[#6B9071] text-white px-2 py-1 rounded text-xs font-bold">
                +{remainingCount}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p className="text-sm">{lang === 'ru' ? 'Нет книг' : 'No books'}</p>
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-[#1E2920] line-clamp-2 text-lg leading-tight mb-2">
          {franchise.name}
        </h3>

        {franchise.description && (
          <p className="text-slate-500 text-xs line-clamp-2 italic mb-3 border-t border-slate-300 pt-2">
            {franchise.description}
          </p>
        )}

        <div className="text-slate-500 text-sm mb-3 flex-grow">
          {franchiseBooks.length} {lang === 'ru' ? 'книг' : 'books'}
        </div>

        {/* Кнопки действия */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 p-2 bg-white border border-slate-300 text-[#1E2920] rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
            title={lang === 'ru' ? 'Редактировать' : 'Edit'}
          >
            <Edit2 size={16} className="inline mr-1" />
            {lang === 'ru' ? 'Ред.' : 'Edit'}
          </button>
          <button
            onClick={onDelete}
            className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
            title={lang === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash2 size={16} className="inline mr-1" />
            {lang === 'ru' ? 'Удалить' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FranchiseView: React.FC<FranchiseViewProps> = ({
  franchises,
  books,
  onAddFranchise,
  onUpdateFranchise,
  onDeleteFranchise,
  onBooksUpdated,
  lang,
}) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    franchiseId: string | null;
  }>({
    isOpen: false,
    franchiseId: null,
  });

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const filteredFranchises = franchises.filter(
    (f) => f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFranchise(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmationModal({
      isOpen: true,
      franchiseId: id,
    });
  };

  const confirmDelete = () => {
    if (confirmationModal.franchiseId) {
      onDeleteFranchise(confirmationModal.franchiseId);
      addToast(
        lang === 'ru' ? 'Коллекция удалена' : 'Collection deleted',
        'success'
      );
      setConfirmationModal({
        isOpen: false,
        franchiseId: null,
      });
    }
  };

  const handleSubmit = (franchise: Franchise, updatedBooks: Book[]) => {
    if (editingFranchise) {
      onUpdateFranchise(franchise);
      addToast(
        lang === 'ru' ? 'Коллекция обновлена' : 'Collection updated',
        'success'
      );
    } else {
      onAddFranchise(franchise);
      addToast(
        lang === 'ru' ? 'Коллекция создана' : 'Collection created',
        'success'
      );
    }
    onBooksUpdated(updatedBooks);
    setIsModalOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Заголовок и поиск */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-[#1E2920] mb-2">
            {lang === 'ru' ? 'Коллекции' : 'Collections'}
          </h1>
          <p className="text-sm text-slate-500">
            {lang === 'ru'
              ? (() => {
                  const n = franchises.length;
                  const lastDigit = n % 10;
                  const lastTwoDigits = n % 100;
                  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${n} коллекций`;
                  if (lastDigit === 1) return `${n} коллекция`;
                  if (lastDigit >= 2 && lastDigit <= 4) return `${n} коллекции`;
                  return `${n} коллекций`;
                })()
              : `${franchises.length} ${franchises.length === 1 ? 'collection' : 'collections'}`}
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#5A7A60] transition-colors font-semibold shadow-lg shadow-[#6B9071]/20 whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">
            {lang === 'ru' ? 'Новая коллекция' : 'New Collection'}
          </span>
        </button>
      </div>

      {/* Поиск */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={
            lang === 'ru' ? 'Поиск коллекций...' : 'Search collections...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:ring-2 focus:ring-[#6B9071] outline-none"
        />
      </div>

      {/* Сетка коллекцию */}
      {filteredFranchises.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-grow">
          {filteredFranchises.map((franchise) => (
            <FranchiseCard
              key={franchise.id}
              franchise={franchise}
              books={books}
              onEdit={() => handleEdit(franchise)}
              onDelete={() => handleDelete(franchise.id)}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-center">
          <div>
            <p className="text-slate-400 mb-2">
              {searchTerm
                ? lang === 'ru'
                  ? 'Коллекции не найдены'
                  : 'No collections found'
                : lang === 'ru'
                ? 'Нет коллекций'
                : 'No collections yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAdd}
                className="text-[#6B9071] hover:text-[#5A7A60] font-semibold"
              >
                {lang === 'ru' ? 'Создать первую' : 'Create your first one'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <FranchiseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingFranchise}
          books={books}
          lang={lang}
        />
      )}

      {/* Тосты */}
      <Toast 
        messages={toasts} 
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* Модаль подтверждения удаления */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={lang === 'ru' ? 'Удалить коллекцию' : 'Delete Collection'}
        message={lang === 'ru' ? 'Вы уверены, что хотите удалить эту коллекцию?' : 'Are you sure you want to delete this collection?'}
        confirmText={lang === 'ru' ? 'Удалить' : 'Delete'}
        cancelText={lang === 'ru' ? 'Отмена' : 'Cancel'}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmationModal({ isOpen: false, franchiseId: null })}
        isDangerous={true}
      />
    </div>
  );
};

export default FranchiseView;
