import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ChevronsUpDown, ChevronUp, ChevronDown, Filter, Check } from "lucide-react";

// Schließt ein offenes Popup bei Klick/Tap außerhalb des Wrappers.
function useClickOutside(ref, onClose, active) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [ref, onClose, active]);
}

/**
 * Metazeile über einer Detail-Unterliste (analog zur Backlog-Metazeile):
 * Anzahl links, rechts optional ein Filter-Icon und immer ein Sortier-Icon.
 * Beide öffnen ein Frosted-Glass-Popup. Sortierung: Erstellungsdatum /
 * Alphabetisch (erneut wählen kehrt die Richtung um). Filter: freie Optionen.
 */
export function DetailMetaRow({
  t,
  count,
  tone,
  sort,
  onChangeSort,
  filterValue,
  filterOptions,
  onChangeFilter,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen);
  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);

  const pick = (by) =>
    onChangeSort(sort.by === by ? { by, desc: !sort.desc } : { by, desc: by === "date" });

  const hasFilter = Array.isArray(filterOptions) && filterOptions.length > 0;
  const filterActive = filterValue && filterValue !== "all";

  return (
    <div className="cat-detail__task-meta">
      <span className={`cat-detail__task-count${tone === "done" ? " cat-detail__task-count--done" : ""}`}>
        {t.entriesCount ? t.entriesCount(count) : count}
      </span>
      <div className="cat-detail__meta-actions">
        {hasFilter && (
          <div className="cat-detail__sort-wrap" ref={filterRef}>
            <button
              className={`cat-detail__sort-btn${filterActive || filterOpen ? " cat-detail__sort-btn--active" : ""}`}
              onClick={() => {
                setFilterOpen((o) => !o);
                setSortOpen(false);
              }}
              aria-label={t.filterLabel || "Filter"}
            >
              <Filter size={16} strokeWidth={2.2} />
            </button>
            {filterOpen && (
              <div className="cat-detail__glass-menu cat-detail__glass-menu--sort">
                {filterOptions.map((o) => (
                  <button
                    key={o.id}
                    className={`cat-detail__menu-option${filterValue === o.id ? " cat-detail__menu-option--active" : ""}`}
                    onClick={() => {
                      onChangeFilter(o.id);
                      setFilterOpen(false);
                    }}
                  >
                    <span>{o.label}</span>
                    {filterValue === o.id && <Check size={14} strokeWidth={2.4} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="cat-detail__sort-wrap" ref={sortRef}>
          <button
            className={`cat-detail__sort-btn${sortOpen ? " cat-detail__sort-btn--active" : ""}`}
            onClick={() => {
              setSortOpen((o) => !o);
              setFilterOpen(false);
            }}
            aria-label={t.sortLabel || "Sortieren"}
          >
            <ArrowDownUp size={16} strokeWidth={2.2} />
          </button>
          {sortOpen && (
            <div className="cat-detail__glass-menu cat-detail__glass-menu--sort">
              {[
                { id: "date", label: t.creationDate || "Erstellungsdatum" },
                { id: "alpha", label: t.alphabetical || "Alphabetisch" },
              ].map((o) => (
                <button
                  key={o.id}
                  className={`cat-detail__menu-option${sort.by === o.id ? " cat-detail__menu-option--active" : ""}`}
                  onClick={() => pick(o.id)}
                >
                  <span>{o.label}</span>
                  {sort.by === o.id &&
                    (sort.desc ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Frosted-Glass-Select-Pille über dem Detail-Dock. Zeigt standardmäßig nur den
 * aktiven Wert mit Chevron; Tap öffnet ein Popup mit allen Optionen (inkl.
 * Zähler-Badges). Schwebt absolut über der Liste, damit diese im Hintergrund
 * bis zum Dock sichtbar bleibt. `dockBar` = darüber liegt die volle Dock-Leiste
 * (Eingabefeld) statt nur der schwebende Home-Button → höherer Abstand.
 */
export function DetailViewSelect({ value, options, onChange, dockBar = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  const active = options.find((o) => o.id === value) || options[0];

  return (
    <div
      className={`cat-detail__view-select${dockBar ? " cat-detail__view-select--above-dock" : ""}`}
      ref={ref}
    >
      {open && (
        <div className="cat-detail__glass-menu cat-detail__glass-menu--view">
          {options.map((o) => (
            <button
              key={o.id}
              className={`cat-detail__menu-option${value === o.id ? " cat-detail__menu-option--active" : ""}${o.tone === "done" ? " cat-detail__menu-option--done" : ""}`}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.count > 0 && (
                <span className={`cat-detail__menu-count${o.tone === "done" ? " cat-detail__menu-count--done" : ""}`}>
                  {o.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <button
        className="cat-detail__view-pill"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`cat-detail__view-pill-label${active?.tone === "done" ? " cat-detail__view-pill-label--done" : ""}`}>
          {active?.label}
        </span>
        <ChevronsUpDown size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
