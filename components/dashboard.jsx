"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const initialPrefs = { enabled: false, email: "" };
const Icon = ({ name, size = 18 }) => {
  const paths = {
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    edit: <><path d="m16 4 4 4L9 19l-5 1 1-5L16 4Z"/><path d="m14 6 4 4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    drive: <><path d="m8.5 3-7 12 3.5 6h13l3.5-6-7-12h-6Z"/><path d="m8.5 3 7 12m-14 0h14m-10.5 6 7-12"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

function localDateTime(date = new Date(Date.now() + 86400000)) {
  const pad = (n) => String(n).padStart(2, "0");
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [captions, setCaptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [now, setNow] = useState(0);
  const [todayLabel, setTodayLabel] = useState("");
  const [posts, setPosts] = useState([]);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("All drafts");
  const [editing, setEditing] = useState(null);
  const when = (value, opts = {}) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(opts.year ? { year: "numeric" } : {}), ...(opts.time ? { hour: "numeric", minute: "2-digit" } : {}) }).format(new Date(value));

  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
    return result;
  };
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/api/posts");
      setConnected(data.connected);
      setPosts(data.posts || []);
      setPrefs(data.preferences || initialPrefs);
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      const defaults = localDateTime(new Date(current.getTime() + 86400000));
      setDate(defaults.date);
      setTime(defaults.time);
      setNow(current.getTime());
      setTodayLabel(when(current));
      const query = new URLSearchParams(window.location.search);
      if (query.has("connected")) { setNotice("Google Drive connected. Your drafts are ready to sync."); window.history.replaceState({}, "", "/"); }
      if (query.has("error")) { setError(query.get("error") === "google-config" ? "Google Drive isn’t configured yet. Add the OAuth environment variables to connect." : "Google Drive connection could not be completed. Please try again."); window.history.replaceState({}, "", "/"); }
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const visiblePosts = useMemo(() => {
    if (activeTab === "Upcoming") return posts.filter((post) => new Date(post.scheduledAt).getTime() >= now);
    if (activeTab === "Past") return posts.filter((post) => new Date(post.scheduledAt).getTime() < now);
    return posts;
  }, [activeTab, posts, now]);
  const upcoming = useMemo(() => [...posts].filter((post) => new Date(post.scheduledAt).getTime() >= now).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)), [posts, now]);
  async function generate() {
    if (!topic.trim()) return setError("Add a topic or idea first.");
    setGenerating(true); setError(""); setCaptions([]); setSelected(null);
    try { const result = await request("/api/generate", { method: "POST", body: JSON.stringify({ topic }) }); setCaptions(result.captions); }
    catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  }
  async function schedule() {
    if (!selected) return setError("Choose a caption to continue.");
    const scheduledAt = new Date(`${date}T${time}`);
    if (!date || !time || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return setError("Choose a valid date and time in the future.");
    setSaving(true); setError(""); setNotice("");
    try { const result = await request("/api/posts", { method: "POST", body: JSON.stringify({ ...selected, scheduledAt: scheduledAt.toISOString() }) }); setNotice(result.warning || "Your draft is on the calendar."); setSelected(null); setCaptions([]); setTopic(""); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function saveEdit() {
    if (!editing.caption.trim()) return setError("A caption cannot be empty.");
    try { await request(`/api/posts/${editing.id}`, { method: "PATCH", body: JSON.stringify({ caption: editing.caption, scheduledAt: editing.scheduledAt }) }); setEditing(null); setNotice("Draft updated."); await refresh(); }
    catch (e) { setError(e.message); }
  }
  async function removePost(post) {
    if (!window.confirm("Delete this scheduled draft?")) return;
    try { await request(`/api/posts/${post.id}`, { method: "DELETE" }); setNotice("Draft deleted."); await refresh(); }
    catch (e) { setError(e.message); }
  }
  async function savePrefs() {
    try { await request("/api/notifications", { method: "PUT", body: JSON.stringify(prefs) }); setNotice("Notification settings saved."); }
    catch (e) { setError(e.message); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark"><Icon name="spark" size={20}/></span><span>draftly<span className="brand-dot">.</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <a className="nav-link active" href="#create"><span className="nav-icon"><Icon name="plus"/></span>Create post</a>
        <a className="nav-link" href="#scheduled"><span className="nav-icon"><Icon name="calendar"/></span>Scheduled drafts<span className="nav-count">{posts.length}</span></a>
        <a className="nav-link" href="#settings"><span className="nav-icon"><Icon name="mail"/></span>Notifications</a>
      </nav>
      <div className="sidebar-bottom">
        <div className="drive-card">
          <div className="drive-top"><span className="drive-icon"><Icon name="drive" size={17}/></span><span className={`connection-dot ${connected ? "on" : ""}`}/></div>
          <p className="drive-title">Google Drive</p><p className="drive-copy">{connected ? "Drafts syncing" : "Connect to sync your drafts"}</p>
          {!connected && <a className="drive-connect" href="/api/auth/google">Connect Drive <Icon name="arrow" size={13}/></a>}
        </div>
        <div className="profile"><div className="avatar">D</div><div><p className="profile-name">My workspace</p><p className="profile-sub">Personal account</p></div><span className="profile-more">···</span></div>
      </div>
    </aside>

    <main className="main-area" id="top">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><span className="today-label"><Icon name="calendar" size={15}/>{todayLabel || "Today"}</span><span className="avatar small">D</span></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><p className="eyebrow">YOUR SOCIAL STUDIO</p><h1>Make room for good ideas.</h1><p className="welcome-sub">Write a little now. Show up consistently later.</p></div><div className="welcome-spark"><Icon name="spark" size={22}/></div></section>
        {(error || notice) && <div className={`toast ${error ? "error" : "success"}`} role="status"><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss"><Icon name="close" size={16}/></button></div>}

        <div className="dashboard-grid">
          <section className="panel composer-panel" id="create">
            <div className="section-heading"><div><div className="section-kicker"><span className="step-number">01</span><span>CREATE SOMETHING</span></div><h2>Start with an idea</h2><p className="section-description">A rough thought is plenty. We’ll help shape it.</p></div><span className="ai-pill"><Icon name="spark" size={13}/> AI ASSISTED</span></div>
            <label htmlFor="topic" className="field-label">What’s on your mind?</label>
            <textarea id="topic" className="topic-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. A behind-the-scenes look at how we make our products…" maxLength={600}/>
            <div className="textarea-footer"><span>Be as specific or as spontaneous as you like.</span><span>{topic.length}/600</span></div>
            <button className="button button-primary generate-button" onClick={generate} disabled={generating || !topic.trim()}>{generating ? <span className="spinner"/> : <Icon name="spark" size={16}/>} {generating ? "Finding the words…" : "Generate caption ideas"}<span className="button-arrow">↗</span></button>
            {captions.length > 0 && <div className="caption-results"><div className="results-header"><span>YOUR IDEAS</span><button onClick={generate} disabled={generating}>↻ Regenerate</button></div>{captions.map((item, i) => <article className={`caption-card ${selected === item ? "chosen" : ""}`} key={`${item.caption}-${i}`}><div className="caption-card-top"><span className="option-label">OPTION 0{i + 1}</span>{selected === item && <span className="selected-mark"><Icon name="check" size={13}/> SELECTED</span>}</div><p className="caption-copy">{item.caption}</p><div className="hashtags">{item.hashtags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className={`select-button ${selected === item ? "selected" : ""}`} onClick={() => setSelected(item)}>{selected === item ? <><Icon name="check" size={14}/> Selected</> : "Use this caption"}</button></article>)}</div>}
            {selected && <div className="schedule-box"><div className="section-kicker"><span className="step-number">02</span><span>PICK YOUR MOMENT</span></div><h3>Put it on the calendar</h3><div className="selected-preview"><p>{selected.caption}</p><div className="hashtags">{selected.hashtags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="datetime-fields"><label><span className="field-label">DATE</span><span className="input-wrap"><Icon name="calendar" size={15}/><input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></span></label><label><span className="field-label">TIME</span><span className="input-wrap"><Icon name="clock" size={15}/><input type="time" value={time} onChange={(e) => setTime(e.target.value)}/></span></label></div><button className="button button-primary schedule-button" onClick={schedule} disabled={saving}>{saving ? <span className="spinner"/> : <Icon name="calendar" size={16}/>} {saving ? "Saving your draft…" : "Schedule this draft"}<Icon name="arrow" size={15}/></button><p className="schedule-note">Draftly saves your draft and sends a reminder. It won’t publish to social media.</p></div>}
          </section>

          <section className="panel upcoming-panel"><div className="section-heading upcoming-heading"><div><div className="section-kicker"><span className="step-number muted-step">UP NEXT</span><span>YOUR CALENDAR</span></div><h2>Coming up</h2><p className="section-description">A little peek at what’s ahead.</p></div><a href="#scheduled" className="view-all">View all <Icon name="arrow" size={14}/></a></div>
            {loading ? <div className="loading-line"><span className="spinner"/> Loading drafts…</div> : upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 4).map((post) => <div className="upcoming-item" key={post.id}><div className="date-tile"><span>{when(post.scheduledAt).split(" ")[0].toUpperCase()}</span><strong>{new Date(post.scheduledAt).getDate()}</strong></div><div className="upcoming-copy"><p>{post.caption}</p><span><Icon name="clock" size={13}/>{when(post.scheduledAt, { time: true }).split(", ")[1]}</span></div><span className="status-dot" title="Scheduled"/></div>)}</div> : <div className="upcoming-empty"><div className="empty-calendar"><Icon name="calendar" size={22}/></div><p>Your calendar has room to grow.</p><span>Schedule a draft and it’ll show up here.</span></div>}
            <div className="upcoming-footer"><span className="footer-dot"/> Drafts stay yours until you’re ready to post.</div>
          </section>
        </div>

        <section className="panel posts-panel" id="scheduled"><div className="posts-heading"><div><div className="section-kicker"><span className="step-number">03</span><span>KEEP IT MOVING</span></div><h2>Your scheduled drafts <span className="count-pill">{posts.length}</span></h2><p className="section-description">Everything you’ve been meaning to share, in one place.</p></div><div className="filter-tabs">{["All drafts", "Upcoming", "Past"].map((tab) => <button className={activeTab === tab ? "tab active-tab" : "tab"} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div></div>
          {loading ? <div className="list-empty"><span className="spinner"/> Fetching your drafts…</div> : visiblePosts.length === 0 ? <div className="list-empty"><div className="empty-icon"><Icon name="calendar" size={20}/></div><strong>{posts.length ? "Nothing in this view" : "Your first draft is waiting"}</strong><span>{posts.length ? "Try another filter to see your drafts." : "Start with an idea above and make it official."}</span>{!posts.length && <a href="#create" className="text-action">Create a draft <Icon name="arrow" size={13}/></a>}</div> : <div className="post-list">{visiblePosts.map((post) => <article className="post-row" key={post.id}><div className="post-date"><span>{when(post.scheduledAt).split(" ")[0].toUpperCase()}</span><strong>{new Date(post.scheduledAt).getDate()}</strong></div><div className="post-body">{editing?.id === post.id ? <><textarea className="edit-caption" value={editing.caption} onChange={(e) => setEditing({ ...editing, caption: e.target.value })}/><div className="edit-actions"><button onClick={saveEdit} className="mini-save">Save changes</button><button onClick={() => setEditing(null)} className="mini-cancel">Cancel</button></div></> : <><p className="post-caption">{post.caption}</p><div className="post-meta"><span><Icon name="clock" size={13}/>{when(post.scheduledAt, { time: true })}</span>{(post.hashtags || []).map((tag) => <span className="post-tag" key={tag}>{tag}</span>)}</div></>}</div><div className="post-actions"><span className={`status-badge ${new Date(post.scheduledAt).getTime() < now ? "past" : ""}`}><span/>{new Date(post.scheduledAt).getTime() < now ? "Past draft" : "Scheduled"}</span><button title="Edit draft" aria-label="Edit draft" onClick={() => setEditing({ ...post })}><Icon name="edit" size={15}/></button><button title="Delete draft" aria-label="Delete draft" onClick={() => removePost(post)}><Icon name="trash" size={15}/></button></div></article>)}</div>}
        </section>

        <section className="settings-row" id="settings"><div className="settings-icon"><Icon name="mail" size={18}/></div><div className="settings-copy"><div className="section-kicker"><span>JUST A LITTLE NUDGE</span></div><h3>Reminder emails</h3><p>Get a friendly heads-up when a draft is scheduled. Your post stays a draft; we never publish it.</p></div><div className="settings-controls"><div className="email-control"><input type="email" aria-label="Reminder email address" placeholder="you@example.com" value={prefs.email} onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}/><button className="button button-light" onClick={savePrefs}>Save</button></div><label className="toggle-label"><input type="checkbox" checked={prefs.enabled} onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}/><span className="toggle"/><span>{prefs.enabled ? "Reminders on" : "Reminders off"}</span></label></div></section>
        <footer className="footer"><span>Made for the ideas you don’t want to forget.</span><span>Draftly <span className="brand-dot">·</span> Your words, your timing.</span></footer>
      </div>
    </main>
  </div>;
}
