import { useCallback, useRef } from 'react';
import type { ElectronDBAPI } from '../electron.d';

export function useDbApi() {
  const dbApiRef = useRef<ElectronDBAPI | null>(null);

  const getDbApi = useCallback((): ElectronDBAPI | null => {
    return dbApiRef.current;
  }, []);

  return { dbApiRef, getDbApi };
}
