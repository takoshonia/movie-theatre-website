import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { get } from "../api/client";
import { useApp } from "../context/AppProvider";

export default function Navbar() {
  const { user, logout, openAuth } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchWrap = useRef(null);

  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      get(`/search?q=${encodeURIComponent(query)}`)
        .then((data) => {
          const list = Array.isArray(data) ? data.slice(0, 6) : [];
          setResults(list);
          setOpen(true);
        })
        .catch(() => {
          setResults([]);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!searchWrap.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function goToSessions(event) {
    event.preventDefault();
    const query = search.trim();
    setOpen(false);
    navigate(query ? `/sessions?search=${encodeURIComponent(query)}` : "/sessions");
  }

  return (
    <header className={`site-header ${location.pathname === "/" ? "over-hero" : ""}`}>
      <div className="header-inner">
        <Link className="logo" to="/" aria-label="Kino XII home">
          KINO <span>XII</span>
        </Link>
        <NavLink className={({ isActive }) => (isActive ? "nav-link current" : "nav-link")} to="/sessions">
          Sessions
        </NavLink>
        <form className="header-search" ref={searchWrap} onSubmit={goToSessions}>
          <SearchIcon />
          <input
            aria-label="Search films"
            aria-expanded={open}
            aria-controls="header-search-results"
            placeholder="Search for a film or event"
            value={search}
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => {
              if (search.trim()) setOpen(true);
            }}
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setResults([]);
                setOpen(false);
              }}
            >
              <CloseIcon />
            </button>
          ) : null}
          {open && search.trim() ? (
            <div id="header-search-results" className="header-search-results" role="listbox">
              {loading ? <p className="header-search-empty">Searching…</p> : null}
              {!loading && results.length === 0 ? <p className="header-search-empty">No titles found</p> : null}
              {!loading
                ? results.map((movie) => (
                    <Link
                      key={movie.id}
                      role="option"
                      className="header-search-item"
                      to={`/movies/${movie.slug}`}
                      onClick={() => {
                        setOpen(false);
                        setSearch("");
                        setResults([]);
                      }}
                    >
                      {movie.posterUrl ? <img src={movie.posterUrl} alt="" /> : <span className="header-search-poster" />}
                      <span>
                        <strong>{movie.title}</strong>
                        <small>
                          {[movie.ageRating?.code, movie.kind === "event" ? "Event" : "Film"].filter(Boolean).join(" · ")}
                        </small>
                      </span>
                    </Link>
                  ))
                : null}
            </div>
          ) : null}
        </form>
        {user ? (
          <div className="account-wrap">
            <button type="button" className="account-button" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
              <span className="avatar small-avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : <UserIcon />}
              </span>
              <span>{user.fullName || user.username}</span>
              <span className={user.profileComplete ? "status-dot complete" : "status-dot"} />
              <Chevron />
            </button>
            {menu ? (
              <>
                <button type="button" className="menu-dismiss" aria-label="Close menu" onClick={() => setMenu(false)} />
                <div className="account-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      navigate("/profile");
                    }}
                  >
                    <UserIcon />
                    My profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      navigate("/profile?tab=tickets");
                    }}
                  >
                    <TicketIcon />
                    My tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      logout();
                    }}
                  >
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="auth-buttons">
            <button type="button" className="btn primary" onClick={() => openAuth("signup")}>
              Sign up
            </button>
            <button type="button" className="btn light" onClick={() => openAuth("login")}>
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.2 10.2 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 5.2 7 9l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 13.2a4.8 4.8 0 0 1 9.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        d="M2.5 4.5h11v2.2a1.4 1.4 0 0 0 0 2.6v2.2h-11V9.3a1.4 1.4 0 0 0 0-2.6V4.5Z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.5 3.5H3.8v9h2.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 8h6M10.5 5.5 13 8l-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
