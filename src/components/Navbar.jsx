import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppProvider";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.2 10.2 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ onLogin, onSignUp }) {
  const { user } = useApp();

  return (
    <header className="navbar">
      <div className="navbar-start">
        <NavLink to="/" className="brand">
          Kino <span>XII</span>
        </NavLink>
        <nav className="navbar-links">
          <NavLink to="/sessions">Sessions</NavLink>
        </nav>
      </div>
      <form className="navbar-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <SearchIcon />
        <input type="search" placeholder="Search films and live events" aria-label="Search films and live events" />
      </form>
      <div className="navbar-auth">
        {user ? (
          <NavLink to="/profile" className="profile-link">
            <span className="avatar">{(user.username || user.email || "?").slice(0, 1)}</span>
            <span>{user.username || user.email}</span>
            <span
              className={user.profileComplete ? "dot dot-complete" : "dot dot-incomplete"}
              aria-label={user.profileComplete ? "Profile complete" : "Profile incomplete"}
            />
          </NavLink>
        ) : (
          <>
            <button type="button" className="pill pill-solid" onClick={onSignUp}>
              Sign up
            </button>
            <button type="button" className="pill pill-ghost" onClick={onLogin}>
              Log in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
