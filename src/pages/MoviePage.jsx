import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { get, post } from "../api/client";
import Modal from "../components/Modal";
import SectionState from "../components/SectionState";
import { useApp } from "../context/AppProvider";
import { rememberMovie } from "../lib/recentlyViewed";

const SESSION_KEY = "selectedSessionId";

function todayIso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function nextDates(count = 7) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  });
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateParts(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function releaseLabel(value) {
  if (!value) return "Not available";
  return dateParts(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MoviePage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, requireUser, requireProfile, setNotice } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const dateParam = searchParams.get("date");
  const date = isIsoDate(dateParam) ? dateParam : todayIso();
  const dates = nextDates(7);

  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [groups, setGroups] = useState([]);
  const [sessionsStatus, setSessionsStatus] = useState("loading");
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsAttempt, setSessionsAttempt] = useState(0);
  const [picked, setPicked] = useState(location.state?.session ?? null);
  const [notified, setNotified] = useState(false);
  const [notifyPending, setNotifyPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    setMovie(null);

    get(`/movies/${slug}`)
      .then((result) => {
        if (cancelled) return;
        rememberMovie(result);
        setMovie(result);
        setNotified(Boolean(result.isNotified));
        setStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message || "Could not load this film");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  useEffect(() => {
    if (!movie || movie.isComingSoon) return undefined;
    let cancelled = false;
    setSessionsStatus("loading");
    setSessionsError("");

    get(`/movies/${slug}/sessions?date=${date}`)
      .then((result) => {
        if (cancelled) return;
        setGroups(result || []);
        setSessionsStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setGroups([]);
        setSessionsError(requestError.message || "Could not load sessions");
        setSessionsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [movie, slug, date, sessionsAttempt]);

  useEffect(() => {
    if (location.state?.session) setPicked(location.state.session);
  }, [location.state]);

  const listed = groups
    .flatMap((group) => group.sessions)
    .find((item) => String(item.id) === String(sessionId));
  const session =
    listed || (picked && String(picked.id) === String(sessionId) ? picked : null);
  const seatsOpen = Boolean(sessionId);
  const blocked =
    Boolean(user?.profileComplete) &&
    movie?.ageRating?.minAge >= 16 &&
    user.age < movie.ageRating.minAge;

  function closeSeats() {
    const next = new URLSearchParams(searchParams);
    next.delete("session");
    setSearchParams(next, { replace: true });
  }

  function selectDate(nextDate) {
    const next = new URLSearchParams(searchParams);
    next.set("date", nextDate);
    setSearchParams(next, { replace: true });
  }

  async function openSession(nextSession) {
    if (nextSession.isSoldOut || blocked) return;
    const nextUser = await requireProfile();
    if (!nextUser) return;
    if (movie?.ageRating?.minAge >= 16 && nextUser.age < movie.ageRating.minAge) {
      setNotice(`This film is only for ages ${movie.ageRating.minAge} and over.`);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, String(nextSession.id));
    setPicked(nextSession);
    const next = new URLSearchParams(searchParams);
    next.set("session", String(nextSession.id));
    if (!next.get("date")) next.set("date", date);
    navigate(`/movies/${slug}?${next.toString()}`, { state: { session: nextSession } });
  }

  async function notify() {
    const nextUser = await requireUser();
    if (!nextUser) return;
    setNotifyPending(true);
    try {
      await post(`/movies/${slug}/notify`);
      setNotified(true);
    } finally {
      setNotifyPending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="container page">
        <div className="skeleton" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container page">
        <div className="error-box">
          <p>{error}</p>
          <button type="button" className="btn secondary" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ageText = [movie.ageRating?.code, movie.ageRating?.description].filter(Boolean).join(" · ");

  return (
    <>
      <div
        className="movie-backdrop"
        style={{
          backgroundImage: `url("${movie.backdropUrl || movie.posterUrl}")`,
        }}
      />
      <div className="container movie-detail">
        <Link className="back-link" to="/sessions">
          <ArrowLeft />
          Back to sessions
        </Link>
        <section className="movie-intro">
          <img className="detail-poster" src={movie.posterUrl} alt={movie.title} />
          <div className="detail-text">
            <p className="eyebrow">{movie.isComingSoon ? "Coming soon" : "Now playing"}</p>
            <h1>{movie.title}</h1>
            <div className="meta">
              <span className="age" title={movie.ageRating?.description}>
                {movie.ageRating?.code}
              </span>
              <span>{movie.runtimeMinutes} min</span>
              {movie.formats?.map((format) => (
                <span className="badge" key={format.id}>
                  {format.name}
                </span>
              ))}
            </div>
            <p className="detail-synopsis">{movie.synopsis}</p>
            <dl>
              <div>
                <dt>Genre</dt>
                <dd>{movie.genres?.map((genre) => genre.name).join(" · ") || "Not available"}</dd>
              </div>
              <div>
                <dt>Director</dt>
                <dd>{movie.director || "Not available"}</dd>
              </div>
              <div>
                <dt>Cast</dt>
                <dd>{movie.cast || "Not available"}</dd>
              </div>
              <div>
                <dt>Release</dt>
                <dd>{releaseLabel(movie.releaseDate)}</dd>
              </div>
              <div>
                <dt>Age rating</dt>
                <dd>{ageText || "Not available"}</dd>
              </div>
            </dl>
            {movie.isComingSoon ? (
              <button type="button" className="btn primary" disabled={notified || notifyPending} onClick={notify}>
                <BellIcon />
                {notified ? "Subscribed" : "Notify me"}
              </button>
            ) : null}
          </div>
        </section>

        {movie.isComingSoon ? null : (
          <section className="movie-sessions">
            <h2>Choose a session</h2>
            <div className="dates">
              {dates.map((iso) => {
                const shown = dateParts(iso);
                return (
                  <button
                    type="button"
                    key={iso}
                    className={iso === date ? "active" : ""}
                    aria-pressed={iso === date}
                    onClick={() => selectDate(iso)}
                  >
                    <span>
                      {iso === todayIso()
                        ? "Today"
                        : shown.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <strong>{shown.getDate()}</strong>
                    <small>{shown.toLocaleDateString("en-GB", { month: "short" })}</small>
                  </button>
                );
              })}
            </div>
            {blocked ? (
              <p className="profile-status warning">
                This film is rated {movie.ageRating.minAge}+. Tickets cannot be bought with this
                account.
              </p>
            ) : null}
            <SectionState
              status={sessionsStatus}
              error={sessionsError}
              onRetry={() => setSessionsAttempt((value) => value + 1)}
              skeleton={<SessionsSkeleton />}
            >
              {groups.length ? (
                groups.map((group) => (
                  <article className="venue-group" key={group.venue.id}>
                    <h3>
                      {group.venue.name}
                      {group.venue.city ? <small>{group.venue.city}</small> : null}
                    </h3>
                    <div className="session-grid">
                      {group.sessions.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={item.isSoldOut || blocked ? "session-card disabled" : "session-card"}
                          disabled={item.isSoldOut || blocked}
                          onClick={() => openSession(item)}
                        >
                          <div className="session-top">
                            <strong>{item.time}</strong>
                            <span className="badge">{item.format?.name}</span>
                          </div>
                          <div className="session-middle">
                            <span>
                              {item.language?.code} · Hall {item.hall?.name}
                            </span>
                            <small className={item.isSoldOut ? "sold" : "available"}>
                              {item.isSoldOut ? "Sold out" : blocked ? "Age limit" : `${item.seatsLeft} seats`}
                            </small>
                          </div>
                          <div className="session-bottom">
                            <small>{item.venue?.name}</small>
                            {item.isSoldOut ? null : <strong>{item.price} ₾</strong>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty">No sessions on this date. Choose another day.</div>
              )}
            </SectionState>
          </section>
        )}
      </div>

      <Modal open={seatsOpen} title="Buy ticket" onClose={closeSeats}>
        {session ? (
          <div className="booking-header">
            <img src={movie.posterUrl} alt="" />
            <div>
              <h3>
                {movie.title} <span className="age">{movie.ageRating?.code}</span>
              </h3>
              <p>
                {session.venue?.name}
                {session.hall?.name ? ` · Hall ${session.hall.name}` : ""} · {session.time}
              </p>
              <small>
                {[session.format?.name, session.language?.name].filter(Boolean).join(" · ")} · {session.price} ₾
              </small>
            </div>
          </div>
        ) : (
          <p>Choose seats for this showing.</p>
        )}
      </Modal>
    </>
  );
}

function SessionsSkeleton() {
  return (
    <div className="skeleton" />
  );
}

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 3 5 8l5 5"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 1.2a3.2 3.2 0 0 0-3.2 3.2v1.4c0 .5-.2 1-.5 1.4L2.4 8.4A1 1 0 0 0 3.2 10h7.6a1 1 0 0 0 .8-1.6L10.7 7.2c-.3-.4-.5-.9-.5-1.4V4.4A3.2 3.2 0 0 0 7 1.2Zm0 11a1.6 1.6 0 0 0 1.5-1H5.5A1.6 1.6 0 0 0 7 12.2Z"
      />
    </svg>
  );
}
