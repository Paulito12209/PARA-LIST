import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Filter,
  Check,
  Circle,
  Triangle,
  Square,
  CheckCircle2,
  FileText,
  Calendar,
  Paperclip,
  Link2,
  ChevronDown,
} from "lucide-react";

const CAT_TYPE_ICON = { project: Circle, area: Triangle, resource: Square };
const CAT_TYPE_COLOR = {
  project: "var(--cat-project, #E03E3E)",
  area: "var(--cat-area, #D09020)",
  resource: "var(--cat-resource, #30A060)",
};
const ENTRY_TYPE_ICON = {
  task: CheckCircle2,
  note: FileText,
  calendar: Calendar,
  media: Paperclip,
  link: Link2,
};
const ENTRY_TYPE_COLOR = {
  task: "#0B8CE9",
  note: "#F59E0B",
  calendar: "#0078D4",
  media: "#10B981",
  link: "#7C3AED",
};

function toTimestamp(value) {
  if (typeof value === "number") return value;
  if (value) return Date.parse(value) || 0;
  return 0;
}

function getGroupLabel(ts, t) {
  if (!ts) return t.searchEarlier;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  if (ts >= todayStart) return t.todayGroup;
  if (ts >= yesterdayStart) return t.searchYesterday;
  return t.searchEarlier;
}

function matchesFilter(item, filter) {
  if (filter === "all") return true;
  if (item.kind === "cat") return item.type === filter;
  return item.type === filter;
}

function getLocation(item, cats, t) {
  if (item.kind === "cat") {
    const label =
      item.type === "project"
        ? t.projects
        : item.type === "area"
        ? t.areas
        : t.resources;
    return t.searchIn(label);
  }
  const catId = item.catIds?.[0] || item.catId;
  const cat = cats.find((c) => c.id === catId);
  if (cat) return t.searchIn(cat.name);
  const typeLabel =
    item.type === "task"
      ? t.tasks
      : item.type === "note"
      ? t.notes
      : item.type === "calendar"
      ? t.calendar
      : item.type === "link"
      ? t.linkPlural
      : t.resources;
  return t.searchIn(typeLabel);
}

function SearchResultItem({ item, cats, t, onSelect }) {
  const Icon =
    item.kind === "cat"
      ? CAT_TYPE_ICON[item.type] || Square
      : ENTRY_TYPE_ICON[item.type] || FileText;
  const color =
    item.kind === "cat"
      ? CAT_TYPE_COLOR[item.type]
      : ENTRY_TYPE_COLOR[item.type] || "#888";

  return (
    <button
      type="button"
      className="search-panel__item"
      onClick={() => onSelect(item)}
    >
      <span className="search-panel__item-icon" style={{ color }}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span className="search-panel__item-text">
        <span className="search-panel__item-title">{item.title}</span>
        <span className="search-panel__item-location">{getLocation(item, cats, t)}</span>
      </span>
    </button>
  );
}

/**
 * Such-Inhalt im geöffneten Command-Panel (Backlog-Kontext).
 * Header (Logo · Datum · „Suchen“ · Settings) bleibt im CommandPanel.
 * Die schwebende Eingabezeile erscheint nur bei aktiver Tastatur.
 */
export function SearchPanel({
  t,
  entries,
  cats,
  onOpenEntry,
  onOpenCat,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);

  const filterOptions = [
    { id: "all", label: t.filterAll },
    ...[
      { id: "project", label: t.projects },
      { id: "area", label: t.areas },
      { id: "resource", label: t.resources },
      { id: "task", label: t.tasks },
      { id: "note", label: t.notes },
      { id: "calendar", label: t.events },
    ].sort((a, b) => a.label.localeCompare(b.label, t.locale)),
  ];

  const allItems = useMemo(() => {
    const catItems = cats
      .filter((c) => !c.archived)
      .map((c) => ({
        kind: "cat",
        id: c.id,
        title: c.name,
        type: c.type,
        lastOpenedAt: toTimestamp(c.lastOpenedAt) || toTimestamp(c.createdAt),
      }));

    const entryItems = entries
      .filter((e) => {
        if (e.trashedAt) return false;
        if (e.type === "task" && e.done) return false;
        if (e.type === "calendar" && e.done) return false;
        if (e.type === "note" && e.archived) return false;
        return true;
      })
      .map((e) => ({
        kind: "entry",
        id: e.id,
        title: e.title,
        type: e.type,
        catIds: e.catIds,
        catId: e.catId,
        lastOpenedAt: toTimestamp(e.lastOpenedAt) || toTimestamp(e.createdAt),
      }));

    return [...catItems, ...entryItems];
  }, [cats, entries]);

  const filtered = useMemo(() => {
    let list = allItems.filter((item) => matchesFilter(item, typeFilter));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => item.title.toLowerCase().includes(q));
      list.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    } else {
      list = [...list].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 40);
    }
    return list;
  }, [allItems, typeFilter, query]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const label = getGroupLabel(item.lastOpenedAt, t);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(item);
    }
    return Array.from(map.entries());
  }, [filtered, t]);

  const firstGroup = groups[0];
  const restGroups = groups.slice(1);
  const filterActive = typeFilter !== "all";
  const showKeyboardBar = inputFocused || kbHeight > 0;

  const metaLeftLabel = query.trim()
    ? filtered.length > 0
      ? t.entriesCount(filtered.length)
      : ""
    : firstGroup?.[0] || "";

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(kb > 80 ? kb : 0);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const handleSelect = (item) => {
    setFilterMenuOpen(false);
    if (item.kind === "cat") onOpenCat?.({ id: item.id });
    else onOpenEntry?.({ id: item.id });
  };

  const handleInputFocus = () => {
    clearTimeout(blurTimer.current);
    setInputFocused(true);
  };

  const handleInputBlur = () => {
    blurTimer.current = setTimeout(() => setInputFocused(false), 120);
  };

  const collapseKeyboard = () => {
    clearTimeout(blurTimer.current);
    inputRef.current?.blur();
    setInputFocused(false);
  };

  const refocusInput = () => inputRef.current?.focus();

  return (
    <>
      {filterMenuOpen && (
        <div className="command-panel__menu-backdrop" onClick={() => setFilterMenuOpen(false)} />
      )}

      <div className="command-panel__drawer search-panel" style={{ touchAction: "pan-y" }}>
        {/* Heute links · Filter rechts – eine Zeile */}
        <div className="command-panel__meta-row search-panel__meta-row">
          <button
            type="button"
            className="search-panel__meta-label"
            onClick={refocusInput}
            aria-label={t.searchTitle}
          >
            {metaLeftLabel}
          </button>
          <div className="command-panel__meta-action-wrap">
            <button
              type="button"
              className={`command-panel__list-filter-btn${
                filterActive ? " command-panel__list-filter-btn--active" : ""
              }`}
              onClick={() => setFilterMenuOpen((o) => !o)}
              aria-label={t.filterLabel}
              aria-expanded={filterMenuOpen}
            >
              <Filter size={16} strokeWidth={2.2} />
            </button>
            {filterMenuOpen && (
              <div className="command-panel__glass-menu command-panel__glass-menu--filter">
                {filterOptions.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`command-panel__menu-option${
                      typeFilter === f.id ? " command-panel__menu-option--active" : ""
                    }`}
                    onClick={() => {
                      setTypeFilter(f.id);
                      setFilterMenuOpen(false);
                    }}
                  >
                    <span>{f.label}</span>
                    {typeFilter === f.id && <Check size={14} strokeWidth={2.4} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`command-panel__list search-panel__list search-panel__list--kb-open`}>
          {filtered.length === 0 && (
            <div className="search-panel__empty">{t.searchNoResults || "Keine Ergebnisse"}</div>
          )}

          {firstGroup && (
            <>
              {firstGroup[1].map((item) => (
                <SearchResultItem
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  cats={cats}
                  t={t}
                  onSelect={handleSelect}
                />
              ))}
            </>
          )}

          {restGroups.map(([label, items]) => (
            <div key={label} className="search-panel__group">
              <div className="search-panel__group-label">{label}</div>
              {items.map((item) => (
                <SearchResultItem
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  cats={cats}
                  t={t}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Sucheingabe-Dock am unteren Rand des SearchPanels */}
        <div className="command-dock command-dock--detail search-panel__bottom-dock">
          <div className="command-dock__input-row">
            <input
              ref={inputRef}
              className="command-dock__input"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t.searchPlaceholder || "Suchen..."}
              aria-label={t.searchTitle || "Suchen"}
            />
            {/* List-Icon rechts daneben, um zum Backlog zu wechseln */}
            <button
              type="button"
              className="command-dock__icon-btn"
              onClick={onClose}
              aria-label={t.backlog || "Backlog"}
            >
              <CheckCircle2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
