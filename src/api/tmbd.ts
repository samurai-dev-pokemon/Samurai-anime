

const TMDB_API_KEY = 'bdcc7ff578b42ef4350bba3d06d8933f'; // Get free from themoviedb.org

// Search TMDB using anime title to find TMDB ID
export async function getTmdbIdByTitle(title: string): Promise<number | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
  );
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

// Or use this mapping API (no key needed!)
export async function malToTmdb(malId: number): Promise<number | null> {
  const res = await fetch(
    `https://api.malsync.moe/mal/anime/${malId}`
  );
  const data = await res.json();
  // MalSync has TMDB mappings
  return data.Sites?.TMDB?.['1'] ?? null;
}
