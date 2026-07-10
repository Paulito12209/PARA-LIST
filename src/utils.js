// ============================================================
// PARA·LIST – Pure helpers, constants, and seed data
// Keep this file free of React components so Fast Refresh works
// reliably across the codebase.
// ============================================================
import { Circle, Triangle, Square, FileText, CheckCircle2, Calendar, Paperclip, Pencil, Info } from "lucide-react";
import { BookmarkIcon, TagIcon } from "./components/AppIcons";
import { I18N } from "./i18n";

/* ── ID helpers ──────────────────────────────────────────────── */
export const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Date helpers ────────────────────────────────────────────── */
export const TODAY = (() => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
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
    return { date: `${nextYyyy}-${mm}-${dd}`, age: nextYyyy - birthDate.getFullYear() };
  }
  return { date: nextBdThisYearStr, age: currentYear - birthDate.getFullYear() };
};

export const fmtDate = (d, locale) =>
  !d
    ? ""
    : new Date(d + "T12:00").toLocaleDateString(locale, { day: "numeric", month: "short" });

// Initialen aus dem Nutzernamen: "Paul" → "P", "Paul Angeles Chaquire" → "PA"
// (Vorname + erster Nachname). Fallback "U" wenn kein Name gesetzt ist.
export const getInitials = (name) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const fmtRelative = (ts, locale) => {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  const langT = I18N[locale.slice(0, 2)];

  if (sec < 60) return langT?.justNow || "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;

  const d0 = new Date(ts);
  d0.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (t.getTime() === d0.getTime()) return langT?.today || "heute";

  t.setDate(t.getDate() - 1);
  if (t.getTime() === d0.getTime()) return langT?.yesterday || "gestern";

  return new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short" });
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

export const getTaskGroup = (due, locale, hideDayNumber = false) => {
  if (!due) return null;
  const d = new Date(due + "T12:00");
  const t = new Date(TODAY + "T12:00");
  const diffDays = Math.round((d - t) / MS_PER_DAY);
  if (diffDays <= 0) return null;

  let weekday = d.toLocaleDateString(locale, { weekday: "short" });
  if (weekday.length > 3) weekday = weekday.substring(0, 2);
  const day = String(d.getDate()).padStart(2, "0");
  const left = hideDayNumber ? `${weekday}.` : `${weekday}., ${day}`;
  void left; // currently unused — kept for future grouping refinements

  const getMonday = (date) => {
    const dt = new Date(date);
    const dayOfWeek = dt.getDay() || 7;
    dt.setDate(dt.getDate() - dayOfWeek + 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const weekDiff = Math.round((getMonday(d) - getMonday(t)) / MS_PER_WEEK);
  const langT = I18N[locale.slice(0, 2)];

  let leftLabel = "";
  if (diffDays === 1) leftLabel = langT?.tomorrow || "Morgen";
  else if (diffDays === 2) leftLabel = langT?.afterTomorrow || "Übermorgen";
  else if (weekDiff === 0) leftLabel = d.toLocaleDateString(locale, { weekday: "long" });
  else if (weekDiff === 1) leftLabel = langT?.nextWeek || "Nächste Woche";
  else {
    const mDiff = (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth());
    if (d.getFullYear() > t.getFullYear()) leftLabel = d.getFullYear().toString();
    else if (mDiff === 0) leftLabel = langT?.thisMonth || "Dieser Monat";
    else if (mDiff === 1) leftLabel = langT?.nextMonth || "Nächsten Monat";
    else if (mDiff === -1) leftLabel = langT?.lastMonth || "Letzten Monat";
    else leftLabel = d.toLocaleDateString(locale, { month: "long" });
  }

  const rightLabel = d.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");
  return { left: capitalize(leftLabel), right: capitalize(rightLabel), sortKey: d.getTime() };
};

/* ── URL helpers ─────────────────────────────────────────────── */
export const getYouTubeVideoId = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace("www.", "");
    if (host === "youtu.be") return url.pathname.slice(1) || null;
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

/* ── Brand / palette constants ───────────────────────────────── */
export const BOOKMARKS = [
  { id: "canvas", color: "#818CF8", Icon: FileText },
  { id: "tasks", color: "#0B8CE9", Icon: CheckCircle2 },
  // Notizen: eigenes Lesezeichen (früher Sub-Tab unter "media"/Ressourcen)
  { id: "notes", color: "#F59E0B", Icon: Pencil },
  { id: "cal", color: "#0078D4", Icon: Calendar },
  { id: "media", color: "#10B981", Icon: Paperclip },
  { id: "link", color: "#7C3AED", Icon: BookmarkIcon },
  { id: "tags", color: "#EC4899", Icon: TagIcon },
  // Details-Lesezeichen: zeigt Metadaten der Seite (erstellt/geändert/geöffnet).
  // Löst das frühere "settings"-Lesezeichen ab – Einstellungen sind jetzt der
  // Zahnrad-Button unten rechts in der Bottom-Nav.
  { id: "details", color: "#5858A0", Icon: Info },
];

export const NOTIF_RED = "#F26565";
export const NOTIF_NAVY = "#1E40AF";
export const NOTIF_VIOL = "#7C83F7";

export const CAT_ICONS = {
  project: Circle,
  area: Triangle,
  resource: Square,
};

export const ID_BIRTHDAYS = "res-birthdays";

/* ── Seed data ───────────────────────────────────────────────── */
export const SEED = {
  theme: "light",
  lang: "de",
  user: { name: "" },
  cats: [
    { id: "p1", type: "project",  name: "Onboarding", date: "2026-04-30", body: "Hier kannst du die Projektbeschreibung anpassen, wie du möchtest.\n\nTipp: Für ein besseres Verständnis der App, geh auf die Büroklammer (5. Lesezeichen), öffne die Ressource und lies die Beschreibung der PARA-Methode.", tags: ["App"], relatedId: "a8", archived: false, pinned: true },
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
    // PARA-Methode ist mit dem Onboarding-Projekt verknüpft (relatedId: "p1"),
    // damit sie dort unter der Büroklammer (verknüpfte Ressourcen) auftaucht.
    { id: "r5", type: "resource", name: "PARA-Methode",      date: null, body: "Stöbert rechts durch die 7 Lesezeichen, um mehr Kontext zur PARA-Methode zu entdecken.\n\nHinweis: Schau dir im 6. Lesezeichen das Video von Oliver Münch an, um die PARA-Methode zu verstehen. Denn PARA-LIST ist der beste Begleiter, um diese Methode anzuwenden.", tags: ["Produktivität"], relatedId: "p1", archived: false },
    { id: ID_BIRTHDAYS, type: "resource", name: "Geburtstage", date: null, body: "Alle Geburtstage aus dem Kalender.", tags: ["System"], relatedId: null, archived: false },
  ],
  entries: [
    { id: "e1", type: "task", title: "\"Onboarding\" öffnen", done: false, note: "Das Projekt öffnen und die Projektbeschreibung lesen.", due: TODAY, catId: "p1", linkedEntryIds: [], parentId: null },
    { id: "e2", type: "task", title: "Klicke auf das PARA·LIST-Logo oben links, um die App zu wechseln", done: false, note: "", due: TODAY, catId: "p1", linkedEntryIds: [], parentId: null },
    { id: "e-para-vid", type: "link", title: "Vorstellung der PARA-Methode", url: "https://www.youtube.com/watch?v=8sdnM-vdqvI", catId: "r5", linkedEntryIds: [], parentId: null },
  ],
  // Papierkorb: gelöschte Einträge & Kategorien. Items werden 30 Tage nach
  // dem Löschen (deletedAt) beim App-Start automatisch endgültig entfernt.
  trash: [],
  // Flashcards-Tool: Decks mit Vokabelkarten. Presets werden beim ersten
  // Start in migrateState geseedet (versioniert), User-Decks bleiben erhalten.
  flashcardDecks: [],
};

// IDs aller mitgelieferten Default-/Onboarding-Items. Wird in migrateState
// genutzt, um bestehende (vor dem seed-Flag gespeicherte) States nachträglich
// zu markieren, damit die Activity/XP-Berechnung Seed-Daten ausschließen kann.
export const SEED_IDS = new Set([
  ...SEED.cats.map((c) => c.id),
  ...SEED.entries.map((e) => e.id),
]);

/* ── Notification logic ──────────────────────────────────────── */
export function computeNotif(entries) {
  const overdue = entries.filter((e) => e.type === "task" && !e.done && isOld(e.due));
  const todayTasks = entries.filter((e) => e.type === "task" && !e.done && isToday(e.due));
  const todayCal = entries.filter((e) => e.type === "calendar" && isToday(e.date));
  if (!overdue.length && !todayTasks.length && !todayCal.length) return null;

  const count = overdue.length + todayTasks.length + todayCal.length;
  if (overdue.length && !todayTasks.length && !todayCal.length) {
    return { color: NOTIF_RED, count };
  }
  if (todayCal.length && !todayTasks.length) {
    return { color: NOTIF_NAVY, count: todayCal.length };
  }
  return { color: NOTIF_VIOL, count };
}

/* ── Fokus-Management (iOS-Tastatur) ─────────────────────────── */
// Blurt das aktuell fokussierte Eingabefeld. Auf iOS (Home-Screen-Web-App)
// blendet das System bei fokussiertem Input immer seine Formular-Assistent-
// Pille über der Tastatur ein – die verschwindet nur, wenn der Fokus
// konsequent aufgehoben wird (Navigation, Panel-Gesten, Listenwechsel …).
export function isEditableElement(el) {
  return !!el && (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export function blurActiveInput() {
  const el = document.activeElement;
  if (isEditableElement(el)) el.blur();
}
