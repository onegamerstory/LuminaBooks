import * as XLSX from 'xlsx';
import { Book, BookStatus } from '../types';

export const exportBooksToExcel = (books: Book[]) => {
  // Подготовка данных для экспорта
  const excelData = books.map(book => ({
    'Название': book.title,
    'Автор': book.author,
    'Год': book.year,
    'Статус': book.status,
    'Оценка': book.rating,
    'Дата начала': book.startDate,
    'Дата окончания': book.endDate,
    'Ссылка на обложку': book.coverUrl,
    'Описание': book.description || ''
  }));

  // Создание workbook и worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Books');

  // Установка ширины колонок
  ws['!cols'] = [
    { wch: 25 },  // Название
    { wch: 20 },  // Автор
    { wch: 8 },   // Год
    { wch: 12 },  // Статус
    { wch: 8 },   // Оценка
    { wch: 12 },  // Дата начала
    { wch: 12 },  // Дата окончания
    { wch: 40 },  // Ссылка на обложку
    { wch: 30 }   // Описание
  ];

  // Сохранение файла
  XLSX.writeFile(wb, `Books_${new Date().getTime()}.xlsx`);
};

export const importBooksFromExcel = (file: File): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Преобразование данных в формат Book
        const importedBooks: Book[] = jsonData.map((row, index) => {
          // Валидация статуса
          let status = BookStatus.WANT_TO_READ;
          if (Object.values(BookStatus).includes(row['Статус'])) {
            status = row['Статус'] as BookStatus;
          }

          // Валидация оценки
          let rating = 0;
          if (typeof row['Оценка'] === 'number') {
            rating = Math.min(10, Math.max(0, row['Оценка']));
          } else if (typeof row['Оценка'] === 'string') {
            const parsed = parseFloat(row['Оценка']);
            rating = isNaN(parsed) ? 0 : Math.min(10, Math.max(0, parsed));
          }

          return {
            id: `imported_${Date.now()}_${index}`,
            title: row['Название'] || 'Unknown',
            author: row['Автор'] || 'Unknown',
            year: row['Год'] || new Date().getFullYear(),
            coverUrl: row['Ссылка на обложку'] || '',
            status: status,
            rating: rating,
            startDate: row['Дата начала'] || '',
            endDate: row['Дата окончания'] || '',
            description: row['Описание'] || ''
          };
        });

        resolve(importedBooks);
      } catch (error) {
        reject(new Error('Ошибка при чтении Excel файла'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка при загрузке файла'));
    };

    reader.readAsArrayBuffer(file);
  });
};
