import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { get } from "../api/client";
import { rememberMovie } from "../lib/recentlyViewed";

export default function MoviePage() {
  const { slug } = useParams();
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
    </section>
  );
}
