import { Book, BookStatus, StatusChange } from '../types';

/**
 * Конвертирует старые значения статусов в новый UPPERCASE формат
 * Используется для миграции данных из localStorage
 * Старые значения: 'Reading', 'Read', 'To Read', 'Abandoned', 'Postponed'
 * Новые значения: 'READING', 'READ', 'WANT_TO_READ', 'ABANDONED', 'POSTPONED'
 */
const migrateOldStatusValue = (oldStatus: any): BookStatus => {
  if (!oldStatus) return BookStatus.WANT_TO_READ;

  // Если уже в новом формате - возвращаем как есть
  if (Object.values(BookStatus).includes(oldStatus)) {
    return oldStatus;
  }

  // Преобразуем старые значения в новые
  const statusMap: Record<string, BookStatus> = {
    'Reading': BookStatus.READING,
    'Read': BookStatus.READ,
    'To Read': BookStatus.WANT_TO_READ,
    'Abandoned': BookStatus.ABANDONED,
    'Postponed': BookStatus.POSTPONED,
    'READING': BookStatus.READING,
    'READ': BookStatus.READ,
    'WANT_TO_READ': BookStatus.WANT_TO_READ,
    'ABANDONED': BookStatus.ABANDONED,
    'POSTPONED': BookStatus.POSTPONED,
  };

  return statusMap[oldStatus] || BookStatus.WANT_TO_READ;
};

/**
 * Мигрирует старую историю статусов на новый формат UPPERCASE
 */
export const migrateBookStatusHistory = (book: Book): Book => {
  if (!book.statusHistory || book.statusHistory.length === 0) {
    return book;
  }

  const migratedHistory = book.statusHistory.map(change => ({
    ...change,
    previousStatus: migrateOldStatusValue(change.previousStatus),
    newStatus: migrateOldStatusValue(change.newStatus),
  }));

  return {
    ...book,
    // Мигрируем и текущий статус тоже
    status: migrateOldStatusValue(book.status),
    statusHistory: migratedHistory,
  };
};

/**
 * Мигрирует всю коллекцию книг
 */
export const migrateAllBooksStatusHistory = (books: Book[]): Book[] => {
  return books.map(book => migrateBookStatusHistory(book));
};

/**
 * Восстанавливает историю статусов из дат начала и конца чтения
 * Если есть startDate и endDate - создает переход WANT_TO_READ → READING → READ
 * Если есть только startDate - создает переход WANT_TO_READ → READING
 * Если дат нет - возвращает пустой массив
 */
export const generateStatusHistoryFromDates = (book: Book): StatusChange[] => {
  const history: StatusChange[] = [];

  // Если история уже существует и валидна - возвращаем её
  // ВАЖНО: это используется только в некоторых случаях (при миграции)
  // При редактировании дат должна вызываться regenerateStatusHistoryFromDates()
  if (book.statusHistory && book.statusHistory.length > 0) {
    return book.statusHistory;
  }

  // Проверяем наличие дат
  const hasStartDate = book.startDate && typeof book.startDate === 'string' && book.startDate.trim() !== '';
  const hasEndDate = book.endDate && typeof book.endDate === 'string' && book.endDate.trim() !== '';

  if (!hasStartDate) {
    // Нет дат - история не восстанавливается
    return [];
  }

  // Есть дата начала - создаем переход WANT_TO_READ → READING
  // Добавляем время начала дня (00:00:00)
  const startDateTime = new Date(`${book.startDate}T00:00:00Z`).toISOString();
  history.push({
    timestamp: startDateTime,
    previousStatus: BookStatus.WANT_TO_READ,
    newStatus: BookStatus.READING
  });

  // Если есть дата конца - создаем переход READING → READ
  // Добавляем время конца дня (23:59:59)
  if (hasEndDate) {
    const endDateTime = new Date(`${book.endDate}T23:59:59Z`).toISOString();
    history.push({
      timestamp: endDateTime,
      previousStatus: BookStatus.READING,
      newStatus: BookStatus.READ
    });
  }

  return history;
};

/**
 * ВСЕГДА регенерирует историю статусов из дат (в отличие от generateStatusHistoryFromDates)
 * Используется при редактировании дат книги, чтобы обновить историю на основе новых дат
 * Эта функция ИГНОРИРУЕТ существующую историю и создает новую с нуля на основе текущих дат
 */
export const regenerateStatusHistoryFromDates = (book: Book): StatusChange[] => {
  const history: StatusChange[] = [];

  // Проверяем наличие дат (исключаем пустые строки и null/undefined)
  const hasStartDate = book.startDate && typeof book.startDate === 'string' && book.startDate.trim() !== '';
  const hasEndDate = book.endDate && typeof book.endDate === 'string' && book.endDate.trim() !== '';

  if (!hasStartDate) {
    // Нет дат - история не восстанавливается
    return [];
  }

  // Есть дата начала - создаем переход WANT_TO_READ → READING
  // Добавляем время начала дня (00:00:00)
  const startDateTime = new Date(`${book.startDate}T00:00:00Z`).toISOString();
  history.push({
    timestamp: startDateTime,
    previousStatus: BookStatus.WANT_TO_READ,
    newStatus: BookStatus.READING
  });

  // Если есть дата конца - создаем переход READING → READ
  // Добавляем время конца дня (23:59:59)
  if (hasEndDate) {
    const endDateTime = new Date(`${book.endDate}T23:59:59Z`).toISOString();
    history.push({
      timestamp: endDateTime,
      previousStatus: BookStatus.READING,
      newStatus: BookStatus.READ
    });
  }

  return history;
};

/**
 * Если у книги статус READ, но нет истории и нет дат - создает фиктивную историю
 */
export const enrichBookStatusHistory = (book: Book): Book => {
  // Если уже есть история - ничего не делаем
  if (book.statusHistory && book.statusHistory.length > 0) {
    return book;
  }

  // Генерируем историю из дат
  const generatedHistory = generateStatusHistoryFromDates(book);

  if (generatedHistory.length === 0) {
    // Если истории нет и дат нет, но статус READ - создаем фиктивную историю
    // Это нужно для случаев, когда пользователь поставил статус READ без дат
    if (book.status === BookStatus.READ) {
      const now = new Date().toISOString();
      const fakeHistory: StatusChange[] = [
        {
          timestamp: now,
          previousStatus: BookStatus.WANT_TO_READ,
          newStatus: BookStatus.READING
        },
        {
          timestamp: now,
          previousStatus: BookStatus.READING,
          newStatus: BookStatus.READ
        }
      ];
      return {
        ...book,
        statusHistory: fakeHistory
      };
    }
    return book;
  }

  return {
    ...book,
    statusHistory: generatedHistory
  };
};

/**
 * Пополняет историю для всех книг, у которых её нет
 */
export const enrichAllBooksStatusHistory = (books: Book[]): Book[] => {
  return books.map(book => enrichBookStatusHistory(book));
};

 /**
 * Если история есть - берет последний (самый свежий) статус
 * Если истории нет - использует установленный пользователем статус
 */
export const getCurrentBookStatus = (book: Book): BookStatus => {
  // Если есть валидная история статусов, берем последний статус из неё
  if (book.statusHistory && book.statusHistory.length > 0) {
    return book.statusHistory[book.statusHistory.length - 1].newStatus;
  }
  // Иначе используем установленный статус
  return book.status;
};

/**
 * Создает записи истории статусов для прямого перехода WANT_TO_READ → READ
 * Если у книги есть startDate и/или endDate, использует их для создания записей:
 * - startDate: WANT_TO_READ → READING
 * - endDate: READING → READ
 * Если дат нет, использует текущее время
 */
const createStatusHistoryForDirectRead = (
  book: Book,
  newStatus: BookStatus
): StatusChange[] => {
  const history: StatusChange[] = [];

  // Проверяем наличие дат
  const hasStartDate = book.startDate && typeof book.startDate === 'string' && book.startDate.trim() !== '';
  const hasEndDate = book.endDate && typeof book.endDate === 'string' && book.endDate.trim() !== '';

  // Если есть дата начала - создаем переход WANT_TO_READ → READING
  if (hasStartDate) {
    // Добавляем время начала дня (00:00:00)
    const startDateTime = new Date(`${book.startDate}T00:00:00Z`).toISOString();
    history.push({
      timestamp: startDateTime,
      previousStatus: BookStatus.WANT_TO_READ,
      newStatus: BookStatus.READING
    });
  }

  // Если есть дата конца - создаем переход READING → READ
  if (hasEndDate) {
    // Добавляем время конца дня (23:59:59)
    const endDateTime = new Date(`${book.endDate}T23:59:59Z`).toISOString();
    history.push({
      timestamp: endDateTime,
      previousStatus: BookStatus.READING,
      newStatus: BookStatus.READ
    });
  }

  // Если дат нет, используем текущее время для прямого перехода
  if (!hasStartDate && !hasEndDate) {
    const now = new Date().toISOString();
    // Добавляем промежуточный статус READING с тем же timestamp
    history.push({
      timestamp: now,
      previousStatus: BookStatus.WANT_TO_READ,
      newStatus: BookStatus.READING
    });
    history.push({
      timestamp: now,
      previousStatus: BookStatus.READING,
      newStatus: BookStatus.READ
    });
  }

  return history;
};

/**
 * Записывает изменение статуса в историю, если статус действительно изменился
 * Если пользователь перевел книгу из WANT_TO_READ сразу в READ,
 * создает промежуточные записи: WANT_TO_READ → READING → READ
 */
export const recordStatusChange = (book: Book, newStatus: BookStatus): Book => {
  // Если статус не изменился, просто возвращаем книгу как есть
  if (book.status === newStatus) {
    return book;
  }

  // Особый случай: прямой переход WANT_TO_READ → READ
  // Создаем промежуточные записи истории
  if (book.status === BookStatus.WANT_TO_READ && newStatus === BookStatus.READ) {
    const intermediateHistory = createStatusHistoryForDirectRead(book, newStatus);

    // Объединяем с существующей историей (если есть)
    const existingHistory = book.statusHistory || [];
    const combinedHistory = [...existingHistory, ...intermediateHistory];

    return {
      ...book,
      status: newStatus,
      statusHistory: combinedHistory
    };
  }

  // Обычный случай - просто добавляем изменение в историю
  const statusChange: StatusChange = {
    timestamp: new Date().toISOString(),
    previousStatus: book.status,
    newStatus: newStatus
  };

  return {
    ...book,
    status: newStatus,
    statusHistory: [...(book.statusHistory || []), statusChange]
  };
};

/**
 * Получает все активные фазы чтения (периоды, когда статус был "Читаю")
 * Возвращает массив объектов с датами начала и конца каждой активной фазы
 */
export const getActiveReadingPhases = (
  book: Book
): Array<{ startDate: string; endDate: string }> => {
  const phases: Array<{ startDate: string; endDate: string }> = [];

  // Проверяем наличие дат
  const hasStartDate = book.startDate && typeof book.startDate === 'string' && book.startDate.trim() !== '';
  const hasEndDate = book.endDate && typeof book.endDate === 'string' && book.endDate.trim() !== '';

  // ПРИОРИТЕТ 1: Если есть даты - используем их напрямую
  // (даты всегда актуальны, история может быть устаревшей)
  if (hasStartDate) {
    // Если статус "Читаю" или "Прочитано" и есть даты - это активная фаза
    if ((book.status === BookStatus.READING || book.status === BookStatus.READ) && hasStartDate) {
      phases.push({
        startDate: book.startDate,
        endDate: hasEndDate ? book.endDate : new Date().toISOString().split('T')[0]
      });
      return phases;
    }
  }

  // ПРИОРИТЕТ 2: Если нет дат или статус не "Читаю"/"Прочитано", используем историю
  if (!book.statusHistory || book.statusHistory.length === 0) {
    // Если нет истории и нет дат - нет активной фазы
    return phases;
  }

  // Проходим по истории статусов и ищем когда статус переходил в "Читаю" и из "Читаю"
  let readingStartDate: string | null = null;

  // Сначала проверяем начальный статус (может быть установлен до первого изменения)
  if (book.statusHistory.length > 0) {
    const firstChange = book.statusHistory[0];
    // Если первое изменение - переход В "Читаю", значит до этого был другой статус
    // Если первое изменение - переход ИЗ "Читаю", значит книга начиналась со статуса "Читаю"
    if (
      firstChange.previousStatus === BookStatus.READING &&
      firstChange.newStatus !== BookStatus.READING &&
      book.startDate
    ) {
      // Была фаза чтения от startDate до даты первого изменения
      phases.push({
        startDate: book.startDate,
        endDate: new Date(firstChange.timestamp).toISOString().split('T')[0]
      });
    }
  }

  // Проходим по истории статусов
  for (const change of book.statusHistory) {
    if (change.newStatus === BookStatus.READING) {
      // Переход В статус "Читаю"
      // Начало активной фазы - это дата изменения
      readingStartDate = new Date(change.timestamp).toISOString().split('T')[0];
    } else if (change.previousStatus === BookStatus.READING) {
      // Переход ИЗ статуса "Читаю" В другой статус
      if (readingStartDate) {
        const endDate = new Date(change.timestamp).toISOString().split('T')[0];
        phases.push({
          startDate: readingStartDate,
          endDate: endDate
        });
        readingStartDate = null;
      }
    }
  }

  // Если статус заканчивается на "Читаю", добавляем открытую фазу
  if (readingStartDate && book.status === BookStatus.READING) {
    phases.push({
      startDate: readingStartDate,
      endDate: book.endDate || new Date().toISOString().split('T')[0]
    });
  }
  // Если статус закончился на "Прочитано", добавляем закрытую фазу
  else if (
    book.statusHistory.length > 0 &&
    book.statusHistory[book.statusHistory.length - 1].newStatus === BookStatus.READ &&
    readingStartDate === null
  ) {
    // Ищем последний переход ИЗ "Читаю" в "Прочитано"
    for (let i = book.statusHistory.length - 1; i >= 0; i--) {
      const change = book.statusHistory[i];
      if (
        change.previousStatus === BookStatus.READING &&
        change.newStatus === BookStatus.READ
      ) {
        // Ищем начало этой фазы читчя (последний переход В "Читаю" перед этим)
        let phaseStart = book.startDate;
        for (let j = i - 1; j >= 0; j--) {
          if (book.statusHistory[j].newStatus === BookStatus.READING) {
            phaseStart = new Date(book.statusHistory[j].timestamp)
              .toISOString()
              .split('T')[0];
            break;
          }
        }
        if (phaseStart && book.endDate) {
          phases.push({
            startDate: phaseStart,
            endDate: book.endDate
          });
        }
        break;
      }
    }
  }

  return phases;
};
