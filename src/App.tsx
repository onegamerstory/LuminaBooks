
import React, { useState, useEffect } from 'react';
import { Book, ViewType } from './types';
import { CatalogView } from './components';
import FranchiseView from './components/FranchiseView';
import CalendarView from './components/CalendarView';
import StatisticsView from './components/StatisticsView';
import ReadingView from './components/ReadingView';
import BookModal from './components/BookModal';
import BookRatingModal from './components/BookRatingModal';
import SettingsModal from './components/UserProfileModal';
import Toast from './components/Toast';
import AchievementNotification from './components/AchievementNotification';
import ConfirmationModal from './components/ConfirmationModal';
import { Calendar, Library, Languages, BarChart3, Zap, Settings, Link, RefreshCw } from 'lucide-react';
import { useToast } from './hooks/useToast';
import { useConfirmation } from './hooks/useConfirmation';
import { useSettings } from './hooks/useSettings';
import { useDbApi } from './hooks/useDbApi';
import { useFranchises } from './hooks/useFranchises';
import { useBooks } from './hooks/useBooks';
import { useAchievements } from './hooks/useAchievements';
import { useSync } from './hooks/useSync';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { translations } from './utils/translations';
import appIcon from '../resources/icon.png';

export { translations };

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('catalog');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { toasts, addToast, removeToast } = useToast();
  const { lang, setLang, toggleLang, t, defaultCoverUrl, setDefaultCoverUrl, googleApiKey, setGoogleApiKey, serverUrl, setServerUrl, autoSync, setAutoSync, launchAtStartup, setLaunchAtStartup } = useSettings();
  const { dbApiRef, getDbApi } = useDbApi();
  const { confirmationModal, showConfirmation, closeConfirmation } = useConfirmation(lang);
  // useFranchises вызывается первой (setBooks опционален и будет передан после инициализации useBooks)
  const { franchises, setFranchises, handleAddFranchise, handleUpdateFranchise, handleDeleteFranchise } = useFranchises({
    getDbApi,
    getSetBooks: () => setBooks,
  });
  const {
    books, setBooks, editingBook, setEditingBook, isModalOpen, setIsModalOpen, bookToRateId, setBookToRateId,
    handleEdit, handleDelete, handleAddBook, handleAddToQueue, handleStartReadingBook,
    handleImport, handleUpdateBook, handleStartReading, handleBooksUpdated,
  } = useBooks({ getDbApi, addToast, showConfirmation, lang, t, setFranchises });
  const { achievementQueue, handleDismissAchievement, notifiedAchievementsRef } = useAchievements({ books, lang, getDbApi });
  const { syncing, handleManualSync } = useSync({
    dbApiRef, getDbApi, setBooks, setFranchises,
    setDefaultCoverUrl, setGoogleApiKey, setServerUrl,
    setLang, addToast, lang, autoSync, notifiedAchievementsRef,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Определяем платформу для применения macOS стилей
  const isMac = typeof window !== 'undefined' && window.electronAPI?.isMac === true;

  return (
    <MantineProvider>
      <div className="min-h-screen bg-page">
      <header
        className={`sticky top-0 z-30 ${isMac ? 'pt-8' : ''}`}
        style={{
          backgroundColor: 'color-mix(in oklab, var(--surface), transparent 8%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="LuminaBooks" className="w-9 h-9" />
            <h1 className="text-lg font-display tracking-tight" style={{ color: 'var(--fg)' }}>LuminaBooks</h1>
          </div>

          <nav className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
            <button
              onClick={() => setActiveView('statistics')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'statistics' ? 'var(--accent)' : 'transparent',
                color: activeView === 'statistics' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <BarChart3 size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Профиль' : 'Profile'}</span>
            </button>
            <button
              onClick={() => setActiveView('catalog')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'catalog' ? 'var(--accent)' : 'transparent',
                color: activeView === 'catalog' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Library size={17} />
              <span className="hidden sm:inline">{t.catalog}</span>
            </button>
            <button
              onClick={() => setActiveView('collections')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'collections' ? 'var(--accent)' : 'transparent',
                color: activeView === 'collections' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Link size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Коллекции' : 'Collections'}</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'calendar' ? 'var(--accent)' : 'transparent',
                color: activeView === 'calendar' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Calendar size={17} />
              <span className="hidden sm:inline">{t.calendar}</span>
            </button>
            <button
              onClick={() => setActiveView('reading')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeView === 'reading' ? 'var(--accent)' : 'transparent',
                color: activeView === 'reading' ? 'var(--accent-on)' : 'var(--muted)',
              }}
            >
              <Zap size={17} />
              <span className="hidden sm:inline">{lang === 'ru' ? 'Чтение' : 'Reading'}</span>
            </button>
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--muted)' }}
              title="Switch Language"
            >
              <Languages size={17} />
              <span className="text-xs font-bold uppercase tracking-wider">{lang}</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ color: 'var(--muted)' }}
              title={lang === 'ru' ? 'Синхронизировать данные' : 'Sync data'}
            >
              <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ color: 'var(--muted)' }}
              title={lang === 'ru' ? 'Настройки' : 'Settings'}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeView === 'catalog' ? (
          <CatalogView 
            books={books} 
            franchises={franchises}
            onEdit={handleEdit} 
            onDelete={handleDelete}
            onAddToQueue={handleAddToQueue}
            onStartReading={handleStartReadingBook}
            onImport={handleImport}
            lang={lang}
            onAddBook={() => {
              setEditingBook(undefined);
              setIsModalOpen(true);
            }}
          />
        ) : activeView === 'collections' ? (
          <FranchiseView 
            franchises={franchises}
            books={books}
            onAddFranchise={handleAddFranchise}
            onUpdateFranchise={handleUpdateFranchise}
            onDeleteFranchise={handleDeleteFranchise}
            onBooksUpdated={handleBooksUpdated}
            lang={lang}
          />
        ) : activeView === 'calendar' ? (
          <CalendarView 
            books={books} 
            lang={lang}
            onStartReading={handleStartReading}
          />
        ) : activeView === 'reading' ? (
          <ReadingView 
            books={books} 
            onUpdateBook={handleUpdateBook}
            lang={lang}
          />
        ) : (
          <StatisticsView 
            books={books} 
            lang={lang}
          />
        )}
      </main>

      {isModalOpen && (
        <BookModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleAddBook}
          initialData={editingBook}
          lang={lang}
          defaultCoverUrl={defaultCoverUrl}
          franchises={franchises}
          onFranchisesUpdated={handleAddFranchise}
          googleApiKey={googleApiKey}
          onLocalSearch={async (title, author) => {
            const api = getDbApi();
            return api?.searchBooksDictionary?.(title, author) ?? [];
          }}
          onSaveToDictionary={async (entry) => {
            const api = getDbApi();
            await api?.saveToBooksDictionary?.(entry);
          }}
        />
      )}

      {isProfileOpen && (
        <SettingsModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)}
          onSave={async (profile) => {
            const api = getDbApi();
            if (api) {
              await api.setUserProfile({ ...profile, achievements: profile.achievements || [] });
            }
            setGoogleApiKey(profile.googleApiKey || '');
          }}
          autoSync={autoSync}
          onAutoSyncChange={(value) => {
            setAutoSync(value);
            localStorage.setItem('lumina_auto_sync', String(value));
          }}
          launchAtStartup={launchAtStartup}
          onLaunchAtStartupChange={(value) => {
            setLaunchAtStartup(value);
            window.electronAPI?.setLoginItemSettings?.({ openAtLogin: value });
          }}
          serverUrl={serverUrl}
          lang={lang}
        />
      )}

      {bookToRateId && (
        <BookRatingModal
          isOpen={true}
          onClose={() => setBookToRateId(null)}
          onSubmit={(rating, review) => {
            setBooks(prevBooks => prevBooks.map(b => 
              b.id === bookToRateId 
                ? { ...b, rating, ...(review ? { description: review } : {}) }
                : b
            ));
            setBookToRateId(null);
          }}
          onSkip={() => setBookToRateId(null)}
          bookTitle={books.find(b => b.id === bookToRateId)?.title || ''}
          lang={lang}
        />
      )}

      <AchievementNotification
        queue={achievementQueue}
        onDismiss={handleDismissAchievement}
        lang={lang}
      />

      <Toast messages={toasts} onRemove={removeToast} />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
        onConfirm={async () => {
          await confirmationModal.onConfirm();
          closeConfirmation();
        }}
        onCancel={closeConfirmation}
        isDangerous={confirmationModal.isDangerous}
      />
      
      <footer className="py-6 text-center text-sm" style={{ color: 'var(--meta)', borderTop: '1px solid var(--border-soft)' }}>
        &copy; {new Date().getFullYear()} LuminaBooks. {lang === 'ru' ? 'Следите за своим прогрессом чтения.' : 'Track your reading journey.'}
      </footer>
    </div>
    </MantineProvider>
  );
};

export default App;
