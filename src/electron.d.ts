export interface BookDictEntry {
  title: string;
  author: string;
  year: string;
  coverUrl: string;
  lang: string;
  source: string;
}

export interface UserProfileData {
  nickname: string;
  photoUrl: string;
  defaultCoverUrl: string;
  achievements: string[];
  googleApiKey: string;
}

export interface ElectronDBAPI {
  getAllBooks: () => Promise<any[]>;
  addBook: (book: any) => Promise<any>;
  updateBook: (book: any) => Promise<any>;
  deleteBook: (id: string) => Promise<void>;

  getAllFranchises: () => Promise<any[]>;
  addFranchise: (franchise: any) => Promise<any>;
  updateFranchise: (franchise: any) => Promise<any>;
  deleteFranchise: (id: string) => Promise<void>;

  getUserProfile: () => Promise<UserProfileData>;
  setUserProfile: (profile: UserProfileData) => Promise<void>;

  migrate: () => Promise<{ books: number; franchises: number }>;

  searchBooksDictionary: (title: string, author?: string) => Promise<BookDictEntry[]>;
  saveToBooksDictionary: (entry: BookDictEntry) => Promise<void>;
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
