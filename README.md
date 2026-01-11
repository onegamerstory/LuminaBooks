<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LuminaBooks - Personal Book Tracker

Приложение для отслеживания вашей библиотеки книг, созданное с React, Vite и Electron.

View your app in AI Studio: https://ai.studio/apps/drive/1WodKcppTzMOa_S2eYb56W1sCg7LG8q8W

## Запуск в браузере

**Требования:** Node.js 18+

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Установите `GEMINI_API_KEY` в файле `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Запустите приложение:
   ```bash
   npm run dev
   ```

## Запуск как Desktop приложение (Electron)

### Режим разработки

```bash
npm run electron:dev
```

Это запустит Vite dev server и Electron одновременно.

### Сборка для Windows

```bash
npm run electron:build
```

Создаст установочный файл `.exe` в папке `release/`.

### Сборка для macOS

На macOS выполните:

```bash
npm run electron:build
```

Создаст файл `.dmg` в папке `release/`.

### Сборка без установщика (для тестирования)

```bash
npm run electron:pack
```

## Функциональность трея (System Tray)

Приложение поддерживает сворачивание в системный трей для всех платформ:

- **Windows**: Иконка появляется в области уведомлений (системный трей)
- **macOS**: Иконка появляется в меню-баре (menu bar) справа
- **Linux**: Иконка появляется в системном трее

### Как использовать:

1. При закрытии окна приложение сворачивается в трей (не закрывается)
2. Клик по иконке трея показывает/скрывает окно приложения
3. Правый клик (или клик с модификатором на macOS) открывает контекстное меню:
   - Показать LuminaBooks
   - Выход

**Примечание для macOS:** Для правильного отображения иконки в меню-баре рекомендуется создать специальную монохромную иконку. См. [TRAY_ICON_GUIDE.md](resources/TRAY_ICON_GUIDE.md)

**Подробные инструкции по сборке:** см. [BUILD.md](BUILD.md)
