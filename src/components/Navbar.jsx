import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppProvider";

export default function Navbar() {
  const { user, logout, openAuth } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);

  return (
    <header className={`site-header ${location.pathname === "/" ? "over-hero" : ""}`}>
      <div className="header-inner">
        <Link className="logo" to="/" aria-label="Kino XII home">
          KINO <span>XII</span>
        </Link>
        <NavLink className={({ isActive }) => (isActive ? "nav-link current" : "nav-link")} to="/sessions">
          Sessions
        </NavLink>
        <form
          className="header-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/sessions?search=${encodeURIComponent(search)}`);
          }}
        >
          <SearchIcon />
          <input
            aria-label="Search films"
            placeholder="Search for a film or event"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
              <CloseIcon />
            </button>
          ) : null}
        </form>
        {user ? (
          <div className="account-wrap">
            <button type="button" className="account-button" aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
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
