export interface AnimeImage {
  jpg: {
    image_url: string;
    small_image_url: string;
    large_image_url: string;
  };
  webp?: {
    image_url: string;
    small_image_url: string;
    large_image_url: string;
  };
}

export interface AnimeGenre {
  mal_id: number;
  name: string;
}

export interface AnimeStudio {
  mal_id: number;
  name: string;
}

export interface AnimeTrailer {
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
}

export interface Anime {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  images: AnimeImage;
  score: number | null;
  rank: number | null;
  popularity: number | null;
  episodes: number | null;
  status: string;
  aired: {
    from: string | null;
    to: string | null;
    string: string;
  };
  genres: AnimeGenre[];
  studios: AnimeStudio[];
  rating: string | null;
  type: string | null;
  trailer: AnimeTrailer;
  year: number | null;
  season: string | null;
  duration: string | null;
  source: string | null;
}

export interface AnimeEpisode {
  mal_id: number;
  title: string | null;
  title_japanese: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
}

export type ViewType = 'home' | 'library' | 'player' | 'search';

export interface PlayerState {
  anime: Anime;
  episode: number;
  totalEpisodes: number;
}
