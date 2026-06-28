import { useState, useEffect } from 'react';
import { Book, Franchise } from '../types';
import type { ElectronDBAPI } from '../electron.d';

interface UseFranchisesDeps {
  getDbApi: () => ElectronDBAPI | null;
  getSetBooks?: () => React.Dispatch<React.SetStateAction<Book[]>>;
}

export function useFranchises({ getDbApi, getSetBooks }: UseFranchisesDeps) {
  const [franchises, setFranchises] = useState<Franchise[]>([]);

  const handleAddFranchise = async (franchise: Franchise) => {
    setFranchises(prev => [...prev, franchise]);
    const api = getDbApi();
    if (api) {
      await api.addFranchise(franchise);
    }
  };

  const handleUpdateFranchise = async (updatedFranchise: Franchise) => {
    setFranchises(prev => prev.map(f => f.id === updatedFranchise.id ? updatedFranchise : f));
    const api = getDbApi();
    if (api) {
      await api.updateFranchise(updatedFranchise);
    }
  };

  const handleDeleteFranchise = async (id: string) => {
    setFranchises(prev => prev.filter(f => f.id !== id));
    const deleteApi = getDbApi();
    if (deleteApi) {
      await deleteApi.deleteFranchise(id);
    }
    const setBooksFn = getSetBooks?.();
    let updatedBooks: Book[] = [];
    if (setBooksFn) {
      setBooksFn(prev => {
        updatedBooks = prev.map(b => {
          const remainingFranchiseIds = (b.franchiseIds || []).filter((fid: string) => fid !== id);
          return {
            ...b,
            franchiseIds: remainingFranchiseIds,
            isPartOfSeries: remainingFranchiseIds.length > 0,
          };
        });
        return updatedBooks;
      });
    }
    if (deleteApi && setBooksFn) {
      for (const book of updatedBooks) {
        await deleteApi.updateBook(book);
      }
    }
  };

  // Браузерный fallback: сохраняем коллекции в localStorage (только если нет API)
  useEffect(() => {
    if (!window.electronAPI?.db && !getDbApi()) {
      localStorage.setItem('lumina_franchises_v1', JSON.stringify(franchises));
    }
  }, [franchises, getDbApi]);

  return {
    franchises,
    setFranchises,
    handleAddFranchise,
    handleUpdateFranchise,
    handleDeleteFranchise,
  };
}
