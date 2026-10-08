const STORAGE_KEY = "recentMovies";
const MAX_RECENT = 8;

export function readRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function rememberMovie(movie) {
  if (!movie?.slug) return readRecent();

  const entry = {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    posterUrl: movie.posterUrl,
    runtimeMinutes: movie.runtimeMinutes,
    releaseDate: movie.releaseDate,
    fromPrice: movie.fromPrice,
    isComingSoon: movie.isComingSoon,
    ageRating: movie.ageRating ? { code: movie.ageRating.code } : null,
  };

  const next = [entry, ...readRecent().filter((item) => item.slug !== movie.slug)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
