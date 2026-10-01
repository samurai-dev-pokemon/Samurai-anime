import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Comments from "../components/Comments";
import { cn } from "../utils/cn";
import { href } from "../utils/router";
import { findBestStream, getAnimeByMalId, getEpisodeCount, getSkipTimes, resolveWatch, titleOf } from "../lib/api";
import {
  markEpisodeWatched,
  removeFromWatchlist,
  removeProgress,
  saveProgress,
  setDubFallbackEnabled,
  useDubFallbackEnabled,
  useProgress,
  useProgressLoaded,
  useWatchedEpisodes,
} from "../lib/store";
import { useAsync } from "../lib/useAsync";
import { Container, ErrorNote, Icon, Skeleton, Switch } from "../components/ui";
import VideoPlayer from "../components/VideoPlayer";

const CHUNK_SIZE = 100;

function megaplayEmbedUrl(malId: number, ep: number, audio: "sub" | "dub"): string {
  return `https://megaplay.buzz/stream/mal/${malId}/${ep}/${audio}`;
}

export default function Watch() {
  const { malId = "" } = useParams();
  const id = Number(malId);
  const [params, setParams] = useSearchParams();
  const ep = Math.max(1, Number(params.get("ep")) || 1);
  const audio = (params.get("audio") === "dub" ? "dub" : "sub") as "sub" | "dub";
  const [server, setServer] = useState<string | undefined>(undefined);
  const [useEmbed, setUseEmbed] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(0);
  const lastSaved = useRef(0);

  const dubFallbackEnabled = useDubFallbackEnabled();

  const { data: anime, loading: animeLoading } = useAsync(() => getAnimeByMalId(id), [id]);

  const { data: episodeCount, loading: episodeCountLoading } = useAsync(async () => {
    if (!anime) return null;
    return getEpisodeCount(id, anime.episodes);
  }, [id, anime?.episodes]);

  const totalEpisodes = episodeCount ?? anime?.episodes ?? null;
  const episodesLoading = animeLoading || episodeCountLoading;

  useEffect(() => {
    setRangeIndex(Math.floor((ep - 1) / CHUNK_SIZE));
  }, [id, ep]);

  const { data: stream, loading: streamLoading, error } = useAsync(async () => {
    setServer(undefined);
    return findBestStream({ malId: id, ep, type: audio });
  }, [id, ep, audio]);

  // Aniskip fallback — used whenever the scraper's own stream response
  // doesn't already include intro/outro timestamps for this episode.
  const { data: skipTimes } = useAsync(async () => {
    if (!id || !ep) return null;
    return getSkipTimes(id, ep);
  }, [id, ep]);

  async function useServer(name: string) {
    setServer(name);
    const result = await resolveWatch({ malId: id, ep, type: audio, server: name, strict: true });
    return result;
  }
  const [manualStream, setManualStream] = useState<typeof stream>(null);
  useEffect(() => setManualStream(null), [id, ep, audio]);
  useEffect(() => setUseEmbed(false), [id, ep]);

  const activeStream = manualStream || stream || null;

  // When the requested audio is Dub but the API only had Sub for this
  // episode, `partial` comes back true. If the user has turned sub-fallback
  // off, don't silently hand them Sub audio when they explicitly asked for
  // Dub — block playback and show a clear message instead.
  const blockedPartialDub = audio === "dub" && !dubFallbackEnabled && !!activeStream?.partial;
  const rawPlayableStream = blockedPartialDub ? null : activeStream;

  // Merge in Aniskip intro/outro times whenever the scraper didn't already
  // provide them on the stream object itself. Scraper-provided values (if
  // any) always win — Aniskip is purely a fallback.
  const playableStream = rawPlayableStream
    ? {
        ...rawPlayableStream,
        intro: rawPlayableStream.intro ?? skipTimes?.intro ?? null,
        outro: rawPlayableStream.outro ?? skipTimes?.outro ?? null,
      }
    : rawPlayableStream;

  const progress = useProgress();
  const progressLoaded = useProgressLoaded();
  const initial = progress.find((p) => p.animeId === id && p.episode === ep);

  const watchedEpisodes = useWatchedEpisodes(id);

  const onProgress = useCallback(
    (time: number, duration: number) => {
      if (!anime || !duration) return;
      const now = Date.now();
      if (now - lastSaved.current < 4000) return;
      lastSaved.current = now;
      saveProgress({
        animeId: id,
        title: titleOf(anime),
        cover: anime.poster || anime.cover || "",
        episode: ep,
        audio,
        provider: useEmbed ? "megaplay" : playableStream?.server || "anivault",
        time,
        duration,
        updatedAt: now,
      });
    },
    [anime, id, ep, audio, playableStream, useEmbed],
  );

  function goEp(n: number) {
    if (n < 1) return;
    if (totalEpisodes && n > totalEpisodes) return;
    setParams({ ep: String(n), audio });
  }

  const onEnded = useCallback(async () => {
    if (!anime) return;
    await markEpisodeWatched(id, ep);
    const isLastEpisode = !!totalEpisodes && ep >= totalEpisodes;
    if (isLastEpisode) {
      await removeFromWatchlist(id);
      await removeProgress(id);
    } else {
      goEp(ep + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime, id, ep, totalEpisodes]);

  useEffect(() => {
    if (!useEmbed) return;
    function onMessage(event: MessageEvent) {
      let data: any = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;

      if (data.type === "complete") {
        onEnded();
        return;
      }

      if (data.type === "watching-log" || data.channel === "megacloud") {
        const current = data.currentTime ?? data.time ?? data.position;
        const dur = data.duration ?? data.total;
        if (typeof current === "number" && typeof dur === "number" && dur > 0) {
          onProgress(current, dur);
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [useEmbed, onEnded, onProgress]);

  const fullEpisodeList = Array.from({ length: Math.min(totalEpisodes || 0, 5000) }, (_, i) => i + 1);
  const chunkCount = Math.ceil(fullEpisodeList.length / CHUNK_SIZE);
  const chunkStart = rangeIndex * CHUNK_SIZE;
  const visibleEpisodes = fullEpisodeList.slice(chunkStart, chunkStart + CHUNK_SIZE);

  const playerLoading = streamLoading || !progressLoaded;
  const embedUrl = megaplayEmbedUrl(id, ep, audio);

  return (
    <div className="min-h-screen pb-20 pt-20">
      <Container className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
          <Link to="/" className="hover:text-white">Home</Link>
          <Icon.Chevron className="h-3.5 w-3.5" />
          {anime && (
            <Link to={href.anime(anime.malId)} className="hover:text-white">
              {titleOf(anime)}
            </Link>
          )}
          <Icon.Chevron className="h-3.5 w-3.5" />
          <span className="text-zinc-200">Episode {ep}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold">
                <button
                  onClick={() => setUseEmbed(false)}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition", !useEmbed ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white")}
                >
                  <Icon.Shield className="h-3.5 w-3.5" /> AniVault Player
                </button>
                <button
                  onClick={() => setUseEmbed(true)}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition", useEmbed ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white")}
                >
                  <Icon.Globe className="h-3.5 w-3.5" /> Megaplay (embed)
                </button>
              </div>
              {useEmbed && (
                <span className="text-[11px] text-amber-400">Third-party embed — may include ads. Progress still saves to your account.</span>
              )}
            </div>

            {useEmbed ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                <iframe
                  key={`megaplay-${id}-${ep}-${audio}`}
                  src={embedUrl}
                  allowFullScreen
                  className="h-full w-full"
                  title="Megaplay embed"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-[11px] text-amber-300 backdrop-blur">
                  Embedded server — some ads may appear
                </div>
              </div>
            ) : playerLoading ? (
              <Skeleton className="aspect-video w-full" />
            ) : error ? (
              <ErrorNote msg={error} />
            ) : blockedPartialDub ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-6 text-center">
                <Icon.Info className="h-8 w-8 text-amber-400" />
                <p className="text-sm font-medium text-zinc-200">Dub isn't available for this episode.</p>
                <p className="max-w-sm text-xs text-zinc-500">
                  Sub-fallback is turned off, so Sub audio won't play automatically. Enable the toggle next to the audio switch, or switch to Sub manually.
                </p>
                <button
                  onClick={() => setParams({ ep: String(ep), audio: "sub" })}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                >
                  Switch to Sub
                </button>
              </div>
            ) : (
              <>
                {playableStream?.partial && audio === "dub" && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                    <Icon.Info className="h-4 w-4 shrink-0" />
                    Dub isn't available for this episode yet — playing Sub instead.
                  </div>
                )}
                <VideoPlayer
                  key={`${id}-${ep}-${audio}-${server}`}
                  stream={playableStream}
                  startAt={initial?.time || 0}
                  title={anime ? `${titleOf(anime)} · Ep ${ep}` : undefined}
                  onProgress={onProgress}
                  onEnded={onEnded}
                  onNext={() => goEp(ep + 1)}
                  hasNext={!!totalEpisodes && ep < totalEpisodes}
                />
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-white sm:text-2xl">{anime ? titleOf(anime) : <span className="inline-block h-6 w-48 animate-pulse rounded bg-zinc-800" />}</h1>
                <p className="text-sm text-zinc-500">Episode {ep} of {totalEpisodes || "—"}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold">
                  {(["sub", "dub"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setParams({ ep: String(ep), audio: a })}
                      className={cn("rounded-full px-3 py-1.5 uppercase transition", audio === a ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white")}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                {audio === "dub" && (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-400"
                    title="When off, episodes without real Dub audio will show a message instead of silently auto-playing Sub."
                  >
                    <Switch checked={dubFallbackEnabled} onChange={setDubFallbackEnabled} label="Sub fallback for missing dub" />
                    Sub fallback
                  </label>
                )}

                <button onClick={() => goEp(ep - 1)} disabled={ep <= 1} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:opacity-30 sm:h-9 sm:w-9">
                  <Icon.ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goEp(ep + 1)}
                  disabled={!!totalEpisodes && ep >= totalEpisodes}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:opacity-30"
                >
                  <Icon.Chevron className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!useEmbed && !blockedPartialDub && playableStream?.availableServers && playableStream.availableServers.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-xs font-medium text-zinc-500">Server:</span>
                {playableStream.availableServers.map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      const r = await useServer(s);
                      if (r) setManualStream(r);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      (server || playableStream.server) === s ? "border-red-500 bg-red-600/20 text-red-300" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {anime && (
              <p className="max-w-3xl text-sm leading-relaxed text-zinc-500">{anime.synopsis?.slice(0, 320)}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Episodes</p>
              {totalEpisodes ? <span className="text-xs text-zinc-500">{totalEpisodes} total</span> : null}
            </div>

            {chunkCount > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: chunkCount }, (_, i) => {
                  const start = i * CHUNK_SIZE + 1;
                  const end = Math.min((i + 1) * CHUNK_SIZE, fullEpisodeList.length);
                  const active = i === rangeIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => setRangeIndex(i)}
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

           <div className="grid max-h-[520px] grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-6 lg:grid-cols-5">
              {episodesLoading
                ? Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
                : visibleEpisodes.map((n) => {
                    const isActive = n === ep;
                    const isWatched = watchedEpisodes.includes(n);
                    return (
                      <button
                        key={n}
                        onClick={() => goEp(n)}
                        className={cn(
                          "grid aspect-square place-items-center rounded-lg text-sm font-semibold transition",
                          isActive
                            ? "bg-red-600 text-white"
                            : isWatched
                              ? "bg-red-950/40 text-red-400 ring-1 ring-red-900/50 hover:bg-red-950/60"
                              : "bg-white/5 text-zinc-300 hover:bg-white/10",
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <Comments animeId={id} episode={ep} />
        </div>
      </Container>
    </div>
  );
}