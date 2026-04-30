import { useRef } from 'react';
import type { Anime } from '../types/anime';
import AnimeCard from './AnimeCard';

interface AnimeRowProps {
  title: string;
  subtitle?: string;
  animes: Anime[];
  onAnimeClick: (anime: Anime) => void;
  loading?: boolean;
}

export default function AnimeRow({ title, subtitle, animes, onAnimeClick, loading }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.75;
    container.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      {/* Header */}
      <div className="flex items-end justify-between px-6 mb-4">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 hover:bg-black/90 hover:border-white/20 transition-all duration-200 shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 hover:bg-black/90 hover:border-white/20 transition-all duration-200 shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Left Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-[5] pointer-events-none" />
        {/* Right Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-[5] pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-6 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-40 md:w-44 shrink-0 rounded-xl bg-zinc-800/50 animate-pulse">
                  <div className="aspect-[2/3] rounded-xl bg-zinc-800" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-3 bg-zinc-700 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-700/50 rounded w-1/2" />
                  </div>
                </div>
              ))
            : animes.map(anime => (
                <AnimeCard key={anime.mal_id} anime={anime} onClick={onAnimeClick} />
              ))}
        </div>
      </div>
    </div>
  );
}
