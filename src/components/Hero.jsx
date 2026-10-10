import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Hero({ movies }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const movie = movies[index];

  useEffect(() => {
    if (movies.length < 2 || paused) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % movies.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [movies.length, paused]);

  if (!movie) return <p className="empty">No featured films right now.</p>;

  function show(nextIndex) {
    const total = movies.length;
    setIndex((nextIndex + total) % total);
  }

  return (
    <section
      className="hero"
      aria-label="Featured films"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-image" key={movie.id} style={{ backgroundImage: `url("${movie.backdropUrl || movie.posterUrl}")` }} />
      <div className="hero-shade" />
      <div className="hero-content container" key={`text-${movie.id}`}>
        <p className="eyebrow">On the big screen · A special cinema story</p>
        <h1>{movie.title}</h1>
        <div className="meta">
          <span className="age" title={movie.ageRating?.description}>
            {movie.ageRating?.code}
          </span>
          <span>
            <ClockIcon />
            {movie.runtimeMinutes} min
          </span>
          {movie.formats?.map((format) => (
            <span className="badge" key={format.id}>
              {format.name}
            </span>
          ))}
        </div>
        <p className="synopsis">{movie.synopsis}</p>
        <div className="hero-actions">
          <Link className="btn primary" to={`/movies/${movie.slug}`}>
            <TicketIcon />
            Buy tickets
          </Link>
          <Link className="btn secondary" to="/sessions">
            All sessions
          </Link>
        </div>
      </div>
      <div className="hero-controls container">
        <div className="hero-progress">
          {movies.map((item, itemIndex) => (
            <button
              type="button"
              key={item.id}
              className={itemIndex === index ? "active" : ""}
              aria-label={`${item.title}, slide ${itemIndex + 1}`}
              aria-pressed={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
            >
              <span />
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" aria-label="Previous film" onClick={() => show(index - 1)}>
          ‹
        </button>
        <button type="button" className="icon-btn" aria-label="Next film" onClick={() => show(index + 1)}>
          ›
        </button>
      </div>
    </section>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.2V7l2 1.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.2 4.2h11.6v2.3a1.5 1.5 0 0 0 0 2.8v2.5H2.2V9.3a1.5 1.5 0 0 0 0-2.8V4.2Z"
      />
    </svg>
  );
}
