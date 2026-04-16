import { useState, useRef, useCallback, useEffect } from "react";
import { I18N, getCC, getTABS } from "./i18n";
import { usePersistedState } from "./hooks/useStorage";
import {
  Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check,
  Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search,
  Link2, Pencil, Settings, Paperclip, Image as ImageIcon,
  CheckCircle2, Archive, ArchiveRestore,
  Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon
} from "lucide-react";
import "./App.scss";

/* ── helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const TODAY = new Date().toISOString().slice(0, 10);
const H = new Date().getHours();
const isOld = (d) => d && d < TODAY;
const isToday = (d) => d === TODAY;

const getNextBirthday = (birthdateStr) => {
  if (!birthdateStr) return null;
  const today = new Date(TODAY + "T12:00");
  const birthDate = new Date(birthdateStr + "T12:00");
  if (isNaN(birthDate.getTime())) return null;

  const currentYear = today.getFullYear();
  const nextBdThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate(), 12, 0, 0);
  
  const yyyy = nextBdThisYear.getFullYear();
  const mm = String(nextBdThisYear.getMonth() + 1).padStart(2, "0");
  const dd = String(nextBdThisYear.getDate()).padStart(2, "0");
  const nextBdThisYearStr = `${yyyy}-${mm}-${dd}`;
  
  if (nextBdThisYearStr < TODAY) {
    const nextYyyy = currentYear + 1;
    return {
      date: `${nextYyyy}-${mm}-${dd}`,
      age: nextYyyy - birthDate.getFullYear()
    };
  } else {
    return {
      date: nextBdThisYearStr,
      age: currentYear - birthDate.getFullYear()
    };
  }
};
const fmtDate = (d, locale) =>
  !d
    ? ""
    : new Date(d + "T12:00").toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });

const getTaskGroup = (due, locale) => {
  if (!due) return null;
  const d = new Date(due + "T12:00");
  const t = new Date(TODAY + "T12:00");
  const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return null; 

  const weekday = d.toLocaleDateString(locale, { weekday: 'short' }).substring(0, 2);
  const day = String(d.getDate()).padStart(2, '0'); 
  const left = `${weekday}., ${day}`;

  const getMonday = (date) => {
    const dt = new Date(date);
    const day = dt.getDay() || 7; 
    dt.setDate(dt.getDate() - day + 1);
    dt.setHours(0,0,0,0);
    return dt;
  };

  const tMonday = getMonday(t);
  const dMonday = getMonday(d);
  const weekDiff = Math.round((dMonday - tMonday) / 604800000);

  let right = "";
  if (diffDays === 1) {
    right = "morgen";
  } else if (diffDays === 2) {
    right = "übermorgen";
  } else if (weekDiff === 0) {
    right = "diese Woche";
  } else if (weekDiff === 1) {
    right = "nächste Woche";
  } else {
    const mDiff = (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth());
    if (mDiff === 1) {
      right = "nächsten Monat";
    } else {
      const monthStr = d.toLocaleDateString(locale, { month: 'long' }).toUpperCase();
      const yearStr = d.getFullYear() !== t.getFullYear() ? " '" + String(d.getFullYear()).slice(-2) : "";
      right = monthStr + yearStr;
    }
  }

  return { left, right, sortKey: d.getTime() };
};

const getYouTubeVideoId = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || null;
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
};

/* ── config ──────────────────────────────────────────────────── */


const TagIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} className="lucide lucide-tag">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const ArchiveIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

const BookmarkIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
  </svg>
);

const BOOKMARKS = [
  { id: "canvas", color: "#818CF8", Icon: FileText },
  { id: "tasks",  color: "#7C83F7", Icon: CheckCircle2 },
  { id: "cal",    color: "#3B82F6", Icon: Calendar },
  { id: "media",  color: "#10B981", Icon: Paperclip },
  { id: "link",   color: "#7C3AED", Icon: BookmarkIcon },
  { id: "tags",   color: "#EC4899", Icon: TagIcon },
];

const NOTIF_RED = "#F26565";
const NOTIF_NAVY = "#1E40AF";
const NOTIF_VIOL = "#7C83F7";

const CAT_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
};

const ID_BIRTHDAYS = "res-birthdays";

/* ── seed data ───────────────────────────────────────────────── */
const SEED = {
  theme: "dark",
  lang: "de",
  user: { name: "" },
  cats: [
    { id: "p1", type: "project",  name: "Paralist Onboarding", date: "2026-04-30", body: "", tags: ["App"], relatedId: "a1", archived: false },
    { id: "p2", type: "project",  name: "5km Lauf",           date: "2026-05-15", body: "Woche 1: 2km locker\nWoche 2: 3km Intervalle", tags: ["Sport"], relatedId: "a2", archived: false },
    { id: "a1", type: "area",     name: "Arbeit",            date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a2", type: "area",     name: "Fitness",           date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a3", type: "area",     name: "Finanzen",          date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r1", type: "resource", name: "Serien",            date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r2", type: "resource", name: "Filme",             date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r3", type: "resource", name: "Einkaufsliste",     date: null, body: "", tags: [], relatedId: "a3", archived: false },
    { id: ID_BIRTHDAYS, type: "resource", name: "Geburtstage", date: null, body: "Alle Geburtstage aus dem Kalender.", tags: ["System"], relatedId: null, archived: false },
  ],
  entries: [
    { id: "e1", type: "task", title: "App kennenlernen", done: false, note: "Onboarding abschließen", due: "2026-04-14", catId: "p1" },
    { id: "e2", type: "task", title: "Wochenplan erstellen", done: false, note: "", due: "2026-04-14", catId: "a1" },
  ],
};

/* ── notification logic ──────────────────────────────────────── */
function computeNotif(entries) {
  const overdue = entries.filter((e) => e.type === "task" && !e.done && isOld(e.due));
  const todayT  = entries.filter((e) => e.type === "task" && !e.done && isToday(e.due));
  const todayC  = entries.filter((e) => e.type === "calendar" && isToday(e.date));
  if (!overdue.length && !todayT.length && !todayC.length) return null;
  const count = overdue.length + todayT.length + todayC.length;
  if (overdue.length && !todayT.length && !todayC.length)
    return { color: NOTIF_RED, count };
  if (todayC.length && !todayT.length)
    return { color: NOTIF_NAVY, count: todayC.length };
  return { color: NOTIF_VIOL, count };
}

/* ════════════════════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Command Panel ───────────────────────────────────────────── */
function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings, onDelete, t, onOpenEntry }) {
  const [subTab, setSubTab] = useState("today");

  const todayEntries = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && isToday(e.due)) ||
      (e.type === "calendar" && isToday(e.date))
  );

  const overdueEntries = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && isOld(e.due)) ||
      (e.type === "calendar" && isOld(e.date))
  ).sort((a, b) => {
    const dA = new Date((a.due || a.date) + "T12:00");
    const dB = new Date((b.due || b.date) + "T12:00");
    return dB - dA;
  });

  const activeEntries = subTab === "today" ? todayEntries : overdueEntries;

  return (
    <div className={`command-panel command-panel--${open ? "open" : "closed"}`}>
      <div className="command-panel__header">
        <div>
          <div className="command-panel__greeting">{t.greeting(new Date().getHours(), user.name)}</div>
          <div className="command-panel__date">
            {new Date().toLocaleDateString(t.locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
        <div className="command-panel__actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`command-panel__bell ${notif ? "command-panel__bell--active" : ""}`}
            onClick={onToggle}
            style={
              notif
                ? { background: notif.color + "22", borderColor: notif.color + "55" }
                : {}
            }
          >
            <Bell size={17} color={notif ? notif.color : "currentColor"} className="icon-muted" />
            {notif && (
              <span
                className="command-panel__bell-dot"
                style={{ background: notif.color }}
              />
            )}
          </button>
          <button
            className="command-panel__bell"
            onClick={onOpenSettings}
          >
            <Settings size={17} className="icon-muted" color="currentColor" />
          </button>
        </div>
      </div>

      {open && (
        <div className="command-panel__drawer">
          <div className="command-panel__tabs">
            <button
              className={`command-panel__tab ${subTab === "today" ? "command-panel__tab--active" : ""}`}
              onClick={() => setSubTab("today")}
            >
              Heute <span className="command-panel__badge">{todayEntries.length}</span>
            </button>
            <button
              className={`command-panel__tab ${subTab === "overdue" ? "command-panel__tab--active" : ""}`}
              onClick={() => setSubTab("overdue")}
            >
              Überfällig <span className="command-panel__badge">{overdueEntries.length}</span>
            </button>
          </div>

          <div className="command-panel__list">
            {activeEntries.length === 0 ? (
              <div className="command-panel__drawer-empty">
                {subTab === "today" ? "Keine Einträge für heute" : "Keine überfälligen Einträge"}
              </div>
            ) : (
              activeEntries.map((e) => {
                const d = e.due || e.date;
                return (
                  <div
                    key={e.id}
                    className={`command-panel__drawer-item ${
                      isOld(d) ? "command-panel__drawer-item--overdue" : ""
                    }`}
                    onClick={() => {
                      if (onOpenEntry) {
                        onOpenEntry(e);
                        onToggle();
                      }
                    }}
                  >
                    <span
                      className="command-panel__drawer-dot"
                      style={{
                        background:
                          e.type === "calendar"
                            ? "#38BDF8"
                            : isOld(d)
                            ? NOTIF_RED
                            : "#7C83F7",
                      }}
                    />
                    <div className="command-panel__drawer-info">
                      <div className="command-panel__drawer-title">{e.title}</div>
                      <div className="command-panel__drawer-meta">
                        {e.type === "calendar"
                          ? e.time + (t.oclock ? " " + t.oclock : "")
                          : isOld(d)
                          ? fmtDate(d, t.locale)
                          : t.todayCap}
                      </div>
                    </div>
                    <button
                      className="command-panel__drawer-delete"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onDelete(e.id);
                      }}
                    >
                      <Trash2 size={14} color="#5858A0" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div
        className={`command-panel__handle command-panel__handle--${
          open ? "open" : "closed"
        }`}
        onClick={onToggle}
      >
        <div className="command-panel__handle-bar" />
      </div>
    </div>
  );
}

/* ── Task List ───────────────────────────────────────────────── */
function TaskList({ entries, cats, onToggle, onDelete, t, CC, grouped, color, onOpenEntry }) {
  const renderItem = (e) => {
    const cat = cats.find((c) => c.id === e.catId);
    const overdue = isOld(e.due) && !e.done;
    return (
      <div
        key={e.id}
        className={`task-item ${e.done ? "task-item--done" : ""}`}
        onClick={() => onOpenEntry && onOpenEntry(e)}
      >
        <button
          className={`task-item__checkbox ${
            e.done ? "task-item__checkbox--checked" : ""
          }`}
          onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
        >
          {e.done && <Check size={10} color="#fff" strokeWidth={2.5} />}
        </button>
        <div className="task-item__body">
          <div
            className={`task-item__title ${
              e.done ? "task-item__title--done" : ""
            }`}
          >
            {e.title}
          </div>
          <div className="task-item__meta">
            {e.due && (
              <span
                className={`task-item__due ${
                  overdue ? "task-item__due--overdue" : ""
                }`}
              >
                {isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}
                {e.time && ` · ${e.time} ${t.oclock}`}
              </span>
            )}
            {cat && CC[cat.type] && (
              <span
                className="task-item__cat-tag"
                style={{
                  color: CC[cat.type].color,
                  background: CC[cat.type].color + "18",
                }}
              >
                {cat.name}
              </span>
            )}
          </div>
        </div>
        <button className="task-item__delete" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}>
          <Trash2 size={14} color="#5858A0" />
        </button>
      </div>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    if (!e.due || isToday(e.due) || isOld(e.due)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(e.due, t.locale);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.due) - new Date(b.due));
  });

  return (
    <>
      {todayTasks.map(renderItem)}
      {futureGroups.map((g, i) => (
        <div key={i} className="task-group">
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__line" style={color ? { background: color } : {}} />
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}

/* ── Note List ───────────────────────────────────────────────── */
function NoteList({ entries, cats, onDelete, CC, grouped, color, t, onOpenEntry, onArchiveEntry }) {
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [clonePos, setClonePos] = useState({ x: 0, y: 0 });
  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (draggedEntry) {
      const onMove = (e) => {
        if (e.cancelable) e.preventDefault();
        const cx = e.clientX ?? (e.touches && e.touches[0].clientX);
        const cy = e.clientY ?? (e.touches && e.touches[0].clientY);
        setClonePos({ x: cx, y: cy });
      };
      const onUp = (e) => {
        const cx = e.clientX ?? (e.changedTouches && e.changedTouches[0].clientX);
        const cy = e.clientY ?? (e.changedTouches && e.changedTouches[0].clientY);
        document.body.style.userSelect = '';
        const cloneEl = document.getElementById('drag-clone');
        if (cloneEl) cloneEl.style.display = 'none';
        
        const target = document.elementFromPoint(cx, cy);
        if (target && target.closest('.fab-archive')) {
           if (onArchiveEntry) onArchiveEntry(draggedEntry.id);
        }
        
        setDraggedEntry(null);
      };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
    }
  }, [draggedEntry, onArchiveEntry]);

  const handlePointerDown = (e, entry) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!onArchiveEntry) return; // Only enable if we can archive
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    startPos.current = { x: cx, y: cy };
    pressTimer.current = setTimeout(() => {
       setDraggedEntry(entry);
       setClonePos({ x: cx, y: cy });
       document.body.style.userSelect = 'none';
       if (navigator.vibrate) navigator.vibrate(50);
    }, 400); 
  };

  const handlePointerMove = (e) => {
    if (!draggedEntry && pressTimer.current) {
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const dx = Math.abs(cx - startPos.current.x);
      const dy = Math.abs(cy - startPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const renderItem = (e) => {
    const cat = cats.find((c) => c.id === e.catId);
    return (
      <div 
        key={e.id} 
        className={`note-item ${draggedEntry?.id === e.id ? 'note-item--dragging' : ''}`} 
        onClick={() => {
          if (draggedEntry?.id === e.id) return; 
          onOpenEntry && onOpenEntry(e);
        }}
        onPointerDown={(ev) => handlePointerDown(ev, e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: draggedEntry?.id === e.id ? 'none' : 'auto' }}
      >
        <div className="note-item__header">
          <div className="note-item__body">
            <div className="note-item__title">{e.title}</div>
            {e.body && <div className="note-item__excerpt">{e.body}</div>}
          </div>
          <button className="note-item__delete" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}>
            <Trash2 size={14} color="#5858A0" />
          </button>
        </div>
        {cat && CC[cat.type] && (
          <span
            className="note-item__cat-tag"
            style={{
              color: CC[cat.type].color,
              background: CC[cat.type].color + "18",
            }}
          >
            {cat.name}
          </span>
        )}
      </div>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    const d = e.due || e.date;
    if (!d || isToday(d) || isOld(d)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(d, t.locale);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.due || a.date) - new Date(b.due || b.date));
  });

  return (
    <>
      {todayTasks.map(renderItem)}
      {futureGroups.map((g, i) => (
        <div key={i} className="task-group">
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__line" style={color ? { background: color } : {}} />
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
      
      {draggedEntry && (
        <div
          id="drag-clone"
          className="note-item"
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
            left: clonePos.x,
            top: clonePos.y,
            transform: 'translate(-50%, -50%)',
            width: '280px',
            opacity: 0.9,
            background: 'var(--color-card, #1E1E2C)',
            border: '1px solid var(--color-border, #333344)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
            padding: '12px 14px',
            borderRadius: '16px'
          }}
        >
          <div className="note-item__header">
            <div className="note-item__body">
              <div className="note-item__title" style={{ fontSize: '14px', fontWeight: 600 }}>{draggedEntry.title}</div>
              {draggedEntry.body && <div className="note-item__excerpt" style={{ fontSize: '12px', opacity: 0.7 }}>{draggedEntry.body}</div>}
            </div>
            <div style={{ opacity: 0.5 }}>...</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Calendar List ───────────────────────────────────────────── */
function CalList({ entries, cats, onDelete, t, CC, grouped, color, onOpenEntry }) {
  const renderItem = (e) => {
    const cat = cats.find((c) => c.id === e.catId);
    const past = e.date && e.date < TODAY;
    return (
      <div
        key={e.id}
        className={`cal-item ${isToday(e.date) ? "cal-item--today" : ""} ${
          past ? "cal-item--past" : ""
        }`}
        onClick={() => onOpenEntry && onOpenEntry(e)}
      >
        <div className="cal-item__row">
          <div className="cal-item__date-badge">
            <div className="cal-item__date-month">
              {e.date
                ? new Date(e.date + "T12:00").toLocaleDateString(t.locale, {
                    month: "short",
                  })
                : ""}
            </div>
            <div className="cal-item__date-day">
              {e.date ? new Date(e.date + "T12:00").getDate() : ""}
            </div>
          </div>
          <div className="cal-item__info">
            <div className="cal-item__title">{e.title}</div>
            {e.time && <div className="cal-item__time">{e.time} Uhr</div>}
          </div>
          <button className="cal-item__delete" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}>
            <Trash2 size={14} color="#5858A0" />
          </button>
        </div>
        {cat && CC[cat.type] && (
          <span
            className="cal-item__cat-tag"
            style={{
              color: CC[cat.type].color,
              background: CC[cat.type].color + "18",
            }}
          >
            {cat.name}
          </span>
        )}
      </div>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    const d = e.date;
    if (!d || isToday(d) || isOld(d)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(d, t.locale);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return (
    <>
      {todayTasks.map(renderItem)}
      {futureGroups.map((g, i) => (
        <div key={i} className="task-group">
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__line" style={color ? { background: color } : {}} />
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}

/* ── Media List ──────────────────────────────────────────────── */
function MediaList({ entries, cats, onDelete, t, CC }) {
  const getMediaConfig = (mediaType) => {
    switch (mediaType) {
      case "image": return { Icon: ImageIcon, color: "#0D9488", label: t.image };
      case "video": return { Icon: VideoIcon, color: "#EF4444", label: t.video };
      case "audio": return { Icon: AudioIcon, color: "#F97316", label: t.audio };
      case "document": return { Icon: DocumentIcon, color: "#0078D4", label: t.document };
      default: return { Icon: Paperclip, color: "#9CA3AF", label: t.file };
    }
  };

  return entries.map((e) => {
    const { Icon, color, label } = getMediaConfig(e.mediaType);
    const cat = cats?.find((c) => c.id === e.catId);
    return (
      <div 
        key={e.id} 
        className="media-item"
        style={{ cursor: e.mediaData ? 'pointer' : 'default' }}
        onClick={() => {
          if (e.mediaData) {
            const url = URL.createObjectURL(e.mediaData);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }}
      >
        <div className="media-item__icon" style={{ background: color + "22", color: color }}>
          <Icon size={18} />
        </div>
        <div className="media-item__body">
          <div className="media-item__title">{e.title}</div>
          <div className="media-item__meta">{label}</div>
          {cat && CC[cat.type] && (
            <span
              className="media-item__cat-tag"
              style={{
                color: CC[cat.type].color,
                background: CC[cat.type].color + "18",
              }}
            >
              {cat.name}
            </span>
          )}
        </div>
        <button 
          className="media-item__delete" 
          onClick={(ev) => { 
            ev.stopPropagation(); 
            onDelete(e.id); 
          }}
        >
          <Trash2 size={14} color="#5858A0" />
        </button>
      </div>
    );
  });
}

/* ── Link List ───────────────────────────────────────────────── */
function LinkList({ entries, cats, onDelete, CC }) {
  return entries.map((e) => {
    const cat = cats?.find((c) => c.id === e.catId);
    const ytId = getYouTubeVideoId(e.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
    return (
      <div key={e.id} className="media-item">
        <div className="media-item__icon" style={{ background: "#7C3AED22", color: "#7C3AED" }}>
          <BookmarkIcon size={18} />
        </div>
        <div className="media-item__body">
          <div className="media-item__title">{e.title}</div>
          {embedUrl && (
            <div className="link-item__preview">
              <iframe
                title={`YouTube preview ${e.title}`}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
          {e.url && <div className="media-item__meta">{e.url}</div>}
          {cat && CC[cat.type] && (
            <span
              className="media-item__cat-tag"
              style={{
                color: CC[cat.type].color,
                background: CC[cat.type].color + "18",
              }}
            >
              {cat.name}
            </span>
          )}
        </div>
        <button className="media-item__delete" onClick={() => onDelete(e.id)}>
          <Trash2 size={14} color="#5858A0" />
        </button>
      </div>
    );
  });
}

/* ── Home Screen ─────────────────────────────────────────────── */
function HomeScreen({
  t,
  CC,
  TABS,
  lang,
  state,
  tab,
  setTab,
  onOpenCatType,
  onAddCat,
  onAddEntry,
  toggleTask,
  deleteEntry,
  onOpenEntry,
  onOpenArchive,
  onArchiveEntry,
}) {
  const { entries, cats } = state;
  const tabEntries = entries.map((e) => {
    if (e.type === "calendar" && e.isBirthday) {
      const nextBd = getNextBirthday(e.date);
      if (nextBd) {
        return { ...e, date: nextBd.date, title: `${e.title} (${nextBd.age} J.)` };
      }
    }
    return e;
  }).filter((e) => {
    if (tab === "calendar") {
      return e.type === "calendar" && (!e.date || !isOld(e.date));
    }
    if (tab === "notes") {
      return e.type === "note" && !e.archived;
    }
    if (tab === "tasks") {
      const isOverdue = e.type === "task" && !e.done && isOld(e.due);
      return e.type === "task" && !isOverdue && !e.done;
    }
    return false;
  });

  const showArchiveButton = () => {
    if (tab === "tasks") return entries.some((e) => e.type === "task" && e.done);
    if (tab === "calendar") return entries.some((e) => e.type === "calendar" && isOld(e.date));
    if (tab === "notes") return entries.some((e) => e.type === "note");
    return false;
  };
  const tabCfg = TABS.find((t) => t.id === tab);
  const tabColor = tabCfg?.color || "#7C83F7";

  const lastTap = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX.current;
    
    if (Math.abs(dx) > 60) {
      const tabOrder = TABS.map(t => t.id);
      const currentIndex = tabOrder.indexOf(tab);
      
      if (dx > 0 && currentIndex > 0) {
        // Swipe nach rechts -> Vorheriger Tab
        setTab(tabOrder[currentIndex - 1]);
      } else if (dx < 0 && currentIndex < tabOrder.length - 1) {
        // Swipe nach links -> Nächster Tab
        setTab(tabOrder[currentIndex + 1]);
      }
    }
  };

  const handleDoubleTap = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onAddEntry();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [onAddEntry]
  );

  return (
    <div className="home">
      <div className="home__content">
        {/* Category cards */}
        <div className="category-grid">
          {["project", "area", "resource"].map((type) => {
            const cfg = CC[type];
            const CatIcon = CAT_ICONS[type];
            const count = cats.filter((c) => c.type === type && !c.archived).length;
            return (
              <div key={type} className={`category-card category-card--${type}`}>
                <button
                  className="category-card__main"
                  onClick={() => onOpenCatType(type)}
                >
                  <CatIcon size={24} color={cfg.color} strokeWidth={2.5} />
                  <span
                    className="category-card__label"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  {count > 0 && (
                    <span className="category-card__count">{count}</span>
                  )}
                </button>
                <button
                  className={`category-card__add-btn category-card__add-btn--${type}`}
                  onClick={() => onAddCat(type)}
                >
                  <Plus size={15} color={cfg.color} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>

        {/* List section header: label left + switcher icons center */}
        <div className="list-section__header">
          <span className="list-section__label">{tabCfg?.label}</span>
          <div className="list-switcher">
            {TABS.map((t) => {
              const TabIcon = t.Icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  className={`list-switcher__btn ${
                    isActive ? "list-switcher__btn--active" : ""
                  }`}
                  onClick={() => setTab(t.id)}
                  style={
                    isActive
                      ? {
                          background: t.color + "22",
                          boxShadow: `0 0 12px ${t.color}30`,
                          color: t.color,
                        }
                      : {}
                  }
                >
                  <TabIcon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entry list */}
      <div 
        className="entry-list" 
        onClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {tabEntries.length === 0 ? (
          <div className="entry-list__empty">
            <div className="entry-list__empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              {tabCfg && <tabCfg.Icon size={28} color={tabColor} strokeWidth={1.5} />}
            </div>
            Keine {tabCfg?.label} · Doppeltippe zum Erstellen
          </div>
        ) : (
          <>
            {tab === "tasks" && (
              <TaskList t={t} CC={CC} lang={lang}
                entries={tabEntries}
                cats={cats}
                onToggle={toggleTask}
                onDelete={deleteEntry}
                grouped={true}
                color={tabColor}
                onOpenEntry={onOpenEntry}
              />
            )}
            {tab === "notes" && (
              <NoteList t={t} CC={CC}
                entries={tabEntries}
                cats={cats}
                onDelete={deleteEntry}
                grouped={true}
                color={tabColor}
                onOpenEntry={onOpenEntry}
                onArchiveEntry={onArchiveEntry}
              />
            )}
            {tab === "calendar" && (
              <CalList t={t} CC={CC} lang={lang}
                entries={tabEntries}
                cats={cats}
                onDelete={deleteEntry}
                grouped={true}
                color={tabColor}
                onOpenEntry={onOpenEntry}
              />
            )}
          </>
        )}
      </div>

      {showArchiveButton() && (
        <button
          className="fab-archive"
          onClick={() => onOpenArchive(tab)}
          style={{
            background: "#9CA3AF22",
            border: "1px solid #9CA3AF55",
            color: "#9CA3AF",
            boxShadow: "0 8px 24px #9CA3AF22",
          }}
        >
          <ArchiveIcon size={22} color="#9CA3AF" strokeWidth={2} />
        </button>
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={onAddEntry}
        style={{
          background: tabColor,
          boxShadow: `0 8px 24px ${tabColor}55`,
        }}
      >
        <Plus size={22} color="#fff" strokeWidth={2.4} />
      </button>
    </div>
  );
}

/* ── Category List Screen ────────────────────────────────────── */
function CatListScreen({ type, cats, onOpen, onAdd, onBack, onOpenArchive, t, CC }) {
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="cat-list">
      <div className="cat-list__header">
        <CatIcon size={22} color={cfg.color} />
        <h2 className="cat-list__title">{cfg.label}</h2>
        <button 
          className="cat-list__archive-btn" 
          onClick={() => onOpenArchive(type)}
        >
          <ArchiveIcon size={18} color="#9CA3AF" />
        </button>
      </div>

      <div className="cat-list__body">
        {cats.length === 0 ? (
          <div className="cat-list__empty">
            {t.noCats(cfg.label).split("\n")[0]}
            <br />
            {t.noCats(cfg.label).split("\n")[1]}
          </div>
        ) : (
          cats.map((cat) => (
            <button
              key={cat.id}
              className="cat-list__item"
              onClick={() => onOpen(cat)}
            >
              <div
                className="cat-list__item-icon"
                style={{ background: cfg.color + "22" }}
              >
                <CatIcon size={18} color={cfg.color} />
              </div>
              <div className="cat-list__item-info">
                <div className="cat-list__item-name">{cat.name}</div>
                {cat.date && (
                  <div className="cat-list__item-date">{fmtDate(cat.date, t.locale)}</div>
                )}
              </div>
              <ChevronLeft
                size={16}
                color="#5858A0"
                style={{ transform: "rotate(180deg)" }}
              />
            </button>
          ))
        )}
      </div>

      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        <button
          className="nav-bottom__add"
          onClick={onAdd}
          style={{
            background: cfg.color,
            boxShadow: `0 8px 24px ${cfg.color}55`,
          }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

/* ── Bookmark Rail ───────────────────────────────────────────── */
function BookmarkRail({ active, onSelect, baseColor }) {
  return (
    <div className="bookmark-rail">
      {BOOKMARKS.map((bm) => {
        const BmIcon = bm.Icon;
        const isActive = active === bm.id;
        const color = (bm.id === 'canvas' && baseColor) ? baseColor : bm.color;
        
        return (
          <button
            key={bm.id}
            className={`bookmark-rail__tab ${
              isActive
                ? "bookmark-rail__tab--active"
                : "bookmark-rail__tab--inactive"
            }`}
            onClick={() => onSelect(bm.id)}
            style={{
              background: isActive ? color : color + "28",
              border: `1px solid ${color}${isActive ? "" : "50"}`,
              borderRight: "none",
            }}
          >
            <BmIcon size={11} color={isActive ? "#fff" : color} />
          </button>
        );
      })}
    </div>
  );
}

/* ── Category Detail Screen ──────────────────────────────────── */
function CatDetailScreen({
  t,
  CC,
  lang,
  cat,
  allCats,
  entries,
  onUpdate,
  onDelete,
  onBack,
  onHome,
  toggleTask,
  deleteEntry,
  onAddEntry,
  onOpenCat,
  onOpenEntry,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onLinkResource,
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  const [bm, setBm] = useState("canvas");
  const [tagSort, setTagSort] = useState({ by: 'date', desc: true });
  const [showDate, setShowDate] = useState(false);
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [resSearch, setResSearch] = useState("");

  // Alle Ordner (inkl. Ressourcen) haben 3 Sub-Tabs im Media/Ressourcen Lesezeichen
  const isProjectOrArea = cat.type === "project" || cat.type === "area";
  
  // Sub-Tab für das Ressource-Lesezeichen (standardmäßig "resources")
  const [resSubTab, setResSubTab] = useState("resources");

  // Refs für Click-Outside-Erkennung
  const connPopupRef = useRef(null);
  const connPillRef = useRef(null);
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);

  // Swipe-Refs für Sub-Tab-Wechsel (wiederverwendbar)
  const subTabTouchX = useRef(0);

  const related = allCats.find(c => c.id === cat.relatedId);
  const relatedCfg = related && CC[related.type] ? CC[related.type] : null;
  const connOptions = allCats.filter(c => {
    if (c.id === cat.id) return false;
    if (cat.type === "project") return c.type === "area";
    if (cat.type === "area") return c.type === "project";
    return c.type === "project" || c.type === "area";
  });
  // Verknüpfte Ressourcen berechnen (Ressourcen, deren relatedId auf dieses Element zeigt)
  const linkedResources = allCats.filter(c => c.type === 'resource' && c.relatedId === cat.id);
  const resCount = linkedResources.length;
  const ResIcon = CAT_ICONS.resource;

  // Anzahl der Notizen und Medien für Sub-Tab-Badges
  const noteCount = entries.filter(e => e.type === "note").length;
  const mediaCount = entries.filter(e => e.type === "media").length;

  // Click-Outside: Popups schließen wenn außerhalb geklickt wird
  const handleClickOutside = useCallback((e) => {
    // Connection-Popup schließen
    if (showConnSelect &&
        connPopupRef.current && !connPopupRef.current.contains(e.target) &&
        connPillRef.current && !connPillRef.current.contains(e.target)) {
      setShowConnSelect(false);
    }
    // Datum-Picker schließen
    if (showDate &&
        dateInputRef.current && !dateInputRef.current.contains(e.target) &&
        datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
  }, [showConnSelect, showDate]);

  // Event-Listener für Click-Outside
  // (useRef + useCallback statt useEffect, da wir den Handler auf dem cat-detail div setzen)

  // Mapping: Bookmark → Entry-Typ (inkl. Sub-Tab bei Ressource)
  const getEntryTypeFromBookmark = useCallback(() => {
    if (bm === "media") {
      return resSubTab === "notes" ? "note" : "media";
    }
    const map = {
      canvas: "note",
      tasks: "task",
      cal: "calendar",
      link: "link",
      tags: "tags",
    };
    return map[bm] || "note";
  }, [bm, resSubTab]);

  // Mapping: Entry-Typ → FAB-Farbe
  const getFabColor = useCallback(() => {
    const entryType = getEntryTypeFromBookmark();
    const colorMap = {
      note: "#F59E0B",
      task: "#7C83F7",
      calendar: "#1E40AF",
      media: "#10B981",
      link: "#7C3AED",
      tags: "#EC4899",
    };
    return colorMap[entryType] || cfg.color;
  }, [getEntryTypeFromBookmark, cfg.color]);

  const createEntryFromBookmark = useCallback(() => {
    if (bm === "tags") {
      const name = window.prompt("Neues Tag (Label) erstellen:");
      if (name && name.trim()) {
        onCreateTag(name.trim());
      }
      return;
    }
    onAddEntry(getEntryTypeFromBookmark());
  }, [getEntryTypeFromBookmark, bm, onAddEntry, onCreateTag]);

  // Swipe-Handler für Sub-Tab-Wechsel (3 Tabs bei Projekt/Bereich/Ressource)
  const subTabOrder = ["resources", "notes", "media"];
  const onSubTabTouchStart = useCallback((e) => {
    subTabTouchX.current = e.touches[0].clientX;
  }, []);
  const onSubTabTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - subTabTouchX.current;
    if (Math.abs(dx) > 60) {
      setResSubTab(prev => {
        const idx = subTabOrder.indexOf(prev);
        if (dx > 0) {
          // Swipe rechts → vorheriger Tab
          return subTabOrder[Math.max(0, idx - 1)];
        } else {
          // Swipe links → nächster Tab
          return subTabOrder[Math.min(subTabOrder.length - 1, idx + 1)];
        }
      });
    }
  }, [subTabOrder]);

  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        createEntryFromBookmark();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [createEntryFromBookmark]
  );

  return (
    <div className="cat-detail" onClick={handleClickOutside}>
      {/* Header */}
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          <CatIcon size={18} color={cfg.color} />
          <input
            className="cat-detail__title-input"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Titel..."
          />
          <button className="cat-detail__delete-btn" onClick={onDelete}>
            <Trash2 size={16} color="#F26565" />
          </button>
        </div>
        <div className="cat-detail__pills">
          <div className="cat-detail__pills-group">
          {cat.type === "project" && (
            <button
              ref={datePillRef}
              className="cat-detail__date-pill"
              onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
              style={
                cat.date
                  ? {
                      background: cfg.color + "20",
                      borderColor: cfg.color + "45",
                      color: cfg.color,
                    }
                  : {}
              }
            >
              {cat.date ? fmtDate(cat.date, t.locale) : t.addDate}
            </button>
          )}

          <button
            ref={connPillRef}
            className="cat-detail__date-pill"
            onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
            style={
              relatedCfg
                ? {
                    background: relatedCfg.color + "20",
                    borderColor: relatedCfg.color + "45",
                    color: relatedCfg.color,
                  }
                : {}
            }
          >
            {related ? related.name : (cat.type === 'project' ? t.connectArea : cat.type === 'area' ? t.connectProject : t.connectSelection)}
          </button>

          {resCount > 0 && (cat.type === 'project' || cat.type === 'area') && (
            <div 
              className="cat-detail__res-count"
              style={{ 
                background: CC.resource.color + "18", 
                borderColor: CC.resource.color + "45",
                color: CC.resource.color 
              }}
            >
              <ResIcon size={12} strokeWidth={2.5} />
              <span>{resCount}</span>
            </div>
          )}

          {cat.tags?.map((tag) => (
            <span key={tag} className="cat-detail__tag">
              {tag}
            </span>
          ))}
          </div>

          <button 
            className={`cat-detail__archive-toggle ${cat.archived ? 'cat-detail__archive-toggle--active' : ''}`}
            onClick={() => onUpdate({ archived: !cat.archived })}
          >
            {cat.archived ? <ArchiveRestore size={18} color={cfg.color} /> : <Archive size={18} color="#5858A0" />}
          </button>
          {showConnSelect && (
            <div className="cat-detail__conn-popup" ref={connPopupRef} onClick={(e) => e.stopPropagation()}>
              <div className="cat-detail__conn-list">
                {connOptions.length === 0 ? (
                  <div className="cat-detail__conn-empty">{t.noCats('?').split('\n')[0]}</div>
                ) : (
                  connOptions.map(opt => (
                    <button
                      key={opt.id}
                      className="cat-detail__conn-item"
                      onClick={() => {
                        onUpdate({ relatedId: opt.id });
                        setShowConnSelect(false);
                      }}
                    >
                      <span 
                        className="cat-detail__conn-dot" 
                        style={{ background: (CC[opt.type]?.color || CC.resource.color) }} 
                      />
                      <span className="cat-detail__conn-name">{opt.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                className="cat-detail__conn-none"
                onClick={() => {
                  onUpdate({ relatedId: null });
                  setShowConnSelect(false);
                }}
              >
                {t.noConnection}
              </button>
            </div>
          )}
        </div>
        {showDate && (
          <input
            ref={dateInputRef}
            type="date"
            className="cat-detail__date-input"
            value={cat.date || ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              onUpdate({ date: e.target.value });
              setShowDate(false);
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="cat-detail__body" onClick={handleDoubleTap}>
        {bm === "canvas" && (
          <textarea
            className="cat-detail__textarea"
            value={cat.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder={t.writeThoughts}
          />
        )}
        {bm === "tasks" &&
          (entries.filter((e) => e.type === "task").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noTasks}</div>
          ) : (
            <TaskList t={t} CC={CC} lang={lang}
                entries={entries.filter((e) => e.type === "task")}
              cats={allCats}
              onToggle={toggleTask}
              onDelete={deleteEntry}
              onOpenEntry={onOpenEntry}
            />
          ))}
        {bm === "cal" &&
          (entries.filter((e) => e.type === "calendar").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noCal}</div>
          ) : (
            <CalList t={t} CC={CC} lang={lang}
              entries={entries.filter((e) => e.type === "calendar")}
              cats={allCats}
              onDelete={deleteEntry}
              onOpenEntry={onOpenEntry}
            />
          ))}
        {bm === "media" && (
          <div
            onTouchStart={onSubTabTouchStart}
            onTouchEnd={onSubTabTouchEnd}
            style={{ flex: 1 }}
          >
            {/* Sub-Tab-Leiste: Ressourcen / Notizen / Medien */}
            <div className="res-sub-tabs">
              <button
                className={`res-sub-tabs__btn ${resSubTab === "resources" ? "res-sub-tabs__btn--active-res" : ""}`}
                onClick={() => setResSubTab("resources")}
              >
                <Square size={14} />
                <span>{t.linkedRes}</span>
                {resCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--res">{resCount}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "notes" ? "res-sub-tabs__btn--active-notes" : ""}`}
                onClick={() => setResSubTab("notes")}
              >
                <Pencil size={14} />
                <span>{t.notes}</span>
                {noteCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--notes">{noteCount}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "media" ? "res-sub-tabs__btn--active-media" : ""}`}
                onClick={() => setResSubTab("media")}
              >
                <Paperclip size={14} />
                <span>{t.mediaTab}</span>
                {mediaCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--media">{mediaCount}</span>
                )}
              </button>
            </div>

            {/* Verknüpfte Ressourcen-Ansicht */}
            {resSubTab === "resources" && (
              linkedResources.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noLinkedRes}</div>
              ) : (
                linkedResources.map((res) => (
                  <button
                    key={res.id}
                    className="cat-list__item"
                    onClick={() => onOpenCat && onOpenCat(res)}
                  >
                    <div
                      className="cat-list__item-icon"
                      style={{ background: CC.resource.color + "22" }}
                    >
                      <Square size={18} color={CC.resource.color} />
                    </div>
                    <div className="cat-list__item-info">
                      <div className="cat-list__item-name">{res.name}</div>
                    </div>
                    <ChevronLeft
                      size={16}
                      color="#5858A0"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </button>
                ))
              )
            )}

            {/* Notizen-Ansicht */}
            {resSubTab === "notes" && (
              entries.filter((e) => e.type === "note").length === 0 ? (
                <div className="cat-detail__section-empty">{t.notes}: {t.noMedia}</div>
              ) : (
                <NoteList t={t} CC={CC}
                  entries={entries.filter((e) => e.type === "note")}
                  cats={allCats}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}

            {/* Medien-Ansicht */}
            {resSubTab === "media" && (
              entries.filter((e) => e.type === "media").length === 0 ? (
                <div className="cat-detail__section-empty">{t.noMedia}</div>
              ) : (
                <MediaList t={t} CC={CC}
                  entries={entries.filter((e) => e.type === "media")}
                  cats={allCats}
                  onDelete={deleteEntry}
                />
              )
            )}
          </div>
        )}
        {bm === "link" &&
          (entries.filter((e) => e.type === "link").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noLink}</div>
          ) : (
            <LinkList t={t} CC={CC}
              entries={entries.filter((e) => e.type === "link")}
              cats={allCats}
              onDelete={deleteEntry}
            />
          ))}
        {bm === "tags" && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="res-sub-tabs" style={{ marginBottom: "16px" }}>
              <button
                className={`res-sub-tabs__btn ${tagSort.by === 'date' ? 'res-sub-tabs__btn--active-res' : ''}`}
                onClick={() => setTagSort(prev => ({ by: 'date', desc: prev.by === 'date' ? !prev.desc : true }))}
              >
                <span>Erstellungsdatum</span>
                {tagSort.by === 'date' && (tagSort.desc ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
              </button>
              <button
                className={`res-sub-tabs__btn ${tagSort.by === 'alpha' ? 'res-sub-tabs__btn--active-res' : ''}`}
                onClick={() => setTagSort(prev => ({ by: 'alpha', desc: prev.by === 'alpha' ? !prev.desc : false }))}
              >
                <span>Alphabetisch</span>
                {tagSort.by === 'alpha' && (tagSort.desc ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
              </button>
            </div>
            {(() => {
              const sortedTags = [...(tags || [])].sort((a, b) => {
                if (tagSort.by === 'date') {
                  const da = new Date(a.createdAt || 0).getTime();
                  const db = new Date(b.createdAt || 0).getTime();
                  return tagSort.desc ? db - da : da - db;
                } else {
                  const cmp = a.name.localeCompare(b.name);
                  return tagSort.desc ? -cmp : cmp;
                }
              });
              if (sortedTags.length === 0) {
                return <div className="cat-detail__section-empty">Keine Tags vorhanden</div>;
              }
              return (
                <div className="tag-list" style={{ overflowY: 'auto' }}>
                  {sortedTags.map(tag => (
                    <div key={tag.id} className="media-item">
                      <div className="media-item__icon" style={{ background: "#EC489922", color: "#EC4899" }}>
                        <TagIcon size={18} />
                      </div>
                      <div className="media-item__body">
                        <div className="media-item__title">{tag.name}</div>
                        {tag.createdAt && <div className="media-item__meta">{fmtDate(tag.createdAt.split("T")[0], t.locale)}</div>}
                      </div>
                      <button className="media-item__delete" onClick={() => {
                        const newName = window.prompt("Tag umbenennen:", tag.name);
                        if (newName && newName.trim() && newName.trim() !== tag.name) {
                          onUpdateTag(tag.id, newName.trim());
                        }
                      }}>
                        <Edit2 size={14} color="#5858A0" />
                      </button>
                      <button className="media-item__delete" onClick={() => {
                        if (window.confirm(`Tag "${tag.name}" löschen?`)) {
                          onDeleteTag(tag.id);
                        }
                      }}>
                        <Trash2 size={14} color="#F26565" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <BookmarkRail active={bm} onSelect={setBm} baseColor={cfg.color} />

      {/* Bottom nav */}
      <div className="nav-bottom" style={{ position: "relative" }}>
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        
        {/* Suchfeld für Ressourcen-Verknüpfungen (Nur im "resources" Sub-Tab sichtbar) */}
        {bm === "media" && resSubTab === "resources" && (
          <div className="nav-bottom__res-search">
            <div className="nav-bottom__res-search-container">
              <Search className="nav-bottom__res-search-icon" size={16} color={CC.resource.color} />
              <input
                type="text"
                className="nav-bottom__res-search-input"
                value={resSearch}
                onChange={(e) => setResSearch(e.target.value)}
                placeholder="Ressourcen suchen..."
              />
            </div>
            {resSearch.trim() && (
              <div className="nav-bottom__res-search-results">
                {allCats
                  .filter(c => c.type === 'resource' && c.id !== cat.id && c.relatedId !== cat.id && c.name.toLowerCase().includes(resSearch.toLowerCase()))
                  .map(res => (
                    <button
                      key={res.id}
                      className="nav-bottom__res-search-item"
                      onClick={() => {
                        onLinkResource(res.id);
                        setResSearch("");
                      }}
                    >
                      <Square size={14} color={CC.resource.color} />
                      <span>{res.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="nav-bottom__actions">
          {bm === "canvas" ? (
            <button
              className="nav-bottom__back"
              onClick={onHome}
            >
              <Home size={20} color="#EDEEFF" />
            </button>
          ) : (
            <button
              className="nav-bottom__add"
              onClick={createEntryFromBookmark}
              style={{
                background: getFabColor(),
                boxShadow: `0 8px 24px ${getFabColor()}55`,
              }}
            >
              <Plus size={22} color="#fff" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Archive Screen ────────────────────────────────────────────── */
function ArchiveScreen({ t, CC, lang, entries, cats, tab, onDelete, onBack, toggleTask, onOpenEntry, onRestoreNote, onOpenCat }) {
  const isCatTab = ["project", "area", "resource"].includes(tab);

  const archiveItems = isCatTab
    ? cats.filter(c => c.type === tab && c.archived)
    : entries.filter(e => {
        if (tab === "tasks") return e.type === "task" && e.done;
        if (tab === "calendar") return e.type === "calendar" && isOld(e.date);
        if (tab === "notes") return e.type === "note" && e.archived;
        return false;
      });

  const tabCfg = isCatTab ? CC[tab] : getTABS(t).find(x => x.id === tab);
  const title = isCatTab 
    ? `Archivierte ${tabCfg.label}` 
    : tab === "tasks" ? "Erledigte Aufgaben" : tab === "calendar" ? "Vergangene Termine" : "Archivierte Notizen";
  const CatIcon = isCatTab ? CAT_ICONS[tab] : null;

  return (
    <div className="cat-detail">
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          {isCatTab ? <CatIcon size={18} color={tabCfg.color} /> : <ArchiveIcon size={18} color={tabCfg?.color || "#EDEEFF"} />}
          <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
            {title}
          </div>
        </div>
      </div>
      <div className="cat-detail__body" style={{ padding: '16px', paddingBottom: '100px' }}>
        {archiveItems.length === 0 ? (
          <div className="cat-detail__section-empty">Keine archivierten Einträge</div>
        ) : (
          <>
            {isCatTab && (
              <div className="cat-list__archive-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {archiveItems.map((cat) => (
                  <button
                    key={cat.id}
                    className="cat-list__item"
                    onClick={() => onOpenCat(cat)}
                  >
                    <div className="cat-list__item-icon">
                      <CatIcon size={18} color={tabCfg.color} />
                    </div>
                    <div className="cat-list__item-info">
                      <div className="cat-list__item-name">{cat.name}</div>
                    </div>
                    <ChevronLeft
                      size={16}
                      color="#5858A0"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </button>
                ))}
              </div>
            )}
            {tab === "tasks" && (
              <TaskList t={t} CC={CC} lang={lang}
                entries={archiveItems}
                cats={cats}
                onToggle={toggleTask}
                onDelete={onDelete}
                onOpenEntry={onOpenEntry}
              />
            )}
            {tab === "calendar" && (
              <CalList t={t} CC={CC} lang={lang}
                entries={archiveItems}
                cats={cats}
                onDelete={onDelete}
                onOpenEntry={onOpenEntry}
              />
            )}
            {tab === "notes" && (
              <NoteList t={t} CC={CC}
                entries={archiveItems}
                cats={cats}
                onDelete={onDelete}
                onOpenEntry={onOpenEntry}
              />
            )}
          </>
        )}
      </div>
      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}

/* ── Entry Detail Screen ─────────────────────────────────────── */
function EntryDetailScreen({ t, CC, theme, entry, cat, allCats, onUpdate, onDelete, onBack }) {
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showDate, setShowDate] = useState(false);
  
  const connPopupRef = useRef(null);
  const connPillRef = useRef(null);
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (showConnSelect && connPopupRef.current && !connPopupRef.current.contains(e.target) && connPillRef.current && !connPillRef.current.contains(e.target)) {
      setShowConnSelect(false);
    }
    if (showDate && dateInputRef.current && !dateInputRef.current.contains(e.target) && datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
  }, [showConnSelect, showDate]);
  const typeIcon = {
    task: CheckCircle2,
    note: FileText,
    calendar: Calendar,
    media: Paperclip,
    link: Link2,
  }[entry.type] || FileText;
  
  const TypeIcon = typeIcon;
  const cfgColor = entry.type === "task" ? "#7C83F7" : 
    entry.type === "note" ? "#F59E0B" : 
    entry.type === "calendar" ? "#38BDF8" : "#9CA3AF";

  const alpha = theme === 'light' ? "0C" : "18";

  return (
    <div className="cat-detail" onClick={handleClickOutside}>
      {/* Header */}
      <div className="cat-detail__header" style={{ background: cfgColor + alpha }}>
        <div className="cat-detail__title-row">
          <TypeIcon size={18} color={cfgColor} />
          <input
            className="cat-detail__title-input"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titel..."
          />
          <button className="cat-detail__delete-btn" onClick={onDelete}>
            <Trash2 size={16} color="#F26565" />
          </button>
        </div>
        <div className="cat-detail__pills">
          <button
            ref={connPillRef}
            className="cat-detail__date-pill"
            onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
            style={
              cat && CC[cat.type]
                ? {
                    background: CC[cat.type].color + "20",
                    borderColor: CC[cat.type].color + "45",
                    color: CC[cat.type].color,
                  }
                : {}
            }
          >
            {cat ? cat.name : t.connectSelection}
          </button>
          
          {(entry.type === "task" || entry.type === "calendar") && (
            <button
              ref={datePillRef}
              className="cat-detail__date-pill"
              onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
              style={
                (entry.due || entry.date)
                  ? {
                      background: cfgColor + "20",
                      borderColor: cfgColor + "45",
                      color: cfgColor,
                    }
                  : {}
              }
            >
              {(entry.due || entry.date) ? fmtDate((entry.due || entry.date), t.locale) : t.addDate}
            </button>
          )}

          {entry.type === "calendar" && (
            <button
              onClick={() => onUpdate({ isBirthday: !entry.isBirthday })}
              style={{
                marginLeft: "auto",
                background: entry.isBirthday ? "rgba(255, 255, 255, 0.15)" : "transparent",
                border: "none",
                borderRadius: "50%",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: entry.isBirthday ? 1 : 0.4,
                transition: "all 0.2s"
              }}
              title="Als Geburtstag markieren"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={entry.isBirthday ? "url(#birthdayGrad)" : "currentColor"} style={{ width: 18, height: 18 }}>
                {entry.isBirthday && (
                  <defs>
                    <linearGradient id="birthdayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F26565" />
                      <stop offset="33%" stopColor="#F59E0B" />
                      <stop offset="66%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                )}
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
              </svg>
            </button>
          )}

          {/* Connection Popup */}
          {showConnSelect && (
            <div className="cat-detail__conn-popup" ref={connPopupRef} onClick={(e) => e.stopPropagation()}>
              <div className="cat-detail__conn-list">
                {allCats.length === 0 ? (
                  <div className="cat-detail__conn-empty">{t.noCats('?').split('\n')[0]}</div>
                ) : (
                  allCats.map(opt => (
                    <button
                      key={opt.id}
                      className="cat-detail__conn-item"
                      onClick={() => {
                        onUpdate({ catId: opt.id });
                        setShowConnSelect(false);
                      }}
                    >
                      <span 
                        className="cat-detail__conn-dot" 
                        style={{ background: (CC[opt.type]?.color || CC.resource.color) }} 
                      />
                      <span className="cat-detail__conn-name">{opt.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                className="cat-detail__conn-none"
                onClick={() => {
                  onUpdate({ catId: null });
                  setShowConnSelect(false);
                }}
              >
                {t.noConnection}
              </button>
            </div>
          )}
        </div>
        
        {/* Date/Time Popup */}
        {(entry.type === "task" || entry.type === "calendar") && showDate && (
          <div ref={dateInputRef} onClick={(e) => e.stopPropagation()} style={{ paddingTop: '8px', zIndex: 10 }}>
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                style={{ marginTop: 0 }}
                value={entry.due || entry.date || ""}
                onChange={(e) => {
                  const patch = entry.type === "task" ? { due: e.target.value } : { date: e.target.value };
                  onUpdate(patch);
                }}
              />
              <input
                type="time"
                className="modal__time-input"
                style={{ marginTop: 0 }}
                value={entry.time || ""}
                onChange={(e) => {
                  onUpdate({ time: e.target.value });
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="cat-detail__body" style={{ flex: 1 }}>
        {entry.type === "note" && (
          <textarea
            className="cat-detail__textarea"
            value={entry.body || ""}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder={t.writeNotePlaceholder}
          />
        )}
        {entry.type === "task" && (
           <textarea
             className="cat-detail__textarea"
             value={entry.note || ""}
             onChange={(e) => onUpdate({ note: e.target.value })}
             placeholder={t.addNotePlaceholder}
           />
        )}
      </div>

      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}

/* ── Create Entry Modal ──────────────────────────────────────── */
function CreateModal({ type, cats, initialCatId, onSave, onClose, t, CC }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  // Multi-Auswahl: Array von ausgewählten Kategorie-IDs
  const [catIds, setCatIds] = useState(initialCatId ? [initialCatId] : []);
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);
  const fileInputRef = useRef(null);

  // Toggle: Kategorie hinzufügen/entfernen
  const toggleCat = (id) => {
    setCatIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMediaGridClick = (mId) => {
    setMediaType(mId);
    if (fileInputRef.current) {
      if (mId === 'image') fileInputRef.current.accept = 'image/*';
      else if (mId === 'video') fileInputRef.current.accept = 'video/*';
      else if (mId === 'audio') fileInputRef.current.accept = 'audio/*';
      else if (mId === 'document') fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,*/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!title) setTitle(file.name);
      setMediaFile(file);
    }
    if (e.target) e.target.value = null;
  };

  const tc =
    type === "task" ? "#7C83F7" : 
    type === "note" ? "#F59E0B" : 
    type === "calendar" ? "#38BDF8" : 
    type === "media" ? "#10B981" : 
    "#7C3AED";

  const label =
    type === "task" ? t.task : 
    type === "note" ? "Notiz" : 
    type === "calendar" ? "Termin" : 
    type === "media" ? "Ressource" : 
    "Quelle";

  const save = () => {
    if (!title.trim()) return;
    // Mindestens das aktuelle Projekt oder keine Zuordnung
    const ids = catIds.length > 0 ? catIds : [null];
    // Pro ausgewählter Kategorie einen Eintrag erstellen
    const entries = ids.map(cid => {
      let finalCid = cid;
      if (type === "calendar" && isBirthday) {
        // Automatische Verknüpfung mit Geburtstage-Ressource
        finalCid = ID_BIRTHDAYS;
      }

      const base = { type, title: title.trim(), catId: finalCid };
      if (type === "task") return { ...base, done: false, note, due: due || null, time: time || null };
      if (type === "note") return { ...base, body };
      if (type === "calendar") return { ...base, date, time, isBirthday };
      if (type === "media") return { ...base, mediaType, mediaData: mediaFile };
      if (type === "link") return { ...base, url: url.trim() };
      return base;
    });
    onSave(entries);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <h3 className="modal__title">{t.newLabel(label)}</h3>
          <button className="modal__close" onClick={onClose}>
            <X size={18} color="#5858A0" />
          </button>
        </div>

        <input
          className="modal__input modal__input--title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ borderColor: tc + "45" }}
        />

        {type === "task" && (
          <>
            <input
              className="modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.addNotePlaceholder}
            />
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                style={{ color: due ? "#EDEEFF" : "#5858A0" }}
              />
              <input
                type="time"
                className="modal__time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ color: time ? "#EDEEFF" : "#5858A0" }}
              />
            </div>
          </>
        )}

        {type === "note" && (
          <textarea
            className="modal__textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.writeNotePlaceholder}
            rows={4}
          />
        )}

        {type === "calendar" && (
          <>
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="modal__time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ color: time ? "#EDEEFF" : "#5858A0" }}
              />
            </div>
            <div className="modal__toggle-row">
              <label htmlFor="isBirthday">Geburtstag</label>
              <label className="modal__switch">
                <input 
                  type="checkbox" 
                  id="isBirthday" 
                  checked={isBirthday} 
                  onChange={(e) => setIsBirthday(e.target.checked)}
                />
                <span className="modal__slider"></span>
              </label>
            </div>
          </>
        )}

        {type === "media" && (
          <div className="modal__media-grid">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            {[
              { id: 'image', Icon: ImageIcon, color: '#0D9488', label: 'Bild' },
              { id: 'video', Icon: VideoIcon, color: '#EF4444', label: 'Video' },
              { id: 'audio', Icon: AudioIcon, color: '#F97316', label: 'Audio' },
              { id: 'document', Icon: DocumentIcon, color: '#0078D4', label: 'Dokument' },
            ].map(m => (
              <button 
                key={m.id}
                className={`modal__media-grid-btn ${mediaType === m.id ? 'modal__media-grid-btn--active' : ''}`}
                onClick={() => handleMediaGridClick(m.id)}
                style={{ color: mediaType === m.id ? m.color : '#5858A0' }}
              >
                <div className="icon-wrapper" style={{ background: m.color }}>
                  <m.Icon size={18} />
                </div>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {type === "link" && (
          <input
            className="modal__input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={{ borderColor: tc + "45" }}
          />
        )}

        {/* Multi-Select Dropdown für Kategorien */}
        {(() => {
          const selectedNames = cats.filter(c => catIds.includes(c.id)).map(c => c.name);
          const summary = selectedNames.length === 0
            ? t.noProject
            : selectedNames.length <= 2
              ? selectedNames.join(", ")
              : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`;

          return (
            <div className="modal__multi-select" style={{ position: "relative" }}>
              <button
                className={`modal__multi-select-btn ${catIds.length > 0 ? "modal__multi-select-btn--has-selection" : ""}`}
                onClick={() => setCatDropOpen(!catDropOpen)}
                type="button"
              >
                <span>{summary}</span>
                <ChevronLeft
                  size={14}
                  style={{ transform: catDropOpen ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
                  color="#5858A0"
                />
              </button>
              {catDropOpen && (
                <div className="modal__multi-select-list">
                  {cats.map((c) => {
                    const isSelected = catIds.includes(c.id);
                    const chipColor = CC[c.type]?.color || "#5858A0";
                    const CIcon = CAT_ICONS[c.type];
                    return (
                      <button
                        key={c.id}
                        className={`modal__multi-select-item ${isSelected ? "modal__multi-select-item--selected" : ""}`}
                        onClick={() => toggleCat(c.id)}
                        type="button"
                      >
                        <span
                          className="modal__multi-select-check"
                          style={isSelected ? { background: chipColor, borderColor: chipColor } : {}}
                        >
                          {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                        </span>
                        {CIcon && <CIcon size={14} color={chipColor} strokeWidth={2.5} />}
                        <span className="modal__multi-select-name">{CC[c.type].sing}: {c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <button
          className={`modal__submit ${
            !title.trim() ? "modal__submit--disabled" : ""
          }`}
          onClick={save}
          style={{ background: tc }}
        >
          Erstellen
        </button>
      </div>
    </div>
  );
}

/* ── New Category Modal ──────────────────────────────────────── */
function NewCatModal({ type, onSave, onClose, t, CC }) {
  const [name, setName] = useState("");
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__icon-row">
          <CatIcon size={20} color={cfg.color} />
          <h3 className="modal__title">{t.newSing(cfg.sing)}</h3>
        </div>
        <input
          className="modal__input modal__input--title"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder(cfg.sing)}
          onKeyDown={(e) =>
            e.key === "Enter" && name.trim() && onSave(name.trim())
          }
          style={{ borderColor: cfg.color + "45" }}
        />
        <button
          className={`modal__submit ${
            !name.trim() ? "modal__submit--disabled" : ""
          }`}
          onClick={() => name.trim() && onSave(name.trim())}
          style={{ background: cfg.color }}
        >
          Erstellen
        </button>
      </div>
    </div>
  );
}

/* ── Onboarding Modal ────────────────────────────────────────── */
function OnboardingModal({ t, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");

  const finish = () => {
    if (name.trim()) onComplete(lang, name.trim());
  };

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <div className="onboarding__logo">PARA·LIST</div>
        
        {step === 0 ? (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{t.welcome}</h2>
            <p className="onboarding__text">{t.onboardingLang}</p>
            <div className="onboarding__langs">
              {["de", "en", "es"].map(l => (
                <button 
                  key={l}
                  className={`onboarding__lang-btn ${lang === l ? "onboarding__lang-btn--active" : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="onboarding__next" onClick={() => setStep(1)}>{t.getStarted}</button>
          </div>
        ) : (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{I18N[lang].onboardingName}</h2>
            <input 
              autoFocus
              className="onboarding__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name..."
              onKeyDown={e => e.key === "Enter" && finish()}
            />
            <button 
              className={`onboarding__next ${!name.trim() ? "onboarding__next--disabled" : ""}`}
              onClick={finish}
            >
              {I18N[lang].getStarted}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Settings Modal ──────────────────────────────────────────── */
function SettingsModal({ user, theme, setTheme, lang, setLang, t, onClose, onUpdateUser }) {
  const [view, setView] = useState("main"); // "main" | "profile" | "feedback"
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");

  const sendFeedback = () => {
    const subject = `Feedback: ${feedbackType === "bug" ? "Bug" : feedbackType === "feature" ? "Feature" : "Verbesserung"}`;
    const mailto = `mailto:kontakt@paulangeles.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(feedbackText)}`;
    window.location.href = mailto;
  };

  const currentTitle = 
    view === "main" ? t.settings : 
    view === "profile" ? t.personalData : 
    t.feedback;

  return (
    <div className="modal" onClick={onClose}>
      <div className={`modal__sheet settings-modal ${view !== "main" ? "settings-modal--sub" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        
        <div className="modal__header">
          {view !== "main" && (
            <button className="settings-modal__back" onClick={() => setView("main")}>
              <ChevronLeft size={20} color="#5858A0" />
            </button>
          )}
          <div className="modal__icon-row">
            {view === "main" && <Settings size={20} className="icon-muted" color="currentColor" />}
            <h3 className="modal__title">{currentTitle}</h3>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} color="#5858A0" />
          </button>
        </div>

        {view === "main" ? (
          <div className="settings-modal__content">
            {/* Apple-style Profile Row */}
            <button className="profile-row" onClick={() => setView("profile")}>
              <div className="profile-row__avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "P"}
              </div>
              <div className="profile-row__info">
                <div className="profile-row__name">{user.name || "User"}</div>
                <div className="profile-row__sub">{t.personalData}</div>
              </div>
              <ChevronRight size={18} color="#5858A0" className="profile-row__chevron" />
            </button>

            <div className="settings-section">
              <div className="settings-label">{t.userName}</div>
              <input 
                className="modal__input"
                value={user.name}
                onChange={(e) => onUpdateUser({ name: e.target.value })}
                placeholder="Name..."
              />
            </div>

            <div className="settings-section">
              <div className="settings-row">
                <span className="settings-label">{t.appearance}</span>
                <div className="theme-toggle">
                  <button 
                    className={`theme-toggle__btn ${theme === "dark" ? "theme-toggle__btn--active" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    {t.dark}
                  </button>
                  <button 
                    className={`theme-toggle__btn ${theme === "light" ? "theme-toggle__btn--active" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    {t.light}
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-row">
                <span className="settings-label">{t.language}</span>
                <div className="theme-toggle">
                  {["de", "en", "es"].map(l => (
                    <button 
                      key={l}
                      className={`theme-toggle__btn ${lang === l ? "theme-toggle__btn--active" : ""}`}
                      onClick={() => setLang(l)}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="settings-section">
              <div className="settings-row">
                <span className="settings-label">{t.feedback}</span>
                <button 
                  className="feedback-trigger-btn"
                  onClick={() => setView("feedback")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              className="modal__submit modal__submit--secondary"
              onClick={onClose}
              style={{ marginTop: '24px' }}
            >
              {t.closeBtn}
            </button>
          </div>
        ) : view === "profile" ? (
          <div className="settings-modal__content settings-modal__content--sub">
             <div className="settings-group">
                <div className="settings-group__title">{t.dataSection}</div>
                <button
                  className="settings-item settings-item--danger"
                  onClick={() => {
                    if (window.confirm(t.deleteConfirm)) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  <div className="settings-item__label">{t.deleteApp}</div>
                  <Trash2 size={16} />
                </button>
             </div>
          </div>
        ) : (
          <div className="settings-modal__content settings-modal__content--sub">
            <div className="feedback-form">
              <div className="feedback-types">
                {[
                  { id: "bug", label: t.bug, desc: t.bugDesc },
                  { id: "improvement", label: t.improvement, desc: t.improvementDesc },
                  { id: "feature", label: t.feature, desc: t.featureDesc }
                ].map(type => (
                  <button 
                    key={type.id}
                    className={`feedback-type-btn ${feedbackType === type.id ? "feedback-type-btn--active" : ""}`}
                    onClick={() => setFeedbackType(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="feedback-callout">
                {feedbackType === "bug" && t.bugDesc}
                {feedbackType === "improvement" && t.improvementDesc}
                {feedbackType === "feature" && t.featureDesc}
              </div>

              <div className="feedback-textarea-group">
                <label className="feedback-label">{t.feedbackQuestion}</label>
                <textarea 
                  className="modal__textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="..."
                  rows={6}
                />
              </div>

              <button 
                className={`modal__submit ${!feedbackText.trim() ? "modal__submit--disabled" : ""}`}
                onClick={sendFeedback}
                style={{ background: "#7C83F7" }}
              >
                {t.send}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   APP ROOT
   ════════════════════════════════════════════════════════════════ */
export default function App() {
  const [state, setState, isLoaded] = usePersistedState(SEED);
  useEffect(() => {
    if (isLoaded) {
      setState(s => {
        let dirty = false;
        const nextState = { ...s };
        if (!nextState.cats.find(c => c.id === ID_BIRTHDAYS)) {
          nextState.cats = [
            ...nextState.cats,
            { id: ID_BIRTHDAYS, type: "resource", name: "Geburtstage", date: null, body: "Alle Geburtstage aus dem Kalender.", tags: ["System"], relatedId: null }
          ];
          dirty = true;
        }
        if (!nextState.tags) {
          const tagMap = new Map();
          nextState.cats.forEach(c => c.tags?.forEach(t => {
            if (!tagMap.has(t)) tagMap.set(t, { id: uid(), name: t, createdAt: new Date().toISOString() });
          }));
          nextState.tags = Array.from(tagMap.values());
          dirty = true;
        }
        return dirty ? nextState : s;
      });
    }
  }, [isLoaded, setState]);

  const updateGlobalTag = (id, newName) => {
    setState((s) => {
      const tag = s.tags?.find(t => t.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      const nextTags = s.tags.map(t => t.id === id ? { ...t, name: newName } : t);
      const nextCats = s.cats.map(c => {
        if (c.tags && c.tags.includes(oldName)) {
          return { ...c, tags: c.tags.map(old => old === oldName ? newName : old) };
        }
        return c;
      });
      return { ...s, tags: nextTags, cats: nextCats };
    });
  };

  const deleteGlobalTag = (id) => {
    setState((s) => {
      const tag = s.tags?.find(t => t.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      const nextTags = s.tags.filter(t => t.id !== id);
      const nextCats = s.cats.map(c => {
        if (c.tags && c.tags.includes(oldName)) {
          return { ...c, tags: c.tags.filter(old => old !== oldName) };
        }
        return c;
      });
      return { ...s, tags: nextTags, cats: nextCats };
    });
  };

  const createGlobalTag = (name) => {
    setState((s) => {
      if (s.tags && s.tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
        return s; // already exists
      }
      const newTag = { id: uid(), name, createdAt: new Date().toISOString() };
      return { ...s, tags: [...(s.tags || []), newTag] };
    });
  };

  const [stack, setStack] = useState([{ view: "home" }]);
  const [tab, setTab] = useState("tasks");
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(null);
  const [newCatType, setNewCatType] = useState(null);

  const theme = state.theme || "dark";
  const lang = state.lang || "de";
  const t = I18N[lang];
  const CC = getCC(t);
  const TABS = getTABS(t);

  const push = (v) => setStack((s) => [...s, v]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const cur = stack[stack.length - 1];

  /* ── mutations ─────────────────────────────────────────────── */
  const addCat = (type, name) =>
    setState((s) => ({
      ...s,
      cats: [
        ...s.cats,
        { id: uid(), type, name, date: null, body: "", tags: [], relatedId: null, archived: false },
      ],
    }));

  const updateCat = (id, patch) =>
    setState((s) => ({
      ...s,
      cats: s.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const deleteCat = (id) => {
    setState((s) => ({ ...s, cats: s.cats.filter((c) => c.id !== id) }));
    pop();
  };

  const addEntry = (entry) =>
    setState((s) => ({
      ...s,
      entries: [...s.entries, { id: uid(), ...entry }],
    }));

  const toggleTask = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    }));

  const updateEntry = (id, patch) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const deleteEntry = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }));

  const notif = computeNotif(state.entries);

  /* ── swipe-back gesture ────────────────────────────────────── */
  const touchX = useRef(0);
  const touchY = useRef(0);
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    
    // Swipe back to previous view
    if (dx > 75 && touchX.current < 45 && stack.length > 1) {
      pop();
      return;
    }

    // Swipe down to open command panel
    if (dy > 80 && Math.abs(dx) < 50 && !panelOpen) {
      // Find the active scroll container based on view
      let scrollEl;
      if (cur.view === "home") scrollEl = document.querySelector('.entry-list');
      else if (cur.view === "catList") scrollEl = document.querySelector('.cat-list__body');
      else if (cur.view === "catDetail" || cur.view === "entryDetail") scrollEl = document.querySelector('.cat-detail__body');

      if (!scrollEl || scrollEl.scrollTop <= 0) {
        setPanelOpen(true);
      }
    }

    // Swipe up to close command panel
    if (dy < -60 && Math.abs(dx) < 50 && panelOpen) {
      const isBackdrop = e.target.classList.contains('command-panel__backdrop');
      const inList = e.target.closest('.command-panel__list');
      const listEl = document.querySelector('.command-panel__list');
      
      // Close if swipe up happens outside of the list (e.g. on backdrop, handle, header), 
      // or if there is no list, or if the list is completely scrolled to the bottom.
      if (isBackdrop || !inList || !listEl || listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight <= 1) {
        setPanelOpen(false);
      }
    }
  };

  /* ── loading state ─────────────────────────────────────────── */
  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <div className="loading__text">PARA·LIST</div>
      </div>
    );
  }

  return (
    <div
      className={`app ${theme === 'light' ? 'light-theme' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CommandPanel
        t={t}
        lang={lang}
        user={state.user}
        notif={notif}
        entries={state.entries}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        onOpenSettings={() => setSettingsOpen(true)}
        onDelete={deleteEntry}
        onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
      />

      {panelOpen && (
        <div
          className="command-panel__backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}

      <div className="main-content">
        {cur.view === "home" && (
          <HomeScreen
            t={t}
            CC={CC}
            TABS={TABS}
            lang={lang}
            state={state}
            tab={tab}
            setTab={setTab}
            onOpenCatType={(type) => push({ view: "catList", type })}
            onAddCat={(type) => {
              setPanelOpen(false);
              setNewCatType(type);
            }}
            onAddEntry={() => {
              setPanelOpen(false);
              setCreating({
                type:
                  tab === "tasks"
                    ? "task"
                    : tab === "notes"
                    ? "note"
                    : "calendar",
                catId: null,
              });
            }}
            toggleTask={toggleTask}
            deleteEntry={deleteEntry}
            onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
            onOpenArchive={(currentTab) => {
              setPanelOpen(false);
              push({ view: "archive", tab: currentTab });
            }}
            onArchiveEntry={(id) => updateEntry(id, { archived: true })}
          />
        )}
        
        {cur.view === "archive" && (
          <ArchiveScreen
            t={t}
            CC={CC}
            lang={lang}
            entries={state.entries}
            cats={state.cats}
            tab={cur.tab || tab}
            onDelete={deleteEntry}
            onBack={pop}
            toggleTask={toggleTask}
            onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
            onRestoreNote={(id) => updateEntry(id, { archived: false })}
            onOpenCat={(c) => push({ view: "catDetail", catId: c.id })}
          />
        )}

        {cur.view === "catList" && (
          <CatListScreen
            t={t}
            CC={CC}
            type={cur.type}
            cats={state.cats.filter((c) => c.type === cur.type && !c.archived)}
            onOpen={(cat) => push({ view: "catDetail", catId: cat.id })}
            onAdd={() => setNewCatType(cur.type)}
            onBack={pop}
            onOpenArchive={(type) => push({ view: "archive", tab: type })}
          />
        )}

        {cur.view === "catDetail" &&
          (() => {
            const cat = state.cats.find((c) => c.id === cur.catId);
            if (!cat) {
              return (
                <div className="cat-detail">
                  <div className="cat-detail__header">
                    <div className="cat-detail__title-row">
                      <Square size={18} color={CC.resource.color} />
                      <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
                        Eintrag nicht gefunden
                      </div>
                    </div>
                  </div>
                  <div className="nav-bottom">
                    <button className="nav-bottom__back" onClick={pop}>
                      <ChevronLeft size={20} color="#EDEEFF" />
                    </button>
                  </div>
                </div>
              );
            }
            
            // Inclusive filtering: include entries from "child" categories
            const childIds = state.cats.filter(c => c.relatedId === cat.id).map(c => c.id);
            const inclusiveEntries = state.entries.filter(e => {
              const isBaseEntry = e.catId === cat.id || childIds.includes(e.catId);
              // Wenn wir in der "Geburtstage" Ressource sind, zeigen wir alle Geburtstage an
              if (cat.id === ID_BIRTHDAYS) {
                return isBaseEntry || (e.type === "calendar" && e.isBirthday);
              }
              return isBaseEntry;
            }).map((e) => {
              if (cat.id === ID_BIRTHDAYS && e.type === "calendar" && e.isBirthday) {
                const nextBd = getNextBirthday(e.date);
                if (nextBd) {
                  return { ...e, date: nextBd.date, title: `${e.title} (${nextBd.age} J.)` };
                }
              }
              return e;
            });
            
            return (
              <CatDetailScreen
                t={t}
                CC={CC}
                lang={lang}
                cat={cat}
                allCats={state.cats}
                entries={inclusiveEntries}
                tags={state.tags}
                onCreateTag={createGlobalTag}
                onUpdateTag={updateGlobalTag}
                onDeleteTag={deleteGlobalTag}
                onUpdate={(p) => updateCat(cat.id, p)}
                onLinkResource={(resourceId) => updateCat(resourceId, { relatedId: cat.id })}
                onDelete={() => {
                  if (window.confirm(t.confirmDelete(cat.name)))
                    deleteCat(cat.id);
                }}
                onBack={pop}
                onHome={() => setStack([{ view: "home" }])}
                toggleTask={toggleTask}
                deleteEntry={deleteEntry}
                onAddEntry={(type) =>
                  setCreating({ type, catId: cat.id })
                }
                onOpenCat={(resCat) => push({ view: "catDetail", catId: resCat.id })}
                onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
              />
            );
          })()}

        {cur.view === "entryDetail" &&
          (() => {
            const entry = state.entries.find((e) => e.id === cur.entryId);
            if (!entry) {
              return (
                <div className="cat-detail">
                  <div className="cat-detail__header">
                    <div className="cat-detail__title-row">
                      <FileText size={18} color="#5858A0" />
                      <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
                        Eintrag nicht gefunden
                      </div>
                    </div>
                  </div>
                  <div className="nav-bottom">
                    <button className="nav-bottom__back" onClick={pop}>
                      <ChevronLeft size={20} color="#EDEEFF" />
                    </button>
                  </div>
                </div>
              );
            }
            
            const cat = state.cats.find(c => c.id === entry.catId);
            
            return (
              <EntryDetailScreen
                t={t}
                CC={CC}
                theme={theme}
                entry={entry}
                cat={cat}
                allCats={state.cats}
                onUpdate={(p) => updateEntry(entry.id, p)}
                onDelete={() => {
                  deleteEntry(entry.id);
                  pop();
                }}
                onBack={pop}
              />
            );
          })()}
      </div>

      {settingsOpen && (
        <SettingsModal
          t={t}
          lang={lang}
          setLang={(l) => setState(s => ({ ...s, lang: l }))}
          theme={theme}
          setTheme={(t) => setState(s => ({ ...s, theme: t }))}
          user={state.user}
          onUpdateUser={(patch) => setState(s => ({ ...s, user: { ...s.user, ...patch } }))}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {state.user.name === "" && (
        <OnboardingModal 
          t={t}
          onComplete={(l, n) => setState(s => ({ ...s, lang: l, user: { name: n } }))}
        />
      )}

      {creating && (
        <CreateModal
          t={t}
          CC={CC}
          type={creating.type}
          cats={state.cats}
          initialCatId={creating.catId}
          onSave={(entries) => {
            // Mehrere Einträge auf einmal speichern (Multi-Select)
            entries.forEach(e => addEntry(e));
            setCreating(null);
          }}
          onClose={() => setCreating(null)}
        />
      )}

      {newCatType && (
        <NewCatModal
          t={t}
          CC={CC}
          type={newCatType}
          onSave={(name) => {
            addCat(newCatType, name);
            setNewCatType(null);
          }}
          onClose={() => setNewCatType(null)}
        />
      )}
    </div>
  );
}
