import Hls from "hls.js";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./ui";
import type { WatchResult } from "../lib/types";

function fmt(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const SUB_SCALE_MIN = 0.6;
const SUB_SCALE_MAX = 2.2;
const SUB_SCALE_STEP = 0.1;

export default function VideoPlayer({
  stream,
  onProgress,
  onEnded,
  startAt = 0,
  title,
  onNext,
  hasNext,
}: {
  stream: WatchResult | null;
  onProgress?: (time: number, duration: number) => void;
  onEnded?: () => void;
  startAt?: number;
  title?: string;
  onNext?: () => void;
  hasNext?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const skipFlashTimer = useRef<number | null>(null);
  const videoId = useId().replace(/:/g, "");
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volumeHover, setVolumeHover] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const [skipFlash, setSkipFlash] = useState<"back" | "fwd" | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleScale, setSubtitleScale] = useState(1);
  const [subFlash, setSubFlash] = useState<string | null>(null);
  const subFlashTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const src = stream?.hlsProxyUrl || stream?.m3u8 || stream?.mp4 || "";
  const isHls = !!(stream?.hlsProxyUrl || stream?.m3u8) && stream?.playbackMode !== "mp4";
  const needsEmbed = !src && !!stream?.embedUrl;
  const hasSubtitles = !!stream?.subtitles?.length;

  useEffect(() => {
    setErrored(null);
    setReady(false);
    setBuffering(true);
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          enableWorker: true,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 4,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setReady(true);
          if (startAt) video.currentTime = startAt;
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setErrored("Playback error — try another episode or server.");
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        setReady(true);
      } else {
        setErrored("Your browser can't play this stream.");
      }
    } else {
      video.src = src;
      setReady(true);
      if (startAt) video.currentTime = startAt;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setTime(video.currentTime);
      onProgress?.(video.currentTime, video.duration || 0);
    };
    const onLoaded = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnd = () => onEnded?.();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnd);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnd);
    };
  }, [onProgress, onEnded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function applyTrackModes() {
      const tracks = video!.textTracks;
      const subs = stream?.subtitles || [];
      const hasExplicitDefault = subs.some((s) => s.default);
      for (let i = 0; i < tracks.length; i++) {
        if (!subtitlesEnabled) {
          tracks[i].mode = "disabled";
          continue;
        }
        const entry = subs[i];
        const shouldShow = entry?.default || (!hasExplicitDefault && i === 0);
        tracks[i].mode = shouldShow ? "showing" : "disabled";
      }
    }
    video.addEventListener("loadedmetadata", applyTrackModes);
    applyTrackModes();
    return () => video.removeEventListener("loadedmetadata", applyTrackModes);
  }, [stream, subtitlesEnabled]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    const max = duration || video.duration || Infinity;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), max);
    setSkipFlash(delta > 0 ? "fwd" : "back");
    if (skipFlashTimer.current) window.clearTimeout(skipFlashTimer.current);
    skipFlashTimer.current = window.setTimeout(() => setSkipFlash(null), 550);
  }

  function jumpTo(t: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = t;
  }

  function flashSubSize(scale: number) {
    setSubFlash(`Subtitles ${Math.round(scale * 100)}%`);
    if (subFlashTimer.current) window.clearTimeout(subFlashTimer.current);
    subFlashTimer.current = window.setTimeout(() => setSubFlash(null), 900);
  }

  function bumpSubtitleScale(delta: number) {
    setSubtitleScale((s) => {
      const next = Math.min(SUB_SCALE_MAX, Math.max(SUB_SCALE_MIN, +(s + delta).toFixed(2)));
      flashSubSize(next);
      return next;
    });
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT" || el?.isContentEditable) return;
      if (!videoRef.current || !src) return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekBy(10);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekBy(-10);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        bumpSubtitleScale(-SUB_SCALE_STEP);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        bumpSubtitleScale(SUB_SCALE_STEP);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, src]);

  function seek(pct: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = pct * duration;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(v: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
    setVolume(v);
    setMuted(v === 0);
  }

  function toggleFullscreen() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (!document.fullscreenElement) wrap.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function resetHideTimer() {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2800);
  }

  if (needsEmbed) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <iframe src={stream!.embedUrl} allowFullScreen className="h-full w-full" title={title || "Player"} referrerPolicy="no-referrer" />
        <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-[11px] text-amber-300 backdrop-blur">
          Embedded server — some ads may appear
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border border-white/10 bg-zinc-950 text-sm text-zinc-500">
        No playable source found for this episode yet.
      </div>
    );
  }

  const pct = duration ? (time / duration) * 100 : 0;

  // Aniskip / scraper-provided intro & outro windows — button only shows
  // while currentTime actually falls inside the interval.
  const introActive = !!stream?.intro && time >= stream.intro.start && time < stream.intro.end;
  const outroActive = !!stream?.outro && time >= stream.outro.start && time < stream.outro.end;
  const skipTarget = introActive ? stream?.intro?.end : outroActive ? stream?.outro?.end : null;
  const skipLabel = introActive ? "Skip Intro" : outroActive ? "Skip Outro" : null;

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <style>{`#${videoId}::cue { font-size: ${subtitleScale}em; }`}</style>

      <video id={videoId} ref={videoRef} className="h-full w-full" onClick={togglePlay} playsInline crossOrigin="anonymous">
        {stream?.subtitles?.map((s) => (
          <track key={s.url} src={s.url} kind="subtitles" srcLang="en" label={s.lang} default={s.default} />
        ))}
      </video>

      {(buffering || !ready) && !errored && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
          <Icon.Loader className="h-10 w-10 animate-spin text-red-500" />
        </div>
      )}

      {errored && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center text-sm text-red-200">{errored}</div>
      )}

      {!playing && ready && !buffering && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/20"
          aria-label="Play"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition duration-200 hover:scale-105 hover:border-red-500/50 hover:bg-black/60">
            <Icon.Play className="ml-1 h-6 w-6" />
          </span>
        </button>
      )}

      {skipFlash && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-black/75 px-5 py-3 text-white backdrop-blur">
            {skipFlash === "back" ? <Icon.Rewind10 className="h-6 w-6" /> : <Icon.Forward10 className="h-6 w-6" />}
            <span className="text-sm font-semibold">{skipFlash === "back" ? "-10s" : "+10s"}</span>
          </div>
        </div>
      )}

      {subFlash && (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <div className="rounded-full bg-black/75 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">{subFlash}</div>
        </div>
      )}

      {/* Intro/Outro skip button — persistently visible while active,
          regardless of whether the rest of the control bar is faded out,
          matching the behavior of most streaming sites (Crunchyroll, etc). */}
      {skipLabel && skipTarget != null && (
        <button
          onClick={() => jumpTo(skipTarget)}
          className="absolute bottom-20 right-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:scale-[1.03] hover:bg-black/95 sm:bottom-24 sm:right-6"
        >
          {skipLabel}
          <Icon.SkipForward className="h-4 w-4" />
        </button>
      )}

      <div className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-3 pb-2 pt-10 transition-opacity duration-300 sm:px-5", showControls ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div
          className="group/bar relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - rect.left) / rect.width);
          }}
        >
          <div className="h-full rounded-full bg-red-600" style={{ width: `${pct}%` }} />
          <div className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-red-500 opacity-0 shadow transition group-hover/bar:opacity-100" style={{ left: `${pct}%` }} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-white">
          <button onClick={() => seekBy(-10)} aria-label="Rewind 10 seconds" className="text-zinc-300 transition hover:text-white">
            <Icon.Rewind10 className="h-5 w-5" />
          </button>

          <button onClick={togglePlay} aria-label="Play/Pause">
            {playing ? <Icon.Pause className="h-5 w-5" /> : <Icon.Play className="h-5 w-5" />}
          </button>

          <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className="text-zinc-300 transition hover:text-white">
            <Icon.Forward10 className="h-5 w-5" />
          </button>

          {hasNext && (
            <button onClick={onNext} aria-label="Next episode" className="text-zinc-300 hover:text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5"><path d="M6 4l10 8-10 8V4zM18 4h2v16h-2z" /></svg>
            </button>
          )}

          <div
            className="group/vol flex items-center gap-1.5"
            onMouseEnter={() => setVolumeHover(true)}
            onMouseLeave={() => setVolumeHover(false)}
          >
            <button onClick={toggleMute} aria-label="Mute">
              {muted || volume === 0 ? <Icon.Mute className="h-4.5 w-4.5" /> : <Icon.Volume className="h-4.5 w-4.5" />}
            </button>
            <div className={cn("overflow-hidden transition-all duration-200", volumeHover ? "w-16" : "w-0")}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                onFocus={() => setVolumeHover(true)}
                onBlur={() => setVolumeHover(false)}
                className="volume-slider h-1 w-16"
              />
            </div>
          </div>

          {hasSubtitles && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => bumpSubtitleScale(-SUB_SCALE_STEP)}
                disabled={!subtitlesEnabled}
                aria-label="Decrease subtitle size"
                className="grid h-6 w-6 place-items-center rounded text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                −
              </button>
              <button
                onClick={() => setSubtitlesEnabled((v) => !v)}
                aria-label="Toggle subtitles"
                className={cn("transition", subtitlesEnabled ? "text-white" : "text-zinc-500 hover:text-white")}
              >
                {subtitlesEnabled ? <Icon.Captions className="h-4.5 w-4.5" /> : <Icon.CaptionsOff className="h-4.5 w-4.5" />}
              </button>
              <button
                onClick={() => bumpSubtitleScale(SUB_SCALE_STEP)}
                disabled={!subtitlesEnabled}
                aria-label="Increase subtitle size"
                className="grid h-6 w-6 place-items-center rounded text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}

          <span className="text-xs tabular-nums text-zinc-300">
            {fmt(time)} / {fmt(duration)}
          </span>

          {title && <span className="ml-2 hidden max-w-[240px] truncate text-xs text-zinc-400 sm:block">{title}</span>}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 sm:flex">
              <Icon.Shield className="h-3 w-3 text-green-400" /> Ad-free stream
            </span>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className={cn(fullscreen && "text-red-400")}>
              <Icon.Expand className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}