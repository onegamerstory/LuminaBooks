
export const calculateDaysDifference = (startDate: string, endDate?: string): number | null => {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  
  // Нормализуем даты до начала дня для точного расчета
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 чтобы включить начальный день
  
  return diffDays > 0 ? diffDays : 1; // Минимум 1 день
};

// Вычисляет общее количество часов для книги
// Итоговые часы = часы из сессий + импортированные часы (если были)
export const calculateBookTotalHours = (book: { sessions?: Array<{duration: number}>; importedTotalHours?: number }): number => {
  // Часы из сессий, добавленных в приложении
  let sessionHours = 0;
  if (book.sessions && book.sessions.length > 0) {
    const totalSeconds = book.sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    sessionHours = Math.round((totalSeconds / 3600) * 10) / 10;
  }
  
  // Часы, импортированные из файла
  const importedHours = book.importedTotalHours || 0;
  
  // Складываем обе части
  return Math.round((sessionHours + importedHours) * 10) / 10;
};
