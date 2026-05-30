import React, { useState, useEffect, useRef } from 'react';
import { X, User } from 'lucide-react';
import { translations } from '../utils/translations';

interface UserProfile {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<void>;
  autoSync: boolean;
  onAutoSyncChange: (value: boolean) => void;
  lang: 'en' | 'ru';
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onSave, autoSync, onAutoSyncChange, lang }) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>({
    nickname: '',
    photoUrl: '',
    defaultCoverUrl: ''
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
  }, []);

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

  const handleSave = async () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    await onSave(profile);
    onClose();
  };

  const handleClearCover = () => {
    setProfile(prev => ({
      ...prev,
      defaultCoverUrl: ''
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold font-serif text-[#1E2920]">
            {t.userProfile}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-white p-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="text-center">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              {t.profilePhoto}
            </label>
            
            <button
              onClick={handlePhotoClick}
              className="flex justify-center mx-auto mb-4 group cursor-pointer"
              type="button"
              title={lang === 'ru' ? 'Нажмите для загрузки фото' : 'Click to upload photo'}
            >
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-[#6B9071] group-hover:border-[#59785E] group-hover:bg-slate-300 transition-all">
                {profile.photoUrl ? (
                  <img 
                    src={profile.photoUrl} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.removeAttribute('style');
                    }}
                  />
                ) : null}
                {!profile.photoUrl && (
                  <User size={40} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                )}
              </div>
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            <p className="text-xs text-slate-500 text-center">
              {lang === 'ru' ? 'Нажмите на фото для загрузки' : 'Click photo to upload'}
            </p>
          </div>

          {/* Nickname Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t.nickname}
            </label>
            <input 
              type="text" 
              placeholder={t.enterNickname}
              value={profile.nickname}
              onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
            />
          </div>

          {/* Default Cover Settings Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t.defaultCoverSettings}
            </label>
            <input 
              type="text" 
              placeholder={t.enterCoverUrl}
              value={profile.defaultCoverUrl}
              onChange={(e) => setProfile(prev => ({ ...prev, defaultCoverUrl: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-[#6B9071]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9071]"
            />
            
            {profile.defaultCoverUrl && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-600 mb-2">{t.preview}:</p>
                <img 
                  src={profile.defaultCoverUrl} 
                  alt="Cover preview"
                  className="w-20 h-28 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"%3E%3Crect fill="%23e2e8f0" width="60" height="80"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23cbd5e1" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          {/* Auto Sync Toggle */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {lang === 'ru' ? 'Авто-синхронизация' : 'Auto Sync'}
                </label>
                <p className="text-xs text-slate-500">
                  {lang === 'ru'
                    ? 'Автоматически обновлять данные с других устройств'
                    : 'Automatically sync data from other devices'}
                </p>
              </div>
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

        {/* Action Buttons */}
        <div className="px-6 pb-6 pt-4 bg-white">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-[#6B9071] text-white rounded-lg hover:bg-[#59785E] font-semibold transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
