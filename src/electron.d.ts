// Типы для Electron API, доступного через preload
export interface ElectronAPI {
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

