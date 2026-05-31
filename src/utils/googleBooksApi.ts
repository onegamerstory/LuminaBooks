export interface GoogleBooksResult {
  title: string;
  author: string;
  year: number | string;
  totalPages?: number;
  coverUrl: string;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export async function searchBookOnGoogleBooks(
  title: string,
  author?: string,
  apiKey?: string
): Promise<GoogleBooksResult | null> {
  if (!apiKey) return null;

  const isRussian = hasCyrillic(title) || (author ? hasCyrillic(author) : false);

  let query = `intitle:${title}`;
  if (author?.trim()) {
    query += `+inauthor:${author}`;
  }

  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`;
  if (isRussian) {
    url += `&langRestrict=ru`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      console.warn('Google Books API: quota exceeded or access denied');
    }
    throw new Error(`Google Books API error: ${res.status}`);
  }

  const data = await res.json();
  const items = data.items as any[] | undefined;
  if (!items || items.length === 0) return null;

  let item: any;

  if (isRussian) {
    item =
      items.find((i: any) => i.volumeInfo?.language === 'ru' && hasCyrillic(i.volumeInfo?.title || '') && i.volumeInfo?.imageLinks) ||
      items.find((i: any) => i.volumeInfo?.language === 'ru' && hasCyrillic(i.volumeInfo?.title || '')) ||
      items.find((i: any) => i.volumeInfo?.language === 'ru' && i.volumeInfo?.imageLinks) ||
      items.find((i: any) => i.volumeInfo?.language === 'ru') ||
      items.find((i: any) => hasCyrillic(i.volumeInfo?.title || '') && i.volumeInfo?.imageLinks) ||
      items.find((i: any) => hasCyrillic(i.volumeInfo?.title || '')) ||
      items[0];
  } else {
    item = items.find((i: any) => i.volumeInfo?.imageLinks) || items[0];
  }

  const info = item.volumeInfo || {};

  let resultTitle = info.title || title;
  let resultAuthor = info.authors?.[0] || author || 'Unknown';

  if (isRussian) {
    if (!hasCyrillic(resultTitle) && hasCyrillic(title)) {
      resultTitle = title;
    }
    if (!hasCyrillic(resultAuthor) && author && hasCyrillic(author)) {
      resultAuthor = author;
    }

  }

  const coverUrl = info.imageLinks?.thumbnail?.replace('http:', 'https:')
    || info.imageLinks?.smallThumbnail?.replace('http:', 'https:')
    || '';

  return {
    title: resultTitle || 'Unknown',
    author: resultAuthor || 'Unknown',
    year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
    totalPages: info.pageCount,
    coverUrl,
  };
}
