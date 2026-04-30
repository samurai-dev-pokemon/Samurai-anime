// src/api/vidsrc.ts

export function getVidsrcUrl(tmdbId: number, episode: number): string {
  // vidsrc.to supports TMDB for TV shows
  return `https://vidsrc.to/embed/tv/${tmdbId}/${1}/${episode}`;
  // season 1, episode number
}

export function get2EmbedUrl(tmdbId: number, episode: number): string {
  return `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=${episode}`;
}

export function getVidsrcProUrl(tmdbId: number, episode: number): string {
  return `https://vidsrc.pro/embed/tv/${tmdbId}/1/${episode}`;
}
