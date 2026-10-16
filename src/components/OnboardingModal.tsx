import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Image, Power, RefreshCw, Sparkles, Upload, User } from 'lucide-react';
import type { UserProfileData } from '../electron.d';

interface OnboardingModalProps {
  lang: 'en' | 'ru';
  autoSync: boolean;
  launchAtStartup: boolean;
  onFinish: (profile: UserProfileData, autoSync: boolean, launchAtStartup: boolean) => Promise<void>;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  lang,
  autoSync: initialAutoSync,
  launchAtStartup: initialLaunchAtStartup,
  onFinish,
}) => {
  const isRussian = lang === 'ru';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfileData>({
    nickname: '',
    photoUrl: '',
    defaultCoverUrl: '',
    achievements: [],
    googleApiKey: '',
  });
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [launchAtStartup, setLaunchAtStartup] = useState(initialLaunchAtStartup);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const api = window.electronAPI?.db;
        if (!api) throw new Error('Electron database API is unavailable');
        const savedProfile = await api.getUserProfile();
        if (!cancelled) {
          setProfile(savedProfile);
          setProfileLoaded(true);
          setLoading(false);
        }
      } catch (loadError) {
        console.error('[Onboarding] Failed to load profile', loadError);
        if (!cancelled) {
          setError(isRussian ? 'Не удалось загрузить профиль. Попробуйте ещё раз.' : 'Could not load your profile. Please try again.');
          setLoading(false);
        }
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isRussian]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setProfile(previous => ({ ...previous, photoUrl: result }));
        }
      };
      reader.onerror = () => {
        setError(isRussian ? 'Не удалось прочитать изображение.' : 'Could not read the image.');
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const finish = async () => {
    if (saving || loading || !profileLoaded) return;
    setSaving(true);
    setError('');
    try {
      await onFinish(profile, autoSync, launchAtStartup);
    } catch (saveError) {
      console.error('[Onboarding] Failed to save setup', saveError);
      setError(isRussian ? 'Не удалось сохранить настройки. Попробуйте ещё раз.' : 'Could not save your settings. Please try again.');
      setSaving(false);
    }
  };

  const pageTitles = isRussian
    ? ['Добро пожаловать в LuminaBooks', 'Ваш профиль', 'Обложка книг', 'Настройки приложения']
    : ['Welcome to LuminaBooks', 'Your profile', 'Book covers', 'App preferences'];

  const toggleClass = (enabled: boolean) =>
    `relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${enabled ? 'bg-accent' : 'bg-accent-soft'}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'color-mix(in oklab, var(--fg), transparent 45%)', backdropFilter: 'blur(8px)' }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex max-h-[min(760px,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-surface shadow-overlay"
      >
        <header className="flex items-center justify-between border-b border-default px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <BookOpen size={21} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">LuminaBooks</p>
              <p className="text-sm text-muted">{isRussian ? `Шаг ${page + 1} из ${pageTitles.length}` : `Step ${page + 1} of ${pageTitles.length}`}</p>
            </div>
          </div>
          <Sparkles className="text-accent" size={20} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-10 sm:py-9">
          <h1 id="onboarding-title" className="mb-3 text-2xl font-bold font-display text-fg sm:text-3xl">
            {pageTitles[page]}
          </h1>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted">
              <RefreshCw className="animate-spin" size={24} />
            </div>
          ) : (
            <>
              {!profileLoaded && (
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setError('');
                    const api = window.electronAPI?.db;
                    if (!api) {
                      setLoading(false);
                      setError(isRussian ? 'База данных приложения недоступна.' : 'The app database is unavailable.');
                      return;
                    }
                    void api.getUserProfile().then(savedProfile => {
                      setProfile(savedProfile);
                      setProfileLoaded(true);
                    }).catch(loadError => {
                      console.error('[Onboarding] Failed to retry profile load', loadError);
                      setError(isRussian ? 'Не удалось загрузить профиль. Попробуйте ещё раз.' : 'Could not load your profile. Please try again.');
                    }).finally(() => setLoading(false));
                  }}
                  className="mb-5 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
                >
                  {isRussian ? 'Повторить загрузку' : 'Retry loading'}
                </button>
              )}
              {page === 0 && (
                <div className="space-y-5">
                  <p className="text-base leading-7 text-muted">
                    {isRussian
                      ? 'Ведите каталог книг, отмечайте прогресс чтения, собирайте серии и смотрите свою статистику.'
                      : 'Keep your book collection organized, track reading progress, group series, and explore your statistics.'}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: BookOpen, title: isRussian ? 'Библиотека' : 'Library', text: isRussian ? 'Все книги в одном месте' : 'All your books in one place' },
                      { icon: RefreshCw, title: isRussian ? 'Прогресс' : 'Progress', text: isRussian ? 'История и сессии чтения' : 'Reading history and sessions' },
                      { icon: Sparkles, title: isRussian ? 'Статистика' : 'Insights', text: isRussian ? 'Ваш путь в чтении' : 'Your reading journey' },
                    ].map(({ icon: Icon, title, text }) => (
                      <div key={title} className="rounded-2xl border border-default bg-page p-4">
                        <Icon className="mb-3 text-accent" size={20} />
                        <h2 className="text-sm font-semibold text-fg">{title}</h2>
                        <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted">
                    {isRussian ? 'Сначала настроим приложение — это займёт всего минуту.' : 'Let’s set things up first — it only takes a minute.'}
                  </p>
                </div>
              )}

              {page === 1 && (
                <div className="space-y-6">
                  <p className="text-sm leading-6 text-muted">
                    {isRussian ? 'Добавьте имя и фото, чтобы персонализировать свой профиль. Оба поля можно оставить пустыми.' : 'Add a name and photo to personalize your profile. Both are optional.'}
                  </p>
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-accent-soft">
                      {profile.photoUrl
                        ? <img src={profile.photoUrl} alt={isRussian ? 'Аватар профиля' : 'Profile avatar'} className="h-full w-full object-cover" />
                        : <User size={34} className="text-muted" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
                        <Upload size={16} />{isRussian ? 'Загрузить фото' : 'Upload photo'}
                      </button>
                      {profile.photoUrl && (
                        <button type="button" onClick={() => setProfile(previous => ({ ...previous, photoUrl: '' }))} className="rounded-xl px-4 py-2 text-sm text-muted hover:bg-page">
                          {isRussian ? 'Удалить фото' : 'Remove photo'}
                        </button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-fg">{isRussian ? 'Как к вам обращаться?' : 'What should we call you?'}</span>
                    <input
                      type="text"
                      value={profile.nickname}
                      onChange={event => setProfile(previous => ({ ...previous, nickname: event.target.value }))}
                      placeholder={isRussian ? 'Ваше имя' : 'Your name'}
                      className="w-full rounded-xl border border-accent/30 bg-surface px-4 py-3 text-fg outline-none transition focus:ring-2 focus:ring-accent"
                    />
                  </label>
                </div>
              )}

              {page === 2 && (
                <div className="space-y-6">
                  <p className="text-sm leading-6 text-muted">
                    {isRussian ? 'Выберите изображение, которое будет подставляться для книг без собственной обложки. Настроить это можно и позже.' : 'Choose an image to use for books without a cover. You can also set this up later.'}
                  </p>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-fg">{isRussian ? 'Ссылка на изображение' : 'Image URL'}</span>
                    <div className="relative">
                      <Image className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
                      <input
                        type="url"
                        value={profile.defaultCoverUrl}
                        onChange={event => setProfile(previous => ({ ...previous, defaultCoverUrl: event.target.value }))}
                        placeholder="https://example.com/cover.jpg"
                        className="w-full rounded-xl border border-accent/30 bg-surface py-3 pl-10 pr-4 text-fg outline-none transition focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </label>
                  {profile.defaultCoverUrl ? (
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-default bg-page p-4">
                      <img src={profile.defaultCoverUrl} alt={isRussian ? 'Предпросмотр обложки' : 'Cover preview'} className="max-h-48 max-w-full rounded-xl object-contain shadow" />
                    </div>
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-page p-4 text-muted">
                      <Image size={28} className="mb-2 opacity-60" />
                      <span className="text-sm">{isRussian ? 'Предпросмотр появится здесь' : 'Your cover preview will appear here'}</span>
                    </div>
                  )}
                </div>
              )}

              {page === 3 && (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted">
                    {isRussian ? 'Выберите, как LuminaBooks будет работать на этом устройстве. Эти параметры можно изменить в настройках.' : 'Choose how LuminaBooks should work on this device. You can change these preferences later.'}
                  </p>
                  <PreferenceRow
                    icon={<RefreshCw size={19} />}
                    title={isRussian ? 'Автосинхронизация' : 'Automatic sync'}
                    description={isRussian ? 'Обновлять данные с подключённых устройств автоматически' : 'Automatically refresh data from connected devices'}
                    enabled={autoSync}
                    onToggle={() => setAutoSync(value => !value)}
                    toggleClass={toggleClass}
                    isRussian={isRussian}
                  />
                  <PreferenceRow
                    icon={<Power size={19} />}
                    title={isRussian ? 'Запуск при входе' : 'Launch at login'}
                    description={isRussian ? 'Запускать приложение при входе в систему' : 'Start the app when you sign in to your computer'}
                    enabled={launchAtStartup}
                    onToggle={() => setLaunchAtStartup(value => !value)}
                    toggleClass={toggleClass}
                    isRussian={isRussian}
                  />
                  <div className="rounded-xl bg-accent-soft/50 p-4 text-sm leading-6 text-muted">
                    {isRussian ? 'Автосинхронизация работает, когда приложение открыто. Для синхронизации через браузер компьютер должен быть включён, а приложение — запущено.' : 'Automatic sync runs while the app is open. To sync through a browser, keep this computer on and the app running.'}
                  </div>
                </div>
              )}

              {error && <p role="alert" className="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            </>
          )}
        </div>

        <footer className="border-t border-default px-6 py-5 sm:px-8">
          <div className="mb-5 flex items-center justify-center gap-2" aria-label={isRussian ? 'Страницы приветствия' : 'Onboarding pages'}>
            {pageTitles.map((title, index) => (
              <button
                key={title}
                type="button"
                aria-label={isRussian ? `Перейти к шагу ${index + 1}` : `Go to step ${index + 1}`}
                aria-current={page === index ? 'step' : undefined}
                onClick={() => !loading && !saving && profileLoaded && setPage(index)}
                className={`h-2.5 rounded-full transition-all ${page === index ? 'w-8 bg-accent' : 'w-2.5 bg-accent/25 hover:bg-accent/50'}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(0, current - 1))}
              disabled={page === 0 || loading || saving || !profileLoaded}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-page disabled:invisible"
            >
              <ArrowLeft size={17} />{isRussian ? 'Назад' : 'Back'}
            </button>
            <button type="button" onClick={() => void finish()} disabled={loading || saving || !profileLoaded} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition hover:opacity-90 disabled:opacity-60">
              {saving ? <RefreshCw className="animate-spin" size={17} /> : page === pageTitles.length - 1 ? <Check size={17} /> : null}
              {saving
                ? (isRussian ? 'Сохраняем…' : 'Saving…')
                : page === pageTitles.length - 1
                  ? (isRussian ? 'Начать работу' : 'Get started')
                  : (isRussian ? 'Пропустить' : 'Skip')}
            </button>
            {page < pageTitles.length - 1 && (
              <button
                type="button"
                onClick={() => setPage(current => Math.min(pageTitles.length - 1, current + 1))}
                disabled={loading || saving || !profileLoaded}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-60"
              >
                {isRussian ? 'Далее' : 'Next'}<ArrowRight size={17} />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
};

interface PreferenceRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  toggleClass: (enabled: boolean) => string;
  isRussian: boolean;
}

const PreferenceRow: React.FC<PreferenceRowProps> = ({ icon, title, description, enabled, onToggle, toggleClass, isRussian }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-default bg-page p-4">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
    <button type="button" role="switch" aria-checked={enabled} aria-label={title} onClick={onToggle} className={toggleClass(enabled)}>
      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      <span className="sr-only">{enabled ? (isRussian ? 'Включено' : 'On') : (isRussian ? 'Выключено' : 'Off')}</span>
    </button>
  </div>
);

export default OnboardingModal;
