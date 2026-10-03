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
    return { ...body, partial: res.status === 206 } as WatchResult;
  } catch (e) {
    console.warn("[watch] network error", url, e);
    return null;
  }
}

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

/**
 * Normalizes inconsistent status phrasing from different upstream sources
 * into one clean label. This backend can return either AniList's
 * enum-style statuses (FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED,
 * HIATUS) or MAL/Jikan's phrasing ("Currently Airing", "Finished Airing",
 * "Not yet aired") depending on which source filled in the data — this
 * handles both so the UI never shows raw backend text.
 */
export function formatStatus(status?: string | null): string {
  if (!status) return "";
  const s = status.trim().toLowerCase().replace(/[_\s]+/g, " ");

  // Order matters: "Finished Airing" contains the substring "airing", so
  // the finish/complete check must run before the airing check, or every
  // finished show would get misread as still airing.
  if (s.includes("not") && (s.includes("yet") || s.includes("released") || s.includes("aired"))) return "Upcoming";
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("hiatus")) return "Hiatus";
  if (s.includes("finish") || s.includes("complete")) return "Finished";
  if (s.includes("releasing") || s.includes("airing") || s.includes("ongoing")) return "Airing";

  return status;
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

const episodeCountCache = new Map<number, { count: number; ts: number }>();
const EPISODE_COUNT_TTL = 5 * 60 * 1000;
const airedCountCache = new Map<number, { count: number; ts: number }>();
const AIRED_COUNT_TTL = 2 * 60 * 1000; // shorter TTL — this needs to catch newly-aired episodes promptly

/**
 * Walks the episodes-list endpoint to count how many episodes actually
 * exist there — used both for open-ended long-runners (where MAL's
 * `episodes` field is null) and for currently-airing shows (where we
 * deliberately ignore MAL's `episodes` total, since it reflects the
 * season's eventual planned length, not how many have aired so far).
 */
async function fetchEpisodeListCount(malId: number): Promise<number | null> {
  try {
    const first = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/episodes?page=1`);
    const pageSize = first?.data?.length || 0;
    if (pageSize === 0) return null;

    const explicitTotal =
      first?.pagination?.items?.total ?? first?.pagination?.total ?? first?.total ?? first?.count ?? null;

    if (typeof explicitTotal === "number" && explicitTotal > 0) {
      return explicitTotal;
    }

    let count = pageSize;
    let page = 1;
    let lastPageLen = pageSize;
    while (lastPageLen === pageSize && page < 30) {
      page++;
      const next = await getJSON<any>(`${API_BASE}/mal/anime/${malId}/episodes?page=${page}`);
      lastPageLen = next?.data?.length || 0;
      count += lastPageLen;
    }
    return count;
  } catch {
    return null;
  }
}

/**
 * Resolves the episode count to use for navigation/grids on finished or
 * not-yet-confirmed-airing shows. Trusts MAL's known total when present
 * (reliable once a show is finished), falling back to counting the
 * episode list directly for open-ended airing long-runners where MAL
 * doesn't set a total at all.
 */
export async function getEpisodeCount(malId: number, knownEpisodes?: number | null): Promise<number | null> {
  if (knownEpisodes) return knownEpisodes;

  const cached = episodeCountCache.get(malId);
  if (cached && Date.now() - cached.ts < EPISODE_COUNT_TTL) return cached.count;

  const count = await fetchEpisodeListCount(malId);
  if (count == null) return cached?.count ?? knownEpisodes ?? null;

  episodeCountCache.set(malId, { count, ts: Date.now() });
  return count;
}

/**
 * Returns how many episodes have actually been released so far,
 * deliberately ignoring MAL's "total planned episodes" field. Use this
 * instead of getEpisodeCount() for any show currently in "Airing" status
 * — MAL sets the eventual total (e.g. 13) the moment a season is
 * confirmed, long before all of them have actually aired.
 */
export async function getAiredEpisodeCount(malId: number): Promise<number | null> {
  const cached = airedCountCache.get(malId);
  if (cached && Date.now() - cached.ts < AIRED_COUNT_TTL) return cached.count;

  const count = await fetchEpisodeListCount(malId);
  if (count == null) return cached?.count ?? null;

  airedCountCache.set(malId, { count, ts: Date.now() });
  return count;
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

export async function getSkipTimes(malId: number, episodeNumber: number): Promise<SkipSegments> {
  const empty: SkipSegments = { intro: null, outro: null };
  if (!malId || !episodeNumber) return empty;

  try {
    const params = new URLSearchParams();
    params.append("types", "op");
    params.append("types", "ed");
    params.append("episodeLength", "0");

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

/* ---------------- episode thumbnails (kitsu/tmdb) ---------------- */

const episodeThumbCache = new Map<string, string | null>();
const episodeThumbInflight = new Map<string, Promise<string | null>>();

async function fetchEpisodeThumbFrom(
  provider: "kitsu" | "tmdb",
  malId: number,
  ep: number,
): Promise<string | null> {
  try {
    const raw = await getJSON<any>(`${API_BASE}/${provider}/episode-thumb?ep=${ep}&malId=${malId}`);
    return raw?.data?.thumbnail || null;
  } catch {
    return null;
  }
}

export async function getEpisodeThumb(malId: number, ep: number): Promise<string | null> {
  const key = `${malId}-${ep}`;
  if (episodeThumbCache.has(key)) return episodeThumbCache.get(key)!;
  if (episodeThumbInflight.has(key)) return episodeThumbInflight.get(key)!;

  const p = (async () => {
    let thumb = await fetchEpisodeThumbFrom("kitsu", malId, ep);
    if (!thumb) thumb = await fetchEpisodeThumbFrom("tmdb", malId, ep);
    episodeThumbCache.set(key, thumb);
    episodeThumbInflight.delete(key);
    return thumb;
  })();
  episodeThumbInflight.set(key, p);
  return p;
}

export async function getEpisodeThumbsBatch(
  malId: number,
  episodeNumbers: number[],
  concurrency = 6,
): Promise<Record<number, string | null>> {
  const result: Record<number, string | null> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < episodeNumbers.length) {
      const idx = cursor++;
      const ep = episodeNumbers[idx];
      result[ep] = await getEpisodeThumb(malId, ep);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, episodeNumbers.length) }, worker));
  return result;
}