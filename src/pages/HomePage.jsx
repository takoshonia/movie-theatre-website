import { useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import { ComingSoonCard, NowPlayingCard } from "../components/MovieCard";
import SectionState, { CardRowSkeleton, HeroSkeleton } from "../components/SectionState";
import { useApi } from "../hooks/useApi";
import { readRecent } from "../lib/recentlyViewed";

export default function HomePage() {
  const featured = useApi("/movies/featured");
  const nowPlaying = useApi("/movies/now-playing?limit=8");
  const comingSoon = useApi("/movies/coming-soon");
  const [recent] = useState(() => readRecent());

  return (
    <>
      <SectionState status={featured.status} error={featured.error} onRetry={featured.retry} skeleton={<HeroSkeleton />}>
        <Hero movies={featured.data || []} />
      </SectionState>

      {recent.length > 0 ? (
        <section className="recent container">
          <h2>Recently viewed</h2>
          <div className="recent-list">
            {recent.map((movie) => (
              <Link key={movie.slug} to={`/movies/${movie.slug}`}>
                <img src={movie.posterUrl} alt="" />
                <div>
                  <strong>{movie.title}</strong>
                  <small>{movie.runtimeMinutes} min</small>
                  {movie.ageRating?.code ? <span className="age">{movie.ageRating.code}</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-section container">
        <div className="section-head">
          <h2>Now playing</h2>
          <Link to="/sessions">
            See all <Arrow />
          </Link>
        </div>
        <SectionState status={nowPlaying.status} error={nowPlaying.error} onRetry={nowPlaying.retry} skeleton={<CardRowSkeleton />}>
          {nowPlaying.data?.length ? (
            <div className="movie-grid">
              {nowPlaying.data.map((movie) => (
                <NowPlayingCard movie={movie} key={movie.id} />
              ))}
            </div>
          ) : (
            <p className="muted">No films in this category yet.</p>
          )}
        </SectionState>
      </section>

      <section className="home-section container">
        <div className="section-head">
          <h2>Coming soon…</h2>
          <Link to="/sessions">
            See all <Arrow />
          </Link>
        </div>
        <SectionState status={comingSoon.status} error={comingSoon.error} onRetry={comingSoon.retry} skeleton={<CardRowSkeleton />}>
          {comingSoon.data?.length ? (
            <div className="coming-grid">
              {comingSoon.data.map((movie) => (
                <ComingSoonCard movie={movie} key={movie.id} />
              ))}
            </div>
          ) : (
            <p className="muted">No films in this category yet.</p>
          )}
        </SectionState>
      </section>
    </>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 7h8M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
