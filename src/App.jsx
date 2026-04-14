import { useState, useRef, useCallback } from "react";
import { usePersistedState } from "./hooks/useStorage";
import {
  Circle, Triangle, Square, Plus, ChevronLeft, Check,
  Bell, Trash2, X, FileText, CheckSquare, Calendar,
  Link2, Pencil
} from "lucide-react";
import "./App.scss";

/* ── helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const TODAY = new Date().toISOString().slice(0, 10);
const H = new Date().getHours();
const greet = (n) =>
  (H < 12 ? "Guten Morgen" : H < 18 ? "Guten Tag" : "Guten Abend") + `, ${n}`;
const isOld = (d) => d && d < TODAY;
const isToday = (d) => d === TODAY;
const fmtDate = (d) =>
  !d
    ? ""
    : new Date(d + "T12:00").toLocaleDateString("de-DE", {
        day: "numeric",
        month: "short",
      });

/* ── config ──────────────────────────────────────────────────── */
const CC = {
  project:  { label: "Projekte",   sing: "Projekt",   color: "#E03E3E", dim: "#1D0A0A" },
  area:     { label: "Bereiche",   sing: "Bereich",   color: "#D09020", dim: "#1D1508" },
  resource: { label: "Ressourcen", sing: "Ressource", color: "#30A060", dim: "#081408" },
};

const TABS = [
  { id: "tasks",    label: "Aufgaben", color: "#7C83F7", Icon: CheckSquare },
  { id: "notes",    label: "Notizen",  color: "#F59E0B", Icon: Pencil },
  { id: "calendar", label: "Kalender", color: "#38BDF8", Icon: Calendar },
];

const BOOKMARKS = [
  { id: "canvas", color: "#818CF8", Icon: FileText },
  { id: "tasks",  color: "#38BDF8", Icon: CheckSquare },
  { id: "cal",    color: "#34D399", Icon: Calendar },
  { id: "link",   color: "#FB923C", Icon: Link2 },
];

const NOTIF_RED = "#F26565";
const NOTIF_NAVY = "#1E40AF";
const NOTIF_VIOL = "#7C3AED";

const CAT_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
};

/* ── seed data ───────────────────────────────────────────────── */
const SEED = {
  user: { name: "Paul" },
  cats: [
    { id: "p1", type: "project",  name: "App entwickeln",  date: "2026-04-30", body: "Architektur-Überlegungen:\n\n→ React + Vite\n→ IndexedDB für Offline\n→ PWA installierbar\n\nMVP Scope:", tags: ["Coding"] },
    { id: "p2", type: "project",  name: "Abschlussarbeit", date: "2026-06-15", body: "", tags: [] },
    { id: "a1", type: "area",     name: "Gesundheit",      date: null, body: "", tags: [] },
    { id: "a2", type: "area",     name: "Studium",         date: null, body: "", tags: [] },
    { id: "r1", type: "resource", name: "Bücher & Links",  date: null, body: "", tags: [] },
  ],
  entries: [
    { id: "e1", type: "task", title: "Wireframes fertigstellen", done: false, note: "", due: "2026-04-13", catId: "p1" },
    { id: "e2", type: "task", title: "Design Review Meeting",    done: false, note: "Mit Lena & Jonas", due: "2026-04-14", catId: "p1" },
    { id: "e3", type: "task", title: "Einkaufen gehen",          done: true,  note: "", due: null, catId: null },
    { id: "e4", type: "task", title: "Sport machen",             done: false, note: "", due: "2026-04-14", catId: "a1" },
    { id: "e5", type: "task", title: "Kapitel 3 schreiben",      done: false, note: "", due: "2026-04-16", catId: "p2" },
    { id: "f1", type: "note", title: "MVP Feature Liste", body: "→ Command Panel mit Pull-Down\n→ Kategorien (P/A/R)\n→ Aufgaben, Notizen, Kalender\n→ Bookmark Rail", catId: "p1" },
    { id: "c1", type: "calendar", title: "Design Review", date: "2026-04-14", time: "15:00", catId: "p1" },
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
function CommandPanel({ user, notif, entries, open, onToggle }) {
  const today = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && (isToday(e.due) || isOld(e.due))) ||
      (e.type === "calendar" && isToday(e.date))
  );

  return (
    <div className={`command-panel command-panel--${open ? "open" : "closed"}`}>
      <div className="command-panel__header">
        <div>
          <div className="command-panel__greeting">{greet(user.name)}</div>
          <div className="command-panel__date">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
        <button
          className={`command-panel__bell ${notif ? "command-panel__bell--active" : ""}`}
          onClick={onToggle}
          style={
            notif
              ? { background: notif.color + "22", borderColor: notif.color + "55" }
              : {}
          }
        >
          <Bell size={17} color={notif ? notif.color : "#5858A0"} />
          {notif && (
            <span
              className="command-panel__bell-dot"
              style={{ background: notif.color }}
            />
          )}
        </button>
      </div>

      {open && (
        <div className="command-panel__drawer">
          {today.length === 0 ? (
            <div className="command-panel__drawer-empty">
              Keine offenen Einträge für heute 🎉
            </div>
          ) : (
            today.slice(0, 5).map((e) => (
              <div
                key={e.id}
                className={`command-panel__drawer-item ${
                  e.type === "task" && isOld(e.due)
                    ? "command-panel__drawer-item--overdue"
                    : ""
                }`}
              >
                <span
                  className="command-panel__drawer-dot"
                  style={{
                    background:
                      e.type === "calendar"
                        ? "#38BDF8"
                        : isOld(e.due)
                        ? NOTIF_RED
                        : "#7C83F7",
                  }}
                />
                <span className="command-panel__drawer-title">{e.title}</span>
                <span className="command-panel__drawer-meta">
                  {e.type === "calendar"
                    ? e.time + " Uhr"
                    : isOld(e.due)
                    ? "überfällig"
                    : "heute"}
                </span>
              </div>
            ))
          )}
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
function TaskList({ entries, cats, onToggle, onDelete }) {
  return entries.map((e) => {
    const cat = cats.find((c) => c.id === e.catId);
    const overdue = isOld(e.due) && !e.done;
    return (
      <div
        key={e.id}
        className={`task-item ${e.done ? "task-item--done" : ""}`}
      >
        <button
          className={`task-item__checkbox ${
            e.done ? "task-item__checkbox--checked" : ""
          }`}
          onClick={() => onToggle(e.id)}
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
                {isToday(e.due) ? "Heute" : fmtDate(e.due)}
              </span>
            )}
            {cat && (
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
        <button className="task-item__delete" onClick={() => onDelete(e.id)}>
          <Trash2 size={14} color="#5858A0" />
        </button>
      </div>
    );
  });
}

/* ── Note List ───────────────────────────────────────────────── */
function NoteList({ entries, cats, onDelete }) {
  return entries.map((e) => {
    const cat = cats.find((c) => c.id === e.catId);
    return (
      <div key={e.id} className="note-item">
        <div className="note-item__header">
          <div className="note-item__body">
            <div className="note-item__title">{e.title}</div>
            {e.body && <div className="note-item__excerpt">{e.body}</div>}
          </div>
          <button className="note-item__delete" onClick={() => onDelete(e.id)}>
            <Trash2 size={14} color="#5858A0" />
          </button>
        </div>
        {cat && (
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
  });
}

/* ── Calendar List ───────────────────────────────────────────── */
function CalList({ entries, cats, onDelete }) {
  return entries.map((e) => {
    const cat = cats.find((c) => c.id === e.catId);
    const past = e.date && e.date < TODAY;
    return (
      <div
        key={e.id}
        className={`cal-item ${isToday(e.date) ? "cal-item--today" : ""} ${
          past ? "cal-item--past" : ""
        }`}
      >
        <div className="cal-item__row">
          <div className="cal-item__date-badge">
            <div className="cal-item__date-month">
              {e.date
                ? new Date(e.date + "T12:00").toLocaleDateString("de-DE", {
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
          <button className="cal-item__delete" onClick={() => onDelete(e.id)}>
            <Trash2 size={14} color="#5858A0" />
          </button>
        </div>
        {cat && (
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
  });
}

/* ── Home Screen ─────────────────────────────────────────────── */
function HomeScreen({
  state,
  tab,
  setTab,
  onOpenCatType,
  onAddCat,
  onAddEntry,
  toggleTask,
  deleteEntry,
}) {
  const { entries, cats } = state;
  const tabEntries = entries.filter(
    (e) =>
      e.type ===
      (tab === "calendar" ? "calendar" : tab === "notes" ? "note" : "task")
  );
  const tabCfg = TABS.find((t) => t.id === tab);
  const tabColor = tabCfg?.color || "#7C83F7";

  const handleDoubleTap = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onAddEntry();
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
            const count = cats.filter((c) => c.type === type).length;
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
      <div className="entry-list" onDoubleClick={handleDoubleTap}>
        {tabEntries.length === 0 ? (
          <div className="entry-list__empty">
            <div className="entry-list__empty-icon">
              {tab === "tasks" ? "✓" : tab === "notes" ? "✎" : "☐"}
            </div>
            Keine {tabCfg?.label} · Doppeltippe zum Erstellen
          </div>
        ) : (
          <>
            {tab === "tasks" && (
              <TaskList
                entries={tabEntries}
                cats={cats}
                onToggle={toggleTask}
                onDelete={deleteEntry}
              />
            )}
            {tab === "notes" && (
              <NoteList
                entries={tabEntries}
                cats={cats}
                onDelete={deleteEntry}
              />
            )}
            {tab === "calendar" && (
              <CalList
                entries={tabEntries}
                cats={cats}
                onDelete={deleteEntry}
              />
            )}
          </>
        )}
      </div>

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
function CatListScreen({ type, cats, onOpen, onAdd, onBack }) {
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="cat-list">
      <div className="cat-list__header">
        <CatIcon size={22} color={cfg.color} />
        <h2 className="cat-list__title">{cfg.label}</h2>
      </div>

      <div className="cat-list__body">
        {cats.length === 0 ? (
          <div className="cat-list__empty">
            Noch keine {cfg.label} erstellt.
            <br />
            Tippe auf + um zu starten.
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
                  <div className="cat-list__item-date">{fmtDate(cat.date)}</div>
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
function BookmarkRail({ active, onSelect }) {
  return (
    <div className="bookmark-rail">
      {BOOKMARKS.map((bm) => {
        const BmIcon = bm.Icon;
        const isActive = active === bm.id;
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
              background: isActive ? bm.color : bm.color + "28",
              border: `1px solid ${bm.color}${isActive ? "" : "50"}`,
              borderRight: "none",
            }}
          >
            <BmIcon size={11} color={isActive ? "#fff" : bm.color} />
          </button>
        );
      })}
    </div>
  );
}

/* ── Category Detail Screen ──────────────────────────────────── */
function CatDetailScreen({
  cat,
  entries,
  onUpdate,
  onDelete,
  onBack,
  toggleTask,
  onAddEntry,
}) {
  const cfg = CC[cat.type];
  const CatIcon = CAT_ICONS[cat.type];
  const [bm, setBm] = useState("canvas");
  const [showDate, setShowDate] = useState(false);

  return (
    <div className="cat-detail">
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
        </div>
        <div className="cat-detail__pills">
          <button
            className="cat-detail__date-pill"
            onClick={() => setShowDate(!showDate)}
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
            {cat.date ? fmtDate(cat.date) : "+ Datum"}
          </button>
          {cat.tags?.map((tag) => (
            <span key={tag} className="cat-detail__tag">
              {tag}
            </span>
          ))}
        </div>
        {showDate && (
          <input
            type="date"
            className="cat-detail__date-input"
            value={cat.date || ""}
            onChange={(e) => {
              onUpdate({ date: e.target.value });
              setShowDate(false);
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="cat-detail__body">
        {bm === "canvas" && (
          <textarea
            className="cat-detail__textarea"
            value={cat.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Schreib hier deine Gedanken, Ideen und Notizen..."
          />
        )}
        {bm === "tasks" &&
          (entries.filter((e) => e.type === "task").length === 0 ? (
            <div className="cat-detail__section-empty">Keine Aufgaben</div>
          ) : (
            <TaskList
              entries={entries.filter((e) => e.type === "task")}
              cats={[]}
              onToggle={toggleTask}
              onDelete={() => {}}
            />
          ))}
        {bm === "cal" &&
          (entries.filter((e) => e.type === "calendar").length === 0 ? (
            <div className="cat-detail__section-empty">Keine Termine</div>
          ) : (
            <CalList
              entries={entries.filter((e) => e.type === "calendar")}
              cats={[]}
              onDelete={() => {}}
            />
          ))}
        {bm === "link" && (
          <div className="cat-detail__section-empty">
            Links & Quellen — kommt bald
          </div>
        )}
      </div>

      <BookmarkRail active={bm} onSelect={setBm} />

      {/* Bottom nav */}
      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        <div className="nav-bottom__actions">
          <button className="nav-bottom__delete" onClick={onDelete}>
            <Trash2 size={17} color="#F26565" />
          </button>
          <button
            className="nav-bottom__add"
            onClick={onAddEntry}
            style={{
              background: cfg.color,
              boxShadow: `0 8px 24px ${cfg.color}55`,
            }}
          >
            <Plus size={22} color="#fff" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Create Entry Modal ──────────────────────────────────────── */
function CreateModal({ type, cats, initialCatId, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [catId, setCatId] = useState(initialCatId || "");

  const tc =
    type === "task" ? "#7C83F7" : type === "note" ? "#F59E0B" : "#38BDF8";
  const label =
    type === "task" ? "Aufgabe" : type === "note" ? "Notiz" : "Termin";

  const save = () => {
    if (!title.trim()) return;
    const base = { type, title: title.trim(), catId: catId || null };
    if (type === "task") onSave({ ...base, done: false, note, due: due || null });
    else if (type === "note") onSave({ ...base, body });
    else onSave({ ...base, date, time });
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <h3 className="modal__title">Neue {label}</h3>
          <button className="modal__close" onClick={onClose}>
            <X size={18} color="#5858A0" />
          </button>
        </div>

        <input
          className="modal__input modal__input--title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel…"
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ borderColor: tc + "45" }}
        />

        {type === "task" && (
          <>
            <input
              className="modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz hinzufügen…"
            />
            <input
              type="date"
              className="modal__date-input"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              style={{ color: due ? "#EDEEFF" : "#5858A0" }}
            />
          </>
        )}

        {type === "note" && (
          <textarea
            className="modal__textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notiz schreiben…"
            rows={4}
          />
        )}

        {type === "calendar" && (
          <>
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
          </>
        )}

        <select
          className="modal__select"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          style={{ color: catId ? "#EDEEFF" : "#5858A0" }}
        >
          <option value="">Kein Projekt / Bereich</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {CC[c.type].sing}: {c.name}
            </option>
          ))}
        </select>

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
function NewCatModal({ type, onSave, onClose }) {
  const [name, setName] = useState("");
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__icon-row">
          <CatIcon size={20} color={cfg.color} />
          <h3 className="modal__title">Neues {cfg.sing}</h3>
        </div>
        <input
          className="modal__input modal__input--title"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${cfg.sing} benennen…`}
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

/* ════════════════════════════════════════════════════════════════
   APP ROOT
   ════════════════════════════════════════════════════════════════ */
export default function App() {
  const [state, setState, isLoaded] = usePersistedState(SEED);
  const [stack, setStack] = useState([{ view: "home" }]);
  const [tab, setTab] = useState("tasks");
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(null);
  const [newCatType, setNewCatType] = useState(null);

  const push = (v) => setStack((s) => [...s, v]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const cur = stack[stack.length - 1];

  /* ── mutations ─────────────────────────────────────────────── */
  const addCat = (type, name) =>
    setState((s) => ({
      ...s,
      cats: [
        ...s.cats,
        { id: uid(), type, name, date: null, body: "", tags: [] },
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

  const deleteEntry = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }));

  const notif = computeNotif(state.entries);

  /* ── swipe-back gesture ────────────────────────────────────── */
  const touchX = useRef(0);
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 75 && touchX.current < 45 && stack.length > 1) pop();
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
      className="app"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CommandPanel
        user={state.user}
        notif={notif}
        entries={state.entries}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
      />

      <div className="main-content">
        {cur.view === "home" && (
          <HomeScreen
            state={state}
            tab={tab}
            setTab={setTab}
            onOpenCatType={(type) => push({ view: "catList", type })}
            onAddCat={(type) => setNewCatType(type)}
            onAddEntry={() =>
              setCreating({
                type:
                  tab === "tasks"
                    ? "task"
                    : tab === "notes"
                    ? "note"
                    : "calendar",
                catId: null,
              })
            }
            toggleTask={toggleTask}
            deleteEntry={deleteEntry}
          />
        )}

        {cur.view === "catList" && (
          <CatListScreen
            type={cur.type}
            cats={state.cats.filter((c) => c.type === cur.type)}
            onOpen={(cat) => push({ view: "catDetail", catId: cat.id })}
            onAdd={() => setNewCatType(cur.type)}
            onBack={pop}
          />
        )}

        {cur.view === "catDetail" &&
          (() => {
            const cat = state.cats.find((c) => c.id === cur.catId);
            if (!cat) return null;
            return (
              <CatDetailScreen
                cat={cat}
                entries={state.entries.filter((e) => e.catId === cat.id)}
                onUpdate={(p) => updateCat(cat.id, p)}
                onDelete={() => {
                  if (window.confirm(`"${cat.name}" wirklich löschen?`))
                    deleteCat(cat.id);
                }}
                onBack={pop}
                toggleTask={toggleTask}
                onAddEntry={() =>
                  setCreating({ type: "task", catId: cat.id })
                }
              />
            );
          })()}
      </div>

      {creating && (
        <CreateModal
          type={creating.type}
          cats={state.cats}
          initialCatId={creating.catId}
          onSave={(e) => {
            addEntry(e);
            setCreating(null);
          }}
          onClose={() => setCreating(null)}
        />
      )}

      {newCatType && (
        <NewCatModal
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
