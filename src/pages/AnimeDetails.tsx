import { useEffect, useState } from "react";
import Comments from "../components/Comments";
import { Link, useParams } from "react-router-dom";
import { href } from "../utils/router";
import {
  cleanDesc,
  getAnimeByMalId,
  getCharactersFor,
  getEpisodeThumbsBatch,
  getRecommendationsFor,
  getStreamingPlatforms,
  getVideosFor,
  titleOf,
} from "../lib/api";
import { getAnimeBatch } from "../lib/api";
import { setReaction, toggleWatchlist, useAnimeStats, useReaction, useWatchedEpisodes, useWatchlist } from "../lib/store";
import { useAsync } from "../lib/useAsync";
import { AnimeCard, Badge, CardRow, CardSkeletons, Container, ErrorNote, formatCount, Icon, RowItem, Section, Skeleton } from "../components/ui";
import { cn } from "../utils/cn";
import AuthModal from "../components/AuthModal";

const EP_CHUNK_SIZE = 24;

/** A single episode's clickable thumbnail card — shows a cover image
 * (Kitsu/TMDB), episode number badge, watched checkmark, and a play icon
 * on hover. Falls back to a generic film icon when no thumbnail exists. */
function EpisodeCard({
  num,
  malId,
  thumbnail,
  loading,
  watched,
}: {
  num: number;
  malId: number;
  thumbnail?: string | null;
  loading: boolean;
  watched: boolean;
}) {
  return (
    <Link to={href.watch(malId, num, "sub")} className="group block">
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 ring-1 transition",
          watched ? "ring-red-900/50" : "ring-white/5 group-hover:ring-red-500/40",
        )}
      >
        {loading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={`Episode ${num}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-zinc-900 text-zinc-700">
            <Icon.Film className="h-6 w-6" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />

        <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          EP {num}
        </div>

        {watched && (
          <div className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white">
            <Icon.Check className="h-3 w-3" />
          </div>
        )}

        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-red-600/90 text-white shadow-lg">
            <Icon.Play className="ml-0.5 h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AnimeDetails() {
  const { malId = "" } = useParams();
  const id = Number(malId);
  const [tick, setTick] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [epRangeIndex, setEpRangeIndex] = useState(0);

  const { data: anime, loading, error } = useAsync(() => getAnimeByMalId(id), [id, tick]);

  const extras = useAsync(async () => {
    const [chars, videos, platforms, recs] = await Promise.all([
      getCharactersFor(id),
      getVideosFor(id),
      getStreamingPlatforms(id),
      getRecommendationsFor(id),
    ]);
    const recAnime = await getAnimeBatch(recs.map((r) => r.animeId).slice(0, 12));
    return { chars, videos, platforms, recAnime };
  }, [id]);

  useEffect(() => {
    setEpRangeIndex(0);
  }, [id]);

  // Computed before the loading/error early-returns (using optional
  // chaining) so hook order stays stable across renders.
  const episodeCount = anime?.episodes || 12;
  const episodeNumbers = Array.from({ length: Math.min(episodeCount, 5000) }, (_, i) => i + 1);
  const epChunkCount = Math.ceil(episodeNumbers.length / EP_CHUNK_SIZE);
  const epChunkStart = epRangeIndex * EP_CHUNK_SIZE;
  const visibleEpisodeNumbers = episodeNumbers.slice(epChunkStart, epChunkStart + EP_CHUNK_SIZE);

  const { data: episodeThumbs, loading: thumbsLoading } = useAsync(async () => {
    if (!id || visibleEpisodeNumbers.length === 0) return {};
    return getEpisodeThumbsBatch(id, visibleEpisodeNumbers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, epRangeIndex, episodeCount]);

  const watchlist = useWatchlist();
  const inList = watchlist.some((w) => w.animeId === id);
  const reaction = useReaction(id);
  const stats = useAnimeStats(id);
  const watchedEpisodes = useWatchedEpisodes(id);

  async function handleToggleList() {
    if (!anime) return;
    const result = await toggleWatchlist({
      animeId: anime.malId,
      title: titleOf(anime),
      cover: anime.poster || anime.cover || "",
    });
    if (result.requiresAuth) setShowAuth(true);
  }

  async function handleReaction(type: "like" | "dislike") {
    if (!anime) return;
    const result = await setReaction(anime.malId, type);
    if (result.requiresAuth) setShowAuth(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <Skeleton className="h-[34vh] w-full rounded-none sm:h-[48vh] lg:h-[56vh]" />
        <Container className="-mt-20 space-y-6 sm:-mt-28 lg:-mt-40">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </Container>
      </div>
    );
  }
  if (error || !anime) {
    return (
      <Container className="pt-32">
        <ErrorNote msg={error || "Anime not found"} retry={() => setTick((t) => t + 1)} />
      </Container>
    );
  }

  const trailer = extras.data?.videos.trailers?.[0];

  return (
    <div className="min-h-screen pb-20">
      <div className="relative h-[34vh] min-h-[220px] w-full overflow-hidden sm:h-[48vh] sm:min-h-[320px] lg:h-[56vh] lg:min-h-[380px]">
        <img
          src={anime.banner || anime.cover || anime.poster || ""}
          alt=""
          className="h-full w-full scale-105 object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/40 to-transparent" />
      </div>

      <Container className="relative z-10 -mt-20 flex flex-col gap-8 rounded-2xl bg-zinc-950/70 p-4 backdrop-blur-md sm:-mt-28 sm:p-6 lg:-mt-40 lg:flex-row">
        <div className="mx-auto w-32 shrink-0 sm:w-44 lg:mx-0 lg:w-56">
          <div className="overflow-hidden rounded-xl shadow-2xl shadow-black ring-1 ring-white/10">
            {anime.poster && <img src={anime.poster} alt={titleOf(anime)} className="w-full object-cover" />}
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {anime.score ? (
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300">
                  <Icon.Star className="mr-1 h-3 w-3" /> {(anime.score / 10).toFixed(1)}
                </Badge>
              ) : null}
              {anime.year && <Badge>{anime.year}</Badge>}
              {anime.type && <Badge>{anime.type}</Badge>}
              {anime.episodes && <Badge>{anime.episodes} episodes</Badge>}
              {anime.status && <Badge>{anime.status}</Badge>}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">{titleOf(anime)}</h1>
            <div className="flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <Badge key={g} className="text-zinc-400">{g}</Badge>
              ))}
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{cleanDesc(anime.synopsis) || "No synopsis available."}</p>
            {anime.studios && anime.studios.length > 0 && (
              <p className="text-xs text-zinc-500">Studio: {anime.studios.join(", ")}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to={href.watch(anime.malId, 1, "sub")} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500">
              <Icon.Play className="h-4 w-4" /> Watch Episode 1
            </Link>
            {trailer && (
              <button onClick={() => setShowTrailer(true)} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition hover:bg-white/10">
                <Icon.Film className="h-4 w-4" /> Trailer
              </button>
            )}
            <button
              onClick={handleToggleList}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition hover:bg-white/10"
            >
              {inList ? <Icon.Check className="h-4 w-4 text-green-400" /> : <Icon.Plus className="h-4 w-4" />}
              {inList ? "In My List" : "Add to List"}
            </button>

            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur">
              <button
                onClick={() => handleReaction("like")}
                aria-label="Like"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                  reaction === "like" ? "bg-green-600/20 text-green-400" : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon.ThumbsUp className="h-4 w-4" />
                <span className="tabular-nums">{formatCount(stats.likes)}</span>
              </button>
              <div className="h-5 w-px bg-white/10" />
              <button
                onClick={() => handleReaction("dislike")}
                aria-label="Dislike"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                  reaction === "dislike" ? "bg-red-600/20 text-red-400" : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon.ThumbsDown className="h-4 w-4" />
                <span className="tabular-nums">{formatCount(stats.dislikes)}</span>
              </button>
            </div>
          </div>

          {extras.data?.platforms && extras.data.platforms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
              <span>Also legally available on:</span>
              {extras.data.platforms.map((p) => (
                <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-2.5 py-1 text-zinc-300 hover:border-red-500/50 hover:text-white">
                  {p.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </Container>

      <Container className="mt-10 space-y-12 sm:mt-14">
        <Section title="Episodes">
          {epChunkCount > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Array.from({ length: epChunkCount }, (_, i) => {
                const start = i * EP_CHUNK_SIZE + 1;
                const end = Math.min((i + 1) * EP_CHUNK_SIZE, episodeNumbers.length);
                const active = i === epRangeIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setEpRangeIndex(i)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      active ? "border-red-500 bg-red-600/20 text-red-300" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white",
                    )}
                  >
                    {start}-{end}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visibleEpisodeNumbers.map((n) => (
              <EpisodeCard
                key={n}
                num={n}
                malId={anime.malId}
                thumbnail={episodeThumbs?.[n]}
                loading={thumbsLoading}
                watched={watchedEpisodes.includes(n)}
              />
            ))}
          </div>
        </Section>

        {extras.loading ? (
          <CardSkeletons row n={8} />
        ) : (
          <>
            {extras.data?.chars && extras.data.chars.length > 0 && (
              <Section title="Characters & voice actors">
                <CardRow>
                  {extras.data.chars.slice(0, 16).map((c, idx) => (
                    <RowItem key={idx}>
                      <div className="overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/5">
                        <div className="aspect-[2/3] w-full">
                          {c.image ? <img src={c.image} alt={c.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-zinc-700"><Icon.User className="h-8 w-8" /></div>}
                        </div>
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-xs font-medium text-zinc-200">{c.name}</p>
                      {c.voiceActor && <p className="line-clamp-1 text-[11px] text-zinc-500">{c.voiceActor}</p>}
                    </RowItem>
                  ))}
                </CardRow>
              </Section>
            )}

            {extras.data?.recAnime && extras.data.recAnime.length > 0 && (
              <Section title="More like this">
                <CardRow>
                  {extras.data.recAnime.map((a) => (
                    <RowItem key={a.malId}>
                      <AnimeCard anime={a} />
                    </RowItem>
                  ))}
                </CardRow>
              </Section>
            )}
          </>
        )}
        <div className="border-t border-white/10 pt-8">
          <Comments animeId={anime.malId} />
        </div>
      </Container>

      {showTrailer && trailer && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4" onClick={() => setShowTrailer(false)}>
          <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <iframe src={trailer.embedUrl} title="Trailer" allow="autoplay; fullscreen" allowFullScreen className="h-full w-full" />
          </div>
        </div>
      )}

      {showAuth && <AuthModal mode="signup" onClose={() => setShowAuth(false)} />}
    </div>
  );
}