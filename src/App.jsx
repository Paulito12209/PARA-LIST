import { useState, useRef, useCallback, useEffect } from "react";
import { I18N, getCC, getTABS } from "./i18n";
import { usePersistedState } from "./hooks/useStorage";
import { useInactivity } from "./hooks/useInactivity";
import {
  Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check,
  Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search,
  Link2, Pencil, Paperclip, Image as ImageIcon,
  CheckCircle2, Archive, ArchiveRestore, Moon, Sun,
  Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon,
  Star, MoreVertical
} from "lucide-react";
import "./App.scss";

/* ── helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const TODAY = (() => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
})();
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

const fmtRelative = (ts, locale) => {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  
  const d = new Date(ts);
  const t = new Date();
  t.setHours(0,0,0,0);
  const d0 = new Date(ts);
  d0.setHours(0,0,0,0);
  
  if (t.getTime() === d0.getTime()) return "heute";
  t.setDate(t.getDate() - 1);
  if (t.getTime() === d0.getTime()) return "gestern";
  
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
};

const getTaskGroup = (due, locale, hideDayNumber = false) => {
  if (!due) return null;
  const d = new Date(due + "T12:00");
  const t = new Date(TODAY + "T12:00");
  const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return null; 

  let weekday = d.toLocaleDateString(locale, { weekday: 'short' });
  if (weekday.length > 3) weekday = weekday.substring(0, 2);
  const day = String(d.getDate()).padStart(2, '0'); 
  const left = hideDayNumber ? `${weekday}.` : `${weekday}., ${day}`;

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

  let leftLabel = "";
  if (diffDays === 1) {
    leftLabel = "Morgen";
  } else if (diffDays === 2) {
    leftLabel = "Übermorgen";
  } else if (weekDiff === 0) {
    leftLabel = d.toLocaleDateString(locale, { weekday: 'long' });
  } else if (weekDiff === 1) {
    leftLabel = "Nächste Woche";
  } else {
    const mDiff = (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth());
    if (d.getFullYear() > t.getFullYear()) {
      leftLabel = d.getFullYear().toString();
    } else if (mDiff === 0) {
      leftLabel = I18N[locale.slice(0,2)]?.thisMonth || "Dieser Monat";
    } else if (mDiff === 1) {
      leftLabel = "Nächsten Monat";
    } else {
      leftLabel = d.toLocaleDateString(locale, { month: 'long' });
    }
  }

  const rightLabel = d.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });

  return { left: leftLabel, right: rightLabel, sortKey: d.getTime() };
}

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

const CustomSettingsIcon = ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="10 10 20 20" strokeWidth={strokeWidth} stroke={color} width={size} height={size} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M28 15H19" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25H13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25C22 25.7956 22.3161 26.5587 22.8787 27.1213C23.4413 27.6839 24.2044 28 25 28C25.7956 28 26.5587 27.6839 27.1213 27.1213C27.6839 26.5587 28 25.7956 28 25C28 24.2044 27.6839 23.4413 27.1213 22.8787C26.5587 22.3161 25.7956 22 25 22C24.2044 22 23.4413 22.3161 22.8787 22.8787C22.3161 23.4413 22 24.2044 22 25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15C12 15.394 12.0776 15.7841 12.2284 16.1481C12.3791 16.512 12.6001 16.8427 12.8787 17.1213C13.1573 17.3999 13.488 17.6209 13.8519 17.7716C14.2159 17.9224 14.606 18 15 18C15.394 18 15.7841 17.9224 16.1481 17.7716C16.512 17.6209 16.8427 17.3999 17.1213 17.1213C17.3999 16.8427 17.6209 16.512 17.7716 16.1481C17.9224 15.7841 18 15.394 18 15C18 14.606 17.9224 14.2159 17.7716 13.8519C17.6209 13.488 17.3999 13.1573 17.1213 12.8787C16.8427 12.6001 16.512 12.3791 16.1481 12.2284C15.7841 12.0776 15.394 12 15 12C14.606 12 14.2159 12.0776 13.8519 12.2284C13.488 12.3791 13.1573 12.6001 12.8787 12.8787C12.6001 13.1573 12.3791 13.488 12.2284 13.8519C12.0776 14.2159 12 14.606 12 15Z" />
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
  theme: "light",
  lang: "de",
  user: { name: "" },
  cats: [
    { id: "p1", type: "project",  name: "Onboarding App", date: "2026-04-30", body: "", tags: ["App"], relatedId: "a1", archived: false },
    { id: "p2", type: "project",  name: "Nächsten Monat 4x ins Gym", date: "2026-05-15", body: "Woche 1: 2km locker\nWoche 2: 3km Intervalle", tags: ["Sport"], relatedId: "a2", archived: false },
    { id: "p3", type: "project",  name: "Aufgeräumte Wohnung", date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a1", type: "area",     name: "Arbeit",            date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a2", type: "area",     name: "Fitness",           date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a3", type: "area",     name: "Finanzen",          date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a4", type: "area",     name: "Familie",           date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a5", type: "area",     name: "Freunde",           date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a6", type: "area",     name: "Ernährung",         date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a7", type: "area",     name: "Studium",           date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "a8", type: "area",     name: "Organisation",      date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r1", type: "resource", name: "Serien",            date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r2", type: "resource", name: "Filme",             date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r3", type: "resource", name: "Einkaufsliste",     date: null, body: "", tags: [], relatedId: "a3", archived: false },
    { id: "r4", type: "resource", name: "Wunschliste",       date: null, body: "", tags: [], relatedId: null, archived: false },
    { id: "r5", type: "resource", name: "PARA-Methode",      date: null, body: "Stöbert rechts durch die 6 Lesezeichen, um mehr Kontext zur PARA-Methode zu entdecken.", tags: ["Produktivität"], relatedId: "a8", archived: false },
    { id: ID_BIRTHDAYS, type: "resource", name: "Geburtstage", date: null, body: "Alle Geburtstage aus dem Kalender.", tags: ["System"], relatedId: null, archived: false },
  ],
  entries: [
    { id: "e1", type: "task", title: "Aufgaben erledigen: Im Menu auswählen", done: false, note: "Onboarding abschließen", due: TODAY, catId: "p1" },
    { id: "e2", type: "task", title: "Aufgabe löschen: Nach links ziehen", done: false, note: "", due: TODAY, catId: "p1" },
    { id: "e3", type: "task", title: "Swipe nach links & erstelle eine Notiz", done: false, note: "", due: TODAY, catId: "p1" },
    { id: "e4", type: "task", title: "Erstelle dein Geburtstag im Kalender", done: false, note: "", due: TODAY, catId: "p1" },
    { id: "e5", type: "task", title: "Ändere dein Profilbild in den Einstellungen", done: false, note: "", due: TODAY, catId: "p1" },
    { id: "e6", type: "task", title: "Klicke auf Ressourcen & öffne 'PARA-Methode'", done: false, note: "", due: TODAY, catId: "p1" },
    { id: "e-para-vid", type: "link", title: "Vorstellung der PARA-Methode", url: "https://www.youtube.com/watch?v=8sdnM-vdqvI", catId: "r5" },
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

function SwipeToDelete({ children, onDelete, isActive }) {
  const [swiping, setSwiping] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isHeld = useRef(false);

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    startPos.current = { x: cx, y: cy };
    isHeld.current = false;
    
    pressTimer.current = setTimeout(() => {
       isHeld.current = true;
       setSwiping(true);
       if (navigator.vibrate) navigator.vibrate(20);
    }, 200); 
  };

  const handlePointerMove = (e) => {
    if (!pressTimer.current && !isHeld.current) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const dx = cx - startPos.current.x;
    const dy = cy - startPos.current.y;

    if (!isHeld.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    } else {
      if (e.cancelable) e.preventDefault();
      if (dx < 0) {
         setOffsetX(dx);
      } else {
         setOffsetX(0);
      }
    }
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (isHeld.current) {
      if (offsetX < -100) {
        onDelete();
      } else {
        setOffsetX(0);
      }
      setSwiping(false);
      isHeld.current = false;
    }
  };

  // Roter Hintergrund nur sichtbar wenn aktiv geswipt wird
  const showDeleteBg = swiping && offsetX < 0;

  return (
    <div className="swipe-delete-wrapper" style={{ position: 'relative', overflow: 'visible' }}>
      <div style={{
          position: 'absolute', inset: '0',
          background: showDeleteBg ? '#DC2626' : 'transparent',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '20px',
          zIndex: 0,
          transition: 'background 0.2s ease'
      }}>
          {showDeleteBg && <Trash2 color="#fff" size={20} />}
      </div>
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s',
          touchAction: swiping ? 'none' : 'pan-y',
          position: 'relative',
          zIndex: isActive ? 50 : 1,
          willChange: 'transform'
        }}
        onClick={(e) => {
           if (Math.abs(offsetX) > 5) {
               e.stopPropagation();
               e.preventDefault();
           }
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Command Panel ───────────────────────────────────────────── */
function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings, onDelete, t, onOpenEntry, theme, setTheme, lang, setLang }) {
  const [subTab, setSubTab] = useState("today");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX.current;
    const dy = touchEndY - touchStartY.current;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      e.stopPropagation();
      if (dx > 0 && subTab === "overdue") {
        setSubTab("today");
        if (navigator.vibrate) navigator.vibrate(10);
      } else if (dx < 0 && subTab === "today") {
        setSubTab("overdue");
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  };

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
    <div 
      className={`command-panel command-panel--${open ? "open" : "closed"}`}
      onTouchStart={open ? handleTouchStart : undefined}
      onTouchEnd={open ? handleTouchEnd : undefined}
    >


      <div className="command-panel__header" onClick={onToggle} style={{ cursor: 'pointer' }}>
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
          {!open && (
            <button
              className="command-panel__bell command-panel__profile-btn"
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              style={user.avatar ? { padding: 0 } : {}}
            >
              {user.avatar ? (
                <div className="command-panel__profile-avatar">
                  <img src={user.avatar} alt="Avatar" />
                  <div className="command-panel__profile-hover">
                    <CustomSettingsIcon size={18} color="#fff" />
                  </div>
                </div>
              ) : (
                <CustomSettingsIcon size={17} className="icon-muted" color="currentColor" />
              )}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div 
          className="command-panel__drawer"
          style={{ touchAction: 'pan-y' }}
        >


          <div className="command-panel__tabs">
            <button
              className={`command-panel__tab ${subTab === "today" ? "command-panel__tab--active-today" : ""}`}
              onClick={() => setSubTab("today")}
            >
              Heute {todayEntries.length > 0 && <span className="command-panel__badge command-panel__badge--today">{todayEntries.length}</span>}
            </button>
            <button
              className={`command-panel__tab ${subTab === "overdue" ? "command-panel__tab--active-overdue" : ""}`}
              onClick={() => setSubTab("overdue")}
            >
              Überfällig {overdueEntries.length > 0 && <span className="command-panel__badge command-panel__badge--overdue">{overdueEntries.length}</span>}
            </button>
          </div>

          <div className="command-panel__list" key={subTab}>

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
                            ? "#1D4ED8"
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
        <div 
          className="command-panel__handle-bar" 
          style={notif ? { background: notif.color, opacity: 1 } : {}}
        />
        {open && (
          <div className="command-panel__quick-settings" onClick={(e) => e.stopPropagation()}>
            <div className="command-panel__qs-pill">
              {/* Sprachen: DE / EN / ES */}
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'de' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('de')}
                title="Deutsch"
              >
                🇩🇪
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'en' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('en')}
                title="English"
              >
                🇬🇧
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'es' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('es')}
                title="Español"
              >
                🇪🇸
              </button>

              {/* Vertikaler Divider */}
              <div className="command-panel__qs-divider" />

              {/* Darstellung: Moon / Sun */}
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${theme === 'dark' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${theme === 'light' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
            </div>
            
            {/* Settings-Button */}
            <button
              className="command-panel__qs-settings-btn"
              onClick={() => onOpenSettings()}
              style={user.avatar ? { padding: 0 } : {}}
            >
              {user.avatar ? (
                <div className="command-panel__profile-avatar" style={{ width: 32, height: 32, borderRadius: '50%' }}>
                  <img src={user.avatar} alt="Avatar" style={{ borderRadius: '50%' }} />
                </div>
              ) : (
                <CustomSettingsIcon size={18} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Entry Meta Tags ─────────────────────────────────────────── */
function EntryMetaTags({ entry, cats, CC }) {
  const ids = entry.catIds || (entry.catId ? [entry.catId] : []);
  if (ids.length === 0) return null;

  const linked = cats.filter((c) => ids.includes(c.id));
  const projs = linked.filter((c) => c.type === "project");
  const areas = linked.filter((c) => c.type === "area");
  const res   = linked.filter((c) => c.type === "resource");

  return (
    <>
      {projs.length > 0 && (
        <span
          className="task-item__cat-tag"
          style={{ color: CC.project.color, background: 'var(--pill-project-bg)' }}
        >
          {projs[0].name}{projs.length > 1 ? ` +${projs.length - 1}` : ""}
        </span>
      )}
      {areas.length > 0 && (
        <span
          className="task-item__cat-tag"
          style={{ color: CC.area.color, background: 'var(--pill-area-bg)' }}
        >
          {areas[0].name}{areas.length > 1 ? ` +${areas.length - 1}` : ""}
        </span>
      )}
      {res.length > 0 && (
        <span
          className="task-item__cat-tag"
          style={{
            color: CC.resource.color,
            background: 'var(--pill-resource-bg)',
          }}
        >
          <Square size={10} color={CC.resource.color} strokeWidth={2.5} style={{ marginRight: 3 }} />
          {res[0].name.trim()}{res.length > 1 ? ` +${res.length - 1}` : ""}
        </span>
      )}
    </>
  );
}

/* ── Task List ───────────────────────────────────────────────── */
function TaskList({ entries, cats, onToggle, onToggleStar, onUpdateEntry, onDelete, t, CC, grouped, color, onOpenEntry, isHome, isArchive }) {
  // State für Kontextmenü, Datum-Popup und Pill-Popup (nur Home)
  const [menuEntryId, setMenuEntryId] = useState(null);
  const [dateEntryId, setDateEntryId] = useState(null);
  // pillPopup: { entryId, type, showAdd } – welches Pill-Popup offen ist
  const [pillPopup, setPillPopup] = useState(null);
  const menuRef = useRef(null);
  const pillPopupRef = useRef(null);
  // Flag: unterdrückt den nächsten Click nach dem Schließen eines Popups
  const suppressNextClick = useRef(false);

  // Kontextmenü schließen bei Klick außerhalb
  useEffect(() => {
    if (!menuEntryId) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuEntryId(null);
        // Nächsten Click unterdrücken, damit kein Eintrag geöffnet wird
        suppressNextClick.current = true;
        requestAnimationFrame(() => {
          setTimeout(() => { suppressNextClick.current = false; }, 0);
        });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuEntryId]);

  // Pill-Popup schließen bei Klick außerhalb
  useEffect(() => {
    if (!pillPopup) return;
    const close = (e) => {
      if (pillPopupRef.current && !pillPopupRef.current.contains(e.target)) {
        setPillPopup(null);
        // Nächsten Click unterdrücken
        suppressNextClick.current = true;
        requestAnimationFrame(() => {
          setTimeout(() => { suppressNextClick.current = false; }, 0);
        });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pillPopup]);

  const renderItem = (e) => {
    const overdue = isOld(e.due) && !e.done;

    // ── Home-Ansicht: Neues Karten-Design ──
    if (isHome) {
      const ids = e.catIds || (e.catId ? [e.catId] : []);
      const linked = cats.filter((c) => ids.includes(c.id));
      // Mehrfach-Verknüpfungen pro Kategorie
      const projs = linked.filter(c => c.type === "project");
      const areas = linked.filter(c => c.type === "area");
      const ress  = linked.filter(c => c.type === "resource");

      // Icons pro Kategorie
      const PILL_ICONS = { project: Circle, area: Triangle, resource: Square };

      // Hilfsfunktion: Rendert eine PARA-Pille (Icon oder Name+X)
      const renderParaPill = (type, items) => {
        const PillIcon = PILL_ICONS[type];
        const cc = CC[type];
        const isPopupOpen = pillPopup && pillPopup.entryId === e.id && pillPopup.type === type;
        const label = type === 'project' ? t.projectSing : type === 'area' ? t.areaSing : t.resourceSing;

        // Verfügbare Einträge dieser Kategorie (nicht archiviert)
        const available = cats.filter(c => c.type === type && !c.archived && !ids.includes(c.id));

        return (
          <div className="task-item__pill-wrap" key={type}>
            {/* Pille: Icon wenn leer, Name wenn verknüpft */}
            {items.length === 0 ? (
              <button
                className="task-item__pill task-item__pill--icon-btn"
                style={{ color: cc.color }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setPillPopup(isPopupOpen ? null : { entryId: e.id, type, showAdd: true });
                }}
              >
                <PillIcon size={12} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                className="task-item__pill task-item__pill--cat-btn"
                style={{ color: cc.color, background: `var(--pill-${type}-bg)` }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setPillPopup(isPopupOpen ? null : { entryId: e.id, type, showAdd: false });
                }}
              >
                {items[0].name}{items.length > 1 ? ` +${items.length - 1}` : ''}
              </button>
            )}

            {/* Popup-Dropdown */}
            {isPopupOpen && (
              <div
                className="task-item__pill-popup"
                ref={pillPopupRef}
                onClick={(ev) => ev.stopPropagation()}
              >
                {/* Verknüpfte Einträge */}
                {items.length > 0 && (
                  <>
                    {items.map(item => (
                      <div key={item.id} className="task-item__pill-popup-item">
                        <PillIcon size={10} color={cc.color} strokeWidth={2.5} />
                        <span className="task-item__pill-popup-name">{item.name}</span>
                        <button
                          className="task-item__pill-popup-remove"
                          onClick={() => {
                            // Verknüpfung entfernen
                            const nextIds = ids.filter(id => id !== item.id);
                            onUpdateEntry && onUpdateEntry(e.id, { catIds: nextIds, catId: nextIds[0] || null });
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="task-item__pill-popup-divider" />
                  </>
                )}

                {/* Hinzufügen-Zeile */}
                {!pillPopup.showAdd ? (
                  <button
                    className="task-item__pill-popup-add"
                    onClick={() => setPillPopup({ ...pillPopup, showAdd: true })}
                  >
                    <Plus size={12} />
                    <span>{label}</span>
                  </button>
                ) : (
                  <>
                    {available.length === 0 ? (
                      <div className="task-item__pill-popup-empty">
                        {t.noCats(cc.label).split('\n')[0]}
                      </div>
                    ) : (
                      available.map(opt => (
                        <button
                          key={opt.id}
                          className="task-item__pill-popup-option"
                          onClick={() => {
                            // Verknüpfung hinzufügen
                            const nextIds = [...ids, opt.id];
                            onUpdateEntry && onUpdateEntry(e.id, { catIds: nextIds, catId: nextIds[0] || null });
                            setPillPopup({ ...pillPopup, showAdd: false });
                          }}
                        >
                          <PillIcon size={10} color={cc.color} strokeWidth={2} style={{ opacity: 0.5 }} />
                          <span>{opt.name}</span>
                        </button>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      };

      return (
        <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)} isActive={menuEntryId === e.id || dateEntryId === e.id || (pillPopup && pillPopup.entryId === e.id)}>
          <div
            className={`task-item task-item--home ${e.done ? "task-item--done" : ""}`}
            onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
          >
            <div className="task-item__body">
              {/* Zeile 1: Titel + Stern + Menü */}
              <div className="task-item__top-row">
                <div
                  className={`task-item__title ${e.done ? "task-item__title--done" : ""}`}
                >
                  {e.title}
                </div>
                <div className="task-item__actions-home">
                  <button
                    className="task-item__star-btn"
                    onClick={(ev) => { ev.stopPropagation(); onToggleStar && onToggleStar(e.id); }}
                  >
                    <Star
                      size={18}
                      fill={e.starred ? '#F59E0B' : 'none'}
                      color={e.starred ? '#F59E0B' : '#C0C0D0'}
                      strokeWidth={e.starred ? 0 : 1.5}
                    />
                  </button>
                  <button
                    className="task-item__menu-btn"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setMenuEntryId(menuEntryId === e.id ? null : e.id);
                    }}
                  >
                    <MoreVertical size={18} color="#C0C0D0" />
                  </button>
                </div>
              </div>

              {/* Zeile 2: Notiz-Platzhalter */}
              <div className="task-item__note-hint">
                {e.note || t.addNotePlaceholder}
              </div>

              {/* Zeile 3: Pillen-Buttons */}
              <div className="task-item__pills">
                {/* Datum-/Uhrzeit-Pille – Tasks: due, Kalender: date+time, Notizen: nur wenn date vorhanden */}
                {e.type === 'calendar' ? (
                  <span
                    className="task-item__pill task-item__pill--date"
                    style={{ cursor: 'default' }}
                  >
                    <Calendar size={12} />
                    {e.date && <span>{isToday(e.date) ? t.todayCap : fmtDate(e.date, t.locale)}</span>}
                    {e.time && <span>· {e.time} {t.oclock}</span>}
                  </span>
                ) : e.type !== 'note' ? (
                  <button
                    className={`task-item__pill task-item__pill--date ${overdue ? 'task-item__pill--overdue' : ''}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setDateEntryId(dateEntryId === e.id ? null : e.id);
                    }}
                  >
                    <Calendar size={12} />
                    {e.due && <span>{isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}</span>}
                  </button>
                ) : null}

                {/* PARA-Pillen: Projekt, Area, Ressource */}
                {renderParaPill('project', projs)}
                {renderParaPill('area', areas)}
                {renderParaPill('resource', ress)}
              </div>

              {/* Datum-Popup (expandiert unter den Pillen) */}
              {dateEntryId === e.id && (
                <div className="task-item__date-popup" onClick={(ev) => ev.stopPropagation()}>
                  <input
                    type="date"
                    className="task-item__date-input"
                    value={e.due || ""}
                    autoFocus
                    onChange={(ev) => {
                      onUpdateEntry && onUpdateEntry(e.id, { due: ev.target.value || null });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Kontextmenü */}
            {menuEntryId === e.id && (
              <div className="task-item__context-menu" ref={menuRef} onClick={(ev) => ev.stopPropagation()}>
                <button
                  className="task-item__context-menu-item"
                  onClick={() => { onToggle(e.id); setMenuEntryId(null); }}
                >
                  <Check size={14} />
                  <span>{e.done ? 'Als offen markieren' : 'Erledigt'}</span>
                </button>
                <button
                  className="task-item__context-menu-item"
                  onClick={() => { onOpenEntry && onOpenEntry(e); setMenuEntryId(null); }}
                >
                  <Edit2 size={14} />
                  <span>Bearbeiten</span>
                </button>
                <div className="task-item__context-menu-divider" />
                <button
                  className="task-item__context-menu-item task-item__context-menu-item--danger"
                  onClick={() => { onDelete(e.id); setMenuEntryId(null); }}
                >
                  <Trash2 size={14} />
                  <span>Löschen</span>
                </button>
              </div>
            )}
          </div>
        </SwipeToDelete>
      );
    }

    // ── Standard-Ansicht (Kategorie-Detail etc.) ──
    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div
          className={`task-item ${e.done && !isArchive ? "task-item--done" : ""} ${isArchive ? "task-item--archive" : ""}`}
          onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
        >
          <div className="task-item__body">
            <div
              className={`task-item__title ${
                e.done && !isArchive ? "task-item__title--done" : ""
              }`}
            >
              {e.title}
            </div>
            
            <div className="task-item__meta">
              {e.due && (
                <span
                  className={`task-item__due ${overdue ? "task-item__due--overdue" : ""}`}
                >
                  {isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}
                  {e.time && ` · ${e.time} ${t.oclock}`}
                </span>
              )}
              <EntryMetaTags entry={e} cats={cats} CC={CC} />
            </div>
          </div>
          {isArchive ? (
            <button
              className="task-item__archive-restore-btn"
              onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
            >
              <ArchiveRestore size={16} />
            </button>
          ) : (
            <button
              className={`task-item__checkbox ${
                e.done ? "task-item__checkbox--checked" : ""
              }`}
              onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
            >
              {e.done && <Check size={12} color="#7C83F7" strokeWidth={3} />}
            </button>
          )}
        </div>
      </SwipeToDelete>
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
      const g = getTaskGroup(e.due, t.locale, true);
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
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header task-group-header--today">
            <span className="task-group-header__left">Heute</span>
          </div>
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}

/* ── Note List ───────────────────────────────────────────────── */
function NoteList({ entries, cats, onDelete, CC, grouped, color, t, onOpenEntry, onArchiveEntry, isHome, isArchive }) {
  const renderItem = (e) => {
    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div 
          className={`note-item ${isHome ? "note-item--home" : ""} ${isArchive ? "note-item--archive" : ""}`} 
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          <div className="note-item__header">
            <div className="note-item__body">
              <div className="note-item__title">{e.title}</div>
              {e.body && <div className="note-item__excerpt">{e.body}</div>}
            </div>
            <button
               className="note-item__archive-btn"
               onClick={(ev) => {
                 ev.stopPropagation();
                 onArchiveEntry && onArchiveEntry(e.id);
               }}
            >
               {isArchive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px', lineHeight: 1 }}>
            {!isHome && (
              <span className="task-item__due" style={{ marginTop: 0 }}>
                {fmtRelative(e.createdAt, t.locale)}
              </span>
            )}
            <EntryMetaTags entry={e} cats={cats} CC={CC} />
          </div>
        </div>
      </SwipeToDelete>
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
      const g = getTaskGroup(d, t.locale, true);
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
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header task-group-header--today">
            <span className="task-group-header__left">Heute</span>
          </div>
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}

/* ── Calendar List ───────────────────────────────────────────── */
function CalList({ entries, cats, onDelete, t, CC, grouped, color, onOpenEntry, isHome, isArchive }) {
  const renderItem = (e) => {
    const past = e.date && e.date < TODAY;
    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div
          className={`cal-item ${isToday(e.date) ? "cal-item--today" : ""} ${
            past && !isArchive ? "cal-item--past" : ""
          } ${isHome ? "cal-item--home" : ""} ${isArchive ? "cal-item--archive" : ""}`}
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          <div className="cal-item__row">
            {!isHome && (
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
            )}
            <div className="cal-item__info">
              <div className="cal-item__title">{e.title}</div>
              {e.time && <div className="cal-item__time">{e.time} Uhr</div>}
              <div className="cal-item__tags">
                <EntryMetaTags entry={e} cats={cats} CC={CC} />
              </div>
            </div>
            {isArchive && (
              <button
                className="task-item__archive-restore-btn"
                style={{ marginLeft: '12px' }}
                onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); /* In archive context, onDelete acts as toggle for some lists? Need to check. */ }}
              >
                <ArchiveRestore size={16} />
              </button>
            )}
          </div>
        </div>
      </SwipeToDelete>
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
      const g = getTaskGroup(d, t.locale, true);
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
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header task-group-header--today">
            <span className="task-group-header__left">Heute</span>
          </div>
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`}>
          <div className="task-group-header">
            <span className="task-group-header__left">{g.left}</span>
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
          <EntryMetaTags entry={e} cats={cats} CC={CC} />
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
    const ytId = getYouTubeVideoId(e.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
    return (
      <div key={e.id} className="media-item media-item--link">
        <div className="media-item__header-row">
          <div className="media-item__title-box">
             <div className="media-item__icon-mini" style={{ color: "#7C3AED" }}>
               <BookmarkIcon size={14} />
             </div>
             <div className="media-item__title">{e.title}</div>
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
        
        <div className="media-item__content">
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
          <div className="media-item__footer-meta">
            {e.url && <div className="media-item__meta">{e.url}</div>}
            <EntryMetaTags entry={e} cats={cats} CC={CC} />
          </div>
        </div>
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
  toggleStar,
  updateEntry,
  deleteEntry,
  onOpenEntry,
  onOpenArchive,
  onArchiveEntry,
  panelOpen,
  expandedCat,
  setExpandedCat,
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
  
  const cardPressTimer = useRef(null);
  const isCardLongPress = useRef(false);

  const handleCardPointerDown = (type) => {
    isCardLongPress.current = false;
    cardPressTimer.current = setTimeout(() => {
      isCardLongPress.current = true;
      setExpandedCat(type);
    }, 200);
  };

  const handleCardPointerUp = () => {
    if (cardPressTimer.current) clearTimeout(cardPressTimer.current);
  };

  const handleCardPointerLeave = () => {
    if (cardPressTimer.current) clearTimeout(cardPressTimer.current);
  };

  const handleCardClick = (e, type) => {
    if (isCardLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setExpandedCat(type);
    onOpenCatType(type);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX.current;
    
    if (Math.abs(dx) > 60 && !panelOpen) {

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
      // Erlaube Klicks auf den Hintergrund (currentTarget) oder das Empty-Placeholder-Element
      const isEmptyPlaceholder = e.target.closest('.entry-list__empty') || e.target.closest('.cat-detail__section-empty');
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
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

  const firstGroupLabel = (() => {
    if (!tabEntries || tabEntries.length === 0) return null;
    let hasToday = false;
    const futureDates = [];
    tabEntries.forEach(e => {
       const d = e.due || e.date;
       if (!d || isToday(d) || isOld(d)) hasToday = true;
       else futureDates.push(d);
    });
    if (hasToday) return "Heute";
    if (futureDates.length > 0) {
       futureDates.sort((a,b) => new Date(a) - new Date(b));
       const d = futureDates[0];
       const g = getTaskGroup(d, t.locale, true);
       return g.right ? `${g.left} ・ ${g.right}` : g.left;
    }
    return null;
  })();

  return (
    <div className={`home home--${tab}`}>
      <div className="home__categories-container">
        {/* Überschrift + Ordner-Icon (wie bei den Subtabs unten) */}
        <div className="home__categories-header">
          <span className="home__categories-title">Ordner</span>
          <div className="home__categories-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={16} height={16} className="home__categories-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
          </div>
        </div>

        {/* Horizontaler Swipe-Track – aktuell nur 1 Page (Ordner) */}
        <div className="home__categories-track">
          {/* Page 1: Kategorie-Ordner (Projekte / Arbeitsbereiche / Ressourcen) */}
          <div className="home__categories-page home__categories-page--active">
            <div className="category-grid">
              {["project", "area", "resource"].map((type) => {
                const cfg = CC[type];
                const count = cats.filter((c) => c.type === type && !c.archived).length;
                const isExpanded = expandedCat === type;
                
                // Initiale für minimierte Ansicht
                const initial = cfg.label.charAt(0).toUpperCase();

                if (isExpanded) {
                  const statusLabel = (type === 'area' || type === 'resource') ? 'aktiv' : 'offen';
                  return (
                    <div 
                      key={type} 
                      className={`category-card category-card--expanded category-card--${type}`}
                      onPointerDown={() => handleCardPointerDown(type)}
                      onPointerUp={handleCardPointerUp}
                      onPointerLeave={handleCardPointerLeave}
                      onClick={(e) => handleCardClick(e, type)}
                    >
                      <div className="category-card__bg"></div>
                      <div className="category-card__content">
                        <div className="category-card__header">
                          <span className="category-card__title">{cfg.label}</span>
                        </div>

                        <div className="category-card__status">
                          <div className="category-card__status-icon-wrap">
                            {type === 'area' ? (
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3L22 20H2L12 3Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : type === 'resource' ? (
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {/* KEINE Zahl im Icon für expanded State */}
                          </div>
                          <span className="category-card__status-text">Du hast <strong>{count}</strong> {statusLabel}</span>
                        </div>
                        <div className="category-card__bottom">
                          <button
                            className="category-card__add-btn category-card__add-btn--expanded"
                            onClick={(e) => { e.stopPropagation(); onAddCat(type); }}
                          >
                            <Plus size={20} color="#fff" strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={type} 
                    className={`category-card category-card--collapsed category-card--${type}`}
                    onPointerDown={() => handleCardPointerDown(type)}
                    onPointerUp={handleCardPointerUp}
                    onPointerLeave={handleCardPointerLeave}
                    onClick={(e) => handleCardClick(e, type)}
                  >
                    <div className="category-card__bg"></div>
                    <div className="category-card__content">
                      <span className="category-card__initial">{initial}</span>
                      
                      <div className="category-card__badge-wrap">
                        {type === 'area' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3L22 20H2L12 3Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : type === 'resource' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        <span className="category-card__badge-count">{count}</span>
                      </div>

                      <div className="category-card__bottom">
                        <button
                          className="category-card__add-btn category-card__add-btn--collapsed"
                          onClick={(e) => { e.stopPropagation(); onAddCat(type); }}
                        >
                          <Plus size={20} color="#fff" strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zukünftige Pages hier ergänzen, z.B.: */}
          {/* <div className="home__categories-page">...</div> */}
        </div>
      </div>

      <div className="home__list-container">
        {/* List section header: label left + switcher icons center */}
        <div className="list-section__header">
          <div className="list-section__header-left">
            <span className="list-section__label">{tabCfg?.label}</span>
          </div>
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
              {t.noEntries(tabCfg?.label)}
            </div>
          ) : (
            <>
              {tab === "tasks" && (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={tabEntries}
                  cats={cats}
                  onToggle={toggleTask}
                  onToggleStar={toggleStar}
                  onUpdateEntry={updateEntry}
                  onDelete={deleteEntry}
                  grouped={true}
                  color={tabColor}
                  onOpenEntry={onOpenEntry}
                  isHome={true}
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
                  isHome={true}
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
                  isHome={true}
                />
              )}
            </>
          )}
        </div>
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
  const fabVisible = useInactivity(5000);
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

      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
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
  const fabVisible = useInactivity(5000);
  const [tagSort, setTagSort] = useState({ by: 'date', desc: true });
  const [showDate, setShowDate] = useState(false);
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [resSearch, setResSearch] = useState("");

  // Alle Ordner (inkl. Ressourcen) haben 3 Sub-Tabs im Media/Ressourcen Lesezeichen
  const isProjectOrArea = cat.type === "project" || cat.type === "area";
  
  // Sub-Tab für das Ressource-Lesezeichen (standardmäßig "resources")
  const [resSubTab, setResSubTab] = useState("resources");
  const [taskSubTab, setTaskSubTab] = useState("open");

  // Refs für Click-Outside-Erkennung
  const connPopupRef = useRef(null);
  const connPillRef = useRef(null);
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);
  const tagPopupRef = useRef(null);
  const tagTriggerRef = useRef(null);

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
    // Tag-Popup schließen
    if (showTagSelect &&
        tagPopupRef.current && !tagPopupRef.current.contains(e.target) &&
        tagTriggerRef.current && !tagTriggerRef.current.contains(e.target)) {
      setShowTagSelect(false);
    }
  }, [showConnSelect, showDate, showTagSelect]);

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
  const resSubTabOrder = ["resources", "notes", "media"];
  const taskSubTabOrder = ["open", "completed"];
  const onSubTabTouchStart = useCallback((e) => {
    subTabTouchX.current = e.touches[0].clientX;
  }, []);
  const onSubTabTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - subTabTouchX.current;
    if (Math.abs(dx) > 60) {
      if (bm === "media") {
        setResSubTab(prev => {
          const idx = resSubTabOrder.indexOf(prev);
          if (dx > 0) {
            // Swipe rechts → vorheriger Tab
            return resSubTabOrder[Math.max(0, idx - 1)];
          } else {
            // Swipe links → nächster Tab
            return resSubTabOrder[Math.min(resSubTabOrder.length - 1, idx + 1)];
          }
        });
      } else if (bm === "tasks") {
        setTaskSubTab(prev => {
          const idx = taskSubTabOrder.indexOf(prev);
          if (dx > 0) {
            // Swipe rechts → vorheriger Tab
            return taskSubTabOrder[Math.max(0, idx - 1)];
          } else {
            // Swipe links → nächster Tab
            return taskSubTabOrder[Math.min(taskSubTabOrder.length - 1, idx + 1)];
          }
        });
      }
    }
  }, [resSubTabOrder, taskSubTabOrder, bm]);

  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(
    (e) => {
      const isEmptyPlaceholder = e.target.closest('.cat-detail__empty') || e.target.closest('.cat-detail__section-empty') || e.target.closest('.entry-list__empty');
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
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
          {cat.type === "resource" && cat.createdAt && (
            <div className="cat-detail__date-pill cat-detail__date-pill--static">
              {fmtDate(cat.createdAt.split("T")[0], t.locale)}
            </div>
          )}
          {cat.type === "project" && (
            <button
              ref={datePillRef}
              className="cat-detail__date-pill"
              onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
              style={!cat.date ? {} : {}} 
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

          <div 
            style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}
            ref={tagTriggerRef}
            onClick={(e) => { e.stopPropagation(); setShowTagSelect(!showTagSelect); }}
          >
            {(() => {
              const selectedTags = cat.tags || [];
              if (selectedTags.length === 0) return null;
              if (selectedTags.length === 1) {
                return (
                  <span className="cat-detail__tag">
                    {selectedTags[0]}
                  </span>
                );
              }
              return (
                <span className="cat-detail__tag">
                  {selectedTags[0]} +{selectedTags.length - 1}
                </span>
              );
            })()}
            {(!cat.tags || cat.tags.length === 0) && (
              <span className="cat-detail__tag" style={{ background: "transparent", border: "1px dashed #5858A066", opacity: 0.8 }}>
                + Tag
              </span>
            )}
          </div>
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
          {showTagSelect && (
            <div className="cat-detail__conn-popup" ref={tagPopupRef} onClick={(e) => e.stopPropagation()} style={{ left: "auto", right: 0 }}>
              <div className="cat-detail__conn-list">
                {(!tags || tags.length === 0) ? (
                  <div className="cat-detail__conn-empty">Keine Tags</div>
                ) : (
                  tags.map(tag => {
                    const isSelected = (cat.tags || []).includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        className="cat-detail__conn-item"
                        onClick={() => {
                          const currentTags = cat.tags || [];
                          if (isSelected) {
                            onUpdate({ tags: currentTags.filter(t => t !== tag.name) });
                          } else {
                            onUpdate({ tags: [...currentTags, tag.name] });
                          }
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span className="cat-detail__conn-name" style={{ color: isSelected ? CC.resource.color : 'inherit', fontWeight: isSelected ? 600 : 400 }}>
                          {tag.name}
                        </span>
                        {isSelected && <Check size={14} color={CC.resource.color} />}
                      </button>
                    );
                  })
                )}
              </div>
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
        {bm === "tasks" && (
          <div
            onTouchStart={onSubTabTouchStart}
            onTouchEnd={onSubTabTouchEnd}
            style={{ flex: 1 }}
          >
            {/* Sub-Tab-Leiste: Offen / Erledigt */}
            <div className="res-sub-tabs">
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "open" ? "res-sub-tabs__btn--active-open" : ""}`}
                onClick={() => setTaskSubTab("open")}
              >
                <CheckCircle2 size={14} />
                <span>{t.open || "Offen"}</span>
                {entries.filter((e) => e.type === "task" && !e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--open">{entries.filter((e) => e.type === "task" && !e.done).length}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "completed" ? "res-sub-tabs__btn--active-completed" : ""}`}
                onClick={() => setTaskSubTab("completed")}
              >
                <CheckCircle2 size={14} />
                <span>{t.completed || "Erledigt"}</span>
                {entries.filter((e) => e.type === "task" && e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--completed">{entries.filter((e) => e.type === "task" && e.done).length}</span>
                )}
              </button>
            </div>

            {/* Task-Listen basierend auf Sub-Tab */}
            {taskSubTab === "open" && (
              entries.filter((e) => e.type === "task" && !e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noTasks}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={entries.filter((e) => e.type === "task" && !e.done)}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
            {taskSubTab === "completed" && (
              entries.filter((e) => e.type === "task" && e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noCompletedTasks || "Keine erledigten Aufgaben"}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={entries.filter((e) => e.type === "task" && e.done)}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
          </div>
        )}
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
            <div className="res-sub-tabs" style={{ marginBottom: "8px" }}>
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
                        <input 
                          className="media-item__title media-item__title--input" 
                          value={tag.name}
                          onChange={(e) => onUpdateTag(tag.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          placeholder="..."
                        />
                        {tag.createdAt && <div className="media-item__meta">{fmtDate(tag.createdAt.split("T")[0], t.locale)}</div>}
                      </div>
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
      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`} style={{ position: "relative" }}>
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
  const fabVisible = useInactivity(5000);

  const archiveItems = isCatTab
    ? cats.filter(c => c.type === tab && c.archived)
    : entries.filter(e => {
        if (tab === "tasks") return e.type === "task" && e.done;
        if (tab === "calendar") return e.type === "calendar" && isOld(e.date);
        if (tab === "notes") return e.type === "note" && e.archived;
        return false;
      }).sort((a, b) => {
        if (tab === "calendar") {
          return new Date(b.date + "T12:00") - new Date(a.date + "T12:00");
        }
        return 0;
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
                isArchive={true}
              />
            )}
            {tab === "calendar" && (
              <CalList t={t} CC={CC} lang={lang}
                entries={archiveItems}
                cats={cats}
                onDelete={onDelete}
                onOpenEntry={onOpenEntry}
                isArchive={true}
              />
            )}
            {tab === "notes" && (
              <NoteList t={t} CC={CC}
                entries={archiveItems}
                cats={cats}
                onDelete={onDelete}
                onOpenEntry={onOpenEntry}
                onArchiveEntry={onRestoreNote}
                isArchive={true}
              />
            )}
          </>
        )}
      </div>
      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}

/* ── Entry Detail Screen ─────────────────────────────────────── */
function EntryDetailScreen({ t, CC, theme, entry, cat, allCats, onUpdate, onDelete, onBack }) {
  const fabVisible = useInactivity(5000);
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
    entry.type === "calendar" ? "#1D4ED8" : "#9CA3AF";

  const alpha = theme === 'light' ? "0C" : "18";

  return (
    <div className="cat-detail" onClick={handleClickOutside}>
      {/* Header */}
      <div
        className="cat-detail__header"
        style={{
          background: entry.type === "calendar"
            ? "linear-gradient(135deg, rgba(29,78,216,0.10) 0%, rgba(29,78,216,0.03) 100%)"
            : cfgColor + alpha,
          borderBottomColor: entry.type === "calendar" ? "rgba(29,78,216,0.18)" : undefined,
        }}
      >
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
            {/* 1. Datumspille (Aufgabe / Kalender / Notiz-Erstellung) — kommt zuerst */}
            {(entry.type === "task" || entry.type === "calendar") && (
              <button
                ref={datePillRef}
                className="cat-detail__date-pill"
                onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
              >
                {(entry.due || entry.date) ? fmtDate((entry.due || entry.date), t.locale) : t.addDate}
              </button>
            )}
            {entry.type === "note" && entry.createdAt && (
              <span className="cat-detail__date-pill" style={{ cursor: 'default' }}>
                {fmtRelative(entry.createdAt, t.locale)}
              </span>
            )}

            {/* 2. PARA-Kategorie-Tag — kommt nach dem Datum */}
            {(() => {
              const selectedCats = allCats.filter(c => (entry.catIds || []).includes(c.id));
              const summary = selectedCats.length === 0
                ? t.connectSelection
                : selectedCats.length === 1
                  ? selectedCats[0].name
                  : `${selectedCats[0].name} +${selectedCats.length - 1}`;
              
              const activeCat = selectedCats[0] || cat;

              return (
                <button
                  ref={connPillRef}
                  className="cat-detail__date-pill"
                  onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
                  style={
                    activeCat && CC[activeCat.type]
                      ? {
                          background: CC[activeCat.type].color + "18",
                          borderColor: CC[activeCat.type].color + "60",
                          color: CC[activeCat.type].color,
                        }
                      : {}
                  }
                >
                  {summary}
                </button>
              );
            })()}

          {entry.type === "calendar" && (
            <button
              className="cat-detail__birthday-toggle"
              onClick={() => onUpdate({ isBirthday: !entry.isBirthday })}
              style={{
                background: entry.isBirthday ? "rgba(255, 255, 255, 0.15)" : "transparent",
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
                  allCats.map(opt => {
                    const isSelected = (entry.catIds || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        className={`cat-detail__conn-item ${isSelected ? 'cat-detail__conn-item--selected' : ''}`}
                        onClick={() => {
                          const nextIds = isSelected
                            ? (entry.catIds || []).filter(id => id !== opt.id)
                            : [...(entry.catIds || []), opt.id];
                          onUpdate({ catIds: nextIds, catId: nextIds[0] || null });
                        }}
                      >
                        <span 
                          className="cat-detail__conn-dot" 
                          style={{ 
                            background: (CC[opt.type]?.color || CC.resource.color),
                            border: isSelected ? '2px solid #fff' : 'none',
                            boxShadow: isSelected ? '0 0 0 1px ' + (CC[opt.type]?.color || CC.resource.color) : 'none'
                          }} 
                        />
                        <span className="cat-detail__conn-name" style={{ fontWeight: isSelected ? 600 : 400 }}>{opt.name}</span>
                        {isSelected && <Check size={12} color={CC[opt.type]?.color} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })
                )}
              </div>
              <button
                className="cat-detail__conn-none"
                onClick={() => {
                  onUpdate({ catIds: [], catId: null });
                  setShowConnSelect(false);
                }}
              >
                {t.noConnection}
              </button>
            </div>
          )}

          {entry.type !== "calendar" && (
            <button 
              className={`cat-detail__archive-toggle ${entry.archived ? 'cat-detail__archive-toggle--active' : ''}`}
              onClick={() => onUpdate({ archived: !entry.archived })}
              style={{ marginLeft: 'auto' }}
            >
              {entry.archived ? <ArchiveRestore size={18} color={cfgColor} /> : <Archive size={18} color="#5858A0" />}
            </button>
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

      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
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
    
    // Wir erstellen nur noch EINEN Eintrag mit allen ausgewählten Kategorien
    let finalCatIds = catIds.length > 0 ? catIds : [];
    
    if (type === "calendar" && isBirthday) {
      // Automatische Verknüpfung mit Geburtstage-Ressource
      finalCatIds = [ID_BIRTHDAYS];
    }

    const entry = { 
      type, 
      title: title.trim(), 
      catIds: finalCatIds,
      // Abwärtskompatibilität: catId ist die erste ID im Array
      catId: finalCatIds[0] || null 
    };

    if (type === "task") Object.assign(entry, { done: false, note, due: due || null, time: time || null });
    if (type === "note") Object.assign(entry, { body });
    if (type === "calendar") Object.assign(entry, { date, time, isBirthday });
    if (type === "media") Object.assign(entry, { mediaType, mediaData: mediaFile });
    if (type === "link") Object.assign(entry, { url: url.trim() });
    
    onSave(entry);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <div className="modal__header-left" />
          <h3 className="modal__title">{t.newLabel(label)}</h3>
          <div className="modal__header-right">
            <button className="modal__close" onClick={onClose}>
              <X size={18} color="#5858A0" />
            </button>
          </div>
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
            <h2 className="onboarding__title">{I18N[lang].welcome}</h2>
            <p className="onboarding__text">{I18N[lang].onboardingLang}</p>
            <div className="onboarding__langs">
              {["de", "en", "es"].map(l => (
                <button 
                  key={l}
                  className={`onboarding__lang-btn ${lang === l ? "onboarding__lang-btn--active" : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇪🇸"}
                </button>
              ))}
            </div>
            <button className="onboarding__next" onClick={() => setStep(1)}>{I18N[lang].getStarted}</button>
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
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

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
          <div className="modal__header-left">
            {view !== "main" ? (
              <button className="settings-modal__back-inline" onClick={() => setView("main")}>
                <ChevronLeft size={20} color="#5858A0" />
              </button>
            ) : (
              <CustomSettingsIcon size={20} className="icon-muted" color="currentColor" />
            )}
          </div>
          
          <h3 className="modal__title">{currentTitle}</h3>

          <div className="modal__header-right">
            <button className="modal__close" onClick={onClose}>
              <X size={18} color="#5858A0" />
            </button>
          </div>
        </div>

        {view === "main" ? (
          <div className="settings-modal__content">
            {/* Apple-style Profile Row */}
            <div className="profile-row" onClick={() => setView("profile")}>
              <div 
                className="profile-row__avatar" 
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="profile-row__avatar-img" />
                ) : (
                  user.name ? user.name.charAt(0).toUpperCase() : "P"
                )}
                <div className="profile-row__avatar-overlay">
                  <ImageIcon size={14} color="white" />
                </div>
              </div>
              <div className="profile-row__info">
                <div className="profile-row__name">{user.name || "User"}</div>
                <div className="profile-row__sub">{t.personalData}</div>
              </div>
              <ChevronRight size={18} color="#5858A0" className="profile-row__chevron" />
            </div>

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
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Moon size={14} />
                    {t.dark}
                  </button>
                  <button 
                    className={`theme-toggle__btn ${theme === "light" ? "theme-toggle__btn--active" : ""}`}
                    onClick={() => setTheme("light")}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sun size={14} />
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
                      {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇪🇸"}
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
                  onClick={async () => {
                    if (window.confirm(t.deleteConfirm)) {
                      localStorage.clear();
                      try {
                        const { clear } = await import('idb-keyval');
                        await clear();
                      } catch (e) {
                        console.error('Failed to clear idb', e);
                      }
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
        if (!nextState.entries) nextState.entries = [];
        nextState.entries = nextState.entries.map(e => {
          if (!e.catIds) {
            dirty = true;
            return { ...e, catIds: e.catId ? [e.catId] : [] };
          }
          return e;
        });

        nextState.cats = nextState.cats.map(c => {
          if (!c.createdAt) {
            dirty = true;
            return { ...c, createdAt: new Date().toISOString() };
          }
          return c;
        });

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
  const [expandedCat, setExpandedCat] = useState("project");

  const theme = state.theme || "light";
  const lang = state.lang || "de";
  const t = I18N[lang];
  const CC = getCC(t);
  const TABS = getTABS(t);

  const push = (v) => setStack((s) => [...s, v]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  // Hilfsfunktion zur Ermittlung der Anzahl archivierter Elemente für einen Tab
  const getArchiveCount = (archiveTab) => {
    const isCatTab = ["project", "area", "resource"].includes(archiveTab);
    if (isCatTab) {
      return state.cats.filter(c => c.type === archiveTab && c.archived).length;
    }
    if (archiveTab === "tasks") return state.entries.filter(e => e.type === "task" && e.done).length;
    if (archiveTab === "calendar") return state.entries.filter(e => e.type === "calendar" && isOld(e.date)).length;
    if (archiveTab === "notes") return state.entries.filter(e => e.type === "note" && e.archived).length;
    return 0;
  };

  // Smarte Zurück-Logik: Überspringt das Archiv, wenn es nach dem Dearchivieren leer ist
  const handleSmartBack = () => {
    const prev = stack[stack.length - 2];
    if (prev && prev.view === "archive") {
      const count = getArchiveCount(prev.tab || tab);
      if (count === 0) {
        setStack(s => s.length > 2 ? s.slice(0, -2) : [{ view: "home" }]);
        return;
      }
    }
    pop();
  };

  const cur = stack[stack.length - 1];

  /* ── mutations ─────────────────────────────────────────────── */
  const addCat = (type, name) =>
    setState((s) => ({
      ...s,
      cats: [
        ...s.cats,
        { id: uid(), type, name, date: null, body: "", tags: [], relatedId: null, archived: false, createdAt: new Date().toISOString() },
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
      entries: [...s.entries, { id: uid(), createdAt: Date.now(), ...entry }],
    }));

  const toggleTask = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    }));

  // Favoriten-Stern umschalten
  const toggleStar = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, starred: !e.starred } : e
      ),
    }));

  const updateEntry = (id, patch) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => {
        if (e.id === id) {
          const next = { ...e, ...patch };
          // Falls catId (alt) gesetzt wird, in catIds überführen
          if (patch.catId !== undefined) {
            next.catIds = patch.catId ? [patch.catId] : [];
          }
          return next;
        }
        return e;
      }),
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
    if (dx > 75 && touchX.current < 45 && stack.length > 1 && !panelOpen) {

      pop();
      return;
    }

    // Swipe down to open command panel
    if (dy > 80 && Math.abs(dx) < 50 && !panelOpen) {
      // Find the active scroll container based on view
      let scrollEl;
      if (cur.view === "home") scrollEl = document.querySelector('.entry-list');
      else if (cur.view === "catList") scrollEl = document.querySelector('.cat-list__body');
      else if (cur.view === "catDetail" || cur.view === "entryDetail") {
        scrollEl = document.querySelector('.cat-detail__body');
        // Wenn in den Detail-Screens eine Textarea vorhanden ist, darf das Panel nur öffnen,
        // wenn die Textarea bereits ganz oben (am Limit) ist.
        const textarea = e.target.closest('.cat-detail__textarea');
        if (textarea && textarea.scrollTop > 0) {
          return;
        }
      }

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
        setLang={(l) => setState(s => ({ ...s, lang: l }))}
        theme={theme}
        setTheme={(t) => setState(s => ({ ...s, theme: t }))}
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

      <div className={`main-content ${cur.view === "home" ? `main-content--${tab}` : ""}`}>
        {cur.view === "home" && (
          <HomeScreen
            t={t}
            CC={CC}
            TABS={TABS}
            lang={lang}
            state={state}
            tab={tab}
            setTab={setTab}
            panelOpen={panelOpen}
            expandedCat={expandedCat}
            setExpandedCat={setExpandedCat}

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
            toggleStar={toggleStar}
            updateEntry={updateEntry}
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
              const ids = e.catIds || (e.catId ? [e.catId] : []);
              const isBaseEntry = ids.includes(cat.id) || ids.some(id => childIds.includes(id));
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
                onBack={handleSmartBack}
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
                onBack={handleSmartBack}
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
          onSave={(entry) => {
            addEntry(entry);
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
