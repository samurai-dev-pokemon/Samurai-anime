import type { Anime, AnimeEpisode } from '../types/anime';

const BASE_URL = 'https://api.jikan.moe/v4';

// Blocked rating prefixes — explicit adult content only
const BLOCKED_RATINGS = ['Rx', 'R+'];

function isAdultRated(anime: Anime): boolean {
  if (!anime.rating) return false;
  return BLOCKED_RATINGS.some(r => anime.rating!.startsWith(r));
}

function isValidAnime(anime: Anime): boolean {
  if (isAdultRated(anime)) return false;
  if (!anime.images?.jpg?.large_image_url) return false;
  if (!anime.synopsis) return false;
  return true;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function getRecommendedAnime(): Promise<Anime[]> {
  const res = await fetchWithRetry(`${BASE_URL}/recommendations/anime`);
  const data = await res.json();
  const entries = data.data?.slice(0, 30) || [];
  const animes: Anime[] = [];
  for (const entry of entries) {
    for (const item of entry.entry || []) {
      if (animes.length >= 24) break;
      if (isValidAnime(item)) {
        animes.push(item);
      }
    }
    if (animes.length >= 24) break;
  }
  return animes;
}

export async function getSeasonalAnime(): Promise<Anime[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let season = 'winter';
  if (month >= 4 && month <= 6) season = 'spring';
  else if (month >= 7 && month <= 9) season = 'summer';
  else if (month >= 10 && month <= 12) season = 'fall';

  const res = await fetchWithRetry(`${BASE_URL}/seasons/${year}/${season}?filter=tv&limit=24`);
  const data = await res.json();
  return (data.data || []).filter(isValidAnime).slice(0, 20);
}

export async function getTopAnime(): Promise<Anime[]> {
  const res = await fetchWithRetry(`${BASE_URL}/top/anime?type=tv&filter=bypopularity&limit=25`);
  const data = await res.json();
  return (data.data || []).filter(isValidAnime).slice(0, 20);
}

export async function getNewReleases(): Promise<Anime[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let season = 'winter';
  if (month >= 4 && month <= 6) season = 'spring';
  else if (month >= 7 && month <= 9) season = 'summer';
  else if (month >= 10 && month <= 12) season = 'fall';

  const res = await fetchWithRetry(
    `${BASE_URL}/seasons/${year}/${season}?filter=tv&limit=25`
  );
  const data = await res.json();
  const filtered = (data.data || []).filter(isValidAnime);

  if (filtered.length < 10) {
    // fallback to previous season
    const prevRes = await fetchWithRetry(
      `${BASE_URL}/seasons/now?limit=25`
    );
    const prevData = await prevRes.json();
    return (prevData.data || []).filter(isValidAnime).slice(0, 20);
  }

  return filtered.slice(0, 20);
}

export async function searchAnime(query: string): Promise<Anime[]> {
  const res = await fetchWithRetry(
    `${BASE_URL}/anime?q=${encodeURIComponent(query)}&type=tv&sfw=true&limit=20`
  );
  const data = await res.json();
  return (data.data || []).filter(isValidAnime);
}

export async function getAnimeById(id: number): Promise<Anime | null> {
  const res = await fetchWithRetry(`${BASE_URL}/anime/${id}/full`);
  const data = await res.json();
  return data.data || null;
}

export async function getAnimeEpisodes(id: number, page = 1): Promise<AnimeEpisode[]> {
  const res = await fetchWithRetry(`${BASE_URL}/anime/${id}/episodes?page=${page}`);
  const data = await res.json();
  return data.data || [];
}

export async function getAnimeRecommendationsById(id: number): Promise<Anime[]> {
  const res = await fetchWithRetry(`${BASE_URL}/anime/${id}/recommendations`);
  const data = await res.json();
  const animes: Anime[] = [];
  for (const rec of (data.data || []).slice(0, 12)) {
    if (rec.entry && isValidAnime(rec.entry)) {
      animes.push(rec.entry);
    }
  }
  return animes;
}

export async function getAnimeByGenre(genreId: number): Promise<Anime[]> {
  const res = await fetchWithRetry(
    `${BASE_URL}/anime?genres=${genreId}&type=tv&sfw=true&order_by=score&sort=desc&limit=20`
  );
  const data = await res.json();
  return (data.data || []).filter(isValidAnime).slice(0, 16);
}
