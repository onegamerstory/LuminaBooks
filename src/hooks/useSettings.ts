import { useState, useEffect } from 'react';
import { translations } from '../utils/translations';

export function useSettings() {
  const [lang, setLang] = useState<'en' | 'ru'>('ru');
  const [defaultCoverUrl, setDefaultCoverUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('lumina_auto_sync') === 'true');
  const [launchAtStartup, setLaunchAtStartup] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (window.electronAPI?.getLoginItemSettings) {
      window.electronAPI.getLoginItemSettings().then((settings) => {
        setLaunchAtStartup(settings.openAtLogin);
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lumina_lang', lang);
  }, [lang]);

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ru' : 'en');

  return {
    lang,
    setLang,
    toggleLang,
    t,
    defaultCoverUrl,
    setDefaultCoverUrl,
    googleApiKey,
    setGoogleApiKey,
    serverUrl,
    setServerUrl,
    autoSync,
    setAutoSync,
    launchAtStartup,
    setLaunchAtStartup,
  };
}
