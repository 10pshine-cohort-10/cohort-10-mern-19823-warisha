import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { api } from "./api";
import { useDialog } from "./useDialog";
import "./styles.css";

export function AuthForm({ onLogin }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api(`/auth/${register ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      onLogin(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="intro">
        <a className="brand" href="/">
          ▤ <span>folio</span>
          <i>NOTES, WITH ROOM TO THINK.</i>
        </a>
        <div>
          <span className="eyebrow">YOUR EVERYDAY COMPANION</span>
          <h1>
            A little room
            <br />
            for your thoughts<span>.</span>
          </h1>
          <p>
            Capture a passing idea. Make a plan.
            <br />
            Keep the things that matter, together.
          </p>
          <div className="paper">
            <small>A NOTE TO SELF</small>
            <h3>
              Good things start
              <br />
              with a simple idea.
            </h3>
            <span>Make space for yours. ↗</span>
          </div>
        </div>
        <footer>Made for a clearer mind.</footer>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">A FRESH PAGE AWAITS</span>
          <h2>{register ? "Make yourself at home." : "Welcome back."}</h2>
          <p>
            {register
              ? "Your ideas deserve a place of their own."
              : "Your thoughts are right where you left them."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. Warisha"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                placeholder={
                  register ? "At least 10 characters" : "Enter your password"
                }
              />
            </label>
            {register && (
              <small className="hint">
                Use a unique password with at least 10 characters.
              </small>
            )}
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="primary" disabled={busy}>
              {busy
                ? "One moment…"
                : register
                  ? "Create your account →"
                  : "Sign in →"}
            </button>
          </form>
          <p className="switch">
            {register ? "Already have an account?" : "New to Folio?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="privacy">
            ◇ Your notes stay yours. Private by design.
          </div>
        </div>
      </section>
    </main>
  );
}
function NoteEditor({ note, onClose, onSaved, onSessionExpired }) {
  const [title, setTitle] = useState(note?.title || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [discarding, setDiscarding] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start with a thought…" }),
    ],
    content: note?.content || "",
    onUpdate: () => setDirty(true),
    editorProps: {
      attributes: {
        "aria-label": "Note content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  });
  function close() {
    if (busy) return;
    if (dirty) setDiscarding(true);
    else onClose();
  }
  const dialogRef = useDialog(close);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  async function save(e) {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(note ? `/notes/${note.id}` : "/notes", {
        method: note ? "PUT" : "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: editor.getHTML(),
        }),
      });
      onSaved(result.note);
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const formats = [
    ["B", "Bold", "bold"],
    ["I", "Italic", "italic"],
    ["H₂", "Heading", "heading"],
    ["•", "Bullet list", "bulletList"],
    ["1.", "Numbered list", "orderedList"],
    ["❝", "Quote", "blockquote"],
  ];
  return (
    <div className="overlay">
      <section
        className="editor-modal"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header>
          <span className="eyebrow" id="editor-title">
            {note ? "EDIT YOUR NOTE" : "A NEW THOUGHT"}
          </span>
          <button aria-label="Close editor" onClick={close} disabled={busy}>
            ✕
          </button>
        </header>
        <form onSubmit={save}>
          <input
            className="title-input"
            aria-label="Note title"
            autoFocus
            required
            maxLength={160}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="Give it a title…"
          />
          <div className="toolbar" role="toolbar" aria-label="Text formatting">
            {formats.map(([symbol, label, type]) => (
              <button
                type="button"
                key={type}
                aria-label={label}
                aria-pressed={editor?.isActive(type)}
                onClick={() => {
                  const chain = editor?.chain().focus();
                  if (type === "heading")
                    chain?.toggleHeading({ level: 2 }).run();
                  else if (type === "bold") chain?.toggleBold().run();
                  else if (type === "italic") chain?.toggleItalic().run();
                  else if (type === "bulletList")
                    chain?.toggleBulletList().run();
                  else if (type === "orderedList")
                    chain?.toggleOrderedList().run();
                  else chain?.toggleBlockquote().run();
                }}
              >
                {symbol}
              </button>
            ))}
          </div>
          <EditorContent editor={editor} />
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <footer>
            <span>{dirty ? "Unsaved changes" : "A space for your words"}</span>
            <div>
              <button
                type="button"
                className="secondary"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                disabled={busy || !title.trim()}
              >
                {busy ? "Saving…" : "Save note"}
              </button>
            </div>
          </footer>
        </form>
      </section>
      {discarding && (
        <DiscardDialog
          onKeep={() => setDiscarding(false)}
          onDiscard={onClose}
        />
      )}
    </div>
  );
}
function DiscardDialog({ onKeep, onDiscard }) {
  const ref = useDialog(onKeep);
  return (
    <div className="overlay">
      <section
        ref={ref}
        tabIndex={-1}
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
      >
        <h2 id="discard-title">Discard unsaved changes?</h2>
        <p>Your saved note will stay unchanged.</p>
        <div>
          <button className="secondary" onClick={onKeep}>
            Keep editing
          </button>
          <button className="danger" onClick={onDiscard}>
            Discard changes
          </button>
        </div>
      </section>
    </div>
  );
}
function DeleteDialog({ note, busy, onCancel, onDelete }) {
  const ref = useDialog(() => {
    if (!busy) onCancel();
  });
  return (
    <div className="overlay">
      <section
        ref={ref}
        tabIndex={-1}
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">Let this note go?</h2>
        <p>“{note.title}” will move to Trash. You can restore it later.</p>
        <div>
          <button className="secondary" onClick={onCancel} disabled={busy}>
            Keep note
          </button>
          <button className="danger" onClick={onDelete} disabled={busy}>
            {busy ? "Deleting…" : "Delete note"}
          </button>
        </div>
      </section>
    </div>
  );
}
export function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [notes, setNotes] = useState([]),
    [trash, setTrash] = useState([]),
    [transferBusy, setTransferBusy] = useState(false),
    [notesLoading, setNotesLoading] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [active, setActive] = useState("all"),
    [editing, setEditing] = useState(undefined),
    [deleting, setDeleting] = useState(null),
    [deleteBusy, setDeleteBusy] = useState(false),
    [profile, setProfile] = useState(false),
    [notice, setNotice] = useState("");
  function expired() {
    setNotice("");
    setUser(null);
    setNotes([]);
    setTrash([]);
    setEditing(undefined);
    setDeleting(null);
    setProfile(false);
    setQuery("");
    setActive("all");
    setError("Your session ended. Please sign in again.");
  }
  async function loadNotes() {
    setNotesLoading(true);
    setError("");
    try {
      const [current,removed] = await Promise.all([api('/notes'),api('/trash')]);
      setNotes(current.notes);
      setTrash(removed?.notes || []);
    } catch (e) {
      if (e.status === 401) expired();
      else setError(e.message);
    } finally {
      setNotesLoading(false);
    }
  }
  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch((e) => {
        if (e.status !== 401)
          setError(
            "Unable to reach the server. Please check your connection and refresh.",
          );
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) void loadNotes();
  }, [user]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setNotice("");
      setUser(null);
      setNotes([]);
    setTrash([]);
      setProfile(false);
      setQuery("");
      setActive("all");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove() {
    setDeleteBusy(true);
    try {
      await api(`/notes/${deleting.id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== deleting.id));
      setTrash((prev) => [deleting,...prev]);
      setDeleting(null);
      setNotice('Note moved to Trash.');
    } catch (e) {
      if (e.status === 401) expired();
      else setError(e.message);
    } finally {
      setDeleteBusy(false);
    }
  }
  async function restore(id) {
    setTransferBusy(true);
    try {
      await api('/notes/'+id+'/restore',{method:'POST'});
      await loadNotes();
      setNotice('Note restored.');
    } catch(e) { if(e.status===401) expired(); else setError(e.message); }
    finally { setTransferBusy(false); }
  }
  function exportNotes() {
    const text=JSON.stringify({format:'folio-notes-v1',notes:notes.map(({title,content})=>({title,content}))},null,2);
    if (!notes.length || notes.length>100 || new Blob([text]).size>140000) {
      setError('A backup supports 1–100 active notes, up to 140 KB. Trash is excluded.'); return;
    }
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const link=document.createElement('a'); link.href=url; link.download='folio-notes-backup.json'; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Backup downloaded. Store it privately.');
  }
  async function importNotes(event) {
    const file=event.target.files?.[0]; event.target.value=''; if(!file)return;
    setTransferBusy(true); setError('');
    try {
      if(file.size>140000) throw new Error('Choose a Folio JSON backup up to 140 KB.');
      let data; try { data=JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON.'); }
      const result=await api('/notes/import',{method:'POST',body:JSON.stringify(data)});
      await loadNotes(); setActive('all'); setProfile(false); setQuery(''); setNotice(result.count+' '+(result.count===1?'note imported as a new copy.':'notes imported as new copies.'));
    } catch(e) { if(e.status===401)expired(); else setError(e.message); }
    finally {setTransferBusy(false);}
  }
  if (loading)
    return (
      <div className="loading" role="status">
        ▤ Opening your notebook…
      </div>
    );
  if (!user)
    return (
      <>
        {error && (
          <div className="connection-error" role="alert">
            {error}
          </div>
        )}
        <AuthForm onLogin={setUser} />
      </>
    );
  const strip = (html) => {
    const el = document.createElement("div");
    el.innerHTML = html.replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, "$& ");
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  };
  const filtered = (active === "trash" ? trash : notes).filter(
    (n) =>
      (active !== "recent" ||
        Date.now() - new Date(n.updated_at).getTime() < 7 * 86400000) &&
      `${n.title} ${strip(n.content)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand">
          ▤ <span>folio</span>
        </a>
        <button className="new-note primary" onClick={() => setEditing(null)}>
          ＋ Create a note
        </button>
        <div className="nav-label">YOUR WORKSPACE</div>
        <button
          className={`nav ${active === "all" && !profile ? "selected" : ""}`}
          onClick={() => {
            setActive("all");
            setProfile(false);
          }}
        >
          ▤ <span>All notes</span>
          <small>{notes.length}</small>
        </button>
        <button
          className={`nav ${active === "recent" && !profile ? "selected" : ""}`}
          onClick={() => {
            setActive("recent");
            setProfile(false);
          }}
        >
          ◷ <span>Recent notes</span>
        </button>
        <button className={`nav ${active === 'trash' && !profile ? 'selected' : ''}`} onClick={()=>{setActive('trash');setProfile(false);}}>♲ <span>Trash</span><small>{trash.length}</small></button>
        <div className="sidebar-note">
          <span>✳</span>
          <p>
            Small thoughts.
            <br />
            Big possibilities.
          </p>
          <small>Make a little space every day.</small>
        </div>
        <button className="profile" onClick={() => setProfile(true)}>
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{user.name}</strong>
            <small>Personal workspace</small>
          </span>
          <span>↗</span>
        </button>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Personal workspace <span className="slash">/</span>{" "}
            {profile
              ? "Profile"
              : active === "recent"
                ? "Recent notes"
                : active === "trash" ? "Trash" : "All notes"}
          </span>
          <button className="signout" onClick={logout}>
            Sign out ↗
          </button>
        </header>
        <section className="content">
          <div className="backup-tools">
            <button type="button" className="secondary" disabled={transferBusy || notesLoading} onClick={exportNotes}>Export backup</button>
            <label className="secondary import-control">{transferBusy ? 'Working…' : 'Import backup'}<input type="file" aria-label="Import backup" accept=".json,application/json" disabled={transferBusy || notesLoading} onChange={importNotes}/></label>
            <small>JSON · 1–100 notes · 140 KB max. Import adds copies; export excludes Trash.</small>
          </div>
              {error && (
                <div role="alert" className="alert">
                  {error} <button onClick={loadNotes}>Try again</button>
                </div>
              )}
          {profile ? (
            <>
              <span className="eyebrow">YOUR CORNER</span>
              <h1>My profile</h1>
              <div className="profile-card">
                <span className="avatar large">
                  {user.name[0].toUpperCase()}
                </span>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>Your notes are only accessible to your account.</p>
                <button className="secondary" onClick={() => setProfile(false)}>
                  Back to notes
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    A PLACE FOR EVERYTHING ON YOUR MIND
                  </span>
                  <h1>
                    {active === "recent"
                      ? "Fresh on your mind."
                      : active === "trash" ? "A second chance for your notes." : "Your thoughts, collected."}
                  </h1>
                  <p>A little clarity, one note at a time.</p>
                </div>
                <span className="date-stamp">
                  {new Date().toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                  <small>MAKE TODAY COUNT</small>
                </span>
              </div>
              <div className="note-tools">
                <span>
                  {filtered.length} {filtered.length === 1 ? "note" : "notes"}{" "}
                  <small>in your collection</small>
                </span>
                <label className="search">
                  ⌕{" "}
                  <input
                    aria-label="Search notes"
                    placeholder="Find a thought…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>

              {notesLoading ? (
                <div className="empty" role="status">
                  Gathering your notes…
                </div>
              ) : filtered.length ? (
                <div className="grid">
                  {filtered.map((n, index) => (
                    <article
                      className={`note-card tone-${index % 4}`}
                      key={n.id}
                    >
                      <div className="note-meta">
                        <span>PERSONAL NOTE</span>
                        <button
                          disabled={transferBusy}
                          aria-label={active === "trash" ? `Restore ${n.title}` : `Delete ${n.title}`}
                          onClick={() => active === "trash" ? void restore(n.id) : setDeleting(n)}
                        >
                          {active === "trash" ? "Restore" : "⌫"}
                        </button>
                      </div>
                      <button
                        className="note-open"
                        disabled={active === "trash"}
                        onClick={() => setEditing(n)}
                      >
                        <h2>{n.title}</h2>
                        <p>
                          {strip(n.content) ||
                            "A fresh page, full of possibility."}
                        </p>
                      </button>
                      <footer>
                        <span>
                          {new Date(n.updated_at).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          hidden={active === "trash"}
                          aria-label={`Edit ${n.title}`}
                          onClick={() => setEditing(n)}
                        >
                          ↗
                        </button>
                      </footer>
                    </article>
                  ))}
                  <button className="add-card" hidden={active === "trash"} onClick={() => setEditing(null)}>
                    <span>＋</span>A new note, a fresh start.
                  </button>
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">▤</div>
                  <h2>
                    {query
                      ? "No matching thoughts."
                      : active === "trash" ? "Trash is empty." : "Your next idea starts here."}
                  </h2>
                  <p>
                    {query
                      ? "Try a different word or clear your search."
                      : active === "recent"
                        ? "No notes edited in the last seven days."
                        : active === "trash" ? "Removed notes stay here until you restore them." : "A plan, a reminder, a spark of inspiration. Give it a home."}
                  </p>
                  <button
                    className="primary"
                    hidden={active === "trash" && !query}
                    onClick={() => (query ? setQuery("") : setEditing(null))}
                  >
                    {query ? "Clear search" : "Write your first note ＋"}
                  </button>
                </div>
              )}
              <div className="bottom-line">
                YOUR SPACE. YOUR PACE. YOUR IDEAS.
              </div>
            </>
          )}
        </section>
      </main>
      {notice && (
        <div className="save-notice">
          <span role="status">✓ {notice}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button>
        </div>
      )}
      {editing !== undefined && (
        <NoteEditor
          key={editing?.id || "new"}
          note={editing}
          onClose={() => setEditing(undefined)}
          onSessionExpired={expired}
          onSaved={(saved) => {
            setNotes((prev) => [
              saved,
              ...prev.filter((n) => n.id !== saved.id),
            ]);
            setEditing(undefined);
            setActive("all");
            setProfile(false);
            setQuery("");
            setNotice("Note saved.");
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          note={deleting}
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onDelete={remove}
        />
      )}
    </div>
  );
}
