import React, { useState, useEffect, useRef } from 'react';
import { X, User, Book, RefreshCw, Link, Globe, Copy, Upload } from 'lucide-react';
import { translations } from '../utils/translations';
import { version } from '../../package.json';

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
  serverUrl: string;
  lang: 'en' | 'ru';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, autoSync, onAutoSyncChange, serverUrl, lang }) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        setProfile(prev => ({ ...prev, photoUrl: base64String }));
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

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="border-b px-8 py-5 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold font-serif text-[#1E2920]">
            {lang === 'ru' ? 'Настройки' : 'Settings'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-0">
          {/* Section 1: Avatar */}
          <div className="py-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-48">
                <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Аватар' : 'Avatar'}</p>
                <p className="text-xs text-slate-500 mt-1">{lang === 'ru' ? 'Загрузите изображение для профиля' : 'Upload a profile image'}</p>
              </div>
              <div className="flex items-center gap-4 flex-1 justify-center">
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-[#6B9071] flex-shrink-0">
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
                    <User size={32} className="text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handlePhotoClick}
                    className="px-4 py-1.5 border-2 border-[#6B9071] text-[#6B9071] text-sm rounded-lg hover:bg-[#6B9071] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Upload size={16} />
                    {lang === 'ru' ? 'Загрузить фото' : 'Upload photo'}
                  </button>
                  <button
                    onClick={handleDeletePhoto}
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors"
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

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Section 2: Nickname */}
          <div className="py-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">{t.nickname}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">{lang === 'ru' ? 'Ваше имя в приложении' : 'Your name in the app'}</p>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder={t.enterNickname}
                  value={profile.nickname}
                  onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Section 3: Default Cover */}
          <div className="py-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <Book size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Обложка по умолчанию' : 'Default Cover'}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">{lang === 'ru' ? 'Обложка будет использоваться для книг без обложки' : 'Cover will be used for books without a cover'}</p>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={lang === 'ru' ? 'Введите URL обложки...' : 'Enter cover URL...'}
                    value={profile.defaultCoverUrl}
                    onChange={(e) => setProfile(prev => ({ ...prev, defaultCoverUrl: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
                  />
                </div>
                {profile.defaultCoverUrl && (
                  <div className="mt-3 flex justify-end">
                    <img 
                      src={profile.defaultCoverUrl} 
                      alt="Cover preview"
                      className="w-16 h-24 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Section 4: Auto Sync */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Авто-синхронизация' : 'Auto Sync'}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">{lang === 'ru' ? 'Автоматически обновлять данные с другого устройства' : 'Automatically sync data from other devices'}</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSync}
                  onClick={() => onAutoSyncChange(!autoSync)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6B9071] focus:ring-offset-2 ${autoSync ? 'bg-[#6B9071]' : 'bg-slate-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSync ? 'translate-x-5' : 'translate-x-0'}`}
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
                <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Google Books API ключ' : 'Google Books API Key'}</p>
                <p className="text-xs text-slate-500 mt-1">{lang === 'ru' ? 'Ключ для расширенного поиска книг по API Google' : 'API key for extended book search via Google'}</p>
              </div>
              <div className="flex-1">
                <input
                  type="password"
                  placeholder={lang === 'ru' ? 'Введите API ключ...' : 'Enter API key...'}
                  value={profile.googleApiKey}
                  onChange={(e) => setProfile(prev => ({ ...prev, googleApiKey: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071] font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Section 6: Version & Browser */}
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Версия приложения' : 'App Version'}</p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-sm text-slate-600">{version}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700">{lang === 'ru' ? 'Доступно в браузере' : 'Available in browser'}</p>
              </div>
              <div className="flex-shrink-0">
                {serverUrl ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                      <Globe size={14} className="text-[#6B9071]" />
                      <span>{serverUrl}</span>
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                      title={lang === 'ru' ? 'Копировать URL' : 'Copy URL'}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{lang === 'ru' ? 'Сервер не запущен' : 'Server not running'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 bg-white">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2.5 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] font-semibold transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
