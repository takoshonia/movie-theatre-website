import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { get, getToken, onSessionExpired, post, setToken } from "../api/client";

const AppContext = createContext(null);

export function AppProvider({ children }) { // AppProvider is a component that provides the context object to the children components
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [filterOptions, setFilterOptions] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const userRef = useRef(null);
  const waiters = useRef([]);
  const profileWaiters = useRef([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  function finishAuth(result) {
    setToken(result.token);
    setTokenState(result.token);
    userRef.current = result.user;
    setUser(result.user);
    setAuthMode(null);
    waiters.current.splice(0).forEach((resolve) => resolve(result.user));
  }

  async function login(email, password) {
    const result = await post("/login", { email, password }, { isLogin: true, anonymous: true });
    finishAuth(result);
    return result.user;
  }

  async function register(fields, avatarFile) {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => body.append(key, value));
    if (avatarFile) body.append("avatar", avatarFile);
    const result = await post("/register", body, { anonymous: true });
    finishAuth(result);
    return result.user;
  }

  async function logout() {
    try {
      await post("/logout");
    } finally {
      setToken(null);
      setTokenState(null);
      userRef.current = null;
      setUser(null);
      setAuthMode(null);
      setProfileOpen(false);
      profileWaiters.current.splice(0).forEach((resolve) => resolve(null));
    }
  }

  function profileSaved(nextUser) {
    userRef.current = nextUser;
    setUser(nextUser);
    setNotice("Changes saved");
    if (nextUser.profileComplete) {
      setProfileOpen(false);
      profileWaiters.current.splice(0).forEach((resolve) => resolve(nextUser));
    }
  }

  function closeProfile() {
    setProfileOpen(false);
    profileWaiters.current.splice(0).forEach((resolve) => resolve(null));
  }

  const openAuth = useCallback((mode = "login") => {
    setAuthMode(mode === "signup" ? "signup" : "login");
  }, []);

  const closeAuth = useCallback(() => {
    setAuthMode(null);
    waiters.current.splice(0).forEach((resolve) => resolve(null));
  }, []);

  const requireUser = useCallback(() => {
    if (userRef.current) return Promise.resolve(userRef.current);
    setAuthMode("login");
    return new Promise((resolve) => {
      waiters.current.push(resolve);
    });
  }, []);

  const requireProfile = useCallback(() => {
    function askForProfile() {
      setNotice("Complete your profile to buy a ticket.");
      setProfileOpen(true);
      return new Promise((resolve) => {
        profileWaiters.current.push(resolve);
      });
    }

    if (userRef.current?.profileComplete) return Promise.resolve(userRef.current);
    if (userRef.current) return askForProfile();

    return requireUser().then((nextUser) => {
      if (!nextUser) return null;
      if (nextUser.profileComplete) return nextUser;
      return askForProfile();
    });
  }, [requireUser]);

  useEffect(() => {
    return onSessionExpired(() => {
      setToken(null);
      setTokenState(null);
      userRef.current = null;
      setUser(null);
      setAuthMode("login");
      setProfileOpen(false);
      profileWaiters.current.splice(0).forEach((resolve) => resolve(null));
    });
  }, []);

  const value = { // value is the context object that is passed to the children components
    user,
    token,
    filterOptions,
    ready,
    error,
    authMode,
    login,
    register,
    logout,
    openAuth,
    closeAuth,
    requireUser,
    requireProfile,
    profileOpen,
    closeProfile,
    profileSaved,
    notice,
    setNotice,
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
