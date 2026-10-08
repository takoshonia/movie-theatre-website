import { useState } from "react";
import { Link } from "react-router-dom";
import { post } from "../api/client";
import { useApp } from "../context/AppProvider";
import { openLogin } from "../lib/authDialog";

function Poster({ movie }) {
  if (!movie.posterUrl) return <div className="poster poster-empty" />;
  return <img className="poster" src={movie.posterUrl} alt="" />;
}

export function NowPlayingCard({ movie }) {
  const genre = movie.genres?.[0]?.name;

  return (
    <article className="movie-card now-playing-card">
      <Poster movie={movie} />
      <div className="card-copy">
        <div className="card-title-block">
          <h3>{movie.title}</h3>
          <p className="card-genre">
            {genre ? `${genre} · ` : ""}
            {movie.runtimeMinutes} min
          </p>
        </div>
        <span className="card-age" title={movie.ageRating?.description}>
          {movie.ageRating?.code}
        </span>
      </div>
      <div className="card-buy-row">
        <p className="card-from">From ₾{movie.fromPrice}</p>
        <Link className="pill pill-solid card-buy" to={`/movies/${movie.slug}`}>
          <TicketIcon />
          Buy Ticket
        </Link>
      </div>
    </article>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 3.5h10v2.1a1.4 1.4 0 0 0 0 2.8V11H2V8.4a1.4 1.4 0 0 0 0-2.8V3.5Z"
      />
    </svg>
  );
}

export function ComingSoonCard({ movie }) {
  const { user } = useApp();
  const [done, setDone] = useState(Boolean(movie.isNotified));
  const [pending, setPending] = useState(false);

  async function notify() {
    if (!user) {
      openLogin();
      return;
    }
    setPending(true);
    try {
      await post(`/movies/${movie.slug}/notify`);
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  const genre = movie.genres?.[0]?.name;

  return (
    <article className="soon-card">
      <Poster movie={movie} />
      <div className="soon-copy">
        <div className="soon-details">
          <p className="soon-date">{formatInCinemas(movie.releaseDate)}</p>
          <div className="soon-title-block">
            <h3>
              <Link to={`/movies/${movie.slug}`}>{movie.title}</Link>
            </h3>
            <p className="soon-genre">
              {genre ? `${genre} · ` : ""}
              {movie.runtimeMinutes} min
            </p>
          </div>
          <span className="soon-age" title={movie.ageRating?.description}>
            {movie.ageRating?.code}
          </span>
        </div>
        <button type="button" className="soon-notify" disabled={done || pending} onClick={notify}>
          <BellIcon />
          {done ? "Subscribed" : "Notify Me"}
        </button>
      </div>
    </article>
  );
}

function formatInCinemas(value) {
  if (!value) return "In cinemas";
  const [year, month, day] = value.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return `In cinemas ${label}`;
}

function BellIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 1.2a3.2 3.2 0 0 0-3.2 3.2v1.4c0 .5-.2 1-.5 1.4L2.4 8.4A1 1 0 0 0 3.2 10h7.6a1 1 0 0 0 .8-1.6L10.7 7.2c-.3-.4-.5-.9-.5-1.4V4.4A3.2 3.2 0 0 0 7 1.2Zm0 11a1.6 1.6 0 0 0 1.5-1H5.5A1.6 1.6 0 0 0 7 12.2Z"
      />
    </svg>
  );
}

export function RecentCard({ movie }) {
  return (
    <article className="movie-card movie-card-small">
      <Link to={`/movies/${movie.slug}`}>
        <Poster movie={movie} />
        <h3>{movie.title}</h3>
      </Link>
    </article>
  );
}
