import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { post } from "../api/client";
import { useApp } from "../context/AppProvider";

function releaseLabel(value) {
  if (!value) return "Coming soon";
  const [year, month, day] = value.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return `Coming soon · ${label}`;
}

export function NowPlayingCard({ movie }) {
  const { user, requireUser } = useApp();
  const navigate = useNavigate();
  const genres = movie.genres?.map((genre) => genre.name).join(" · ");

  function buy(event) {
    if (user) return;
    event.preventDefault();
    requireUser().then((nextUser) => {
      if (nextUser) navigate(`/movies/${movie.slug}`);
    });
  }

  return (
    <article className="movie-card">
      <Link className="poster-link" to={`/movies/${movie.slug}`}>
        <img src={movie.posterUrl} alt={movie.title} />
      </Link>
      <div className="card-content">
        <Link to={`/movies/${movie.slug}`}>
          <h3>{movie.title}</h3>
        </Link>
        <div className="muted small">
          {genres ? `${genres} · ` : ""}
          {movie.runtimeMinutes} min
        </div>
        <span className="age" title={movie.ageRating?.description}>
          {movie.ageRating?.code}
        </span>
        <div className="card-bottom">
          <span>From {movie.fromPrice} ₾</span>
          <Link className="btn primary" to={`/movies/${movie.slug}`} onClick={buy}>
            <TicketIcon />
            Buy ticket
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ComingSoonCard({ movie }) {
  const { requireUser } = useApp();
  const [done, setDone] = useState(Boolean(movie.isNotified));
  const [pending, setPending] = useState(false);
  const genres = movie.genres?.map((genre) => genre.name).join(" · ");

  async function notify() {
    const nextUser = await requireUser();
    if (!nextUser) return;
    setPending(true);
    try {
      await post(`/movies/${movie.slug}/notify`);
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="movie-card coming-card">
      <Link className="poster-link" to={`/movies/${movie.slug}`}>
        <img src={movie.posterUrl} alt={movie.title} />
      </Link>
      <div className="card-content">
        <span className="eyebrow">{releaseLabel(movie.releaseDate)}</span>
        <Link to={`/movies/${movie.slug}`}>
          <h3>{movie.title}</h3>
        </Link>
        <div className="muted small">
          {genres ? `${genres} · ` : ""}
          {movie.runtimeMinutes} min
        </div>
        <span className="age" title={movie.ageRating?.description}>
          {movie.ageRating?.code}
        </span>
        <div className="card-bottom">
          <button type="button" className="btn secondary" disabled={done || pending} onClick={notify}>
            {done ? "Subscribed" : "Notify me"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path fill="currentColor" d="M2 3.5h10v2.1a1.4 1.4 0 0 0 0 2.8V11H2V8.4a1.4 1.4 0 0 0 0-2.8V3.5Z" />
    </svg>
  );
}
