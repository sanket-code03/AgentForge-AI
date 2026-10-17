import {
  ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState
} from 'react';
import './styles.css';
import {
  Activity, ArrowRight, ArrowUp, Bot, Check, ChevronDown, Copy,
  Download, FileText, Globe, History as HistoryIcon, LogOut, Menu,
  MessageSquare, Mic, Moon, Paperclip, Plus, Search, Settings,
  ShieldCheck, Sparkles, Sun, Workflow, X
} from 'lucide-react';
import * as api from './api';
import type { Task, User } from './api';

type AuthMode = 'login' | 'register';
type Theme = 'light' | 'dark';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  failed?: boolean;
  fileNames?: string[];
};

type Attachment = { name: string; text: string };

const MAX_FILES = 3;
const MAX_FILE_BYTES = 200_000;
const MAX_FILE_CHARS = 6000;
const TEXT_EXT =
  /\.(txt|md|json|csv|xml|html|css|js|jsx|ts|tsx|java|py|sql|yml|yaml|properties|log|c|cpp|go|rs|sh)$/i;

const SpeechRec: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : null;

function taskToMessages(t: Task): ChatMessage[] {
  return [
    { id: `u-${t.id}`, role: 'user', text: t.prompt },
    {
      id: `a-${t.id}`,
      role: 'assistant',
      text: t.output || t.error || 'No output saved for this task.',
      failed: t.status === 'FAILED'
    }
  ];
}

const THEME_KEY = 'agentforge-theme';

function readSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked */
  }
  return 'dark';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [page, setPage] = useState('Chat');
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notice, setNotice] = useState('');
  const [providerModel, setProviderModel] = useState('qwen2.5-coder:3b');

  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const [theme, setTheme] = useState<Theme>(readSavedTheme);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [listening, setListening] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input, page, user]);

  useEffect(() => {
    return () => recognitionRef.current?.stop?.();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  async function refresh() {
    try {
      const [profile, history, provider] = await Promise.all([
        api.me(),
        api.history(),
        api.provider()
      ]);

      setUser(profile);
      setTasks(history);
      setProviderModel(provider.model);

      if (!task && history.length) {
        setTask(history[0]);
      }
    } catch {
      api.logout();
      setUser(null);
    }
  }

  useEffect(() => {
    if (api.token()) void refresh();
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 720) {
        setMobileNav(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  function toggleSidebar() {
    if (window.innerWidth <= 720) {
      setMobileNav(value => !value);
    } else {
      setSidebarCollapsed(value => !value);
    }
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'register' && password !== confirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setAuthError('Use at least 8 characters for your password.');
      return;
    }

    setAuthBusy(true);

    try {
      const result = authMode === 'login'
        ? await api.login(email, password)
        : await api.register(name, email, password);

      setUser({ name: result.name, email: result.email });
      setPassword('');
      setConfirm('');
      await refresh();
    } catch (e) {
      setAuthError(
        e instanceof Error ? e.message : 'Authentication failed.'
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function openTask(item: Task) {
    setTask(item);
    setMessages(taskToMessages(item));
    setPage('Chat');
    setMobileNav(false);

    try {
      const full = await api.getTask(item.id);
      setTask(full);
      setMessages(taskToMessages(full));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load task.');
    }
  }

  async function deleteHistoryTask(id: number) {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.deleteTask(id);
      setTasks(old => old.filter(item => item.id !== id));

      if (task?.id === id) {
        setTask(null);
      }

      notify('Task deleted successfully.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete task.');
    }
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function newChat() {
    setMessages([]);
    setInput('');
    setAttachments([]);
    setPage('Chat');
    setMobileNav(false);
    window.setTimeout(() => textareaRef.current?.focus(), 30);
  }

  async function sendMessage(e?: FormEvent) {
    e?.preventDefault();

    const text = input.trim();
    if ((!text && !attachments.length) || busy) return;

    stopListening();

    const fileBlock = attachments
      .map(f => `\n\n--- Attached file: ${f.name} ---\n${f.text}`)
      .join('');
    const fullPrompt =
      (text || 'Please review the attached file(s).') + fileBlock;

    setMessages(old => [
      ...old,
      {
        id: uid(),
        role: 'user',
        text: text || 'Please review the attached file(s).',
        fileNames: attachments.map(f => f.name)
      }
    ]);
    setInput('');
    setAttachments([]);
    setBusy(true);

    try {
      const result = await api.createTask(fullPrompt);

      setTask(result);
      setTasks(old => [
        result,
        ...old.filter(item => item.id !== result.id)
      ]);
      setMessages(old => [
        ...old,
        {
          id: uid(),
          role: 'assistant',
          text: result.output || result.error || 'No response returned.',
          failed: result.status === 'FAILED'
        }
      ]);
    } catch (err) {
      setMessages(old => [
        ...old,
        {
          id: uid(),
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Could not reach backend.',
          failed: true
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void sendMessage();
    }
  }

  async function onFilesPicked(e: ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = '';

    const next: Attachment[] = [];

    for (const file of files) {
      if (attachments.length + next.length >= MAX_FILES) {
        notify(`You can attach up to ${MAX_FILES} files.`);
        break;
      }

      const readable = file.type.startsWith('text/') || TEXT_EXT.test(file.name);
      if (!readable) {
        notify(`${file.name}: only text and code files can be read.`);
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        notify(`${file.name} is too large (max 200 KB).`);
        continue;
      }

      let text = await file.text();
      if (text.length > MAX_FILE_CHARS) {
        text = text.slice(0, MAX_FILE_CHARS) + '\n…[file truncated]';
      }
      next.push({ name: file.name, text });
    }

    if (next.length) setAttachments(old => [...old, ...next]);
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
  }

  function toggleVoice() {
    if (!SpeechRec) {
      notify('Voice input is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = true;

    const base = input.trim() ? input.trim() + ' ' : '';

    rec.onresult = (ev: any) => {
      let transcript = '';
      for (let i = 0; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript;
      }
      setInput(base + transcript);
    };
    rec.onerror = (ev: any) => {
      notify(
        ev.error === 'not-allowed'
          ? 'Microphone permission was blocked.'
          : 'Voice input stopped.'
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function webSearch() {
    if (!input.trim()) {
      notify('Type something to search first.');
      return;
    }

    window.open(
      'https://www.google.com/search?q=' + encodeURIComponent(input.trim()),
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied.');
    } catch {
      notify('Clipboard access was blocked by browser.');
    }
  }

  function downloadText(text: string) {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' })
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `agentforge-${Date.now()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const nav = [
    { name: 'Chat', icon: MessageSquare },
    { name: 'Agent Workflow', icon: Workflow },
    { name: 'History', icon: HistoryIcon },
    { name: 'Settings', icon: Settings }
  ];

  const recent = tasks
    .filter(item =>
      item.prompt.toLowerCase().includes(historyFilter.trim().toLowerCase())
    )
    .slice(0, 30);

  const first = user ? user.name.split(' ')[0] : '';

  if (!user) {
    return (
      <section className="auth-screen">
        <div className="auth-brand">
          <div className="logo">A</div>
          <span>AgentForge <b>AI</b></span>
        </div>

        <form className="auth-glass" onSubmit={submitAuth}>
          <div className="eyebrow">PLAN. EXECUTE. REVIEW.</div>

          <h1>
            {authMode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h1>

          <p className="auth-lead">
            {authMode === 'login'
              ? 'Sign in to continue to your AI workspace.'
              : 'Set up your workspace and start building with AI agents.'}
          </p>

          {authError && (
            <div className="auth-error" role="alert">
              {authError}
            </div>
          )}

          {authMode === 'register' && (
            <label className="auth-field">
              <span>Full name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={100}
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>

            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                minLength={8}
                maxLength={72}
                required
              />

              <button
                type="button"
                className="show-pass"
                onClick={() => setShowPassword(value => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {authMode === 'register' && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Enter password again"
                minLength={8}
                maxLength={72}
                required
              />
            </label>
          )}

          {authMode === 'login' ? (
            <div className="auth-row">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <span className="muted-small">
                Password reset not configured
              </span>
            </div>
          ) : (
            <label className="terms">
              <input type="checkbox" required />
              I agree to use this local development app responsibly.
            </label>
          )}

          <button className="btn primary auth-submit" disabled={authBusy}>
            {authBusy
              ? 'Please wait…'
              : authMode === 'login'
                ? 'Sign in securely →'
                : 'Create account →'}
          </button>

          <div className="auth-divider">
            {authMode === 'login'
              ? 'NEW TO AGENTFORGE?'
              : 'ALREADY REGISTERED?'}
          </div>

          <p className="auth-switch">
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === 'login' ? 'register' : 'login'
                );
                setAuthError('');
              }}
            >
              {authMode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>

          <p className="auth-foot">
            Real backend authentication · BCrypt password hashing · Local AI ready
          </p>
        </form>
      </section>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-brand">
            <div className="logo">A</div>
            <span>AgentForge <b>AI</b></span>
          </div>
        </div>

        <div className="top-actions">
          <span className="online">
            <i /> <span className="online-text">Backend connected</span>
          </span>

          <button
            className="icon-button"
            type="button"
            title={
              theme === 'dark'
                ? 'Switch to light theme'
                : 'Switch to dark theme'
            }
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(value => (value === 'dark' ? 'light' : 'dark'))
            }
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="user-chip">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="user-name">{user.name}</span>
            <ChevronDown size={14} />
          </div>

          <button
            className="icon-button"
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => {
              api.logout();
              setUser(null);
              setTask(null);
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div
        className={[
          'layout',
          sidebarCollapsed ? 'sidebar-collapsed' : '',
          mobileNav ? 'mobile-nav-open' : ''
        ].filter(Boolean).join(' ')}
      >
        <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
          <button type="button" className="new-chat" onClick={newChat}>
            <Plus size={17} />
            New chat
          </button>

          <button
            type="button"
            className={`nav ${searchOpen ? 'active' : ''}`}
            onClick={() => {
              setSearchOpen(value => !value);
              setHistoryFilter('');
            }}
          >
            <Search size={17} />
            Search
          </button>

          {searchOpen && (
            <input
              className="side-search"
              autoFocus
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value)}
              placeholder="Search your chats…"
            />
          )}

          {nav.map(item => (
            <button
              key={item.name}
              type="button"
              className={`nav ${page === item.name ? 'active' : ''}`}
              onClick={() => {
                setPage(item.name);
                setMobileNav(false);
              }}
            >
              <item.icon size={17} />
              {item.name}
            </button>
          ))}

          <div className="recent-title">Recent chats</div>

          <div className="recent-list">
            {!recent.length ? (
              <p className="recent-empty">
                {historyFilter ? 'No matching chats.' : 'No chats yet.'}
              </p>
            ) : (
              recent.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`recent-item ${task?.id === item.id && page === 'Chat' ? 'active' : ''}`}
                  title={item.prompt}
                  onClick={() => void openTask(item)}
                >
                  {item.prompt}
                </button>
              ))
            )}
          </div>
        </aside>

        {mobileNav && (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}

        <main className={`main ${page === 'Chat' ? 'chat-main' : ''}`}>
          {page !== 'Chat' && (
            <div className="heading">
              <div>
                <h1>{page}</h1>
                <p>
                  {page === 'History'
                    ? 'Review your previously saved tasks.'
                    : page === 'Settings'
                      ? 'Your local AI provider and workspace settings.'
                      : 'See how the Planner, Worker and Reviewer agents ran your last task.'}
                </p>
              </div>

              <span className="pill">
                <span className="pill-dot" />
                Local AI workspace
              </span>
            </div>
          )}

          {page === 'Settings' ? (
            <div className="settings-grid">
              <section className="card">
                <div className="card-title">
                  <h2><Settings size={16} /> AI Provider</h2>
                  <span className="status done">Configured</span>
                </div>

                <div className="setting-line">
                  <span>Provider</span>
                  <b>Ollama · local</b>
                </div>

                <div className="setting-line">
                  <span>Model</span>
                  <b>{providerModel}</b>
                </div>

                <div className="setting-line">
                  <span>Endpoint</span>
                  <b>http://localhost:11434</b>
                </div>

                <p className="muted">
                  Set OLLAMA_BASE_URL and OLLAMA_MODEL in backend
                  environment variables and restart the backend.
                </p>

                <a href="https://ollama.com" target="_blank" rel="noreferrer">
                  Install Ollama ↗
                </a>
              </section>

              <section className="card">
                <div className="card-title">
                  <h2><ShieldCheck size={16} /> Security status</h2>
                </div>

                <p>
                  Passwords are hashed on the server with BCrypt.
                  APIs require a signed bearer token. Generated code
                  is not executed by this starter.
                </p>

                <p className="muted">
                  Before deployment, use HTTPS, rotate secrets,
                  add rate limits, and complete a security review.
                </p>
              </section>
            </div>
          ) : page === 'History' ? (
            <section className="card">
              <div className="card-title">
                <h2><HistoryIcon size={16} /> Task history</h2>
                <span className="sub">{tasks.length} tasks</span>
              </div>

              {!tasks.length ? (
                <div className="empty">
                  No tasks yet. Submit your first task from Dashboard.
                </div>
              ) : (
                <div className="history-list">
                  {tasks.map(item => (
                    <div key={item.id} className="history-item">
                      <button
                        type="button"
                        className="history-open"
                        onClick={() => void openTask(item)}
                      >
                        <span className="history-icon">
                          <FileText size={18} />
                        </span>

                        <span className="history-copy">
                          <b>{item.prompt}</b>
                          <small>
                            {new Date(item.createdAt).toLocaleString()}
                          </small>
                        </span>

                        <span
                          className={`status ${
                            item.status === 'COMPLETED'
                              ? 'done'
                              : item.status === 'FAILED'
                                ? 'failed'
                                : 'running'
                          }`}
                        >
                          {item.status}
                        </span>

                        <ArrowRight size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button danger-button"
                        title="Delete task"
                        aria-label={`Delete task ${item.id}`}
                        onClick={() => void deleteHistoryTask(item.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : page === 'Agent Workflow' ? (
            <div className="workflow-page">
              <section className="card">
                <div className="card-title">
                  <h2><Workflow size={16} /> Agent workflow</h2>
                  <span className="sub">
                    {task ? task.status : 'Ready when you are'}
                  </span>
                </div>

                <div className="workflow">
                  {[
                    {
                      title: 'Planner Agent',
                      desc: 'Breaks your goal into actionable steps.',
                      icon: Sparkles
                    },
                    {
                      title: 'Worker Agent',
                      desc: 'Uses the configured AI model to generate an answer.',
                      icon: Bot
                    },
                    {
                      title: 'Reviewer Agent',
                      desc: 'Reports output status and review limitations.',
                      icon: Check
                    }
                  ].map((agent, index) => (
                    <div
                      key={agent.title}
                      className={`agent ${
                        ['planner', 'worker', 'reviewer'][index]
                      } ${
                        busy
                          ? 'running'
                          : task?.status === 'COMPLETED'
                            ? 'done'
                            : task?.status === 'FAILED' && index === 1
                              ? 'failed'
                              : ''
                      }`}
                    >
                      <div className="agent-icon">
                        <agent.icon size={18} />
                      </div>

                      <h3>{agent.title}</h3>
                      <p>{agent.desc}</p>

                      <span
                        className={`status ${
                          busy && index === 1
                            ? 'running'
                            : task?.status === 'COMPLETED'
                              ? 'done'
                              : task?.status === 'FAILED' && index === 1
                                ? 'failed'
                                : ''
                        }`}
                      >
                        {busy
                          ? index === 0
                            ? 'Planning'
                            : index === 1
                              ? 'Generating'
                              : 'Waiting'
                          : task?.status === 'COMPLETED'
                            ? 'Completed'
                            : task?.status === 'FAILED' && index === 1
                              ? 'Failed'
                              : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="progress-head">
                  <span>
                    {busy
                      ? 'Waiting for local model response'
                      : task?.status === 'COMPLETED'
                        ? 'Task finished'
                        : task?.status === 'FAILED'
                          ? 'Task failed'
                          : 'Ready to start'}
                  </span>

                  <b>
                    {busy
                      ? '…'
                      : task?.status === 'COMPLETED'
                        ? '100%'
                        : task?.status === 'FAILED'
                          ? 'Failed'
                          : '0%'}
                  </b>
                </div>

                <div className="progress">
                  <div
                    style={{
                      width: busy
                        ? '55%'
                        : task?.status === 'COMPLETED'
                          ? '100%'
                          : '0%'
                    }}
                  />
                </div>
              </section>

              <section className="card activity-card">
                <div className="card-title">
                  <h2><Activity size={16} /> Agent activity</h2>
                  <span className="online"><i /> Connected</span>
                </div>

                <div className="activity-list">
                  {!task ? (
                    <div className="event">
                      <span className="event-icon">
                        <Sparkles size={15} />
                      </span>

                      <div>
                        <b>System ready</b>
                        <small>Now</small>
                        <p>Send a message to call the configured AI provider.</p>
                        <span className="status">Idle</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="event">
                        <span className="event-icon">
                          <Check size={15} />
                        </span>

                        <div>
                          <b>Task saved</b>
                          <small>
                            {new Date(task.createdAt).toLocaleTimeString()}
                          </small>
                          <p>Task was persisted in MySQL.</p>
                          <span className="status done">Completed</span>
                        </div>
                      </div>

                      <div className="event">
                        <span className="event-icon">
                          <Bot size={15} />
                        </span>

                        <div>
                          <b>Worker / Ollama</b>
                          <small>{providerModel}</small>
                          <p>
                            {task.status === 'COMPLETED'
                              ? 'Model returned a response.'
                              : task.error || 'Provider call did not complete.'}
                          </p>
                          <span
                            className={`status ${
                              task.status === 'COMPLETED' ? 'done' : 'failed'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <div className="event">
                        <span className="event-icon">
                          <ShieldCheck size={15} />
                        </span>

                        <div>
                          <b>Review status</b>
                          <small>Output check</small>
                          <p>
                            Verify factual claims manually; no web search
                            or code execution is claimed.
                          </p>
                          <span className="status review">
                            Manual verification
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card-title">
                  <h2><Activity size={16} /> Run metrics</h2>
                  <span className="sub">Your account</span>
                </div>

                <div className="metric-grid">
                  <div className="metric">
                    <span>Tasks saved</span>
                    <strong>{tasks.length}</strong>
                  </div>

                  <div className="metric">
                    <span>Completed</span>
                    <strong>
                      {tasks.filter(item => item.status === 'COMPLETED').length}
                    </strong>
                  </div>

                  <div className="metric">
                    <span>Failed</span>
                    <strong>
                      {tasks.filter(item => item.status === 'FAILED').length}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="chat">
              <div className="chat-scroll">
                <div className="chat-inner">
                  {!messages.length && !busy ? (
                    <div className="chat-empty">
                      <div className="logo big">A</div>
                      <h1>Hello {first}! 👋</h1>
                      <p>
                        Give your agents a goal, ask a question, or attach a
                        file.
                      </p>
                    </div>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`msg ${m.role}`}>
                        {m.role === 'assistant' && (
                          <div className="msg-avatar">
                            <Bot size={16} />
                          </div>
                        )}

                        <div className="msg-body">
                          {m.fileNames && m.fileNames.length > 0 && (
                            <div className="msg-files">
                              {m.fileNames.map(n => (
                                <span key={n} className="file-chip">
                                  <FileText size={12} /> {n}
                                </span>
                              ))}
                            </div>
                          )}

                          {m.role === 'assistant' ? (
                            <>
                              <pre
                                className={`output-text ${m.failed ? 'error' : ''}`}
                              >
                                {m.text}
                              </pre>

                              <div className="msg-actions">
                                <button
                                  type="button"
                                  className="msg-action"
                                  onClick={() => void copyText(m.text)}
                                >
                                  <Copy size={13} /> Copy
                                </button>

                                <button
                                  type="button"
                                  className="msg-action"
                                  onClick={() => downloadText(m.text)}
                                >
                                  <Download size={13} /> Download
                                </button>
                              </div>
                            </>
                          ) : (
                            <p>{m.text}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {busy && (
                    <div className="msg assistant">
                      <div className="msg-avatar">
                        <Bot size={16} />
                      </div>

                      <div className="msg-body">
                        <span className="typing">
                          <i /><i /><i />
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </div>

              <form className="composer" onSubmit={sendMessage}>
                {attachments.length > 0 && (
                  <div className="attach-row">
                    {attachments.map(f => (
                      <span key={f.name} className="file-chip">
                        <FileText size={12} /> {f.name}
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() =>
                            setAttachments(old =>
                              old.filter(item => item.name !== f.name)
                            )
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  id="task-prompt"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onComposerKey}
                  placeholder={
                    listening ? 'Listening…' : 'Write a message…'
                  }
                  rows={1}
                  maxLength={8000}
                />

                <div className="composer-bar">
                  <div className="composer-left">
                    <button
                      type="button"
                      className="icon-button ghost"
                      title="Attach text or code file"
                      aria-label="Attach file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={17} />
                    </button>

                    <button
                      type="button"
                      className="icon-button ghost"
                      title="Search the web with this text"
                      aria-label="Web search"
                      onClick={webSearch}
                    >
                      <Globe size={17} />
                    </button>

                    <span className="provider-pill">
                      Ollama · {providerModel}
                    </span>
                  </div>

                  <div className="composer-right">
                    <button
                      type="button"
                      className={`icon-button ghost ${listening ? 'listening' : ''}`}
                      title={listening ? 'Stop voice input' : 'Voice input'}
                      aria-label="Voice input"
                      onClick={toggleVoice}
                    >
                      <Mic size={17} />
                    </button>

                    <button
                      className="send-btn"
                      aria-label="Send message"
                      disabled={busy || (!input.trim() && !attachments.length)}
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept="text/*,.md,.json,.csv,.xml,.html,.css,.js,.jsx,.ts,.tsx,.java,.py,.sql,.yml,.yaml,.properties,.log,.c,.cpp,.go,.rs,.sh"
                  onChange={e => void onFilesPicked(e)}
                />
              </form>

              <p className="composer-note">
                AI can make mistakes. Please double-check responses.
              </p>
            </div>
          )}
        </main>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
