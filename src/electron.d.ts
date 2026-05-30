export interface ElectronDBAPI {
  getAllBooks: () => Promise<any[]>;
  addBook: (book: any) => Promise<any>;
  updateBook: (book: any) => Promise<any>;
  deleteBook: (id: string) => Promise<void>;

  getAllFranchises: () => Promise<any[]>;
  addFranchise: (franchise: any) => Promise<any>;
  updateFranchise: (franchise: any) => Promise<any>;
  deleteFranchise: (id: string) => Promise<void>;

  getUserProfile: () => Promise<{ nickname: string; photoUrl: string; defaultCoverUrl: string }>;
  setUserProfile: (profile: { nickname: string; photoUrl: string; defaultCoverUrl: string }) => Promise<void>;

  migrate: () => Promise<{ books: number; franchises: number }>;
}

export interface ElectronAPI {
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  db?: ElectronDBAPI;
  getServerUrl?: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
