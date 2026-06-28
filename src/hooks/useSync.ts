import React, { useState, useEffect, useCallback } from 'react';
import { Book, Franchise } from '../types';
import type { ElectronDBAPI } from '../electron.d';
import { migrateAllBooksStatusHistory } from '../utils/statusHistoryUtils';
import { syncStatusFromHistory, updateBookStatusBasedOnDates } from '../utils/statusUtils';
import { httpApi } from '../api';

interface UseSyncDeps {
  dbApiRef: React.MutableRefObject<ElectronDBAPI | null>;
  getDbApi: () => ElectronDBAPI | null;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  setFranchises: React.Dispatch<React.SetStateAction<Franchise[]>>;
  setDefaultCoverUrl: React.Dispatch<React.SetStateAction<string>>;
  setGoogleApiKey: React.Dispatch<React.SetStateAction<string>>;
  setServerUrl: React.Dispatch<React.SetStateAction<string>>;
  setLang: React.Dispatch<React.SetStateAction<'en' | 'ru'>>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  lang: 'en' | 'ru';
  autoSync: boolean;
  notifiedAchievementsRef: React.MutableRefObject<Set<string>>;
}

export function useSync({
  dbApiRef, getDbApi, setBooks, setFranchises,
  setDefaultCoverUrl, setGoogleApiKey, setServerUrl,
  setLang, addToast, lang, autoSync, notifiedAchievementsRef,
}: UseSyncDeps) {
  const [syncing, setSyncing] = useState(false);

  const syncDataFromApi = useCallback(async (api: ElectronDBAPI) => {
    // Профиль загружаем первым, чтобы ref с ачивками был заполнен
    try {
      const profile = await api.getUserProfile();
      if (profile) {
        const dbAchievements = new Set(profile.achievements || []);

        for (const id of dbAchievements) {
          notifiedAchievementsRef.current.add(id);
        }

        const unsaved = [...notifiedAchievementsRef.current].filter(id => !dbAchievements.has(id));
        if (unsaved.length > 0) {
          profile.achievements = [...notifiedAchievementsRef.current];
          await api.setUserProfile(profile);
        }

        localStorage.setItem('lumina_user_profile', JSON.stringify(profile));
        if (profile.defaultCoverUrl) {
          setDefaultCoverUrl(profile.defaultCoverUrl);
        }
        if (profile.googleApiKey) {
          setGoogleApiKey(profile.googleApiKey);
        }
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }

    const loadedBooks = await api.getAllBooks();
    if (loadedBooks && loadedBooks.length > 0) {
      const normalizedBooks = loadedBooks.map((book: Book) => ({
        ...book,
        startDate: book.startDate?.trim() || '',
        endDate: book.endDate?.trim() || '',
      }));
      let migratedBooks = migrateAllBooksStatusHistory(normalizedBooks);
      let updatedBooks = updateBookStatusBasedOnDates(migratedBooks);
      updatedBooks = syncStatusFromHistory(updatedBooks);
      setBooks(updatedBooks);
    } else {
      setBooks([]);
    }

    const loadedFranchises = await api.getAllFranchises();
    if (loadedFranchises && loadedFranchises.length > 0) {
      setFranchises(loadedFranchises);
    } else {
      setFranchises([]);
    }
  }, [setBooks, setFranchises, setDefaultCoverUrl, setGoogleApiKey, notifiedAchievementsRef]);

  const handleManualSync = async () => {
    if (syncing) return;
    const api = getDbApi();
    if (!api) {
      addToast(lang === 'ru' ? 'Нет активного подключения к базе данных' : 'No active database connection', 'error');
      return;
    }
    setSyncing(true);
    try {
      await syncDataFromApi(api);
      addToast(lang === 'ru' ? 'Данные обновлены' : 'Data updated', 'success');
    } catch (e) {
      console.error('[Sync]', e);
      addToast(lang === 'ru' ? 'Ошибка синхронизации' : 'Sync failed', 'error');
    }
    setSyncing(false);
  };

  // Загрузка данных при старте
  useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI?.db) {
          dbApiRef.current = window.electronAPI.db;

          const legacyBooks = localStorage.getItem('lumina_books_v1');
          const legacyFranchises = localStorage.getItem('lumina_franchises_v1');
          const needMigrate = (legacyBooks || legacyFranchises) && !localStorage.getItem('lumina_migrated');

          if (needMigrate) {
            const result = await window.electronAPI.db.migrate();
            localStorage.setItem('lumina_migrated', 'true');
            localStorage.removeItem('lumina_books_v1');
            localStorage.removeItem('lumina_franchises_v1');
            console.log(`Migrated ${result.books} books and ${result.franchises} franchises to SQLite`);
          }

          await syncDataFromApi(window.electronAPI.db);
        } else {
          let httpAvailable = false;
          try {
            const resp = await fetch('/api/status');
            httpAvailable = resp.ok;
          } catch {}

          if (httpAvailable) {
            dbApiRef.current = httpApi;
            try {
              await syncDataFromApi(httpApi);
            } catch (e) {
              console.error("Failed to load data via HTTP API", e);
            }
          } else {
            const saved = localStorage.getItem('lumina_books_v1');
            if (saved) {
              try {
                const loadedBooks = JSON.parse(saved);
                const normalizedBooks = loadedBooks.map((book: Book) => ({
                  ...book,
                  startDate: book.startDate?.trim() || '',
                  endDate: book.endDate?.trim() || '',
                }));
                let migratedBooks = migrateAllBooksStatusHistory(normalizedBooks);
                let updatedBooks = updateBookStatusBasedOnDates(migratedBooks);
                updatedBooks = syncStatusFromHistory(updatedBooks);
                setBooks(updatedBooks);
              } catch (e) {
                console.error("Failed to load books from localStorage", e);
              }
            }

            const savedFranchises = localStorage.getItem('lumina_franchises_v1');
            if (savedFranchises) {
              try {
                setFranchises(JSON.parse(savedFranchises));
              } catch (e) {
                console.error("Failed to load franchises from localStorage", e);
              }
            }

            const profileSaved = localStorage.getItem('lumina_user_profile');
            if (profileSaved) {
              try {
                const profile = JSON.parse(profileSaved);
                setDefaultCoverUrl(profile.defaultCoverUrl || '');
              } catch (e) {
                const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
                if (savedDefaultCoverUrl) setDefaultCoverUrl(savedDefaultCoverUrl);
              }
            } else {
              const savedDefaultCoverUrl = localStorage.getItem('lumina_default_cover_url');
              if (savedDefaultCoverUrl) setDefaultCoverUrl(savedDefaultCoverUrl);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }

      if (window.electronAPI?.getServerUrl) {
        try {
          const url = await window.electronAPI.getServerUrl();
          setServerUrl(url);
        } catch {}
      }

      // Настройки из localStorage (всегда)
      const savedLang = localStorage.getItem('lumina_lang');
      if (savedLang === 'en' || savedLang === 'ru') {
        setLang(savedLang);
      }

      // Если ref пуст — инициализируем из localStorage (standalone fallback)
      if (notifiedAchievementsRef.current.size === 0) {
        try {
          const saved = JSON.parse(localStorage.getItem('lumina_achievements_unlocked') || '[]');
          if (Array.isArray(saved)) {
            notifiedAchievementsRef.current = new Set(saved);
          }
        } catch {}
      }
    };

    loadData();
  }, [syncDataFromApi, dbApiRef, setBooks, setFranchises, setDefaultCoverUrl, setGoogleApiKey, setServerUrl, setLang, notifiedAchievementsRef]);

  // Периодическая синхронизация
  useEffect(() => {
    const api = getDbApi();
    if (!api || !autoSync) return;

    const poll = async () => {
      try {
        await syncDataFromApi(api);
      } catch {}
    };

    const interval = setInterval(poll, 30000);

    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') poll();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncDataFromApi, autoSync, getDbApi]);

  return { syncing, handleManualSync, syncDataFromApi };
}
