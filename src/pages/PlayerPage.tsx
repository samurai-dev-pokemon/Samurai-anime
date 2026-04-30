// PlayerPage.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import type { Anime, AnimeEpisode } from '../types/anime';
import { getAnimeEpisodes, getAnimeRecommendationsById } from '../api/jikan';
import AnimeCard from '../components/AnimeCard';

function getEmbedUrl(malId: number, episode: number, source: string): string {
  switch (source) {
    case 'embed1':
      return `https://vidsrc.me/embed/anime?mal=${malId}&episode=${episode}`;
    case 'embed2':
      return `https://vidsrc.to/embed/anime/${malId}/${episode}`;
    case 'embed3':
      return `https://vidsrc.dev/embed/anime/${malId}/${episode}`;
    case 'embed4':
      return `https://www.2embed.skin/embedanime/${malId}/${episode}`;
    default:
      return `https://vidsrc.me/embed/anime?mal=${malId}&episode=${episode}`;
  }
}

const SOURCES = [
  { id: 'embed1', label: 'VidSrc', icon: '▶' },
  { id: 'embed2', label: 'VidSrc 2', icon: '◆' },
  { id: 'embed3', label: 'VidSrc 3', icon: '◉' },
  { id: 'embed4', label: '2Embed', icon: '⬡' },
];

interface PlayerPageProps {
  anime: Anime;
  onBack: () => void;
  onAnimeSelect: (anime: Anime) => void;
}

export default function PlayerPage({ anime, onBack, onAnimeSelect }: PlayerPageProps) {
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [currentEp, setCurrentEp] = useState(1);
  const [source, setSource] = useState('embed1');
  const [loadingEps, setLoadingEps] = useState(true);
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [showEpisodes, setShowEpisodes] = useState(true);
  const [epPage, setEpPage] = useState(1);
  const [hasMoreEps, setHasMoreEps] = useState(false);
  const [loadingMoreEps, setLoadingMoreEps] = useState(false);
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const title = anime.title_english || anime.title;
  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
  const embedUrl = getEmbedUrl(anime.mal_id, currentEp, source);

  const totalEps = anime.episodes && anime.episodes > 0
    ? anime.episodes
    : episodes.length > 0
      ? Math.max(...episodes.map(e => e.mal_id))
      : 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setLoadingEps(true);
    setEpPage(1);
    setEpisodes([]);

    getAnimeEpisodes(anime.mal_id, 1)
      .then(eps => {
        setEpisodes(eps);
        setHasMoreEps(eps.length === 100);
      })
      .catch(console.error)
      .finally(() => setLoadingEps(false));

    getAnimeRecommendationsById(anime.mal_id)
      .then(setRecommendations)
      .catch(console.error);
  }, [anime.mal_id]);

  useEffect(() => {
    setIframeStatus('loading');
  }, [iframeKey]);

  const loadMoreEpisodes = useCallback(async () => {
    if (loadingMoreEps) return;
    setLoadingMoreEps(true);
    const nextPage = epPage + 1;
    try {
      const eps = await getAnimeEpisodes(anime.mal_id, nextPage);
      setEpisodes(prev => [...prev, ...eps]);
      setEpPage(nextPage);
      setHasMoreEps(eps.length === 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMoreEps(false);
    }
  }, [anime.mal_id, epPage, loadingMoreEps]);

  const handleEpClick = (ep: number) => {
    setCurrentEp(ep);
    setIframeKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSourceChange = (s: string) => {
    setSource(s);
    setIframeKey(k => k + 1);
  };

  const displayEpisodes: { number: number; title: string | null }[] =
    episodes.length > 0
      ? episodes.map(e => ({ number: e.mal_id, title: e.title }))
      : Array.from({ length: totalEps }, (_, i) => ({
          number: i + 1,
          title: null,
        }));

  return (
    <div className="min-h-screen bg-black">
      {/* Back Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <svg
            className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-3 min-w-0">
          {image && (
            <img src={image} alt={title} className="w-8 h-10 object-cover rounded-md shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{title}</p>
            <p className="text-white/40 text-xs">Episode {currentEp}</p>
          </div>
        </div>
      </div>

      <div className="pt-16 flex flex-col xl:flex-row gap-0 max-w-[1800px] mx-auto">
        <div className="flex-1 min-w-0">

          {/* Player */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {iframeStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 gap-3">
                <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white/40 text-sm">Loading player...</p>
              </div>
            )}

            {iframeStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 gap-4">
                <div className="text-5xl">⚠️</div>
                <p className="text-white font-semibold">This source didn't load</p>
                <p className="text-white/40 text-sm text-center max-w-xs">
                  Try a different source below.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {SOURCES.filter(s => s.id !== source).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSourceChange(s.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Try {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full"
              style={{ border: 'none', display: 'block' }}
              allowFullScreen
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              title={`${title} - Episode ${currentEp}`}
              onLoad={() => setIframeStatus('loaded')}
              onError={() => setIframeStatus('error')}
            />
          </div>

          {/* Controls */}
          <div className="bg-zinc-950 border-b border-white/5 px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentEp > 1 && handleEpClick(currentEp - 1)}
                  disabled={currentEp <= 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 text-white/70 hover:text-white hover:bg-white/15 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                <span className="text-white/40 text-sm px-2 font-medium">
                  EP {currentEp} / {totalEps}
                </span>
                <button
                  onClick={() => currentEp < totalEps && handleEpClick(currentEp + 1)}
                  disabled={currentEp >= totalEps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 text-white/70 hover:text-white hover:bg-white/15 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/30 text-xs font-medium uppercase tracking-wider mr-1">
                  Source:
                </span>
                {SOURCES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSourceChange(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      source === s.id
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'bg-white/8 text-white/50 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-white/20 text-xs mt-2">
              💡 If player shows blank, try another source
            </p>
          </div>

          {/* Anime Info */}
          <div className="bg-zinc-950 px-4 py-5 border-b border-white/5">
            <div className="flex gap-4">
              {image && (
                <img src={image} alt={title} className="w-20 h-28 object-cover rounded-xl shrink-0 shadow-lg" />
              )}
              <div className="min-w-0">
                <h1 className="text-white font-black text-xl leading-tight mb-2">{title}</h1>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {anime.score && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                      ⭐ {anime.score.toFixed(1)}
                    </span>
                  )}
                  {anime.year && (
                    <span className="text-xs text-white/50 bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">
                      {anime.year}
                    </span>
                  )}
                  {anime.status && (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {anime.status}
                    </span>
                  )}
                  {anime.genres?.slice(0, 3).map(g => (
                    <span key={g.mal_id} className="text-xs text-white/50 bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">
                      {g.name}
                    </span>
                  ))}
                </div>
                {anime.synopsis && (
                  <p className="text-white/50 text-sm leading-relaxed line-clamp-3">{anime.synopsis}</p>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations desktop */}
          {recommendations.length > 0 && (
            <div className="hidden xl:block bg-zinc-950 px-4 py-5">
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider opacity-60">
                More Like This
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {recommendations.map(rec => (
                  <AnimeCard key={rec.mal_id} anime={rec} onClick={onAnimeSelect} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Episodes Sidebar */}
        <div className="xl:w-80 shrink-0 bg-zinc-950 border-l border-white/5 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-16 bg-zinc-950 z-10">
            <div>
              <h2 className="text-white font-bold text-sm">Episodes</h2>
              <p className="text-white/30 text-xs">{totalEps} total</p>
            </div>
            <button
              onClick={() => setShowEpisodes(e => !e)}
              className="text-white/40 hover:text-white transition-colors xl:hidden"
            >
              <svg
                className={`w-5 h-5 transition-transform ${showEpisodes ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div
            className={`flex-1 overflow-y-auto xl:max-h-[calc(100vh-4rem)] ${!showEpisodes ? 'hidden xl:block' : ''}`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#ef4444 transparent' }}
          >
            {loadingEps ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayEpisodes.length === 0 ? (
              <div className="flex flex-col items-center py-12 px-4 text-center">
                <p className="text-white/30 text-sm">Episode list not available</p>
                <button
                  onClick={() => handleEpClick(1)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition-colors"
                >
                  Watch Episode 1
                </button>
              </div>
            ) : (
              <div className="py-2">
                {displayEpisodes.map(ep => (
                  <button
                    key={ep.number}
                    onClick={() => handleEpClick(ep.number)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 hover:bg-white/5 group ${
                      currentEp === ep.number
                        ? 'bg-red-600/15 border-l-2 border-red-500'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        currentEp === ep.number
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'bg-white/8 text-white/50 group-hover:bg-white/15 group-hover:text-white'
                      }`}
                    >
                      {currentEp === ep.number ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        ep.number
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${
                        currentEp === ep.number ? 'text-white' : 'text-white/60 group-hover:text-white'
                      }`}>
                        {ep.title || `Episode ${ep.number}`}
                      </p>
                      <p className="text-white/25 text-xs">Episode {ep.number}</p>
                    </div>
                  </button>
                ))}

                {hasMoreEps && (
                  <div className="px-4 py-3">
                    <button
                      onClick={loadMoreEpisodes}
                      disabled={loadingMoreEps}
                      className="w-full py-2.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-sm transition-all disabled:opacity-50"
                    >
                      {loadingMoreEps ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load More Episodes'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations mobile */}
      {recommendations.length > 0 && (
        <div className="xl:hidden bg-zinc-950 px-4 py-6 mt-1">
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider opacity-60">
            More Like This
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {recommendations.map(rec => (
              <AnimeCard key={rec.mal_id} anime={rec} onClick={onAnimeSelect} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
