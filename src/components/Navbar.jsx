import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppProvider";

export default function Navbar({ onLogin, onSignUp }) {
  const { user } = useApp();

  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        Kino XII
      </NavLink>
      <nav className="navbar-links">
        <NavLink to="/sessions">Sessions</NavLink>
      </nav>
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
            <button type="button" className="pill pill-ghost" onClick={onLogin}>
              Log in
            </button>
            <button type="button" className="pill pill-solid" onClick={onSignUp}>
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
}
