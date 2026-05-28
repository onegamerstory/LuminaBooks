export interface OpenLibraryResult {
  title: string;
  author: string;
  year: number | string;
  totalPages?: number;
  coverUrl: string;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export async function searchBookOnOpenLibrary(
  title: string,
  author?: string
): Promise<OpenLibraryResult | null> {
  const query = `${title} ${author || ''}`.trim();
  const hasRussian = hasCyrillic(query);

  let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
  if (hasRussian) {
    url += '&lang=ru';
  }

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Open Library API error: ${res.status}`);
  }

  const data = await res.json();
  const docs = data.docs as any[] | undefined;
  if (!docs || docs.length === 0) return null;

  // Find the best match: prefer results with a cover and matching language
  let doc = docs[0];
  if (hasRussian) {
    doc = docs.find(d =>
      d.language?.includes('rus') &&
      d.cover_i
    ) || docs.find(d => d.language?.includes('rus')) || docs[0];
  }

  return {
    title: doc.title,
    author: doc.author_name?.[0] || 'Unknown',
    year: doc.first_publish_year || '',
    totalPages: doc.number_of_pages_median,
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : '',
  };
}
