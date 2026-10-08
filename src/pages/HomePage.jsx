import { useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import { ComingSoonCard, NowPlayingCard, RecentCard } from "../components/MovieCard";
import SectionState, { CardRowSkeleton, HeroSkeleton } from "../components/SectionState";
import { useApi } from "../hooks/useApi";
import { readRecent } from "../lib/recentlyViewed";
import "./home.css";

export default function HomePage() {
  const featured = useApi("/movies/featured");
  const nowPlaying = useApi("/movies/now-playing?limit=8");
  const comingSoon = useApi("/movies/coming-soon");
  const [recent] = useState(() => readRecent());

  return (
    <div className="home">
      <SectionState
        status={featured.status}
        error={featured.error}
        onRetry={featured.retry}
        skeleton={<HeroSkeleton />}
      >
        <Hero movies={featured.data || []} />
      </SectionState>

      {recent.length > 0 ? (
        <section className="home-section">
          <header className="section-header">
            <h2>Recently viewed</h2>
          </header>
          <div className="card-row">
            {recent.map((movie) => (
              <RecentCard movie={movie} key={movie.slug} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-section">
        <header className="section-header">
          <h2>Now Playing</h2>
          <Link className="see-all" to="/sessions">
            See all
          </Link>
        </header>
        <SectionState
          status={nowPlaying.status}
          error={nowPlaying.error}
          onRetry={nowPlaying.retry}
          skeleton={<CardRowSkeleton />}
        >
          {nowPlaying.data?.length ? (
            <div className="card-row">
              {nowPlaying.data.map((movie) => (
                <NowPlayingCard movie={movie} key={movie.id} />
              ))}
            </div>
          ) : (
            <p className="empty-copy">No films are playing right now.</p>
          )}
        </SectionState>
      </section>

      <section className="home-section">
        <header className="section-header">
          <h2>Coming soon...</h2>
          <span className="see-all">See all</span>
        </header>
        <SectionState
          status={comingSoon.status}
          error={comingSoon.error}
          onRetry={comingSoon.retry}
          skeleton={<CardRowSkeleton />}
        >
          {comingSoon.data?.length ? (
            <div className="card-row">
              {comingSoon.data.map((movie) => (
                <ComingSoonCard movie={movie} key={movie.id} />
              ))}
            </div>
          ) : (
            <p className="empty-copy">No upcoming releases.</p>
          )}
        </SectionState>
      </section>
    </div>
  );
}
