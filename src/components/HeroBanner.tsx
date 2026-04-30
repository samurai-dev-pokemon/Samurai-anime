import { useState, useEffect } from 'react';
import type { Anime } from '../types/anime';

interface HeroBannerProps {
  animes: Anime[];
  onWatch: (anime: Anime) => void;
  onInfo: (anime: Anime) => void;
}

export default function HeroBanner({ animes, onWatch, onInfo }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const featured = animes.slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(c => (c + 1) % featured.length);
        setFading(false);
      }, 500);
    }, 7000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!featured.length) {
    return (
      <div className="relative h-[85vh] bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const anime = featured[current];
  const title = anime.title_english || anime.title;
  const score = anime.score;

  return (
    <div className="relative h-[90vh] min-h-[600px] overflow-hidden">
      {/* Background Images for smooth cross-fade */}
      {featured.map((a, i) => (
        <div
          key={a.mal_id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current && !fading ? 1 : 0 }}
        >
          <img
            src={a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}
            alt=""
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>
      ))}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 bottom-0 top-auto h-48" />

      {/* Content */}
      <div
        className={`absolute inset-0 flex items-center transition-all duration-500 ${fading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      >
        <div className="px-8 md:px-16 max-w-2xl mt-16">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {score && (
              <span className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {score.toFixed(1)}
              </span>
            )}
            {anime.year && (
              <span className="bg-white/10 text-white/70 text-xs font-medium px-2.5 py-1 rounded-full">{anime.year}</span>
            )}
            {anime.type && (
              <span className="bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">{anime.type}</span>
            )}
            {anime.episodes && (
              <span className="bg-white/10 text-white/70 text-xs font-medium px-2.5 py-1 rounded-full">{anime.episodes} eps</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-lg">
            {title}
          </h1>

          {/* Genres */}
          {anime.genres?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {anime.genres.slice(0, 4).map(g => (
                <span key={g.mal_id} className="text-xs text-white/50 border border-white/15 px-2 py-0.5 rounded">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p className="text-white/70 text-sm md:text-base leading-relaxed line-clamp-3 mb-8">
            {anime.synopsis}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onWatch(anime)}
              className="flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-500/40 hover:scale-105 active:scale-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Now
            </button>
            <button
              onClick={() => onInfo(anime)}
              className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 hover:border-white/25"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
              More Info
            </button>
          </div>
        </div>
      </div>

      {/* Dots */}
      {featured.length > 1 && (
        <div className="absolute bottom-32 left-8 md:left-16 flex gap-2">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false); }, 400); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-red-500' : 'w-3 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
