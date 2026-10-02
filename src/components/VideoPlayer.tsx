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

const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

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
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const [skipFlash, setSkipFlash] = useState<"back" | "fwd" | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleScale, setSubtitleScale] = useState(1);
  const [subFlash, setSubFlash] = useState<string | null>(null);
  const subFlashTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const scrubbing = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const volumeWrapRef = useRef<HTMLDivElement>(null);

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
    const onFsChange = () => setFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as any);
    };
  }, []);

  // Closes the volume popover on outside tap — only needed for touch,
  // since desktop closes it naturally via onMouseLeave.
  useEffect(() => {
    if (!isTouchDevice || !volumePanelOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (volumeWrapRef.current && !volumeWrapRef.current.contains(e.target as Node)) {
        setVolumePanelOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [volumePanelOpen]);

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

  function seekToClientX(clientX: number) {
    const bar = barRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
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
    const video = videoRef.current as any;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else if (wrap?.requestFullscreen) {
        wrap.requestFullscreen();
      } else if ((wrap as any)?.webkitRequestFullscreen) {
        (wrap as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    }
  }

  function resetHideTimer() {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2800);
  }

  function handleVideoTap(e: React.MouseEvent | React.TouchEvent) {
    if (!isTouchDevice) {
      togglePlay();
      return;
    }

    const clientX = "touches" in e && e.touches.length ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const rect = wrapRef.current?.getBoundingClientRect();
    const now = Date.now();
    const isDoubleTap = !!lastTapRef.current && now - lastTapRef.current.time < 300 && Math.abs((lastTapRef.current.x ?? 0) - clientX) < 60;

    if (isDoubleTap && rect) {
      const relX = clientX - rect.left;
      if (relX < rect.width * 0.4) seekBy(-10);
      else if (relX > rect.width * 0.6) seekBy(10);
      else togglePlay();
      lastTapRef.current = null;
      resetHideTimer();
      return;
    }

    lastTapRef.current = { time: now, x: clientX };

    if (!showControls) {
      resetHideTimer();
    } else {
      togglePlay();
      resetHideTimer();
    }
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

  const introActive = !!stream?.intro && time >= stream.intro.start && time < stream.intro.end;
  const outroActive = !!stream?.outro && time >= stream.outro.start && time < stream.outro.end;
  const skipTarget = introActive ? stream?.intro?.end : outroActive ? stream?.outro?.end : null;
  const skipLabel = introActive ? "Skip Intro" : outroActive ? "Skip Outro" : null;

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full touch-none select-none overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:touch-auto"
      onMouseMove={!isTouchDevice ? resetHideTimer : undefined}
      onMouseLeave={!isTouchDevice ? () => playing && setShowControls(false) : undefined}
    >
      <style>{`#${videoId}::cue { font-size: ${subtitleScale}em; }`}</style>

      <video
        id={videoId}
        ref={videoRef}
        className="h-full w-full"
        onClick={handleVideoTap as any}
        onTouchEnd={isTouchDevice ? (handleVideoTap as any) : undefined}
        playsInline
        crossOrigin="anonymous"
      >
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

      {!playing && ready && !buffering && showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
            resetHideTimer();
          }}
          className="absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/20"
          aria-label="Play"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition duration-200 hover:scale-105 hover:border-red-500/50 hover:bg-black/60 sm:h-16 sm:w-16">
            <Icon.Play className="ml-1 h-5 w-5 sm:h-6 sm:w-6" />
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

      {skipLabel && skipTarget != null && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            jumpTo(skipTarget);
          }}
          className="absolute bottom-16 right-3 z-20 flex min-h-[40px] items-center gap-2 rounded-lg border border-white/10 bg-black/80 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition active:scale-95 sm:bottom-20 sm:right-6 sm:px-4 sm:text-sm"
        >
          {skipLabel}
          <Icon.SkipForward className="h-4 w-4" />
        </button>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-2 pb-2 pt-10 transition-opacity duration-300 sm:px-5",
          showControls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={barRef}
          className="group/bar relative mb-2 flex h-5 w-full cursor-pointer items-center"
          onMouseDown={(e) => {
            scrubbing.current = true;
            seekToClientX(e.clientX);
            const onMove = (ev: MouseEvent) => scrubbing.current && seekToClientX(ev.clientX);
            const onUp = () => {
              scrubbing.current = false;
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          onTouchStart={(e) => {
            scrubbing.current = true;
            seekToClientX(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (scrubbing.current) seekToClientX(e.touches[0].clientX);
          }}
          onTouchEnd={() => {
            scrubbing.current = false;
          }}
        >
          <div className="pointer-events-none h-1.5 w-full rounded-full bg-white/20">
            <div className="h-full rounded-full bg-red-600" style={{ width: `${pct}%` }} />
          </div>
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-red-500 opacity-0 shadow transition group-hover/bar:opacity-100"
            style={{ left: `${pct}%` }}
          />
        </div>

        {/* Single row, split into a left "transport" cluster and a right
            "everything else" cluster via one ml-auto — no wrapping, no
            reordering hacks. Sized so it fits down to ~320px screens. */}
        <div className="flex flex-nowrap items-center gap-1 text-white sm:gap-3">
          <button onClick={() => seekBy(-10)} aria-label="Rewind 10 seconds" className="grid h-9 w-9 shrink-0 place-items-center text-zinc-300 transition hover:text-white sm:h-auto sm:w-auto">
            <Icon.Rewind10 className="h-5 w-5" />
          </button>

          <button onClick={togglePlay} aria-label="Play/Pause" className="grid h-10 w-10 shrink-0 place-items-center sm:h-auto sm:w-auto">
            {playing ? <Icon.Pause className="h-5 w-5" /> : <Icon.Play className="h-5 w-5" />}
          </button>

          <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className="grid h-9 w-9 shrink-0 place-items-center text-zinc-300 transition hover:text-white sm:h-auto sm:w-auto">
            <Icon.Forward10 className="h-5 w-5" />
          </button>

          {/* Next-episode arrow hidden on mobile — Watch.tsx already has
              dedicated prev/next buttons below the player, so this was
              just an extra button crowding an already-tight row. */}
          {hasNext && (
            <button onClick={onNext} aria-label="Next episode" className="hidden shrink-0 text-zinc-300 hover:text-white sm:grid sm:h-auto sm:w-auto sm:place-items-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M6 4l10 8-10 8V4zM18 4h2v16h-2z" /></svg>
            </button>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {/* Volume — now a popover anchored above the button instead of
                an inline-growing slider, so opening it never changes the
                row's width or causes a wrap. Hover opens it on desktop,
                tap toggles it on touch. */}
            <div
              ref={volumeWrapRef}
              className="relative"
              onMouseEnter={!isTouchDevice ? () => setVolumePanelOpen(true) : undefined}
              onMouseLeave={!isTouchDevice ? () => setVolumePanelOpen(false) : undefined}
            >
              <button
                onClick={() => (isTouchDevice ? setVolumePanelOpen((v) => !v) : toggleMute())}
                aria-label="Mute"
                className="grid h-9 w-9 shrink-0 place-items-center sm:h-auto sm:w-auto"
              >
                {muted || volume === 0 ? <Icon.Mute className="h-[18px] w-[18px]" /> : <Icon.Volume className="h-[18px] w-[18px]" />}
              </button>
              {volumePanelOpen && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-28 rounded-lg border border-white/10 bg-zinc-950/95 p-2.5 shadow-xl backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="volume-slider h-1 w-full"
                  />
                </div>
              )}
            </div>

            {hasSubtitles && (
              <div className="flex items-center gap-0.5">
                {/* Subtitle size +/- hidden on mobile — captions toggle
                    alone is kept since that's the control people actually
                    need in a hurry; resizing is a nice-to-have that was
                    eating row space on small screens. */}
                <button
                  onClick={() => bumpSubtitleScale(-SUB_SCALE_STEP)}
                  disabled={!subtitlesEnabled}
                  aria-label="Decrease subtitle size"
                  className="hidden h-6 w-6 place-items-center rounded text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 sm:grid"
                >
                  −
                </button>
                <button
                  onClick={() => setSubtitlesEnabled((v) => !v)}
                  aria-label="Toggle subtitles"
                  className={cn("grid h-9 w-9 shrink-0 place-items-center transition sm:h-auto sm:w-auto", subtitlesEnabled ? "text-white" : "text-zinc-500 hover:text-white")}
                >
                  {subtitlesEnabled ? <Icon.Captions className="h-[18px] w-[18px]" /> : <Icon.CaptionsOff className="h-[18px] w-[18px]" />}
                </button>
                <button
                  onClick={() => bumpSubtitleScale(SUB_SCALE_STEP)}
                  disabled={!subtitlesEnabled}
                  aria-label="Increase subtitle size"
                  className="hidden h-6 w-6 place-items-center rounded text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 sm:grid"
                >
                  +
                </button>
              </div>
            )}

            <span className="shrink-0 text-[11px] tabular-nums text-zinc-300 sm:text-xs">
              {fmt(time)} / {fmt(duration)}
            </span>

            {title && <span className="hidden max-w-[240px] truncate text-xs text-zinc-400 sm:block">{title}</span>}

            <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 lg:flex">
              <Icon.Shield className="h-3 w-3 text-green-400" /> Ad-free stream
            </span>

            <button onClick={toggleFullscreen} aria-label="Fullscreen" className={cn("grid h-9 w-9 shrink-0 place-items-center sm:h-auto sm:w-auto", fullscreen && "text-red-400")}>
              <Icon.Expand className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}