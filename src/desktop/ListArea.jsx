import { useMemo, useState, useRef, useEffect } from "react";
import { CheckCircle2, Pencil, Calendar, Circle, Triangle, Square, Plus, Clock } from "lucide-react";
import { TODAY, isOld, isToday, getTaskGroup } from "../utils";

const TILE_CFG = {
  tasks: {
    Icon: CheckCircle2,
    accent: "var(--cat-task)",
    accentSoft: "rgba(11, 140, 233, 0.16)",
    labelKey: "tasks",
    fallback: "Aufgaben",
  },
  notes: {
    Icon: Pencil,
    accent: "var(--cat-note)",
    accentSoft: "rgba(251, 191, 36, 0.18)",
    labelKey: "notes",
    fallback: "Notizen",
  },
  calendar: {
    Icon: Calendar,
    accent: "var(--cat-cal)",
    accentSoft: "rgba(0, 120, 212, 0.18)",
    labelKey: "calendar",
    fallback: "Kalender",
  },
};

function shortWeekday(date, locale) {
  const wd = date.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  return wd.length > 2 ? wd.slice(0, 2) : wd;
}

function todayHeaderRight(t, lang) {
  const locale = t?.locale || (lang === "en" ? "en-US" : "de-DE");
  const d = new Date();
  const wd = shortWeekday(d, locale);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString(locale, { month: "short" }).replace(".", "");
  return `${wd} · ${day}. ${month}`;
}

function groupForDate(dueStr, t, lang) {
  if (!dueStr) return null;
  if (isToday(dueStr)) {
    return { key: "today", label: t?.todayCap || (lang === "en" ? "Today" : "Heute"), sub: todayHeaderRight(t, lang), sortKey: 0 };
  }
  const group = getTaskGroup(dueStr, t?.locale || "de-DE");
  if (!group) return null;
  return { key: group.left, label: group.left, sub: group.right, sortKey: group.sortKey };
}

function buildGroups(entries, t, lang) {
  const groups = new Map();
  for (const e of entries) {
    const dateField = e.type === "calendar" ? e.date : e.type === "task" ? e.due : null;
    let g;
    if (dateField) {
      g = groupForDate(dateField, t, lang);
    }
    if (!g) {
      // For notes (no date) or undated entries — bucket by createdAt
      const ts = e.createdAt || 0;
      const d = ts ? new Date(ts) : new Date();
      const dStart = new Date();
      dStart.setHours(0, 0, 0, 0);
      const y = new Date(dStart);
      y.setDate(y.getDate() - 1);

      const isCreatedToday = ts >= dStart.getTime();
      const isCreatedYday  = ts >= y.getTime() && ts < dStart.getTime();
      if (isCreatedToday) {
        g = { key: "today", label: t?.todayCap || "Heute", sub: todayHeaderRight(t, lang), sortKey: 0 };
      } else if (isCreatedYday) {
        g = { key: "yesterday", label: t?.yesterday ? t.yesterday[0].toUpperCase() + t.yesterday.slice(1) : "Gestern", sub: "", sortKey: -1 };
      } else {
        const locale = t?.locale || "de-DE";
        g = {
          key: `older-${d.toISOString().slice(0, 10)}`,
          label: d.toLocaleDateString(locale, { day: "numeric", month: "short" }),
          sub: "",
          sortKey: -1000 + ts,
        };
      }
    }
    if (!groups.has(g.key)) groups.set(g.key, { ...g, items: [] });
    groups.get(g.key).items.push(e);
  }
  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function MetaPills({ entry, cats, CC }) {
  const ids = entry.catIds || (entry.catId ? [entry.catId] : []);
  if (!ids.length) return null;
  const linked = cats.filter((c) => ids.includes(c.id));
  const proj = linked.find((c) => c.type === "project");
  const area = linked.find((c) => c.type === "area");
  const res  = linked.find((c) => c.type === "resource");
  if (!proj && !area && !res) return null;
  return (
    <span className="dsk-tile__entry-meta-pills">
      {proj && (
        <span className="dsk-tile__entry-pill" style={{ color: CC.project.color }} title={proj.name}>
          <Circle size={9} strokeWidth={2.5} />
        </span>
      )}
      {area && (
        <span className="dsk-tile__entry-pill" style={{ color: CC.area.color }} title={area.name}>
          <Triangle size={9} strokeWidth={2.5} />
        </span>
      )}
      {res && (
        <span className="dsk-tile__entry-pill" style={{ color: CC.resource.color }} title={res.name}>
          <Square size={9} strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

function EntryCard({ entry, cats, type, CC, onOpenEntry, toggleTask }) {
  const isTask = type === "tasks";
  const isCal  = type === "calendar";
  const isNote = type === "notes";
  const tileCfg = TILE_CFG[type];

  const handleClick = () => onOpenEntry?.(entry);

  const subline =
    (isTask && (entry.note || entry.subtitle)) ||
    (isCal && entry.subtitle) ||
    (isNote && entry.body) ||
    "";

  const timeLabel = (() => {
    if (isCal && entry.time && entry.endTime) return `${entry.time} – ${entry.endTime}`;
    if (isCal && entry.time) return entry.time;
    if (entry.createdAt) {
      const d = new Date(entry.createdAt);
      return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }
    return null;
  })();

  return (
    <div className="dsk-tile__entry" onClick={handleClick} role="button" tabIndex={0}>
      {isTask ? (
        <button
          type="button"
          className={`dsk-tile__entry-check${entry.done ? " dsk-tile__entry-check--done" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleTask?.(entry.id);
          }}
          aria-label="toggle"
        >
          {entry.done && <span className="dsk-tile__entry-check-mark">✓</span>}
        </button>
      ) : (
        <span className="dsk-tile__entry-icon" style={{ background: tileCfg.accentSoft, color: tileCfg.accent }}>
          <tileCfg.Icon size={14} strokeWidth={2} />
        </span>
      )}
      <div className="dsk-tile__entry-body">
        <div className="dsk-tile__entry-title">{entry.title}</div>
        {subline && <div className="dsk-tile__entry-sub">{subline}</div>}
        <div className="dsk-tile__entry-foot">
          {timeLabel && (
            <span className="dsk-tile__entry-time">
              <Clock size={10} />
              {timeLabel}
            </span>
          )}
          <MetaPills entry={entry} cats={cats} CC={CC} />
        </div>
      </div>
    </div>
  );
}

function addLabelFor(lang) {
  return lang === "en" ? "Add" : lang === "es" ? "Añadir" : "Hinzufügen";
}

function TileBody({ type, t, lang, CC, entries, cats, onOpenEntry, toggleTask }) {
  const groups = useMemo(() => buildGroups(entries, t, lang), [entries, t, lang]);

  return (
    <div className="dsk-tile__body">
      {groups.length === 0 && (
        <div className="dsk-tile__empty">
          {lang === "en" ? "Nothing here yet." : lang === "es" ? "Nada todavía." : "Noch nichts."}
        </div>
      )}
      {groups.map((g) => (
        <div key={g.key} className="dsk-tile__group">
          <div className="dsk-tile__group-header">
            <span className="dsk-tile__group-label">{g.label}</span>
            <span className="dsk-tile__group-count">{g.items.length}</span>
            {g.sub && <span className="dsk-tile__group-sub">{g.sub}</span>}
          </div>
          <div className="dsk-tile__group-items">
            {g.items.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                cats={cats}
                type={type}
                CC={CC}
                onOpenEntry={onOpenEntry}
                toggleTask={toggleTask}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="dsk-tile__fade" aria-hidden="true" />
    </div>
  );
}

function Tile({ type, t, lang, CC, entries, cats, onOpenEntry, toggleTask, onAddEntry }) {
  const cfg = TILE_CFG[type];
  const Icon = cfg.Icon;
  const addLabel = addLabelFor(lang);

  return (
    <div className="dsk-tile">
      <div className="dsk-tile__header">
        <span className="dsk-tile__header-icon" style={{ background: cfg.accentSoft, color: cfg.accent }}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="dsk-tile__header-title">{t?.[cfg.labelKey] || cfg.fallback}</span>
        <button
          type="button"
          className="dsk-tile__header-add"
          onClick={() => onAddEntry?.(type)}
          title={addLabel}
          aria-label={addLabel}
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>
      <TileBody
        type={type}
        t={t}
        lang={lang}
        CC={CC}
        entries={entries}
        cats={cats}
        onOpenEntry={onOpenEntry}
        toggleTask={toggleTask}
      />
    </div>
  );
}

// Compact view: tasks + notes merged into a single tile with a tab switcher.
function TabbedTile({ tabs, t, lang, CC, cats, onOpenEntry, toggleTask, onAddEntry }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((tab) => tab.id === active) || tabs[0];
  const addLabel = addLabelFor(lang);

  return (
    <div className="dsk-tile dsk-tile--tabbed">
      <div className="dsk-tile__tabs" role="tablist">
        {tabs.map(({ id }) => {
          const cfg = TILE_CFG[id];
          const Icon = cfg.Icon;
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`dsk-tile__tab${isActive ? " dsk-tile__tab--active" : ""}`}
              onClick={() => setActive(id)}
            >
              <span
                className="dsk-tile__tab-icon"
                style={{ background: cfg.accentSoft, color: cfg.accent }}
              >
                <Icon size={15} strokeWidth={2.2} />
              </span>
              <span className="dsk-tile__tab-label">{t?.[cfg.labelKey] || cfg.fallback}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="dsk-tile__header-add"
          onClick={() => onAddEntry?.(active)}
          title={addLabel}
          aria-label={addLabel}
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>
      <TileBody
        key={active}
        type={active}
        t={t}
        lang={lang}
        CC={CC}
        entries={current.entries}
        cats={cats}
        onOpenEntry={onOpenEntry}
        toggleTask={toggleTask}
      />
    </div>
  );
}

const TILE_TO_ENTRY_TYPE = { tasks: "task", notes: "note", calendar: "calendar" };

// Below this list-area width two side-by-side tiles (min 360px each) no longer
// fit, so tasks + notes collapse into one tabbed tile instead of overflowing.
const COMPACT_WIDTH = 792;

function useCompact(ref) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      setCompact(w < COMPACT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return compact;
}

export function ListArea({
  t,
  lang,
  CC,
  entries,
  cats,
  onOpenEntry,
  toggleTask,
  onAddEntry,
}) {
  const areaRef = useRef(null);
  const compact = useCompact(areaRef);

  const tasks    = entries.filter((e) => e.type === "task" && !e.done && !isOld(e.due));
  const notes    = entries.filter((e) => e.type === "note" && !e.archived);
  const calendar = entries.filter((e) => e.type === "calendar" && (!e.date || e.date >= TODAY) && !e.done);

  const handleAdd = (tileType) => onAddEntry?.(TILE_TO_ENTRY_TYPE[tileType]);

  return (
    <div ref={areaRef} className={`dsk-list-area${compact ? " dsk-list-area--compact" : ""}`}>
      {compact ? (
        <TabbedTile
          tabs={[
            { id: "tasks", entries: tasks },
            { id: "notes", entries: notes },
          ]}
          t={t} lang={lang} CC={CC} cats={cats}
          onOpenEntry={onOpenEntry} toggleTask={toggleTask} onAddEntry={handleAdd}
        />
      ) : (
        <>
          <Tile type="tasks" t={t} lang={lang} CC={CC} entries={tasks} cats={cats} onOpenEntry={onOpenEntry} toggleTask={toggleTask} onAddEntry={handleAdd} />
          <Tile type="notes" t={t} lang={lang} CC={CC} entries={notes} cats={cats} onOpenEntry={onOpenEntry} toggleTask={toggleTask} onAddEntry={handleAdd} />
        </>
      )}
      <Tile type="calendar" t={t} lang={lang} CC={CC} entries={calendar} cats={cats} onOpenEntry={onOpenEntry} toggleTask={toggleTask} onAddEntry={handleAdd} />
    </div>
  );
}

