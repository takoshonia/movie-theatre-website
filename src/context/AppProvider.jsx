import { createContext, useContext, useEffect, useState } from "react";
import { get, getToken, post, setToken } from "../api/client";

const AppContext = createContext(null);

export function AppProvider({ children }) { // AppProvider is a component that provides the context object to the children components
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [filterOptions, setFilterOptions] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {// useEffect is a hook that runs when the component mounts
    let cancelled = false;

    async function boot() {
      try {
        const options = await get("/filter-options");
        if (cancelled) return;
        setFilterOptions(options);

        const storedToken = getToken();
        setTokenState(storedToken);

        if (!storedToken) {
          setUser(null);
          return;
        }

        try {// skipSessionExpired is true because we don't want to notify session expired when checking if the user is logged in
          const me = await get("/me", { skipSessionExpired: true });
          if (!cancelled) setUser(me);
        } catch (requestError) {
          if (requestError.status === 401) {
            setToken(null);
            if (!cancelled) {
              setTokenState(null);
              setUser(null);
            }
            return;
          }
          throw requestError;
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Could not load the app");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const result = await post("/login", { email, password }, { isLogin: true });
    setToken(result.token);
    setTokenState(result.token);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    try {
      await post("/logout");
    } finally {
      setToken(null);
      setTokenState(null);
      setUser(null);
    }
  }

  const value = { // value is the context object that is passed to the children components
    user,
    token,
    filterOptions,
    ready,
    error,
    login,
    logout,
    setUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() { // useApp is a hook that returns the context object
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
