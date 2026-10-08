import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Modal from "./components/Modal";
import Navbar from "./components/Navbar";
import { setAuthOpener } from "./lib/authDialog";
import HomePage from "./pages/HomePage";
import MoviePage from "./pages/MoviePage";
import ProfilePage from "./pages/ProfilePage";
import SessionsPage from "./pages/SessionsPage";
import "./App.css";

export default function App() {
  const [authDialog, setAuthDialog] = useState(null);

  useEffect(() => {
    setAuthOpener(setAuthDialog);
  }, []);

  return (
    <div className="page">
      <Navbar
        onLogin={() => setAuthDialog("login")}
        onSignUp={() => setAuthDialog("signup")}
      />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/movies/:slug" element={<MoviePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <Modal
        open={authDialog !== null}
        title={authDialog === "signup" ? "Sign Up" : "Log In"}
        onClose={() => setAuthDialog(null)}
      >
        <p>
          {authDialog === "signup"
            ? "The sign up form will go here."
            : "The log in form will go here."}
        </p>
      </Modal>
    </div>
  );
}
