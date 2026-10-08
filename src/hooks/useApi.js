import { useEffect, useState } from "react";
import { get } from "../api/client";

export function useApi(path) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    get(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message || "Could not load this section");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  function retry() {
    setAttempt((value) => value + 1);
  }

  return { data, status, error, retry };
}
