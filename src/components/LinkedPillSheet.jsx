import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, X } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

/**
 * Kompaktes Bottom-Sheet, das beim Antippen einer Kategorie-Pille die aktuell
 * verknüpften Einträge dieser Kategorie anzeigt. Unten: Schließen-Button
 * (links) und "Mehr verknüpfen" (rechts), das auf das volle LinkSheet
 * umschaltet. Teilt sich die `.link-sheet`-Styles mit dem vollen Sheet.
 *
 * Props:
 *  - type: 'project' | 'area' | 'resource'
 *  - items: verknüpfte Kategorien dieses Typs
 *  - CC, t
 *  - onMore()  – öffnet das volle Verknüpfungs-Sheet
 *  - onClose()
 */
export function LinkedPillSheet({ type, items = [], CC, t, onMore, onClose }) {
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

  const handleMore = () => {
    setClosing(true);
    setTimeout(() => onMore?.(), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);
  const Icon = TYPE_ICONS[type];
  const color = CC[type]?.color;
  const title = items.length > 1 ? CC[type]?.label : CC[type]?.sing;

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{title}</div>

        <div className="link-sheet__scroll">
          <div className="link-sheet__list">
            {items.map((item) => (
              <div key={item.id} className="link-sheet__row link-sheet__row--static">
                <Icon size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span className="link-sheet__row-name">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="link-sheet__footer">
          <button className="link-sheet__close-btn" onClick={handleClose} aria-label={t.closeBtn}>
            <X size={20} />
          </button>
          <button className="link-sheet__confirm-btn" onClick={handleMore}>
            {t.linkMore}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
