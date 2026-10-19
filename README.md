# LuminaBooks - Персональный Book Tracker

<img width="128" height="128" alt="icon" src="https://github.com/user-attachments/assets/0a18658d-1c10-4e8f-8d04-fdbc83c21023" />

ПК-приложение для отслеживания вашей библиотеки книг, созданное с помощью ИИ на стеке React + Vite + Electron.

Приложение разрабатывалось под себя, опираяясь на то, как нам было бы удобно. 

Ниже кратко будут описаны функциональные возможности.

![GitHub Repo stars](https://img.shields.io/github/stars/onegamerstory/LuminaBooks)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/onegamerstory/LuminaBooks/total)
![GitHub Release](https://img.shields.io/github/v/release/onegamerstory/LuminaBooks)


# Установка

## Windows

Стандартный процесс установки:

<img width="498" height="385" alt="image" src="https://github.com/user-attachments/assets/d03e5422-f13c-458b-96ff-b15fa956b2dc" />

<img width="495" height="386" alt="image" src="https://github.com/user-attachments/assets/4bca962e-7420-45f8-93ad-8322cd290848" />

## MacOS

В релизах два установщика:

- `...-arm64.dmg` — Mac с чипом Apple (M1/M2/M3/M4)
- `...-x64.dmg` — Mac с процессором Intel

Чип можно посмотреть в «Об этом Mac». Если скачать не ту архитектуру, система напишет, что приложение не поддерживается этим компьютером.

Классический процесс установки: 

<img width="449" height="394" alt="image" src="https://github.com/user-attachments/assets/3d450e9b-d848-4555-9976-59ea9833310e" />

После установки `.dmg` файла при запуске приложения вы можете получите сообщение о том, что оно повреждено.

Так как я не являюсь зарегистрированным разработчиком, и моей поделки нет в AppStore, то следует обойти блокировку неподписанного приложения - ваш Mac не доверяет моему приложению, которое официально не подписано, и блокирует его при запуске.

В Терминале выполните команду:

`xattr -d com.apple.quarantine /Applications/LuminaBooks.app`

Или с правами суперпользователя/администратора, добавив вначало sudo:

`sudo xattr -d com.apple.quarantine /Applications/LuminaBooks.app`

# Стек и архитектура

- React + Vite + Electron
- Данные профиля и книг со всей информацией сохраняются в БД SQLite на ПК
- Интеграция с Google Books API c сохранением найденных книг в отдельный локальный справочник в БД
- На все desktop-платформы (Windows, MacOS, Linux) (+ доступ из любого браузера в локальной сети, если запущено основное приложение)
- Есть мобильная веб-версия, доступная в браузере (подробнее [тут](#пк-приложение-и-браузерная-версия)))

# Функциональные возможности

- Ведение каталога книг
- Поиск книги по названию в Google Books ([необходим API-ключ](#как-получить-api-ключ) - бесплатно, см. инструкцию)
- Трекинг сессий чтения для каждой книги
- Предложение случайной книги
- Создание коллекций книг
- Экспорт/импорт всех данных в формате JSON
- Настройка обложек по умолчанию
- Настройка авто-синхронизации между несколькими устройствами (между пк-версией и веб-версией)
- Вывод статистики за всё время, за конкретный месяц и день
- Два вариант использования: ПК-приложение (базовая версия) и веб-приложение (веб-приложение подключается к пк-версией по локальной сети, подробнее [тут](#пк-приложение-и-браузерная-версия))

## Профиль

Страница, посвященная статистике и достижениям:

<img width="1276" height="1210" alt="image" src="https://github.com/user-attachments/assets/71ac9d24-555c-482b-989e-7d946817193d" />

## Каталог

"Сердце" всего приложения - библиотека книг, доступное в табличном формате и виде сетки.
Возможности фильтрации и сортировки, поиска книг по названию или по имени автора. 
Имеется возможность экспорта/импорта в формате JSON для переноса данных на другое устройство при необходимости.

Также, доступна возможность добавить книгу в очередь, сформировав список произведений, который отобразится на странице "Чтение":

<img width="1295" height="1039" alt="image" src="https://github.com/user-attachments/assets/ae11cfc6-f2bf-4292-8a5e-db235183cbda" />

<img width="1293" height="1273" alt="image" src="https://github.com/user-attachments/assets/6a142cc2-f5b0-4e14-baca-31d997a0e137" />

## Чтение

На странице трекинга чтения можно увидеть очередь из произведений, а также книги в статусах "Читаю" и "Отложено" в отдельных разделах. 
Для каждой книги доступна фиксация сессий чтения с информацией о времени и прогрессе. Фиксация сессий доступна как в реальном времени с секундомером, так и пост-фактум.

<img width="1292" height="1088" alt="image" src="https://github.com/user-attachments/assets/5f8a5c4e-5782-43a0-a5fc-fb80391e9888" />

## Календарь

Страница с календарем, где вы в двух представлениях можете увидеть вашу активность:
- Фазы чтения - это отображение от первого дня чтения книги до последнего дня чтения
- Сессии чтения - отображение на календаре только тех дней, где у вас зафиксированы сессии

Для каждого месяца доступна краткая статистика в правом окне.

<img width="1296" height="1036" alt="image" src="https://github.com/user-attachments/assets/e20e7dfe-c9a8-4149-ab39-1886a73ba816" />

<img width="1295" height="1037" alt="image" src="https://github.com/user-attachments/assets/71d70d63-58bf-43b7-8e06-f0e24dcf9849" />

Также, по правому клику на ячейку вы можете задать дату начала чтения книги (для начала фазы чтения)

<img width="694" height="1088" alt="image" src="https://github.com/user-attachments/assets/f616da0d-8000-41b2-a777-26074cbef2a9" />

## Коллекции

На этой странице возможность сформировать коллекции книг по любому признаку: популярная франшиза или принадлежность к золотому веку поэзии:

<img width="1314" height="660" alt="image" src="https://github.com/user-attachments/assets/11374e33-2d2d-4a32-8a17-2a6565c77e92" />

## Настройки

Окно настроек, где можно указать имя, аватар, обложку по умолчанию, а также включить авто-синхронизацию (если пользуетесь несколькими версиями приложениями)  

<img width="771" height="1156" alt="image" src="https://github.com/user-attachments/assets/066f1ec6-5460-4049-a44f-aafc0f6c7b70" />

# ПК-приложение и браузерная веб-версия

Эта схема работы была придумана для себя, т.к. у меня дома есть сервер, где и установлено приложение. Таким образом, всегда и с любого устройства можно зайти в трекер.

## Как это работает?

1. Вы запускаете ПК-приложение на Windows/MacOS/Linux и пользуетесь им как обычным приложением
2. "Под капотом" вместе с этим запускается сервер, который позволяет подключиться к этому ПК через браузер (с другого ПК или мобильного устройства)
3. Берете, например, macbook или iphone, находясь в той же сети, в браузере переходите по ссылке, указанной в меню приложения

<img width="647" height="215" alt="image" src="https://github.com/user-attachments/assets/0a51c7d7-5d3c-4a42-aeec-fc61c34dc2f7" />

## Как выглядит мобильная версия

Мы продолжаем работать над мобильной версией, дабы сделать ее удобнее, так как это достаточно удобный вариант:

<img width="393" height="738" alt="IMG_8260" src="https://github.com/user-attachments/assets/4195c0d4-2d34-4377-bb68-a5b62b373e44" />

<img width="393" height="738" alt="IMG_8263" src="https://github.com/user-attachments/assets/a422bdad-aa6d-4191-932a-11badc8b0574" />

<img width="393" height="738" alt="IMG_8261" src="https://github.com/user-attachments/assets/6f1d0273-887e-4b85-a9af-7b33becb7b46" />

<img width="393" height="738" alt="IMG_8259" src="https://github.com/user-attachments/assets/a0fe2e13-5286-4eb1-a462-87318cac5159" />


# Google Books API

Приложение поддерживает поиск книг в Google Books, чтобы было удобнее и быстрее добавлять книги в вашу библиотеку.
Вы вводите название книги и нажимаете "Поиск", приложение запрашивает Google Books и подставляет полной название книги, автора, год выпуска и количество страниц (оно может быть разным в зависимости от издания).

<img width="653" height="570" alt="image" src="https://github.com/user-attachments/assets/39fbd287-f488-433a-88fc-d5e9ddef8c25" />

Для того, чтобы этот функционал работал, необходимо выпустить свой API-ключ

## Как получить API-ключ

Необходимо зарегистрировать Google Account или использовать существующий.
Далее:

### 1. Переходим на [Google Cloud Console](https://console.cloud.google.com/)

### 2. Вверху нажимаем `Select project` → `New Project` и называем, к примеру, `LuminaBooks`. 

<img width="499" height="123" alt="image" src="https://github.com/user-attachments/assets/3439835c-4f09-4599-9bae-add850f8a021" />
<img width="799" height="135" alt="image" src="https://github.com/user-attachments/assets/c50b9450-8a06-4660-b701-6be27827c8a5" />

### 3. Нужно дождаться создания проекта и затем еще раз выбрать его наверху

<img width="499" height="123" alt="image" src="https://github.com/user-attachments/assets/c5e4ff91-eeba-41bf-9c11-1dfeacbd39a3" />

### 4. Открываем [Google Books API Page](https://console.cloud.google.com/apis/library/books.googleapis.com) и нажимаем `Enable`

<img width="653" height="258" alt="image" src="https://github.com/user-attachments/assets/1d47855f-8ef2-4c8c-940e-5454dc14a1c5" />

### 5. Создаем ключ. Переходим `APIs & Services` → `Credentials` → `Create Credentials` → `API key`

<img width="1079" height="445" alt="image" src="https://github.com/user-attachments/assets/43688515-e263-46c0-bcff-c8c2fa61e44f" />

В открывшемся окне заполняем имя ключа (можно оставить по умолчанию) и самое главное - в графе `Select API restrictions` выбираем `Books API` (ищем по слову `books`).

<img width="582" height="891" alt="image" src="https://github.com/user-attachments/assets/f473636f-c169-4ded-8c66-2539c7a71691" />

После этого Google покажем вам ключ:

<img width="586" height="169" alt="image" src="https://github.com/user-attachments/assets/ac6ced9b-9b66-41af-8dc1-6741715ca2a6" />

### 6. Копируем его, вставляем в настройки приложения и сохраняем

<img width="648" height="248" alt="image" src="https://github.com/user-attachments/assets/6ca9a46e-0a94-4e15-8c81-1c6aa25a0489" />

# Сборка Desktop приложения из исходников

## Установка пакетов

```bash
npm install
```

## Режим разработки

```bash
npm run electron:dev
```

Это запустит Vite dev server и Electron одновременно.

## Сборка для Windows

```bash
npm run electron:build
```

Создаст установочный файл `.exe` в папке `release/`.
