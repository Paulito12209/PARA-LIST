import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, Check } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

/**
 * Verknüpfungs-Bottom-Sheet. Slidet von unten herein und endet unter dem
 * Header (80px + Safe-Area). Listet Projekte, Arbeitsbereiche und Ressourcen
 * gruppiert auf; jede Zeile lässt sich über den Auswahl-Kreis rechts an-/
 * abwählen. Unten links schließt das Sheet, unten rechts bestätigt
 * ("Verknüpfen"). Wird per Portal an <body> gehängt.
 *
 * Props:
 *  - currentIds: number[]  – aktuell verknüpfte Kategorie-IDs
 *  - cats: Kategorie-Liste
 *  - CC: Farb-/Label-Konfiguration je Typ
 *  - onConfirm(nextIds)
 *  - onClose
 */
export function LinkSheet({ currentIds = [], cats = [], CC, t, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(currentIds));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirm = () => {
    setClosing(true);
    setTimeout(() => onConfirm?.(Array.from(selected)), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  const groups = [
    { type: "project", label: t.projects },
    { type: "area", label: t.areas },
    { type: "resource", label: t.resources },
  ];

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.linkSheetTitle}</div>

        <div className="link-sheet__list link-sheet__scroll">
          {groups.map(({ type, label }) => {
            const items = cats.filter((c) => c.type === type && !c.archived);
            if (items.length === 0) return null;
            const Icon = TYPE_ICONS[type];
            const color = CC[type]?.color;
            return (
              <div className="link-sheet__group" key={type}>
                <div className="link-sheet__group-head">{label}</div>
                {items.map((item) => {
                  const isSel = selected.has(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                      onClick={() => toggle(item.id)}
                    >
                      <Icon size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span className="link-sheet__row-name">{item.name}</span>
                      <span className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`} style={isSel ? { background: color, borderColor: color } : undefined}>
                        {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn}>
          <button className="link-sheet__confirm-btn" onClick={confirm}>
            {t.linkAction}
          </button>
        </SheetFooter>
      </div>
    </div>,
    document.body
  );
}
