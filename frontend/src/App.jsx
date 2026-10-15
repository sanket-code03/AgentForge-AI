
import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Jobs from "./pages/Jobs.jsx";

const loggedIn = () => !!localStorage.getItem("token");

const Private = ({ children }) =>
  loggedIn() ? children : <Navigate to="/login" />;

export default function App() {
  const nav = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("jobai-theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );

    localStorage.setItem("jobai-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const logout = () => {
    localStorage.clear();
    nav("/login");
  };

  return (
    <>
      <header className="nav">
        <b>🤖 JobAI</b>

        <nav>
          {loggedIn() && (
            <>
              <Link to="/">Resumes</Link>
              <Link to="/jobs">Jobs</Link>
              <span className="muted">
                {localStorage.getItem("name")}
              </span>
            </>
          )}

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode((previous) => !previous)}
            aria-label="Switch color theme"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          {loggedIn() && (
            <button className="ghost" onClick={logout}>
              Logout
            </button>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route
            path="/"
            element={
              <Private>
                <Dashboard />
              </Private>
            }
          />
          <Route
            path="/jobs"
            element={
              <Private>
                <Jobs />
              </Private>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
