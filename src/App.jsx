import { useState, useRef, useCallback } from "react";
import { I18N, getCC, getTABS } from "./i18n";
import { usePersistedState } from "./hooks/useStorage";
import {
  Circle, Triangle, Square, Plus, ChevronLeft, Check,
  Bell, Trash2, X, FileText, CheckSquare, Calendar,
  Link2, Pencil, Settings, Paperclip, Image as ImageIcon,
  Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon
} from "lucide-react";
import "./App.scss";

/* ── helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const TODAY = new Date().toISOString().slice(0, 10);
const H = new Date().getHours();
const isOld = (d) => d && d < TODAY;
const isToday = (d) => d === TODAY;
const fmtDate = (d, locale) =>
  !d
    ? ""
    : new Date(d + "T12:00").toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });

/* ── config ──────────────────────────────────────────────────── */


const BOOKMARKS = [
  { id: "canvas", color: "#818CF8", Icon: FileText },
  { id: "tasks",  color: "#38BDF8", Icon: CheckSquare },
  { id: "cal",    color: "#34D399", Icon: Calendar },
  { id: "media",  color: "#10B981", Icon: Paperclip },
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
  theme: "dark",
  user: { name: "Paul" },
  cats: [
    { id: "p1", type: "project",  name: "App entwickeln",  date: "2026-04-30", body: "Architektur-Überlegungen:\n\n→ React + Vite\n→ IndexedDB für Offline\n→ PWA installierbar\n\nMVP Scope:", tags: ["Coding"], relatedId: "a2" },
    { id: "p2", type: "project",  name: "Abschlussarbeit", date: "2026-06-15", body: "", tags: [], relatedId: "a2" },
    { id: "a1", type: "area",     name: "Gesundheit",      date: null, body: "", tags: [], relatedId: null },
    { id: "a2", type: "area",     name: "Studium",         date: null, body: "", tags: [], relatedId: null },
    { id: "r1", type: "resource", name: "Bücher & Links",  date: null, body: "", tags: [], relatedId: "p1" },
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
function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings, t, lang }) {
  const today = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && (isToday(e.due) || isOld(e.due))) ||
      (e.type === "calendar" && isToday(e.date))
  );

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
          {today.length === 0 ? (
            <div className="command-panel__drawer-empty">
              {t.emptyDrawer}
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
                    ? e.time + (t.oclock ? " " + t.oclock : "")
                    : isOld(e.due)
                    ? t.overdue
                    : t.today}
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
function TaskList({ entries, cats, onToggle, onDelete, t, CC, lang }) {
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
                {isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}
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
function NoteList({ entries, cats, onDelete, t, CC }) {
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
function CalList({ entries, cats, onDelete, t, CC, lang }) {
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

/* ── Media List ──────────────────────────────────────────────── */
function MediaList({ entries, onDelete, t }) {
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
function LinkList({ entries, onDelete, t }) {
  return entries.map((e) => (
    <div key={e.id} className="media-item">
      <div className="media-item__icon" style={{ background: "#FB923C22", color: "#FB923C" }}>
        <Link2 size={18} />
      </div>
      <div className="media-item__body">
        <div className="media-item__title">{e.title}</div>
        {e.url && <div className="media-item__meta">{e.url}</div>}
      </div>
      <button className="media-item__delete" onClick={() => onDelete(e.id)}>
        <Trash2 size={14} color="#5858A0" />
      </button>
    </div>
  ));
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
              <TaskList t={t} CC={CC} lang={lang}
                entries={tabEntries}
                cats={cats}
                onToggle={toggleTask}
                onDelete={deleteEntry}
              />
            )}
            {tab === "notes" && (
              <NoteList t={t} CC={CC}
                entries={tabEntries}
                cats={cats}
                onDelete={deleteEntry}
              />
            )}
            {tab === "calendar" && (
              <CalList t={t} CC={CC} lang={lang}
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
function CatListScreen({ type, cats, onOpen, onAdd, onBack, t, CC }) {
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
  t,
  CC,
  cat,
  allCats,
  entries,
  onUpdate,
  onDelete,
  onBack,
  toggleTask,
  deleteEntry,
  onAddEntry,
}) {
  const cfg = CC[cat.type];
  const CatIcon = CAT_ICONS[cat.type];
  const [bm, setBm] = useState("canvas");
  const [showDate, setShowDate] = useState(false);
  const [showConnSelect, setShowConnSelect] = useState(false);

  const related = allCats.find(c => c.id === cat.relatedId);
  const connOptions = allCats.filter(c => {
    if (c.id === cat.id) return false;
    if (cat.type === "project") return c.type === "area" || c.type === "resource";
    return c.type === "project";
  });

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
          <button className="cat-detail__delete-btn" onClick={onDelete}>
            <Trash2 size={16} color="#F26565" />
          </button>
        </div>
        <div className="cat-detail__pills" style={{ position: 'relative' }}>
          {cat.type === "project" && (
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
              {cat.date ? fmtDate(cat.date, t.locale) : t.addDate}
            </button>
          )}

          <button
            className="cat-detail__date-pill"
            onClick={() => setShowConnSelect(!showConnSelect)}
            style={
              related
                ? {
                    background: CC[related.type].color + "20",
                    borderColor: CC[related.type].color + "45",
                    color: CC[related.type].color,
                  }
                : {}
            }
          >
            {related ? related.name : t.connectProject}
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
        {showConnSelect && (
          <div className="cat-detail__conn-popup">
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
                      style={{ background: CC[opt.type].color }} 
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

      {/* Content */}
      <div className="cat-detail__body">
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
              cats={[]}
              onToggle={toggleTask}
              onDelete={deleteEntry}
            />
          ))}
        {bm === "cal" &&
          (entries.filter((e) => e.type === "calendar").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noCal}</div>
          ) : (
            <CalList t={t} CC={CC} lang={lang}
              entries={entries.filter((e) => e.type === "calendar")}
              cats={[]}
              onDelete={deleteEntry}
            />
          ))}
        {bm === "media" &&
          (entries.filter((e) => e.type === "media").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noMedia}</div>
          ) : (
            <MediaList t={t}
              entries={entries.filter((e) => e.type === "media")}
              onDelete={deleteEntry}
            />
          ))}
        {bm === "link" &&
          (entries.filter((e) => e.type === "link").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noLink}</div>
          ) : (
            <LinkList t={t}
              entries={entries.filter((e) => e.type === "link")}
              onDelete={deleteEntry}
            />
          ))}
      </div>

      <BookmarkRail active={bm} onSelect={setBm} />

      {/* Bottom nav */}
      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        <div className="nav-bottom__actions">
          <button
            className="nav-bottom__add"
            onClick={() => {
              const map = {
                canvas: "note",
                tasks: "task",
                cal: "calendar",
                media: "media",
                link: "link"
              };
              onAddEntry(map[bm] || "task");
            }}
            style={{
              background: BOOKMARKS.find((b) => b.id === bm)?.color || cfg.color,
              boxShadow: `0 8px 24px ${BOOKMARKS.find((b) => b.id === bm)?.color || cfg.color}55`,
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
function CreateModal({ type, cats, initialCatId, onSave, onClose, t, CC }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [catId, setCatId] = useState(initialCatId || "");
  const [mediaFile, setMediaFile] = useState(null);
  const fileInputRef = useRef(null);

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
    "#FB923C";

  const label =
    type === "task" ? t.task : 
    type === "note" ? "Notiz" : 
    type === "calendar" ? "Termin" : 
    type === "media" ? "Ressource" : 
    "Quelle";

  const save = () => {
    if (!title.trim()) return;
    const base = { type, title: title.trim(), catId: catId || null };
    if (type === "task") onSave({ ...base, done: false, note, due: due || null });
    else if (type === "note") onSave({ ...base, body });
    else if (type === "calendar") onSave({ ...base, date, time });
    else if (type === "media") onSave({ ...base, mediaType, mediaData: mediaFile });
    else if (type === "link") onSave({ ...base, url });
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
            placeholder={t.writeNotePlaceholder}
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

        <select
          className="modal__select"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          style={{ color: catId ? "#EDEEFF" : "#5858A0" }}
        >
          <option value="">{t.noProject}</option>
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

/* ── Settings Modal ──────────────────────────────────────────── */
function SettingsModal({ theme, setTheme, lang, setLang, t, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__icon-row">
          <Settings size={20} className="icon-muted" color="currentColor" />
          <h3 className="modal__title">{t.settings}</h3>
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
          
          <div className="settings-row" style={{ marginTop: 24 }}>
            <span className="settings-label">{t.language}</span>
            <div className="theme-toggle">
              <button 
                className={`theme-toggle__btn ${lang === "de" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("de")}
              >
                DE
              </button>
              <button 
                className={`theme-toggle__btn ${lang === "en" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button 
                className={`theme-toggle__btn ${lang === "es" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang("es")}
              >
                ES
              </button>
            </div>
          </div>
        </div>

        <button
          className="modal__submit"
          onClick={onClose}
          style={{ background: "#262648", color: "white", marginTop: "24px" }}
        >
          Schließen
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
        { id: uid(), type, name, date: null, body: "", tags: [], relatedId: null },
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
      />

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
            t={t}
            CC={CC}
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
                t={t}
                CC={CC}
                cat={cat}
                allCats={state.cats}
                entries={state.entries.filter((e) => e.catId === cat.id)}
                onUpdate={(p) => updateCat(cat.id, p)}
                onDelete={() => {
                  if (window.confirm(t.confirmDelete(cat.name)))
                    deleteCat(cat.id);
                }}
                onBack={pop}
                toggleTask={toggleTask}
                deleteEntry={deleteEntry}
                onAddEntry={(type) =>
                  setCreating({ type, catId: cat.id })
                }
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
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {creating && (
        <CreateModal
          t={t}
          CC={CC}
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
