const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',

  db: {
    getAllBooks: () => ipcRenderer.invoke('db:getAllBooks'),
    addBook: (book) => ipcRenderer.invoke('db:addBook', book),
    updateBook: (book) => ipcRenderer.invoke('db:updateBook', book),
    deleteBook: (id) => ipcRenderer.invoke('db:deleteBook', id),

    getAllFranchises: () => ipcRenderer.invoke('db:getAllFranchises'),
    addFranchise: (franchise) => ipcRenderer.invoke('db:addFranchise', franchise),
    updateFranchise: (franchise) => ipcRenderer.invoke('db:updateFranchise', franchise),
    deleteFranchise: (id) => ipcRenderer.invoke('db:deleteFranchise', id),

    getUserProfile: () => ipcRenderer.invoke('db:getUserProfile'),
    setUserProfile: (profile) => ipcRenderer.invoke('db:setUserProfile', profile),

    migrate: () => ipcRenderer.invoke('db:migrate'),
  },
});

document.addEventListener('DOMContentLoaded', () => {
  let lastFocusedElement = null;

  document.addEventListener('focusin', (e) => {
    lastFocusedElement = e.target;
  }, true);

  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;

    if (lastFocusedElement &&
        (activeEl === document.body || !['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) &&
        ['INPUT', 'TEXTAREA'].includes(lastFocusedElement.tagName)) {
      lastFocusedElement.focus();
    }
  }, true);

  document.addEventListener('click', () => {
    if (document.activeElement === document.body && lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }, true);
});
