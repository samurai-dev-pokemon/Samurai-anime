import type {
  Anime,
  CharacterEntry,
  EpisodeMeta,
  RecommendationEntry,
  StreamingPlatform,
  VideoEntry,
  WatchResult,
} from "./types";

export const API_BASE = "https://anivault-scraper-fawn.vercel.app/api";

/** Genres/keywords that must never appear on this site. */
const BLOCKED_GENRES = new Set([
  "hentai",
  "ecchi",
  "erotica",
  "adult cast",
  "adult",
  "boys love",
  "girls love",
]);

export function isSafe(anime: Pick<Anime, "genres" | "rating">): boolean {
  const genres = (anime.genres || []).map((g) => g.toLowerCase());
  if (genres.some((g) => BLOCKED_GENRES.has(g))) return false;
  const rating = (anime.rating || "").toLowerCase();
  if (rating.includes("rx") || rating.includes("hentai")) return false;
  return true;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

/* ---------------- request coalescing + cache ---------------- */
const animeCache = new Map<number, Anime>();
const inflight = new Map<number, Promise<Anime | null>>();

function seasonToYear(premiered?: string | null): number | undefined {
  const m = /\d{4}/.exec(premiered || "");
  return m ? Number(m[0]) : undefined;
}

function normalizeCombined(malId: number, raw: any): Anime {
  const d = raw?.data ?? raw ?? {};
  return {
    malId,
    title: d.titleEnglish || d.title || `Anime #${malId}`,
    titleEnglish: d.titleEnglish,
    titleJapanese: d.titleJapanese,
    synopsis: d.synopsis,
    poster: d.poster || null,
    cover: d.cover || d.poster || null,
    banner: d.banner || null,
    logo: d.logo || null,
    genres: d.genres || [],
    // MAL's native score is 0–10 (e.g. 8.75); normalize to the same 0–100
    // scale AniList uses so Anime.score is consistent everywhere, and
    // AnimeCard's `(score / 10).toFixed(1)` display math works app-wide.
    score: d.score != null ? d.score * 10 : null,
    episodes: d.episodes ?? null,
    year: d.year ?? seasonToYear(d.premiered) ?? null,
    status: d.status ?? null,
    type: d.type ?? null,
    studios: d.studios || [],
    rating: d.rating ?? null,
    duration: d.duration ?? null,
    aired: d.aired ?? null,
  };
}

export async function getAnimeByMalId(malId: number): Promise<Anime | null> {
  if (animeCache.has(malId)) return animeCache.get(malId)!;
  if (inflight.has(malId)) return inflight.get(malId)!;
  const p = (async () => {
    try {
      const raw = await getJSON<any>(`${API_BASE}/anime?malId=${malId}`);
      const anime = normalizeCombined(malId, raw);
      animeCache.set(malId, anime);
      return anime;
    } catch {
      return null;
    } finally {
      inflight.delete(malId);
    }
  })();
  inflight.set(malId, p);
  return p;
}

export function primeAnimeCache(anime: Anime) {
  animeCache.set(anime.malId, anime);
}

/** Fetch many anime by MAL id with bounded concurrency, safe-filtered. */
export async function getAnimeBatch(
  ids: number[],
  { concurrency = 6, safeOnly = true }: { concurrency?: number; safeOnly?: boolean } = {},
): Promise<Anime[]> {
  const unique = Array.from(new Set(ids));
  const results: (Anime | null)[] = new Array(unique.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const idx = cursor++;
      results[idx] = await getAnimeByMalId(unique[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  const list = results.filter((a): a is Anime => !!a);
  return safeOnly ? list.filter(isSafe) : list;
}

/* ---------------- search ---------------- */
export interface SearchResultItem {
  malId?: number;
  id?: number;
  title: string;
  image?: string;
  poster?: string;
  type?: string;
  episodes?: number;
  score?: number;
  genres?: string[];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/search?q=${encodeURIComponent(q)}&limit=24`);
    const items: SearchResultItem[] = raw?.data || raw?.results || [];
    const ids = items.map((i) => i.malId ?? i.id).filter((x): x is number => !!x);
    return getAnimeBatch(ids, { concurrency: 8, safeOnly: true });
  } catch {
    return [];
  }
}

/* ---------------- season / trending ---------------- */
export async function getCurrentSeason(): Promise<Anime[]> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/anilist/season`);
    const media: any[] = raw?.media || [];
    const mapped: Anime[] = media
      .filter((m) => m.idMal)
      .map((m) => ({
        malId: m.idMal,
        anilistId: m.id,
        title: m.title?.english || m.title?.romaji || "Untitled",
        titleEnglish: m.title?.english,
        synopsis: m.description?.replace(/<[^>]+>/g, ""),
        poster: m.coverImage?.extraLarge || m.coverImage?.large || null,
        cover: m.coverImage?.extraLarge || m.coverImage?.large || null,
        banner: m.bannerImage || null,
        genres: m.genres || [],
        score: m.averageScore ?? null,
        episodes: m.episodes ?? null,
        year: null,
        status: m.status ?? null,
        type: m.format ?? null,
      }));
    const safe = mapped.filter(isSafe);
    safe.forEach(primeAnimeCache);
    return safe;
  } catch {
    return [];
  }
}

export async function getTopBanners(limit = 20): Promise<Record<string, string>> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/anilist/top-banners?limit=${limit}`);
    return raw?.data || {};
  } catch {
    return {};
  }
}

/* ---------------- detail extras ---------------- */
export async function getRecommendationsFor(malId: number): Promise<RecommendationEntry[]> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/recommendations`);
    return raw?.data || [];
  } catch {
    return [];
  }
}

export async function getVideosFor(malId: number): Promise<{ trailers: VideoEntry[]; musicVideos: VideoEntry[] }> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/videos`);
    return { trailers: raw?.trailers || [], musicVideos: raw?.musicVideos || [] };
  } catch {
    return { trailers: [], musicVideos: [] };
  }
}

export async function getStreamingPlatforms(malId: number): Promise<StreamingPlatform[]> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/streaming`);
    return raw?.data || [];
  } catch {
    return [];
  }
}

export async function getCharactersFor(malId: number): Promise<CharacterEntry[]> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/characters`);
    const list = raw?.data || raw?.characters || [];
    return list.map((c: any) => ({
      malId: c.malId ?? c.id,
      name: c.name,
      image: c.image,
      role: c.role,
      voiceActor: c.voiceActors?.[0]?.name || c.voiceActor,
      voiceActorImage: c.voiceActors?.[0]?.image,
    }));
  } catch {
    return [];
  }
}

export async function getEpisodeTitles(malId: number, page = 1): Promise<EpisodeMeta[]> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/episodes?page=${page}`);
    const list = raw?.data || raw?.episodes || [];
    return list.map((e: any) => ({
      num: e.num ?? e.number ?? e.mal_id,
      title: e.title,
      aired: e.aired,
      filler: e.filler,
      recap: e.recap,
    }));
  } catch {
    return [];
  }
}

/* ---------------- playback ---------------- */

export async function resolveWatch(opts: {
  malId: number;
  ep: number;
  type: "sub" | "dub";
  source?: "anikoto" | "desidub" | "animeheaven";
  server?: string;
  strict?: boolean;
}): Promise<WatchResult | null> {
  const { malId, ep, type, source = "anikoto", server, strict } = opts;

  const idPart = `mal-${malId}`;
  const query = new URLSearchParams();
  if (server) query.set("server", server);
  if (strict) query.set("strict", "1");
  const qs = query.toString();

  const url = `${API_BASE}/watch/${source}/${idPart}/${ep}/${type}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn("[watch] failed", res.status, url, body);
      return null;
    }
    if (body?.error) {
      console.warn("[watch] api error", url, body);
      return null;
    }
    // 206 = "dub not available, returned sub instead" — surface this to the UI
    // instead of silently pretending the requested audio was honored.
    return { ...body, partial: res.status === 206 } as WatchResult;
  } catch (e) {
    console.warn("[watch] network error", url, e);
    return null;
  }
}

/**
 * Tries to find a playable, ad-free (hls/mp4) stream that actually matches
 * the requested audio. Prefers an exact match; if only a "partial" (audio
 * fallback) result is found anywhere, it's kept as a last resort so the
 * page still plays something, but the caller can tell the difference via
 * `.partial` and show a heads-up to the user instead of a silent swap.
 */
export async function findBestStream(opts: {
  malId: number;
  ep: number;
  type: "sub" | "dub";
}): Promise<WatchResult | null> {
  const sources: Array<"anikoto" | "desidub"> = ["anikoto", "desidub"];
  let bestFallback: WatchResult | null = null;
  let lastResult: WatchResult | null = null;

  const isPlayable = (r: WatchResult | null) => !!r && (r.playbackMode === "hls" || r.playbackMode === "mp4");

  for (const source of sources) {
    const first = await resolveWatch({ ...opts, source });
    if (!first) continue;
    lastResult = first;
    if (isPlayable(first)) {
      if (!first.partial) return first;
      if (!bestFallback) bestFallback = first;
    }

    const others = (first.availableServers || []).filter((s) => s !== first.server).slice(0, 4);
    for (const server of others) {
      const attempt = await resolveWatch({ ...opts, source, server, strict: true });
      if (!attempt) continue;
      lastResult = attempt;
      if (isPlayable(attempt)) {
        if (!attempt.partial) return attempt;
        if (!bestFallback) bestFallback = attempt;
      }
    }
  }
  return bestFallback || lastResult;
}

export function titleOf(a: Anime): string {
  return a.titleEnglish || a.title;
}

export function cleanDesc(desc?: string | null): string {
  if (!desc) return "";
  return desc
    .replace(/<[^>]+>/g, " ")
    .replace(/\(Source:.*?\)/gis, "")
    .replace(/\s+/g, " ")
    .trim();
}
/* ---------------- episode count (handles open-ended/airing shows) ---------------- */

/**
 * Resolves the real episode count for the Watch page's episode grid.
 *
 * MAL's `episodes` field is reliable for finished shows (and even most
 * currently-airing seasonal shows with a known cour length), but it's
 * `null` for open-ended long-runners like One Piece while they're still
 * airing — so we can't just trust `anime.episodes` blindly. When it's
 * missing, this asks the episodes endpoint directly for how many
 * episodes actually exist, which reflects newly released episodes the
 * next time someone loads the page (rather than being stuck at whatever
 * number was true when the anime was first indexed).
 * i am so smart right Odaino if your seeing this i am not attacking you  
 */
/* ---------------- episode count (handles open-ended/airing shows) ---------------- */
const episodeCountCache = new Map<number, { count: number; ts: number }>();
const EPISODE_COUNT_TTL = 5 * 60 * 1000; // 5 min — fresh enough to catch new eps, cheap enough to not spam the API


export async function getEpisodeCount(malId: number, knownEpisodes?: number | null): Promise<number | null> {
  if (knownEpisodes) return knownEpisodes;

  const cached = episodeCountCache.get(malId);
  if (cached && Date.now() - cached.ts < EPISODE_COUNT_TTL) return cached.count;

  try {
    const first = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/episodes?page=1`);
    const pageSize = first?.data?.length || 0;
    if (pageSize === 0) return cached?.count ?? knownEpisodes ?? null;

    // Some APIs do expose a reliable total — use it directly if present.
    const explicitTotal =
      first?.pagination?.items?.total ?? first?.pagination?.total ?? first?.total ?? first?.count ?? null;

    let count: number;
    if (typeof explicitTotal === "number" && explicitTotal > 0) {
      count = explicitTotal;
    } else {
      count = pageSize;
      let page = 1;
      let lastPageLen = pageSize;
      // Cap at 30 pages (~3000 eps at 100/page) so a broken response can't loop forever.
      while (lastPageLen === pageSize && page < 30) {
        page++;
        const next = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/episodes?page=${page}`);
        lastPageLen = next?.data?.length || 0;
        count += lastPageLen;
      }
    }

    episodeCountCache.set(malId, { count, ts: Date.now() });
    return count;
  } catch {
    return cached?.count ?? knownEpisodes ?? null;
  }
}
/* ---------------- aniskip (intro/outro skip times) ---------------- */

const ANISKIP_BASE = "https://api.aniskip.com";

interface AniskipInterval {
  startTime: number;
  endTime: number;
}

interface AniskipResult {
  interval: AniskipInterval;
  skipType: "op" | "ed" | "mixed-op" | "mixed-ed" | "recap";
  skipId: string;
  episodeLength: number;
}

interface AniskipResponse {
  statusCode: number;
  message: string;
  found: boolean;
  results: AniskipResult[];
}

export interface SkipSegments {
  intro: { start: number; end: number } | null;
  outro: { start: number; end: number } | null;
}

/**
 * Pulls opening/ending skip times from Aniskip using the anime's MAL id.
 * Used as a fallback/enhancement when the scraper's own `intro`/`outro`
 * fields on WatchResult are missing for a given episode.
 */
export async function getSkipTimes(malId: number, episodeNumber: number): Promise<SkipSegments> {
  const empty: SkipSegments = { intro: null, outro: null };
  if (!malId || !episodeNumber) return empty;

  try {
    const params = new URLSearchParams();
    params.append("types", "op");
    params.append("types", "ed");
    params.append("episodeLength", "0"); // 0 = don't filter by length

    const res = await fetch(`${ANISKIP_BASE}/v2/skip-times/${malId}/${episodeNumber}?${params.toString()}`);
    if (!res.ok) return empty;

    const data: AniskipResponse = await res.json();
    if (!data.found) return empty;

    const op = data.results.find((r) => r.skipType === "op");
    const ed = data.results.find((r) => r.skipType === "ed");

    return {
      intro: op ? { start: op.interval.startTime, end: op.interval.endTime } : null,
      outro: ed ? { start: ed.interval.startTime, end: ed.interval.endTime } : null,
    };
  } catch {
    return empty;
  }
}