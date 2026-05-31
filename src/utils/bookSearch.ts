import { searchBookOnGoogleBooks } from './googleBooksApi';
import type { BookDictEntry } from '../electron.d';

export interface SearchResult {
  title: string;
  author: string;
  year: number | string;
  totalPages?: number;
  coverUrl: string;
  source: 'local' | 'googlebooks';
  lang?: string;
}

export async function searchBook(
  title: string,
  author: string | undefined,
  googleApiKey: string | undefined,
  searchLocal: (title: string, author?: string) => Promise<BookDictEntry[]>,
): Promise<SearchResult | null> {
  // Step 1: search local dictionary
  try {
    const localResults = await searchLocal(title, author);
    if (localResults.length > 0) {
      const best = localResults[0];
      return {
        title: best.title,
        author: best.author,
        year: best.year,
        coverUrl: best.coverUrl,
        source: 'local',
        lang: best.lang,
      };
    }
  } catch {
    // local search failed, continue to API
  }

  // Step 2: Google Books API (only if key is provided)
  if (googleApiKey) {
    try {
      const gbResult = await searchBookOnGoogleBooks(title, author, googleApiKey);
      if (gbResult) {
        return {
          ...gbResult,
          source: 'googlebooks',
          lang: gbResult.title ? undefined : undefined,
        };
      }
    } catch {
      // Google Books failed
    }
  }

  return null;
}
