import { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { searchAnime } from '../api/jikan';
import AnimeCard from '../components/AnimeCard';
import AnimeModal from '../components/AnimeModal';

interface SearchPageProps {
  query: string;
  onWatch: (anime: Anime) => void;
}

export default function SearchPage({ query, onWatch }: SearchPageProps) {
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setResults([]);
    searchAnime(query)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">
            Search results for <span className="text-red-400">"{query}"</span>
          </h1>
          {!loading && (
            <p className="text-white/40 text-sm mt-1">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-800/50 animate-pulse">
                <div className="aspect-[2/3] rounded-xl bg-zinc-800" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-zinc-700 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
            <p className="text-white/40">Try searching with different keywords</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map(anime => (
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
