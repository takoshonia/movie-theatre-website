import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function formatPremiere(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
}

export default function Hero({ movies }) {
  const [index, setIndex] = useState(0);
  const movie = movies[index];

  useEffect(() => {
    if (movies.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % movies.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movie) return <p className="empty-copy">No featured films right now.</p>;

  function show(nextIndex) {
    const total = movies.length;
    setIndex((nextIndex + total) % total);
  }

  return (
    <section className="hero" aria-label="Featured films">
      <div className="hero-stage" key={movie.id}>
        <img className="hero-backdrop" src={movie.backdropUrl || movie.posterUrl} alt="" />
        <div className="hero-copy">
          {movie.releaseDate ? (
            <p className="eyebrow">Premiere · {formatPremiere(movie.releaseDate)}</p>
          ) : null}
          <h1>{movie.title}</h1>
          <p className="hero-meta">
            <span className="chip" title={movie.ageRating?.description}>
              {movie.ageRating?.code}
            </span>
            <span className="chip">{movie.runtimeMinutes} Min</span>
            {movie.formats?.slice(0, 2).map((format) => (
              <span className="chip" key={format.id}>
                {format.name}
              </span>
            ))}
          </p>
          <p className="hero-synopsis">{movie.synopsis}</p>
          <div className="hero-actions">
            <Link className="pill pill-solid" to={`/movies/${movie.slug}`}>
              Buy tickets
            </Link>
            <Link className="pill pill-muted" to="/sessions">
              All sessions
            </Link>
          </div>
        </div>
        <div className="hero-progress">
          {movies.map((item, itemIndex) => (
            <button
              type="button"
              key={item.id}
              className={itemIndex === index ? "progress-segment is-active" : "progress-segment"}
              aria-label={item.title}
              onClick={() => setIndex(itemIndex)}
            />
          ))}
          <button type="button" className="hero-arrow" aria-label="Previous film" onClick={() => show(index - 1)}>
            ‹
          </button>
          <button type="button" className="hero-arrow" aria-label="Next film" onClick={() => show(index + 1)}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
