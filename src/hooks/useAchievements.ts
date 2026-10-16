import { useState, useRef, useEffect } from 'react';
import { Book } from '../types';
import type { ElectronDBAPI } from '../electron.d';
import { getUnlockedAchievementIds, ALL_ACHIEVEMENTS, AchievementNotificationItem } from '../utils/achievements';

interface UseAchievementsDeps {
  books: Book[];
  lang: 'en' | 'ru';
  getDbApi: () => ElectronDBAPI | null;
}

export function useAchievements({ books, lang, getDbApi }: UseAchievementsDeps) {
  const [achievementQueue, setAchievementQueue] = useState<AchievementNotificationItem[]>([]);
  const achievementQueueRef = useRef<AchievementNotificationItem[]>([]);
  const notifiedAchievementsRef = useRef<Set<string>>(new Set());

  // Проверка достижений (ref — единственный источник истины)
  useEffect(() => {
    const checkAchievements = async () => {
      const unlockedIds = getUnlockedAchievementIds(books);
      const alreadyQueuedIds = new Set(achievementQueueRef.current.map(item => item.achievementId));
      const newIds = unlockedIds.filter(id => !notifiedAchievementsRef.current.has(id) && !alreadyQueuedIds.has(id));

      if (newIds.length > 0) {
        const items: AchievementNotificationItem[] = newIds.map((id, i) => {
          const def = ALL_ACHIEVEMENTS.find(a => a.id === id)!;
          return {
            id: `${id}_${Date.now()}_${i}`,
            achievementId: id,
            title: def.title[lang],
            desc: def.desc[lang],
          };
        });
        setAchievementQueue(prev => {
          const updated = [...prev, ...items];
          achievementQueueRef.current = updated;
          return updated;
        });

        newIds.forEach(id => notifiedAchievementsRef.current.add(id));

        // Если есть БД — сохраняем
        const api = getDbApi();
        if (api) {
          try {
            await api.mergeUserAchievements([...notifiedAchievementsRef.current]);
          } catch (e) {
            console.error("Failed to save achievements to DB profile", e);
          }
        } else {
          localStorage.setItem('lumina_achievements_unlocked', JSON.stringify([...notifiedAchievementsRef.current]));
        }
      }
    };
    checkAchievements();
  }, [books, lang, getDbApi]);

  const handleDismissAchievement = (id: string) => {
    setAchievementQueue(prev => {
      const updated = prev.filter(item => item.id !== id);
      achievementQueueRef.current = updated;
      return updated;
    });
  };

  return {
    achievementQueue,
    handleDismissAchievement,
    notifiedAchievementsRef,
  };
}
