import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { AchievementNotificationItem } from '../utils/achievements';
import achievement1Png from '../assets/achivements/1.png';
import achievement2Png from '../assets/achivements/2.png';
import achievement3Png from '../assets/achivements/3.png';
import achievement4Png from '../assets/achivements/4.png';
import achievement5Png from '../assets/achivements/5.png';
import achievement6Png from '../assets/achivements/6.png';
import achievement7Png from '../assets/achivements/7.png';
import achievement8Png from '../assets/achivements/8.png';
import achievement9Png from '../assets/achivements/9.png';
import achievement10Png from '../assets/achivements/10.png';

const achievementImages: Record<string, string | undefined> = {
  '1': achievement1Png,
  '2': achievement2Png,
  '3': achievement3Png,
  '4': achievement4Png,
  '5': achievement5Png,
  '6': achievement6Png,
  '7': achievement7Png,
  '8': achievement8Png,
  '9': achievement9Png,
  '10': achievement10Png,
};

interface AchievementNotificationProps {
  queue: AchievementNotificationItem[];
  onDismiss: (id: string) => void;
  lang: 'en' | 'ru';
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ queue, onDismiss, lang }) => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {queue.map((item, index) => (
        index === 0 ? (
          <AchievementPopup key={item.id} item={item} onDismiss={onDismiss} lang={lang} />
        ) : null
      ))}
    </div>
  );
};

interface PopupProps {
  item: AchievementNotificationItem;
  onDismiss: (id: string) => void;
  lang: 'en' | 'ru';
}

const AchievementPopup: React.FC<PopupProps> = ({ item, onDismiss, lang }) => {
  const [exiting, setExiting] = useState(false);
  const [progressWidth, setProgressWidth] = useState('100%');

  useEffect(() => {
    setProgressWidth('0%');
    const exitTimer = setTimeout(() => setExiting(true), 5500);
    const removeTimer = setTimeout(() => onDismiss(item.id), 6000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      className={`
        pointer-events-auto w-[380px] bg-slate-900/95 backdrop-blur-xl rounded-2xl
        border border-amber-500/20 shadow-2xl shadow-amber-500/10 overflow-hidden
        transition-all duration-500 ease-out
        ${exiting ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Gold accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500" />

      <div className="p-5 flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full rounded-2xl bg-slate-800 overflow-hidden">
              {achievementImages[item.achievementId] ? (
                <img
                  src={achievementImages[item.achievementId]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Trophy size={28} className="text-amber-400" />
                </div>
              )}
            </div>
          </div>
          {/* Glow dot */}
          <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto mt-1.5 shadow-lg shadow-amber-400/50" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[10px] font-bold tracking-[0.15em] text-amber-400/90 uppercase mb-1">
            {lang === 'ru' ? 'Достижение получено' : 'Achievement Unlocked'}
          </p>
          <h3 className="text-base font-bold text-white leading-tight mb-0.5">
            {item.title}
          </h3>
          <p className="text-sm text-slate-400 leading-tight">
            {item.desc}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => onDismiss(item.id)}
          className="flex-shrink-0 self-start text-slate-600 hover:text-white transition-colors p-0.5"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
          style={{
            width: progressWidth,
            transition: 'width 6s linear',
          }}
        />
      </div>
    </div>
  );
};

export default AchievementNotification;
