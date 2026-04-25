import os
import re

# 1. Create shared.jsx with all the common config, helpers, icons and SwipeToDelete
shared_jsx_content = """import React, { useState, useRef } from "react";
import { I18N } from "./i18n";
import {
  Circle, Triangle, Square, Trash2, FileText, CheckCircle2, Calendar, Paperclip
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
    { id: "p2", type: "project",  name: "Nächsten Monat 4x ins Gym", date: "2026-05-15", body: "Woche 1: 2km locker\\nWoche 2: 3km Intervalle", tags: ["Sport"], relatedId: "a2", archived: false },
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

export function SwipeToDelete({ children, onDelete, isActive }) {
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
"""

with open("src/shared.jsx", "w") as f:
    f.write(shared_jsx_content)

# 2. Extract SVG Icons out of App.jsx into AppIcons.jsx
icons_jsx_content = """import React from 'react';

export const TagIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} className="lucide lucide-tag">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

export const ArchiveIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

export const BookmarkIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
  </svg>
);

export const CustomSettingsIcon = ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="10 10 20 20" strokeWidth={strokeWidth} stroke={color} width={size} height={size} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M28 15H19" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25H13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25C22 25.7956 22.3161 26.5587 22.8787 27.1213C23.4413 27.6839 24.2044 28 25 28C25.7956 28 26.5587 27.6839 27.1213 27.1213C27.6839 26.5587 28 25.7956 28 25C28 24.2044 27.6839 23.4413 27.1213 22.8787C26.5587 22.3161 25.7956 22 25 22C24.2044 22 23.4413 22.3161 22.8787 22.8787C22.3161 23.4413 22 24.2044 22 25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15C12 15.394 12.0776 15.7841 12.2284 16.1481C12.3791 16.512 12.6001 16.8427 12.8787 17.1213C13.1573 17.3999 13.488 17.6209 13.8519 17.7716C14.2159 17.9224 14.606 18 15 18C15.394 18 15.7841 17.9224 16.1481 17.7716C16.512 17.6209 16.8427 17.3999 17.1213 17.1213C17.3999 16.8427 17.6209 16.512 17.7716 16.1481C17.9224 15.7841 18 15.394 18 15C18 14.606 17.9224 14.2159 17.7716 13.8519C17.6209 13.488 17.3999 13.1573 17.1213 12.8787C16.8427 12.6001 16.512 12.3791 16.1481 12.2284C15.7841 12.0776 15.394 12 15 12C14.606 12 14.2159 12.0776 13.8519 12.2284C13.488 12.3791 13.1573 12.6001 12.8787 12.8787C12.6001 13.1573 12.3791 13.488 12.2284 13.8519C12.0776 14.2159 12 14.606 12 15Z" />
  </svg>
);
"""

with open("src/AppIcons.jsx", "w") as f:
    f.write(icons_jsx_content)

# 3. Clean up App.jsx
with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

def remove_bounds(start_line_regex, end_line_regex):
    start_idx = -1
    end_idx = -1
    for i, l in enumerate(lines):
        if re.search(start_line_regex, l):
            start_idx = i
            break
    if start_idx != -1:
        for i in range(start_idx, len(lines)):
            if re.search(end_line_regex, lines[i]):
                end_idx = i
                break
        if end_idx != -1:
            del lines[start_idx:end_idx+1]

# Delete from "/* ── helpers" down to "/* ── Command Panel"
start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if '/* ── helpers' in l:
        start_idx = i
        break
if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if '/* ── Command Panel' in lines[i]:
            end_idx = i - 1
            break
    if end_idx != -1:
        del lines[start_idx:end_idx+1]

# Add imports to App.jsx
new_imports = """
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";
"""
for i, l in enumerate(lines):
    if 'import { EntryMetaTags' in l:
        lines.insert(i, new_imports)
        break

with open('src/App.jsx', 'w') as f:
    f.writelines(lines)

# 4. Fix imports in other files
files_to_fix = ['src/EntryLists.jsx', 'src/FolderScreens.jsx', 'src/EntryDetailScreen.jsx']
for path in files_to_fix:
    with open(path, 'r') as f:
        content = f.read()
    
    content = content.replace('from "./App"', 'from "./shared"')
    
    # AppIcons imports
    content = content.replace('import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./shared";', 'import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";')
    content = content.replace('import { TagIcon } from "./shared";', 'import { TagIcon } from "./AppIcons";')
    
    with open(path, 'w') as f:
        f.write(content)

print("Circular dependencies fixed.")
