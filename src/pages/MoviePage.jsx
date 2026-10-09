import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { get } from "../api/client";
import Modal from "../components/Modal";
import { rememberMovie } from "../lib/recentlyViewed";

export default function MoviePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const session = location.state?.session;
  const [seatsOpen, setSeatsOpen] = useState(Boolean(sessionId));
  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    get(`/movies/${slug}`)
      .then((result) => {
        if (cancelled) return;
        rememberMovie(result);
        setMovie(result);
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
    setSeatsOpen(Boolean(sessionId));
  }, [sessionId]);

  function closeSeats() {
    setSeatsOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete("session");
    setSearchParams(next, { replace: true });
  }

  if (status === "loading") return <p className="page-message">Loading...</p>;
  if (status === "error") {
    return (
      <section className="page-message">
        <p>{error}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="page-message">
      <h1>{movie.title}</h1>
      <p>Film details will go here.</p>
      <Modal open={seatsOpen} title="Select seats" onClose={closeSeats}>
        {session ? (
          <p>
            {session.time} · {session.venue?.name}
            {session.hall?.name ? ` · Hall ${session.hall.name}` : ""} · ₾{session.price}
          </p>
        ) : (
          <p>Choose seats for this showing.</p>
        )}
      </Modal>
    </section>
  );
}
