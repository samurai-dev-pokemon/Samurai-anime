// src/api/embedSources.ts

// Get TMDB ID from MAL ID using MalSync
async function getTmdbId(malId: number, title: string): Promise<number | null> {
  try {
    // Try MalSync first (has good mappings)
    const res = await fetch(`https://api.malsync.moe/mal/anime/${malId}`);
    const data = await res.json();
    
    const tmdbId = data.Sites?.TMDB?.['1'];
    if (tmdbId) return parseInt(tmdbId);
    
    // Fallback: search TMDB by title
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=YOUR_KEY&query=${encodeURIComponent(title)}`
    );
    const searchData = await searchRes.json();
    return searchData.results?.[0]?.id ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Get embed URLs
export async function getEmbedUrls(malId: number, title: string, episode: number) {
  const tmdbId = await getTmdbId(malId, title);
  
  if (!tmdbId) {
    throw new Error('No TMDB ID found for this anime');
  }

  return {
    vidsrc: `https://vidsrc.to/embed/tv/${tmdbId}/1/${episode}`,
    vidsrc2: `https://vidsrc.pro/embed/tv/${tmdbId}/1/${episode}`,
    embed2: `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=${episode}`,
    embedsu: `https://embed.su/embed/tv/${tmdbId}/1/${episode}`,
  };
}
