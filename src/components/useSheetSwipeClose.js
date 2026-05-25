import { useRef } from "react";

// Schwellen für die Wisch-nach-unten-Geste eines Bottom-Sheets.
const CLOSE_DY_PX = 60; // Mindest-Strecke nach unten zum Schließen
const AXIS_TOL_PX = 80; // erlaubte horizontale Abweichung

/**
 * Wisch-nach-unten-zum-Schließen für Bottom-Sheets. Liefert Touch-Handler für
 * den Overlay-Container. Stoppt zudem die Propagation, damit die globale
 * Swipe-Down-Geste in `App.jsx` NICHT das Command-Panel öffnet, solange ein
 * Sheet offen ist.
 *
 * @param {() => void} onClose – wird beim Abwärts-Wisch aufgerufen (i.d.R. die
 *   animierte `handleClose` des Sheets).
 */
export function useSheetSwipeClose(onClose) {
  const startY = useRef(0);
  const startX = useRef(0);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    e.stopPropagation();
  };

  const onTouchEnd = (e) => {
    e.stopPropagation();
    const dy = e.changedTouches[0].clientY - startY.current;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dy <= CLOSE_DY_PX || Math.abs(dx) > AXIS_TOL_PX) return;
    // Nicht schließen, wenn innerhalb einer scrollbaren Liste gewischt wurde,
    // die nicht ganz oben steht (dann war es eine Scroll-Geste).
    const scrollEl = e.target.closest?.(".trash-sheet__list");
    if (scrollEl && scrollEl.scrollTop > 0) return;
    onClose?.();
  };

  return { onTouchStart, onTouchEnd };
}
