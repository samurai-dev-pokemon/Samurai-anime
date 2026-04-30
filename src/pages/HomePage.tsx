import { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { getRecommendedAnime, getNewReleases, getTopAnime, getAnimeByGenre } from '../api/jikan';
import HeroBanner from '../components/HeroBanner';
import AnimeRow from '../components/AnimeRow';
import AnimeModal from '../components/AnimeModal';

interface HomePageProps {
  onWatch: (anime: Anime) => void;
}

export default function HomePage({ onWatch }: HomePageProps) {
  const [recommended, setRecommended] = useState<Anime[]>([]);
  const [newReleases, setNewReleases] = useState<Anime[]>([]);
  const [topRated, setTopRated] = useState<Anime[]>([]);
  const [action, setAction] = useState<Anime[]>([]);
  const [fantasy, setFantasy] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load in parallel batches to respect rate limits
        const [rec, newR, top] = await Promise.all([
          getRecommendedAnime(),
          getNewReleases(),
          getTopAnime(),
        ]);
        setRecommended(rec);
        setNewReleases(newR);
        setTopRated(top);

        // Load genre rows with small delay
        await new Promise(r => setTimeout(r, 500));
        const [act, fan] = await Promise.all([
          getAnimeByGenre(1),  // Action
          getAnimeByGenre(10), // Fantasy
        ]);
        setAction(act);
        setFantasy(fan);
      } catch (err) {
        console.error('Failed to load anime data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const heroAnimes = [...(newReleases.length ? newReleases : []), ...(topRated.length ? topRated : [])].slice(0, 5);

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <HeroBanner
        animes={heroAnimes}
        onWatch={onWatch}
        onInfo={setSelectedAnime}
      />

      {/* Rows */}
      <div className="relative -mt-8 z-10 space-y-10 pb-20">
        <AnimeRow
          title="🌟 Recommended For You"
          subtitle="Curated picks based on community favorites"
          animes={recommended}
          onAnimeClick={setSelectedAnime}
          loading={loading}
        />
        <AnimeRow
          title="🆕 New This Season"
          subtitle="Latest releases — hot off the press"
          animes={newReleases}
          onAnimeClick={setSelectedAnime}
          loading={loading}
        />
        <AnimeRow
          title="🏆 All-Time Favorites"
          subtitle="Highest-rated anime of all time"
          animes={topRated}
          onAnimeClick={setSelectedAnime}
          loading={loading}
        />
        {action.length > 0 && (
          <AnimeRow
            title="⚔️ Action & Adventure"
            animes={action}
            onAnimeClick={setSelectedAnime}
          />
        )}
        {fantasy.length > 0 && (
          <AnimeRow
            title="🧙 Fantasy Worlds"
            animes={fantasy}
            onAnimeClick={setSelectedAnime}
          />
        )}
      </div>

      {/* Modal */}
      <AnimeModal
        anime={selectedAnime}
        onClose={() => setSelectedAnime(null)}
        onWatch={onWatch}
      />
    </div>
  );
}
