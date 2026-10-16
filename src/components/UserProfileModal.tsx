import React, { useState, useEffect, useRef } from 'react';
import { X, User, Book, RefreshCw, Link, Globe, Copy, Upload, Power, Check, Crop } from 'lucide-react';
import { translations } from '../utils/translations';
import { version } from '../../package.json';
import AvatarCropModal from './AvatarCropModal';

interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
  achievements?: string[];
  googleApiKey: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<void>;
  autoSync: boolean;
  onAutoSyncChange: (value: boolean) => void;
  launchAtStartup: boolean;
  onLaunchAtStartupChange: (value: boolean) => void;
  serverUrl: string;
  lang: 'en' | 'ru';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, autoSync, onAutoSyncChange, launchAtStartup, onLaunchAtStartupChange, serverUrl, lang }) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    nickname: '',
    photoUrl: '',
    defaultCoverUrl: '',
    achievements: [],
    googleApiKey: '',
  });

  const PROFILE_STORAGE_KEY = 'lumina_user_profile';

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    } else {
      const savedCoverUrl = localStorage.getItem('lumina_default_cover_url');
      if (savedCoverUrl) {
        setProfile(prev => ({
          ...prev,
          defaultCoverUrl: savedCoverUrl
        }));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setCropImage(base64String);
      };
      reader.onerror = () => {
        console.error('Failed to read avatar image', reader.error);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = () => {
    setProfile(prev => ({ ...prev, photoUrl: '' }));
  };

  const handleSave = async () => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    let existingAchievements: string[] = [];
    if (saved) {
      try { const p = JSON.parse(saved); existingAchievements = p.achievements || []; } catch {}
    }
    const profileToSave = { ...profile, achievements: existingAchievements };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToSave));
    await onSave(profileToSave);
    onClose();
  };

  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'color-mix(in oklab, var(--fg), transparent 50%)', backdropFilter: 'blur(4px)'}}>
      <div className="flex h-[min(90vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-overlay animate-in zoom-in duration-200">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-default bg-surface px-6 py-5 sm:px-8">
          <h2 className="text-xl font-bold font-display text-fg">
            {lang === 'ru' ? 'Настройки' : 'Settings'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-page rounded-full text-muted"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 sm:px-8 sm:py-5">
          <div className="space-y-0">
          {/* Section 1: Avatar */}
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-full flex-shrink-0 sm:w-48">
                <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Аватар' : 'Avatar'}</p>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Загрузите изображение для профиля' : 'Upload a profile image'}</p>
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-center gap-4 sm:justify-start">
                <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center overflow-hidden border-2 border-accent flex-shrink-0">
                  {profile.photoUrl ? (
                    <img 
                      src={profile.photoUrl} 
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User size={32} className="text-muted" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePhotoClick}
                    className="flex items-center gap-1.5 rounded-lg border-2 border-accent px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent hover:text-accent-on"
                  >
                    <Upload size={16} />
                    {lang === 'ru' ? 'Загрузить фото' : 'Upload photo'}
                  </button>
                  {profile.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setCropImage(profile.photoUrl)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                      title={lang === 'ru' ? 'Изменить кадрирование аватара' : 'Edit avatar crop'}
                    >
                      <Crop size={16} />
                      {lang === 'ru' ? 'Редактировать' : 'Edit'}
                    </button>
                  )}
                  <button
                    onClick={handleDeletePhoto}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    {lang === 'ru' ? 'Удалить' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Section 2: Nickname */}
          <div className="py-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-muted" />
                  <p className="text-sm font-semibold text-fg">{t.nickname}</p>
                </div>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Ваше имя в приложении' : 'Your name in the app'}</p>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder={t.enterNickname}
                  value={profile.nickname}
                  onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Section 3: Default Cover */}
          <div className="py-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <Book size={16} className="text-muted" />
                  <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Обложка по умолчанию' : 'Default Cover'}</p>
                </div>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Обложка будет использоваться для книг без обложки' : 'Cover will be used for books without a cover'}</p>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder={lang === 'ru' ? 'Введите URL обложки...' : 'Enter cover URL...'}
                    value={profile.defaultCoverUrl}
                    onChange={(e) => setProfile(prev => ({ ...prev, defaultCoverUrl: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 bg-surface border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                {profile.defaultCoverUrl && (
                  <div className="mt-3 flex justify-end">
                    <img 
                      src={profile.defaultCoverUrl} 
                      alt="Cover preview"
                      className="w-16 h-24 object-cover rounded-lg border border-default"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Section 4: Auto Sync */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-muted" />
                  <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Авто-синхронизация' : 'Auto Sync'}</p>
                </div>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Автоматически обновлять данные с другого устройства' : 'Automatically sync data from other devices'}</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSync}
                  onClick={() => onAutoSyncChange(!autoSync)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${autoSync ? 'bg-accent' : 'bg-accent-soft'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSync ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Section 4.5: Launch at Login */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <Power size={16} className="text-muted" />
                  <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Запуск при входе' : 'Launch at Login'}</p>
                </div>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Автоматически запускать приложение при входе в систему' : 'Automatically start the app when you log in'}</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={launchAtStartup}
                  onClick={() => onLaunchAtStartupChange(!launchAtStartup)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${launchAtStartup ? 'bg-accent' : 'bg-accent-soft'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${launchAtStartup ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Section 5: Google Books API Key */}
          <div className="py-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-48">
                <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Google Books API ключ' : 'Google Books API Key'}</p>
                <p className="text-xs text-muted mt-1">{lang === 'ru' ? 'Ключ для расширенного поиска книг по API Google' : 'API key for extended book search via Google'}</p>
              </div>
              <div className="flex-1">
                <input
                  type="password"
                  placeholder={lang === 'ru' ? 'Введите API ключ...' : 'Enter API key...'}
                  value={profile.googleApiKey}
                  onChange={(e) => setProfile(prev => ({ ...prev, googleApiKey: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-accent/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Section 6: Version & Browser */}
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Версия приложения' : 'App Version'}</p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-sm text-muted">{version}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-fg">{lang === 'ru' ? 'Доступно в браузере' : 'Available in browser'}</p>
              </div>
              <div className="flex-shrink-0">
                {serverUrl ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-page border border-default rounded-lg text-sm text-fg">
                      <Globe size={14} className="text-accent" />
                      <span>{serverUrl}</span>
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className={`p-2 rounded-lg transition-colors ${copied ? 'bg-accent text-accent-on' : 'hover:bg-accent-soft text-muted'}`}
                      title={lang === 'ru' ? 'Копировать URL' : 'Copy URL'}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{lang === 'ru' ? 'Сервер не запущен' : 'Server not running'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="flex-shrink-0 border-t border-default bg-surface px-6 py-4 sm:px-8">
          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-on transition-colors hover:bg-accent-hover"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
    {cropImage && (
      <AvatarCropModal
        imageSrc={cropImage}
        lang={lang}
        onCancel={() => setCropImage(null)}
        onApply={photoUrl => {
          setProfile(previous => ({ ...previous, photoUrl }));
          setCropImage(null);
        }}
      />
    )}
    </>
  );
};

export default SettingsModal;
