import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";
import { href } from "../utils/router";
import {
  getAnimeBatch,
  getCurrentSeason,
  getRecommendationsFor,
  getTopBanners,
  cleanDesc,
  titleOf,
} from "../lib/api";
import {
  ACTION_IDS,
  ALL_TIME_POPULAR_IDS,
  CLASSICS_IDS,
  FANTASY_ISEKAI_IDS,
  HERO_IDS,
  ROMANCE_COMEDY_IDS,
  TRENDING_IDS,
} from "../lib/curated";
import { removeProgress, useProgress } from "../lib/store";
import { useAsync } from "../lib/useAsync";
import type { Anime } from "../lib/types";
import { AnimeCard, Badge, CardRow, CardSkeletons, Container, ErrorNote, Icon, RowItem, Section, Skeleton } from "../components/ui";

/* ---------------- Hero ---------------- */
function Hero({ items }: { items: Anime[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const a = items[i];
  if (!a) return null;

  return (
    <div
      // Was h-[78vh] min-h-[520px] unconditionally — on a typical phone
      // that ate almost the entire visible screen on load before any
      // other content appeared. Now scales up progressively with screen
      // size instead of being desktop-sized everywhere.
      className="relative h-[58vh] min-h-[420px] w-full overflow-hidden sm:h-[68vh] sm:min-h-[480px] lg:h-[78vh] lg:min-h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((it, idx) => (
        <img
          key={it.malId}
          src={it.banner || it.cover || it.poster || ""}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000", idx === i ? "opacity-100" : "opacity-0")}
          loading={idx === 0 ? "eager" : "lazy"}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-zinc-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50" />

      <Container className="relative flex h-full flex-col justify-end pb-8 sm:pb-12 lg:pb-16">
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-red-500/40 bg-red-500/10 text-red-300">Featured</Badge>
            {a.score ? (
              <Badge>
                <Icon.Star className="mr-1 h-3 w-3 text-amber-300" />
                {(a.score / 10).toFixed(1)}
              </Badge>
            ) : null}
            {a.year && <Badge>{a.year}</Badge>}
            {a.episodes && <Badge>{a.episodes} episodes</Badge>}
          </div>
          <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-white drop-shadow sm:text-5xl lg:text-6xl">{titleOf(a)}</h1>
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-zinc-300 sm:line-clamp-3 sm:text-base">{cleanDesc(a.synopsis)}</p>
          <div className="hidden flex-wrap gap-2 pt-1 sm:flex">
            {a.genres?.slice(0, 4).map((g) => (
              <span key={g} className="text-xs text-zinc-400">#{g}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1 sm:pt-2">
            <Link to={href.watch(a.malId, 1)} className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.98] sm:px-6">
              <Icon.Play className="h-4 w-4" /> Watch now
            </Link>
            <Link to={href.anime(a.malId)} className="inline-flex h-11 items-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-100 backdrop-blur transition hover:bg-white/10 sm:px-6">
              Details
            </Link>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 sm:mt-10">
          {items.map((it, idx) => (
            <button key={it.malId} onClick={() => setI(idx)} aria-label={titleOf(it)} className={cn("h-1 rounded-full transition-all", idx === i ? "w-8 bg-red-500" : "w-4 bg-white/25 hover:bg-white/50")} />
          ))}
        </div>
      </Container>
    </div>
  );
}

/* ---------------- Continue Watching ---------------- */
function ContinueWatching() {
  const progress = useProgress();
  if (!progress.length) return null;
  return (
    <Section title="Continue watching">
      <CardRow>
        {progress.map((p) => {
          const pct = p.duration ? (p.time / p.duration) * 100 : 0;
          return (
            <div key={p.animeId} className="group relative w-[190px] shrink-0 snap-start sm:w-[220px] lg:w-[260px]">
              <Link to={href.watch(p.animeId, p.episode, p.audio)} className="block overflow-hidden rounded-xl ring-1 ring-white/5">
                <div className="relative aspect-video bg-zinc-900">
                  <img src={p.cover} alt={p.title} loading="lazy" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="line-clamp-1 text-sm font-semibold text-white">{p.title}</p>
                    <p className="text-xs text-zinc-300">
                      Episode {p.episode} · {p.audio.toUpperCase()}
                    </p>
                  </div>
                  <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-white">
                      <Icon.Play className="ml-0.5 h-5 w-5" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                    <div className="h-full bg-red-500" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
                  </div>
                </div>
              </Link>
              <button
                onClick={() => removeProgress(p.animeId)}
                aria-label="Remove"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-zinc-300 opacity-100 backdrop-blur transition hover:bg-black/80 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Icon.X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </CardRow>
    </Section>
  );
}

/* ---------------- Recommended (based on watch history) ---------------- */
function Recommended() {
  const progress = useProgress();
  const seedIds = useMemo(() => progress.slice(0, 2).map((p) => p.animeId), [progress]);
  const watched = useMemo(() => new Set(progress.map((p) => p.animeId)), [progress]);
  const key = seedIds.join(",");

  const { data, loading } = useAsync(
    async () => {
      const lists = await Promise.all(seedIds.map((id) => getRecommendationsFor(id).catch(() => [])));
      const ids: number[] = [];
      const seen = new Set<number>();
      for (let i = 0; i < 12; i++)
        for (const l of lists) {
          const e = l[i];
          if (e && !seen.has(e.animeId) && !watched.has(e.animeId)) {
            seen.add(e.animeId);
            ids.push(e.animeId);
          }
        }
      return getAnimeBatch(ids.slice(0, 18));
    },
    [key],
    seedIds.length > 0,
  );

  if (!seedIds.length) return null;
  const because = progress[0]?.title;
  return (
    <Section
      title="Recommended for you"
      action={because && <span className="hidden text-xs text-zinc-500 sm:block">Because you watched <span className="text-zinc-300">{because}</span></span>}
    >
      {loading ? (
        <CardSkeletons row n={8} />
      ) : data?.length ? (
        <CardRow>
          {data.map((a) => (
            <RowItem key={a.malId}>
              <AnimeCard anime={a} />
            </RowItem>
          ))}
        </CardRow>
      ) : (
        <p className="text-sm text-zinc-500">No recommendations yet.</p>
      )}
    </Section>
  );
}

/* ---------------- Generic curated row ---------------- */
function AnimeRow({ title, ids, loader }: { title: string; ids?: number[]; loader?: () => Promise<Anime[]> }) {
  const [tick, setTick] = useState(0);
  const { data, loading, error } = useAsync(() => (loader ? loader() : getAnimeBatch(ids || [])), [tick]);
  return (
    <Section title={title}>
      {loading ? (
        <CardSkeletons row n={8} />
      ) : error ? (
        <ErrorNote msg={error} retry={() => setTick((t) => t + 1)} />
      ) : (
        <CardRow>
          {data?.map((a) => (
            <RowItem key={a.malId}>
              <AnimeCard anime={a} />
            </RowItem>
          ))}
        </CardRow>
      )}
    </Section>
  );
}

/* ---------------- Page ---------------- */
export default function Home() {
  const [tick, setTick] = useState(0);
  const featured = useAsync(async () => {
    const [banners, heroAnime] = await Promise.all([getTopBanners(40), getAnimeBatch(HERO_IDS)]);
    return heroAnime.map((a) => ({ ...a, banner: banners[String(a.malId)] || a.banner }));
  }, [tick]);

  return (
    <div className="pb-20">
      {featured.loading ? (
        <div className="h-[58vh] min-h-[420px] w-full sm:h-[68vh] sm:min-h-[480px] lg:h-[78vh] lg:min-h-[520px]">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      ) : featured.error ? (
        <Container className="pt-24">
          <ErrorNote msg={featured.error} retry={() => setTick((t) => t + 1)} />
        </Container>
      ) : (
        <Hero items={featured.data ?? []} />
      )}

      <Container className="-mt-6 space-y-10 sm:-mt-10 sm:space-y-12">
        <ContinueWatching />
        <Recommended />
        <AnimeRow title="Trending now" ids={TRENDING_IDS} />
        <AnimeRow title="New this season" loader={getCurrentSeason} />
        <AnimeRow title="All-time popular" ids={ALL_TIME_POPULAR_IDS} />
        <AnimeRow title="Action picks" ids={ACTION_IDS} />
        <AnimeRow title="Fantasy & isekai" ids={FANTASY_ISEKAI_IDS} />
        <AnimeRow title="Romance & comedy" ids={ROMANCE_COMEDY_IDS} />
        <AnimeRow title="Timeless classics" ids={CLASSICS_IDS} />
      </Container>
    </div>
  );
}