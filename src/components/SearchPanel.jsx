import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
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
  return filter.includes(item.type);
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
  query,
  setQuery,
  inputFocused,
  setInputFocused,
  lang,
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const selectAll = () => setTypeFilter("all");
  const toggleType = (id) =>
    setTypeFilter((prev) => {
      if (prev === "all") return [id];
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length === 0 ? "all" : next;
    });
  const isTypeSelected = (id) =>
    id === "all" ? typeFilter === "all" : typeFilter !== "all" && typeFilter.includes(id);
  const kbHeight = useKeyboardHeight();
  const inputRef = useRef(null);
  const blurTimer = useRef(null);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const refocusInput = () => inputRef.current?.focus();

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

  // Wenn die Leiste eingeblendet wird, fokussieren wir automatisch das dortige Suchfeld
  useEffect(() => {
    if (inputFocused) {
      inputRef.current?.focus();
    }
  }, [inputFocused]);

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

  const filterActive = typeFilter !== "all";

  // Beim Suchen zeigt die Meta-Zeile die Trefferzahl. Ohne Suchanfrage bleibt
  // sie leer – die Abschnittstitel (Heute/Gestern/…) werden als native
  // Sticky-Labels in der Liste selbst gerendert (kein JS-Scroll-Tracking mehr).
  const metaLeftLabel =
    query.trim() && filtered.length > 0 ? t.entriesCount(filtered.length) : "";

  const handleSelect = (item) => {
    setFilterMenuOpen(false);
    if (item.kind === "cat") onOpenCat?.({ id: item.id });
    else onOpenEntry?.({ id: item.id });
  };

  return (
    <>
      {filterMenuOpen && (
        <div className="command-panel__menu-backdrop" onClick={() => setFilterMenuOpen(false)} />
      )}

      <div className="command-panel__drawer search-panel" style={{ touchAction: "pan-y" }}>
        {/* Filter-Button – schwebt oben rechts, auf Höhe des ersten
            Abschnittstitels (der als Sticky-Label in der Liste sitzt). */}
        <div className="command-panel__meta-action-wrap search-panel__filter-float">
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
                    isTypeSelected(f.id) ? " command-panel__menu-option--active" : ""
                  }`}
                  onClick={() => (f.id === "all" ? selectAll() : toggleType(f.id))}
                >
                  <span>{f.label}</span>
                  {isTypeSelected(f.id) && <Check size={14} strokeWidth={2.4} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="command-panel__list search-panel__list search-panel__list--kb-open">
          {filtered.length === 0 && (
            <div className="search-panel__empty">{t.searchNoResults || "Keine Ergebnisse"}</div>
          )}

          {/* Beim Suchen: Trefferzahl als erste Zeile (links, wie zuvor). */}
          {metaLeftLabel && (
            <div className="search-panel__meta-label search-panel__count">{metaLeftLabel}</div>
          )}

          {/* Native Sticky-Abschnittstitel: rasten flüssig oben ein, ohne
              JS-Layout-Toggles (kein Springen zwischen den Gruppen). */}
          {groups.map(([label, items]) => (
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
      </div>

      {(inputFocused || kbHeight > 0) &&
        createPortal(
          <div
            className="search-panel__kb-bar"
            data-keep-focus="true"
            style={{ bottom: kbHeight > 0 ? kbHeight : undefined }}
          >
            {/* Schließbutton (links) – schließt das Such-Overlay komplett */}
            <button
              type="button"
              className="search-panel__kb-close"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
              aria-label={t.closeBtn || "Schließen"}
            >
              <X size={20} />
            </button>

            {/* Input-Feld (Mitte) */}
            <div className="search-panel__kb-input-wrap">
              <input
                ref={inputRef}
                className="search-panel__kb-input"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={lang === "de" ? "Suchen..." : lang === "es" ? "Buscar..." : "Search..."}
                aria-label={t.searchTitle || "Suchen"}
              />
            </div>

            {/* Zuklappbutton (rechts) – Tastatur zuklappen */}
            <button
              type="button"
              className="search-panel__kb-collapse"
              onMouseDown={(e) => e.preventDefault()}
              onClick={collapseKeyboard}
              aria-label={t.fc?.collapseKeyboard || t.closeBtn}
            >
              <ChevronDown size={20} />
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
