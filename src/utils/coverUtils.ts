
const fallbackImage = new URL('../../resources/fallback-book.jpg', import.meta.url).href;

export function handleCoverError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  const attempt = parseInt(img.dataset.coverAttempt || '0', 10);
  img.dataset.coverAttempt = String(attempt + 1);

  if (attempt >= 2) return;

  if (attempt === 0) {
    try {
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) {
        const profile = JSON.parse(saved);
        if (profile.defaultCoverUrl && profile.defaultCoverUrl !== img.src) {
          img.src = profile.defaultCoverUrl;
          return;
        }
      }
    } catch {}
  }

  img.src = fallbackImage;
}
