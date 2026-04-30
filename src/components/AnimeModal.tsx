import { useEffect } from 'react';
import type { Anime } from '../types/anime';

interface AnimeModalProps {
  anime: Anime | null;
  onClose: () => void;
  onWatch: (anime: Anime) => void;
}

export default function AnimeModal({ anime, onClose, onWatch }: AnimeModalProps) {
  useEffect(() => {
    if (anime) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [anime]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!anime) return null;

  const title = anime.title_english || anime.title;
  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black/80 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Hero Image */}
        <div className="relative h-64 md:h-80 overflow-hidden rounded-t-2xl">
          <img src={image} alt={title} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 -mt-12 relative">
          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">{title}</h2>

          {/* Meta Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {anime.score && (
              <MetaBadge icon="⭐" text={anime.score.toFixed(1)} color="yellow" />
            )}
            {anime.year && <MetaBadge text={String(anime.year)} />}
            {anime.type && <MetaBadge text={anime.type} color="red" />}
            {anime.status && <MetaBadge text={anime.status} color="green" />}
            {anime.episodes && <MetaBadge text={`${anime.episodes} eps`} />}
            {anime.duration && <MetaBadge text={anime.duration.replace(' per ep', '')} />}
          </div>

          {/* Watch Button */}
          <button
            onClick={() => { onClose(); onWatch(anime); }}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 mb-5 shadow-lg shadow-red-600/20 hover:scale-[1.01]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Watch Now — Episode 1
          </button>

          {/* Genres */}
          {anime.genres?.length > 0 && (
            <div className="mb-5">
              <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-2">Genres</p>
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map(g => (
                  <span key={g.mal_id} className="text-xs text-white/70 bg-white/8 border border-white/10 px-2.5 py-1 rounded-full">{g.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Studios */}
          {anime.studios?.length > 0 && (
            <div className="mb-5">
              <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-2">Studios</p>
              <div className="flex flex-wrap gap-1.5">
                {anime.studios.map(s => (
                  <span key={s.mal_id} className="text-xs text-white/70 bg-white/8 border border-white/10 px-2.5 py-1 rounded-full">{s.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {anime.synopsis && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-2">Synopsis</p>
              <p className="text-white/70 text-sm leading-relaxed">{anime.synopsis}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaBadge({ icon, text, color }: { icon?: string; text: string; color?: 'yellow' | 'red' | 'green' }) {
  const colors = {
    yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-600/15 border-red-500/30 text-red-400',
    green: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  };
  const cls = color ? colors[color] : 'bg-white/8 border-white/15 text-white/60';
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cls} flex items-center gap-1`}>
      {icon && <span>{icon}</span>}
      {text}
    </span>
  );
}
