
import { useEffect, useState } from "react";
import api, { errMsg } from "../api";

const List = ({ title, items }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="ai-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
};

function Analysis({ json }) {
  let analysis;

  try {
    analysis = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return (
      <p className="error status-alert">
        Unable to display the analysis. Please try again.
      </p>
    );
  }

  if (!analysis) {
    return <p className="muted">No analysis is available.</p>;
  }

  return (
    <div className="analysis">
      <div className="analysis-overview">
        <div className="analysis-score-card">
          <span className="eyebrow">RESUME SCORE</span>
          <div className="score">
            {analysis.score ?? "—"}
            <small>/100</small>
          </div>
        </div>

        <div className="analysis-summary">
          <h3>AI Summary</h3>
          <p>{analysis.summary || "No summary available."}</p>
        </div>
      </div>

      {Array.isArray(analysis.skills) && analysis.skills.length > 0 && (
        <section className="ai-section">
          <h4>Detected Skills</h4>
          <div className="chips">
            {analysis.skills.map((skill, index) => (
              <span className="chip" key={index}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="analysis-grid">
        <List title="Strengths" items={analysis.strengths} />
        <List title="Areas to Improve" items={analysis.weaknesses} />
        <List title="Recommended Actions" items={analysis.suggestions} />
        <List title="Suitable Career Roles" items={analysis.suitableRoles} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/resumes");
      setResumes(Array.isArray(response.data) ? response.data : []);
      setError("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setNotice("");

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    setBusy(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/resumes", formData);
      await load();
      setOpen(response.data.id);
      setNotice("Resume uploaded successfully.");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const remove = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resume?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/resumes/${id}`);

      setResumes((current) =>
        current.filter((resume) => resume.id !== id)
      );

      if (open === id) {
        setOpen(null);
      }

      setNotice("Resume deleted successfully.");
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const averageScore = resumes.length
    ? Math.round(
        resumes.reduce(
          (total, resume) => total + (Number(resume.score) || 0),
          0
        ) / resumes.length
      )
    : 0;

  return (
    <div className="dashboard-page">
      {/* Dashboard heading */}
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR CAREER WORKSPACE</span>
          <h1>Resume Dashboard</h1>
          <p className="dashboard-subtitle">
            Understand your strengths, improve your resume, and discover
            your next career opportunity with AI-powered insights.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="dashboard-stats">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">📄</span>
            <span className="stat-label">TOTAL RESUMES</span>
          </div>

          <strong className="stat-value">
            {loading ? "—" : resumes.length}
          </strong>

          <p className="stat-description">Uploaded documents</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">📊</span>
            <span className="stat-label">AVERAGE SCORE</span>
          </div>

          <strong className="stat-value">
            {loading || !resumes.length ? "—" : averageScore}
            {!loading && resumes.length > 0 && (
              <span className="stat-suffix">/100</span>
            )}
          </strong>

          <p className="stat-description">
            Across your uploaded resumes
          </p>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">✨</span>
            <span className="stat-label">RESUME INSIGHTS</span>
          </div>

          <strong className="stat-value">
            {loading ? "—" : resumes.length}
          </strong>

          <p className="stat-description">Available resume reports</p>
        </article>
      </section>

      {/* Resume upload */}
      <section className="card upload-panel">
        <div className="panel-heading">
          <span className="eyebrow">AI-POWERED ANALYSIS</span>
          <h2>Analyze Your Resume</h2>
          <p className="muted">
            Upload your resume in PDF format to receive personalized
            feedback, skill insights, and career recommendations.
          </p>
        </div>

        <label className="upload-dropzone" htmlFor="resume-file">
          <span className="upload-icon" aria-hidden="true">
            ↑
          </span>

          <strong>
            {busy ? "Analyzing your resume..." : "Upload your resume"}
          </strong>

          <span className="upload-help">
            Choose a PDF file from your computer
          </span>

          <span className="upload-button">
            {busy ? "Please wait..." : "Browse Files"}
          </span>

          <span className="upload-format">PDF files only</span>

          <input
            id="resume-file"
            className="resume-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={upload}
            disabled={busy}
          />
        </label>

        {busy && (
          <p className="status-message" role="status">
            Your resume is being processed. Please wait...
          </p>
        )}

        {error && (
          <p className="error status-alert" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="success-message" role="status">
            {notice}
          </p>
        )}
      </section>

      {/* Uploaded resumes */}
      <section className="resume-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR DOCUMENTS</span>
            <h2>Uploaded Resumes</h2>
            <p className="muted">
              Manage your documents and review your AI-generated feedback.
            </p>
          </div>

          <span className="resume-count">
            {loading ? "Loading..." : `${resumes.length} resume(s)`}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Loading your resumes</h3>
            <p>Please wait while we retrieve your documents.</p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No resumes yet</h3>
            <p>
              Upload your first resume to receive AI-powered feedback,
              discover your strengths, and explore suitable career roles.
            </p>
          </div>
        ) : (
          <div className="resume-list">
            {resumes.map((resume) => (
              <article className="resume-card" key={resume.id}>
                <div className="resume-card-top">
                  <div className="file-icon">PDF</div>

                  <div className="resume-file-details">
                    <h3>{resume.fileName || "Untitled resume"}</h3>

                    <p>
                      Uploaded{" "}
                      {resume.createdAt
                        ? new Date(resume.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "Date unavailable"}
                    </p>
                  </div>

                  <div className="resume-score-pill">
                    <span>Score</span>
                    <strong>
                      {resume.score ?? "—"}
                      <small>/100</small>
                    </strong>
                  </div>
                </div>

                <div className="resume-card-actions">
                  <button
                    type="button"
                    className="ghost"
                    aria-expanded={open === resume.id}
                    onClick={() =>
                      setOpen(open === resume.id ? null : resume.id)
                    }
                  >
                    {open === resume.id ? "Hide Analysis" : "View Analysis"}
                  </button>

                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => remove(resume.id)}
                  >
                    Delete
                  </button>
                </div>

                {open === resume.id && (
                  <Analysis json={resume.analysis} />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
