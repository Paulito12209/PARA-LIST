import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";

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
 * Sortier-/Zähl-Zeile über der Aufgabenliste (analog zur Backlog-Metazeile):
 * Anzahl links, Sortier-Icon rechts. Das Icon öffnet ein Frosted-Glass-Popup
 * (Erstellungsdatum / Alphabetisch, je mit Auf-/Absteigend-Toggle).
 */
export function TaskSortRow({ t, count, completed, sort, onChangeSort }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false), open);

  // Gleiches Kriterium erneut wählen → Richtung umkehren; sonst Standard je
  // Kriterium (Datum: neueste zuerst = desc; Alphabet: A→Z = aufsteigend).
  const pick = (by) =>
    onChangeSort(sort.by === by ? { by, desc: !sort.desc } : { by, desc: by === "date" });

  return (
    <div className="cat-detail__task-meta">
      <span
        className={`cat-detail__task-count${completed ? " cat-detail__task-count--done" : ""}`}
      >
        {t.entriesCount ? t.entriesCount(count) : count}
      </span>
      <div className="cat-detail__sort-wrap" ref={wrapRef}>
        <button
          className={`cat-detail__sort-btn${open ? " cat-detail__sort-btn--active" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={t.sortLabel || "Sortieren"}
        >
          <ArrowDownUp size={16} strokeWidth={2.2} />
        </button>
        {open && (
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
  );
}

/**
 * Frosted-Glass-Select-Pille (Offen / Erledigt) über dem Detail-Dock. Zeigt
 * standardmäßig nur den aktiven Wert mit Chevron; Tap öffnet ein Popup mit
 * beiden Optionen (inkl. Zähler-Badges).
 */
export function TaskViewSelect({ t, subTab, onChange, openCount, completedCount }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false), open);
  const isDone = subTab === "completed";

  return (
    <div className="cat-detail__view-select" ref={wrapRef}>
      {open && (
        <div className="cat-detail__glass-menu cat-detail__glass-menu--view">
          {[
            { id: "open", label: t.open || "Offen", count: openCount },
            { id: "completed", label: t.markDone || "Erledigt", count: completedCount, done: true },
          ].map((v) => (
            <button
              key={v.id}
              className={`cat-detail__menu-option${subTab === v.id ? " cat-detail__menu-option--active" : ""}${v.done ? " cat-detail__menu-option--done" : ""}`}
              onClick={() => {
                onChange(v.id);
                setOpen(false);
              }}
            >
              <span>{v.label}</span>
              {v.count > 0 && (
                <span
                  className={`cat-detail__menu-count${v.done ? " cat-detail__menu-count--done" : ""}`}
                >
                  {v.count}
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
        <span
          className={`cat-detail__view-pill-label${isDone ? " cat-detail__view-pill-label--done" : ""}`}
        >
          {isDone ? t.markDone || "Erledigt" : t.open || "Offen"}
        </span>
        <ChevronsUpDown size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
