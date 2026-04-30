import { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { getTopAnime, getAnimeByGenre, getNewReleases } from '../api/jikan';
import AnimeCard from '../components/AnimeCard';
import AnimeModal from '../components/AnimeModal';

const GENRES = [
  { id: 0, name: 'All' },
  { id: 1, name: 'Action' },
  { id: 2, name: 'Adventure' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 14, name: 'Horror' },
  { id: 7, name: 'Mystery' },
  { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' },
  { id: 30, name: 'Sports' },
  { id: 37, name: 'Supernatural' },
  { id: 41, name: 'Thriller' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Top Rated' },
  { value: 'new', label: 'New Releases' },
  { value: 'popularity', label: 'Most Popular' },
];

interface LibraryPageProps {
  onWatch: (anime: Anime) => void;
}

export default function LibraryPage({ onWatch }: LibraryPageProps) {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [sortBy, setSortBy] = useState('score');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  useEffect(() => {
    async function loadAnimes() {
      setLoading(true);
      setAnimes([]);
      try {
        let data: Anime[] = [];
        if (selectedGenre === 0) {
          if (sortBy === 'new') {
            data = await getNewReleases();
          } else {
            data = await getTopAnime();
          }
        } else {
          data = await getAnimeByGenre(selectedGenre);
        }
        // Sort
        if (sortBy === 'score') {
          data = [...data].sort((a, b) => (b.score || 0) - (a.score || 0));
        } else if (sortBy === 'popularity') {
          data = [...data].sort((a, b) => (a.popularity || 9999) - (b.popularity || 9999));
        }
        setAnimes(data);
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnimes();
  }, [selectedGenre, sortBy]);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-[1600px] mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Anime Library</h1>
          <p className="text-white/40 text-sm">Browse and discover your next favorite</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Genre Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1" style={{ scrollbarWidth: 'none' }}>
            {GENRES.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(g.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedGenre === g.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/15 border border-white/10'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white/8 border border-white/15 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-red-500/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-800/50 animate-pulse">
                <div className="aspect-[2/3] rounded-xl bg-zinc-800" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-zinc-700 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : animes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-xl font-bold text-white mb-2">No Anime Found</h3>
            <p className="text-white/40">Try a different genre or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map(anime => (
              <div key={anime.mal_id} className="flex justify-center">
                <AnimeCard anime={anime} onClick={setSelectedAnime} size="lg" />
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimeModal
        anime={selectedAnime}
        onClose={() => setSelectedAnime(null)}
        onWatch={onWatch}
      />
    </div>
  );
}
