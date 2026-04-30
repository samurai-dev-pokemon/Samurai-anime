import type { Anime } from '../types/anime';

interface AnimeCardProps {
  anime: Anime;
  onClick: (anime: Anime) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function AnimeCard({ anime, onClick, size = 'md' }: AnimeCardProps) {
  const title = anime.title_english || anime.title;
  const score = anime.score;
  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  const sizeClasses = {
    sm: 'w-32 md:w-36',
    md: 'w-40 md:w-44',
    lg: 'w-48 md:w-52',
  };

  return (
    <button
      onClick={() => onClick(anime)}
      className={`${sizeClasses[size]} shrink-0 group relative rounded-xl overflow-hidden bg-zinc-900 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl hover:shadow-black/60 text-left`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://via.placeholder.com/300x450/1a1a2e/e50914?text=${encodeURIComponent(title.slice(0, 2))}`;
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Score Badge */}
        {score && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm border border-yellow-500/30 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-xs font-bold text-yellow-400">{score.toFixed(1)}</span>
          </div>
        )}

        {/* Type Badge */}
        {anime.type && (
          <div className="absolute top-2 left-2 bg-red-600/80 backdrop-blur-sm rounded px-1.5 py-0.5">
            <span className="text-xs font-bold text-white">{anime.type}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
          {title}
        </p>
        {anime.year && (
          <p className="text-white/40 text-xs mt-1">{anime.year}</p>
        )}
      </div>
    </button>
  );
}
