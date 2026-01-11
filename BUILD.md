# Инструкция по сборке LuminaBooks для Windows и macOS

## Предварительные требования

1. **Node.js** версии 18 или выше
2. **npm** или **yarn**
3. Для сборки под macOS на Windows потребуется macOS или виртуальная машина

## Установка зависимостей

```bash
npm install
```

## Разработка

Для запуска приложения в режиме разработки:

```bash
npm run electron:dev
```

Это запустит Vite dev server и Electron одновременно.

## Сборка приложения

### Для Windows

1. Убедитесь, что вы находитесь на Windows или используете Windows в виртуальной машине
2. Выполните команду:

```bash
npm run electron:build
```

Это создаст установочный файл `.exe` в папке `release/`.

**Результат:**
- `release/LuminaBooks Setup x.x.x.exe` - установщик NSIS

### Для macOS

1. Убедитесь, что вы находитесь на macOS
2. Выполните команду:

```bash
npm run electron:build
```

Это создаст файл `.dmg` в папке `release/`.

**Результат:**
- `release/LuminaBooks-x.x.x.dmg` - образ диска для установки

### Сборка без установщика (для тестирования)

Если вы хотите собрать приложение без создания установщика (только исполняемые файлы):

```bash
npm run electron:pack
```

Это создаст папку с исполняемым файлом в `release/`.

## Что происходит при сборке

1. **`build:electron`** - компилирует TypeScript файлы из `electron/` в `dist-electron/`
2. **`build:app`** - компилирует React приложение и собирает его через Vite в `dist/`
3. **`electron-builder`** - упаковывает все в исполняемое приложение для выбранной платформы

## Иконки приложения

Для правильной работы иконок создайте папку `resources/` и поместите туда:
- `resources/icon.ico` - для Windows (256x256 или больше)
- `resources/icon.icns` - для macOS (см. **ВАЖНО** ниже)
- `resources/icon.png` - для Linux (512x512 или больше)
- `resources/trayTemplate.png` - для macOS трея (см. **ВАЖНО** ниже)

**ВАЖНО для macOS:**
- Чтобы избежать растягивания иконки в меню-баре при подключении внешнего монитора, файл `.icns` должен содержать все размеры для разных DPI (1x и 2x версии). Подробная инструкция: см. [ICON_GUIDE.md](resources/ICON_GUIDE.md)
- Для иконки трея в меню-баре macOS нужна специальная монохромная иконка (Template Image). Подробная инструкция: см. [TRAY_ICON_GUIDE.md](resources/TRAY_ICON_GUIDE.md)

Если иконки отсутствуют, приложение будет использовать стандартную иконку Electron.

## Переменные окружения

Убедитесь, что у вас есть файл `.env.local` с вашим API ключом:

```
GEMINI_API_KEY=your_api_key_here
```

## Проблемы и решения

### Ошибка при компиляции TypeScript

Если возникают ошибки компиляции, проверьте:
- Версию TypeScript: `npm list typescript`
- Настройки в `electron/tsconfig.json`

### Ошибка при сборке Electron

Если `electron-builder` выдает ошибки:
- Убедитесь, что все зависимости установлены: `npm install`
- Проверьте, что папки `dist/` и `dist-electron/` созданы после компиляции

### Сборка для другой платформы

Для сборки под другую платформу на текущей ОС используйте флаги:

```bash
# Сборка для Windows на macOS/Linux
npm run electron:build -- --win

# Сборка для macOS на Windows/Linux (требует macOS)
npm run electron:build -- --mac

# Сборка для Linux
npm run electron:build -- --linux
```

## Структура после сборки

```
release/
├── LuminaBooks Setup x.x.x.exe  (Windows)
├── LuminaBooks-x.x.x.dmg        (macOS)
└── win-unpacked/                 (распакованная версия для тестирования)
    └── LuminaBooks.exe
```

## Дополнительные настройки

Вы можете изменить настройки сборки в секции `"build"` файла `package.json`:
- `appId` - уникальный идентификатор приложения
- `productName` - название приложения
- Размеры окна, иконки и другие параметры

