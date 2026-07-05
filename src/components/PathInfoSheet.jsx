import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

/**
 * Info-Sheet für den Aktivitäts-Pfad. Geöffnet über das (i)-Icon neben der
 * "AKTIVITÄTS-PFAD"-Überschrift im Fortschritts-Overlay. Erklärt, dass der
 * Pfad die Chronologie aller erstellten Inhalte zeigt und dass man umso
 * schneller aufsteigt, je mehr man erstellt.
 *
 * Nutzt dieselbe Bottom-Sheet-/Desktop-Modal-Hülle wie FlashcardInfoSheet.
 *
 * Props: title, text, onClose
 */
export function PathInfoSheet({ title, text, onClose }) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`action-sheet action-sheet--centered-desktop ${closing ? "action-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`action-sheet__panel fc-info path-info ${closing ? "action-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet__handle" />

        <div className="fc-info__title">{title}</div>
        <p className="fc-info__text">{text}</p>
      </div>
    </div>,
    document.body
  );
}
