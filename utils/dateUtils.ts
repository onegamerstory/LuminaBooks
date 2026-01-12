
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

