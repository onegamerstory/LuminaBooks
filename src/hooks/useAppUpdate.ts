import { useEffect, useState } from 'react';
import { version as currentVersion } from '../../package.json';

export interface AppRelease {
  tagName: string;
  url: string;
}

const RELEASE_API_URL = 'https://api.github.com/repos/onegamerstory/LuminaBooks/releases/latest';

const parseVersion = (value: string): number[] | null => {
  const match = value.replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1, 4).map(Number) : null;
};

const isNewerVersion = (candidate: string, current: string): boolean => {
  const candidateParts = parseVersion(candidate);
  const currentParts = parseVersion(current);
  if (!candidateParts || !currentParts) return false;

  for (let index = 0; index < candidateParts.length; index += 1) {
    if (candidateParts[index] !== currentParts[index]) {
      return candidateParts[index] > currentParts[index];
    }
  }
  return false;
};

export const useAppUpdate = (): AppRelease | null => {
  const [latestRelease, setLatestRelease] = useState<AppRelease | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const checkLatestRelease = async () => {
      try {
        const response = await fetch(RELEASE_API_URL, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`GitHub release check failed with HTTP ${response.status}`);
        }

        const release: unknown = await response.json();
        if (
          typeof release !== 'object' ||
          release === null ||
          !('tag_name' in release) ||
          typeof release.tag_name !== 'string' ||
          !('html_url' in release) ||
          typeof release.html_url !== 'string'
        ) {
          throw new Error('GitHub returned an invalid latest release response');
        }

        if (isNewerVersion(release.tag_name, currentVersion)) {
          setLatestRelease({ tagName: release.tag_name, url: release.html_url });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[App Update] Failed to check for a newer release:', error);
        }
      }
    };

    void checkLatestRelease();
    return () => controller.abort();
  }, []);

  return latestRelease;
};
