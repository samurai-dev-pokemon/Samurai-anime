import { useState, useCallback } from 'react';
import type { Anime, ViewType } from './types/anime';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import PlayerPage from './pages/PlayerPage';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleWatch = useCallback((anime: Anime) => {
    setSelectedAnime(anime);
    setView('player');
  }, []);

  const handleNavigate = useCallback((v: ViewType) => {
    setView(v);
    if (v !== 'player') setSelectedAnime(null);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setView('search');
  }, []);

  const handleBack = useCallback(() => {
    setView('home');
    setSelectedAnime(null);
  }, []);

  const handleAnimeSelectFromPlayer = useCallback((anime: Anime) => {
    setSelectedAnime(anime);
    setView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (view === 'player' && selectedAnime) {
    return (
      <PlayerPage
        anime={selectedAnime}
        onBack={handleBack}
        onAnimeSelect={handleAnimeSelectFromPlayer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans">
      <Navbar
        currentView={view}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
      />

      {view === 'home' && (
        <HomePage onWatch={handleWatch} />
      )}

      {view === 'library' && (
        <LibraryPage onWatch={handleWatch} />
      )}

      {view === 'search' && (
        <SearchPage query={searchQuery} onWatch={handleWatch} />
      )}
    </div>
  );
}
