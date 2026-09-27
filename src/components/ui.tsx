import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";
import { href } from "../utils/router";
import { titleOf } from "../lib/api";
import type { Anime } from "../lib/types";

/* ---------------- icons ---------------- */
type IconProps = { className?: string };
const svg =
  (paths: ReactNode) =>
  ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths}
    </svg>
  );

export const Icon = {
  Play: svg(<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />),
  Pause: svg(<><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" /></>),
  Star: svg(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none" />),
  X: svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),

  Search: svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  Chevron: svg(<polyline points="9 18 15 12 9 6" />),
  ChevronLeft: svg(<polyline points="15 18 9 12 15 6" />),
  Plus: svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  Check: svg(<polyline points="20 6 9 17 4 12" />),
  Info: svg(<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>),
  User: svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  Menu: svg(<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>),
  Volume: svg(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>),
  Mute: svg(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>),
  Captions: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="6" y1="10" x2="10" y2="10" /><line x1="6" y1="14" x2="14" y2="14" /><line x1="14" y1="10" x2="18" y2="10" /></>),
  CaptionsOff: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="6" y1="10" x2="10" y2="10" /><line x1="6" y1="14" x2="14" y2="14" /><line x1="1" y1="1" x2="23" y2="23" /></>),
  Expand: svg(<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>),
  Loader: svg(<circle cx="12" cy="12" r="9" strokeDasharray="42" strokeDashoffset="14" />),
  Pause: svg(<><line x1="7" y1="4" x2="7" y2="20" /><line x1="17" y1="4" x2="17" y2="20" /></>),
  Bell: svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  Clock: svg(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  Eye: svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  EyeOff: svg(<><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>),
  Film: svg(<><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5" /></>),
  Shield: svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  ThumbsUp: svg(<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />),
  ThumbsDown: svg(<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />),
  Rewind10: svg(<><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" /></>),
  Forward10: svg(<><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 4 21 9 16 9" /></>),
  SkipForward: svg(<><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" /><line x1="19" y1="5" x2="19" y2="19" /></>),
  Globe: svg(<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>),
  Trash: svg(<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>),
  Send: svg(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>),
  Github: svg(<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />),
};

/* ---------------- layout ---------------- */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1700px] px-4 sm:px-8 lg:px-12", className)}>{children}</div>;
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300", className)}>
      {children}
    </span>
  );
}

export function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------- horizontal scroll row w/ hover arrows + edge fade ---------------- */
export function CardRow({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  function scrollByAmount(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const fade = 56;
  const maskImage = `linear-gradient(to right, ${canLeft ? "transparent, black " + fade + "px" : "black 0px"}, black calc(100% - ${canRight ? fade : 0}px), ${canRight ? "transparent" : "black"})`;

  return (
    <div className="group/row relative">
      <div
        ref={scrollerRef}
        className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-3 transition-[mask-image] duration-300 sm:gap-4"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        {children}
      </div>

      {canLeft && (
        <button
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className="absolute left-1 top-0 bottom-3 z-10 flex items-center opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/90 hover:scale-110">
            <Icon.ChevronLeft className="h-5 w-5" />
          </span>
        </button>
      )}

      {canRight && (
        <button
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className="absolute right-1 top-0 bottom-3 z-10 flex items-center opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/90 hover:scale-110">
            <Icon.Chevron className="h-5 w-5" />
          </span>
        </button>
      )}
    </div>
  );
}

export function RowItem({ children }: { children: ReactNode }) {
  return <div className="w-[150px] shrink-0 snap-start sm:w-[180px] lg:w-[200px]">{children}</div>;
}

/* ---------------- skeletons ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-800/80", className)} />;
}

export function CardSkeletons({ n = 8, row = false }: { n?: number; row?: boolean }) {
  const items = Array.from({ length: n });
  if (row) {
    return (
      <div className="-mx-1 flex gap-3 overflow-hidden px-1 pb-3 sm:gap-4">
        {items.map((_, i) => (
          <div key={i} className="w-[150px] shrink-0 sm:w-[180px] lg:w-[200px]">
            <Skeleton className="aspect-[2/3] w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-full" />
      ))}
    </div>
  );
}

/** Minimal count formatter for like/dislike badges — 1234 → "1.2k". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** Minimal "time ago" formatter for comments — 1712345678901 → "3h ago". */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

export function ErrorNote({ msg, retry }: { msg: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-red-900/40 bg-red-950/20 p-5 text-sm text-red-200">
      <p>{msg || "Something went wrong while loading this."}</p>
      {retry && (
        <button onClick={retry} className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500">
          Try again
        </button>
      )}
    </div>
  );
}

/* ---------------- anime card ---------------- */
export function AnimeCard({ anime, showMeta = true }: { anime: Anime; showMeta?: boolean }) {
  const poster = anime.poster || anime.cover || "";
  return (
    <Link to={href.anime(anime.malId)} className="group block">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/5 transition duration-300 group-hover:scale-[1.04] group-hover:ring-red-500/40 group-hover:shadow-xl group-hover:shadow-black/60">
        {poster ? (
          <img src={poster} alt={titleOf(anime)} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-zinc-900 text-zinc-700">
            <Icon.Film className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
        {anime.score ? (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
            <Icon.Star className="h-2.5 w-2.5" /> {(anime.score / 10).toFixed(1)}
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white shadow-lg">
            <Icon.Play className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      {showMeta && (
        <div className="mt-1.5 space-y-0.5">
          <p className="line-clamp-1 text-xs font-medium text-zinc-200 sm:text-sm">{titleOf(anime)}</p>
          <p className="line-clamp-1 text-[11px] text-zinc-500">
            {anime.type || "TV"}
            {anime.episodes ? ` · ${anime.episodes} eps` : ""}
          </p>
        </div>
      )}
    </Link>
  );
}
/* ---------------- toggle switch ---------------- */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
        checked ? "bg-red-600" : "bg-white/15",
      )}
    >
      <span className={cn("h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}