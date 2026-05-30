import type { ElectronDBAPI } from './electron.d';

const BASE = '';

export const httpApi: ElectronDBAPI = {
  getAllBooks: async () => {
    const res = await fetch(`${BASE}/api/books`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  addBook: async (book: any) => {
    const res = await fetch(`${BASE}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  updateBook: async (book: any) => {
    const res = await fetch(`${BASE}/api/books/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  deleteBook: async (id: string) => {
    const res = await fetch(`${BASE}/api/books/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  getAllFranchises: async () => {
    const res = await fetch(`${BASE}/api/franchises`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  addFranchise: async (franchise: any) => {
    const res = await fetch(`${BASE}/api/franchises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(franchise),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  updateFranchise: async (franchise: any) => {
    const res = await fetch(`${BASE}/api/franchises/${franchise.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(franchise),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  deleteFranchise: async (id: string) => {
    const res = await fetch(`${BASE}/api/franchises/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  getUserProfile: async () => {
    const res = await fetch(`${BASE}/api/profile`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  setUserProfile: async (profile: any) => {
    const res = await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  migrate: async () => {
    return { books: 0, franchises: 0 };
  },
};
