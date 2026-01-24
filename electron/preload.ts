import { contextBridge } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Получаем информацию о платформе
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
});

// Обработчик для восстановления фокуса при потере клавиатурных событий
document.addEventListener('DOMContentLoaded', () => {
  let lastFocusedElement: HTMLElement | null = null;

  // Отслеживаем элемент с фокусом
  document.addEventListener('focusin', (e) => {
    lastFocusedElement = e.target as HTMLElement;
  }, true);

  // Обработчик для восстановления фокуса при проблемах
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement as HTMLElement;
    
    // Если активный элемент - это body или не input/textarea, но был ввод на input
    // то пытаемся восстановить фокус
    if (lastFocusedElement && 
        (activeEl === document.body || !['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) &&
        ['INPUT', 'TEXTAREA'].includes(lastFocusedElement.tagName)) {
      lastFocusedElement.focus();
    }
  }, true);

  // Также добавляем обработчик click для восстановления после клика
  document.addEventListener('click', () => {
    // Если после клика фокус на body - восстанавливаем
    if (document.activeElement === document.body && lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }, true);
});

