import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDatabase, getAllBooks, addBook, updateBook, deleteBook, getAllFranchises, addFranchise, updateFranchise, deleteFranchise, getUserProfile, setUserProfile, mergeUserAchievements, migrateFromLocalStorage, searchBooksDictionary, saveToBooksDictionary } from './database.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Глобальные обработчики ошибок для диагностики
process.on('uncaughtException', (err) => {
  console.error('[LuminaBooks] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[LuminaBooks] Unhandled rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Флаг для предотвращения закрытия приложения при закрытии окна
// Используем type assertion для добавления свойства isQuiting
(app as any).isQuiting = false;

// Single-instance lock логика
// Предотвращаем запуск второго экземпляра приложения
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Если не удалось получить блокировку, значит приложение уже запущено
  // Выходим из второго экземпляра
  app.quit();
} else {
  // Обработка события когда пользователь пытается запустить второй экземпляр
  app.on('second-instance', () => {
    // Восстанавливаем и показываем главное окно
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
      // На macOS также показываем иконку в dock
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    }
  });

  // Этот метод будет вызван когда Electron закончит инициализацию
  app.whenReady().then(async () => {
    try {
      // Инициализируем БД
      initDatabase();
      registerIpcHandlers();

      // Запускаем HTTP сервер с динамическим импортом (чтобы не блокировать запуск)
      let serverInfo: { serverUrl: string } | null = null;
      try {
        const serverModule = await import('./server.js');
        serverInfo = await serverModule.startServer(3456, isDev);
      } catch (err) {
        console.error('[LuminaBooks Server] Failed to start HTTP server:', err);
      }
      ipcMain.handle('server:getUrl', () => serverInfo?.serverUrl ?? '');
    
    Menu.setApplicationMenu(null);
    
    // Создаем окно
    createWindow();
    
    // Создаем трей
    createTray();

    app.on('activate', () => {
      // На macOS обычно пересоздают окно в приложении когда кликают на иконку в dock
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        app.dock.show();
      }
    });
    } catch (err) {
      console.error('[LuminaBooks] Fatal error during initialization:', err);
    }
  });

  // Выйти когда все окна закрыты - не закрываем приложение, сворачиваем в трей
  app.on('window-all-closed', () => {
    // Не закрываем приложение, оно будет работать в трее
    // Приложение закроется только при явном выборе "Выход" из меню трея
    // На macOS приложение продолжает работать даже когда все окна закрыты
  });

  // Очистка при выходе
  app.on('before-quit', () => {
    (app as any).isQuiting = true;
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle('db:getAllBooks', () => {
    return getAllBooks();
  });

  ipcMain.handle('db:addBook', (_event, book) => {
    return addBook(book);
  });

  ipcMain.handle('db:updateBook', (_event, book) => {
    return updateBook(book);
  });

  ipcMain.handle('db:deleteBook', (_event, id) => {
    deleteBook(id);
  });

  ipcMain.handle('db:getAllFranchises', () => {
    return getAllFranchises();
  });

  ipcMain.handle('db:addFranchise', (_event, franchise) => {
    return addFranchise(franchise);
  });

  ipcMain.handle('db:updateFranchise', (_event, franchise) => {
    return updateFranchise(franchise);
  });

  ipcMain.handle('db:deleteFranchise', (_event, id) => {
    deleteFranchise(id);
  });

  ipcMain.handle('db:getUserProfile', () => {
    return getUserProfile();
  });

  ipcMain.handle('db:setUserProfile', (_event, profile) => {
    setUserProfile(profile);
  });

  ipcMain.handle('db:mergeUserAchievements', (_event, achievements: string[]) => {
    return mergeUserAchievements(achievements);
  });

  ipcMain.handle('db:migrate', async (event) => {
    const localStorageData = await event.sender.executeJavaScript(`
      (function() {
        const books = localStorage.getItem('lumina_books_v1');
        const franchises = localStorage.getItem('lumina_franchises_v1');
        return {
          books: books ? JSON.parse(books) : [],
          franchises: franchises ? JSON.parse(franchises) : [],
        };
      })()
    `);
    return migrateFromLocalStorage(localStorageData);
  });

  ipcMain.handle('db:searchBooksDictionary', (_event, title, author) => {
    return searchBooksDictionary(title, author);
  });

  ipcMain.handle('db:saveToBooksDictionary', (_event, entry) => {
    saveToBooksDictionary(entry);
  });

  ipcMain.handle('app:getLoginItemSettings', () => {
    return app.getLoginItemSettings();
  });

  ipcMain.handle('app:setLoginItemSettings', (_event, settings: { openAtLogin: boolean; openAsHidden?: boolean }) => {
    app.setLoginItemSettings(settings);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  // Показываем окно только после загрузки
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.focus(); // Убеждаемся что фокус на окне
    
    // Открываем DevTools в режиме разработки
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    if (!isDev) {
      mainWindow.webContents.openDevTools(); // Открываем DevTools для отладки
    }
  });

  // Логирование событий загрузки
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    // Убеждаемся что фокус на окне после загрузки
    mainWindow.webContents.focus();
  });

  // Загружаем приложение
  if (isDev) {
    // В режиме разработки подключаемся к Vite dev server
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      console.error('Failed to load dev server:', err);
    });
  } else {
    // В продакшене загружаем собранные файлы
    // В Electron при упаковке файлы находятся в resources/app.asar или resources/app
    // dist находится относительно dist-electron
    const indexPath = join(__dirname, '../dist/index.html');
    console.log('Loading production file from:', indexPath);
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);
    console.log('app.getAppPath():', app.getAppPath());
    
    // Проверяем существование файла
    if (!existsSync(indexPath)) {
      console.error('Index file does not exist at:', indexPath);
      // Пробуем альтернативные пути
      const altPaths = [
        join(app.getAppPath(), 'dist/index.html'),
        join(process.resourcesPath || __dirname, 'dist/index.html'),
        join(__dirname, '../../dist/index.html'),
      ];
      
      let found = false;
      for (const altPath of altPaths) {
        console.log('Checking alternative path:', altPath);
        if (existsSync(altPath)) {
          console.log('Found file at:', altPath);
          mainWindow.loadFile(altPath).catch(err => {
            console.error('Failed to load from alternative path:', err);
            mainWindow.webContents.openDevTools();
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error('Could not find index.html in any expected location');
        mainWindow.webContents.openDevTools();
        // Показываем сообщение об ошибке
        mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="padding: 20px; font-family: Arial;"><h1>Ошибка загрузки</h1><p>Не удалось найти файлы приложения.</p><p>Проверьте консоль разработчика (F12) для подробностей.</p></div>';
        `);
      }
    } else {
      // Файл существует, загружаем его
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load file:', err);
        mainWindow.webContents.openDevTools();
      });
    }
  }

  // Обработка закрытия окна - сворачиваем в трей вместо закрытия
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
      
      // На macOS показываем уведомление
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createTray() {
  // Если трей уже существует, не создаем новый
  if (tray) {
    return;
  }

  // Определяем путь к иконке трея в зависимости от платформы
  let trayIconPath: string;
  
  if (process.platform === 'darwin') {
    // Для macOS используем специальную иконку для меню-бара (template image)
    // Это должна быть монохромная иконка 22x22 для Retina или 16x16 для обычных дисплеев
    trayIconPath = join(__dirname, '../resources/trayTemplate.png');
    
    // Если специальной иконки нет, используем обычную иконку
    if (!existsSync(trayIconPath)) {
      trayIconPath = join(__dirname, '../resources/icon.png');
    }
  } else if (process.platform === 'win32') {
    // Для Windows используем .ico файл или .png
    trayIconPath = join(__dirname, '../resources/icon.ico');
    if (!existsSync(trayIconPath)) {
      trayIconPath = join(__dirname, '../resources/icon.png');
    }
  } else {
    // Для Linux используем .png
    trayIconPath = join(__dirname, '../resources/icon.png');
  }

  // Проверяем существование файла
  if (!existsSync(trayIconPath)) {
    console.error('Tray icon file not found:', trayIconPath);
    // Используем альтернативные пути для разных режимов (dev/production)
    const altPaths = [
      // Для production (упакованное приложение)
      join(app.getAppPath(), 'resources/icon.png'),
      join(app.getAppPath(), 'resources/icon.ico'),
      join(process.resourcesPath || __dirname, 'resources/icon.png'),
      join(process.resourcesPath || __dirname, 'resources/icon.ico'),
      // Для development
      join(__dirname, '../../resources/icon.png'),
      join(__dirname, '../../resources/icon.ico'),
      // Относительно текущей директории
      join(__dirname, '../resources/icon.png'),
      join(__dirname, '../resources/icon.ico'),
    ];
    
    let found = false;
    for (const altPath of altPaths) {
      console.log('Checking alternative path:', altPath);
      if (existsSync(altPath)) {
        trayIconPath = altPath;
        found = true;
        console.log('Using alternative tray icon path:', trayIconPath);
        break;
      }
    }
    
    if (!found) {
      console.error('Could not find tray icon in any location.');
      console.error('Please ensure that resources/icon.ico (Windows) or resources/icon.png exists.');
      console.error('Tray will not be created without an icon.');
      return;
    }
  }

  console.log('Loading tray icon from:', trayIconPath);

  // Создаем нативное изображение
  let icon = nativeImage.createFromPath(trayIconPath);
  
  // Проверяем, что иконка загрузилась
  if (icon.isEmpty()) {
    console.error('Failed to load tray icon, icon is empty. Path:', trayIconPath);
    console.error('Please check that the icon file is valid and not corrupted.');
    return;
  }
  
  console.log('Icon loaded successfully. Size:', icon.getSize());

  // Для Windows важно, чтобы иконка была правильного размера (16x16 или 32x32)
  if (process.platform === 'win32') {
    const size = icon.getSize();
    console.log('Original icon size:', size);
    
    // Windows трей лучше всего работает с размером 16x16 или 32x32 пикселей
    // Ресайзим до 16x16 для стандартного отображения (Windows может масштабировать до 32x32 для высоких DPI)
    if (size.width !== 16 || size.height !== 16) {
      icon = icon.resize({ width: 16, height: 16 });
      const newSize = icon.getSize();
      console.log(`Resized icon from ${size.width}x${size.height} to ${newSize.width}x${newSize.height} for Windows tray`);
    }
  }
  
  // Для macOS устанавливаем как template image (монохромная иконка)
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  // Создаем трей
  try {
    tray = new Tray(icon);
    console.log('Tray created successfully');
    
    // Для Windows: убеждаемся, что трей видим (иногда иконки скрываются по умолчанию)
    if (process.platform === 'win32') {
      // Не скрываем трей (по умолчанию он видим)
      console.log('Windows tray icon should be visible in notification area');
    }
  } catch (error) {
    console.error('Failed to create tray:', error);
    return;
  }

  // Проверяем, что трей создан
  if (!tray) {
    console.error('Tray is null after creation');
    return;
  }

  // Создаем контекстное меню для трея
  const contextMenu = Menu.buildFromTemplate([
    {
      label: process.platform === 'darwin' ? 'Показать LuminaBooks' : 'Show LuminaBooks',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: process.platform === 'darwin' ? 'Выход' : 'Quit',
      click: () => {
        (app as any).isQuiting = true;
        if (mainWindow) {
          mainWindow.destroy();
        }
        if (tray) {
          tray.destroy();
        }
        app.quit();
      }
    }
  ]);

  tray.setToolTip('LuminaBooks');

  // Обработка клика по иконке трея
  if (tray) {
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
          if (process.platform === 'darwin') {
            app.dock.hide();
          }
        } else {
          mainWindow.show();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });

    if (process.platform === 'darwin') {
      // На macOS не вызываем setContextMenu — он вешает меню на левый клик,
      // из-за чего окно сначала показывается, а потом скрывается при отпускании кнопки.
      // Вместо этого показываем меню только по правому клику.
      tray.on('right-click', () => {
        tray?.popUpContextMenu(contextMenu);
      });
    } else {
      // Windows и Linux: левый клик — показать/скрыть окно, правый — контекстное меню
      tray.setContextMenu(contextMenu);
      tray.on('right-click', () => {
        tray?.popUpContextMenu(contextMenu);
      });
    }
  }
}
// Закрывающая скобка для else блока single-instance lock
