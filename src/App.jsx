import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import AuthModal from "./components/AuthModal";
import Modal from "./components/Modal";
import Navbar from "./components/Navbar";
import ProfileForm from "./components/ProfileForm";
import { useApp } from "./context/AppProvider";
import { setAuthOpener } from "./lib/authDialog";
import HomePage from "./pages/HomePage";
import MoviePage from "./pages/MoviePage";
import ProfilePage from "./pages/ProfilePage";
import SessionsPage from "./pages/SessionsPage";

export default function App() {
  const { openAuth, profileOpen, closeProfile, notice, setNotice } = useApp();

  useEffect(() => {
    setAuthOpener(openAuth);
  }, [openAuth]);

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/movies/:slug" element={<MoviePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="*"
            element={
              <div className="container not-found">
                <h1>Page not found</h1>
                <Link className="btn primary" to="/">
                  Back to home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer container">
        <Link to="/" className="logo">
          KINO <span>XII</span>
        </Link>
        <span>© {new Date().getFullYear()} KINO XII · It&apos;s cinema time</span>
      </footer>
      <AuthModal />
      {profileOpen ? (
        <Modal open title="Complete your profile" onClose={closeProfile}>
          <ProfileForm />
        </Modal>
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
