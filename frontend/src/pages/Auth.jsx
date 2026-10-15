import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api";

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);
      localStorage.setItem("email", data.email);
      nav("/");
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>{isLogin ? "Login" : "Create an account"}</h2>
      {!isLogin && <input placeholder="Full name" value={form.name} onChange={set("name")} required />}
      <input type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
      <input type="password" placeholder="Password (min 6)" value={form.password} onChange={set("password")} required minLength={6} />
      {error && <p className="error">{error}</p>}
      <button>{isLogin ? "Login" : "Register"}</button>
      <p className="muted">
        {isLogin ? <>Don't have an account? <Link to="/register">Register</Link></> : <>Already have an account? <Link to="/login">Login</Link></>}
      </p>
    </form>
  );
}
