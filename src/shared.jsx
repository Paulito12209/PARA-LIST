import React, { useState, useRef } from "react";
import { I18N } from "./i18n";
import {
  Circle, Triangle, Square, Trash2, Check, FileText, CheckCircle2, Calendar, Paperclip
} from "lucide-react";
import { BookmarkIcon, TagIcon } from "./AppIcons"; // We'll move these out to avoid crowding

/* ── helpers ─────────────────────────────────────────────────── */
export const uid = () => Math.random().toString(36).slice(2, 9);
export const TODAY = (() => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
})();
export const isOld = (d) => d && d < TODAY;
export const isToday = (d) => d === TODAY;

export const getNextBirthday = (birthdateStr) => {
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
export const fmtDate = (d, locale) =>
  !d
    ? ""
    : new Date(d + "T12:00").toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });

export const fmtRelative = (ts, locale) => {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return I18N[locale.slice(0,2)]?.justNow || "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  
  const d = new Date(ts);
  const t = new Date();
  t.setHours(0,0,0,0);
  const d0 = new Date(ts);
  d0.setHours(0,0,0,0);
  
  const langT = I18N[locale.slice(0,2)];
  if (t.getTime() === d0.getTime()) return langT?.today || "heute";
  t.setDate(t.getDate() - 1);
  if (t.getTime() === d0.getTime()) return langT?.yesterday || "gestern";
  
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
};

export const getTaskGroup = (due, locale, hideDayNumber = false) => {
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

  const langT = I18N[locale.slice(0,2)];
  let leftLabel = "";
  if (diffDays === 1) {
    leftLabel = langT?.tomorrow || "Morgen";
  } else if (diffDays === 2) {
    leftLabel = langT?.afterTomorrow || "Übermorgen";
  } else if (weekDiff === 0) {
    leftLabel = d.toLocaleDateString(locale, { weekday: 'long' });
  } else if (weekDiff === 1) {
    leftLabel = langT?.nextWeek || "Nächste Woche";
  } else {
    const mDiff = (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth());
    if (d.getFullYear() > t.getFullYear()) {
      leftLabel = d.getFullYear().toString();
    } else if (mDiff === 0) {
      leftLabel = langT?.thisMonth || "Dieser Monat";
    } else if (mDiff === 1) {
      leftLabel = langT?.nextMonth || "Nächsten Monat";
    } else if (mDiff === -1) {
      leftLabel = langT?.lastMonth || "Letzten Monat";
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

  const capLeft = leftLabel ? leftLabel.charAt(0).toUpperCase() + leftLabel.slice(1) : "";
  const capRight = rightLabel ? rightLabel.charAt(0).toUpperCase() + rightLabel.slice(1) : "";

  return { left: capLeft, right: capRight, sortKey: d.getTime() };
}

export const getYouTubeVideoId = (rawUrl) => {
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
export const BOOKMARKS = [
  { id: "canvas", color: "#818CF8", Icon: FileText },
  { id: "tasks",  color: "#7C83F7", Icon: CheckCircle2 },
  { id: "cal",    color: "#3B82F6", Icon: Calendar },
  { id: "media",  color: "#10B981", Icon: Paperclip },
  { id: "link",   color: "#7C3AED", Icon: BookmarkIcon },
  { id: "tags",   color: "#EC4899", Icon: TagIcon },
];

export const NOTIF_RED = "#F26565";
export const NOTIF_NAVY = "#1E40AF";
export const NOTIF_VIOL = "#7C83F7";

export const CAT_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
};

export const ID_BIRTHDAYS = "res-birthdays";

/* ── seed data ───────────────────────────────────────────────── */
export const SEED = {
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
export function computeNotif(entries) {
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

export function SwipeToDelete({ children, onDelete, onComplete, isActive }) {
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
      // Links swipen → Löschen (immer erlaubt)
      // Rechts swipen → Erledigen (nur wenn onComplete vorhanden)
      if (dx < 0) {
        setOffsetX(dx);
      } else if (dx > 0 && onComplete) {
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
        // Schwelle für Löschen erreicht
        onDelete();
      } else if (offsetX > 100 && onComplete) {
        // Schwelle für Erledigen erreicht
        onComplete();
      } else {
        setOffsetX(0);
      }
      setSwiping(false);
      isHeld.current = false;
    }
  };

  const showDeleteBg = swiping && offsetX < 0;
  const showCompleteBg = swiping && offsetX > 0 && onComplete;

  return (
    <div className="swipe-delete-wrapper" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Hintergrund: Löschen (rot, rechts) */}
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
      {/* Hintergrund: Erledigen (grün, links) */}
      <div style={{
          position: 'absolute', inset: '0',
          background: showCompleteBg ? '#16A34A' : 'transparent',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '20px',
          zIndex: 0,
          transition: 'background 0.2s ease'
      }}>
          {showCompleteBg && <Check color="#fff" size={20} strokeWidth={3} />}
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
