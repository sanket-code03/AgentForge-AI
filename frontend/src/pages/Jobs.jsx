import { useEffect, useState } from "react";
import api, { errMsg } from "../api";

const empty = { title: "", company: "", location: "", description: "" };

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [form, setForm] = useState(empty);
  const [results, setResults] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const me = localStorage.getItem("email");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = () => api.get("/jobs").then((r) => setJobs(r.data));
  useEffect(() => {
    load();
    api.get("/resumes").then((r) => { setResumes(r.data); if (r.data[0]) setResumeId(r.data[0].id); });
  }, []);

  const addJob = async (e) => {
    e.preventDefault();
    try { await api.post("/jobs", form); setForm(empty); load(); }
    catch (err) { setError(errMsg(err)); }
  };

  const match = async (id) => {
    if (!resumeId) return setError("Upload a resume on the Resumes page first.");
    setError(""); setBusyId(id);
    try {
      const { data } = await api.post(`/jobs/${id}/match`, null, { params: { resumeId } });
      setResults((p) => ({ ...p, [id]: data }));
    } catch (err) { setError(errMsg(err)); }
    setBusyId(null);
  };

  const remove = async (id) => { await api.delete(`/jobs/${id}`); load(); };

  return (
    <>
      <form className="card" onSubmit={addJob}>
        <h2>Post a new job</h2>
        <div className="grid">
          <input placeholder="Job title" value={form.title} onChange={set("title")} required />
          <input placeholder="Company" value={form.company} onChange={set("company")} required />
          <input placeholder="Location" value={form.location} onChange={set("location")} />
        </div>
        <textarea rows={4} placeholder="Job description / requirements" value={form.description} onChange={set("description")} required />
        <button>Post job</button>
      </form>

      <div className="card row">
        <b>Match against resume:</b>
        <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
          {resumes.map((r) => <option key={r.id} value={r.id}>{r.fileName} ({r.score}/100)</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}

      {jobs.map((j) => {
        const m = results[j.id];
        return (
          <div className="card" key={j.id}>
            <div className="row">
              <div>
                <b>{j.title}</b> — {j.company} <span className="muted">{j.location}</span>
              </div>
              <div>
                <button onClick={() => match(j.id)} disabled={busyId === j.id}>
                  {busyId === j.id ? "Matching..." : "AI Match"}
                </button>
                {j.postedBy === me && <button className="ghost danger" onClick={() => remove(j.id)}>Delete</button>}
              </div>
            </div>
            <p className="desc">{j.description}</p>
            {m && (
              <div className="analysis">
                <div className="score">{m.matchScore}<small>% match</small></div>
                <p>{m.verdict}</p>
                <div className="chips">
                  {m.matchedSkills?.map((s, i) => <span key={i} className="chip ok">{s}</span>)}
                  {m.missingSkills?.map((s, i) => <span key={i} className="chip bad">{s}</span>)}
                </div>
                <ul>{m.tips?.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </div>
        );
      })}
      {!jobs.length && <p className="muted">No jobs yet. Post one above.</p>}
    </>
  );
}