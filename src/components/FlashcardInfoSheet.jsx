import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { FlashcardsIcon } from "./AppIcons";

/**
 * Info-Bottom-Sheet für die nicht-editierbaren "{Sprache} Wörter"-Ressourcen.
 * Geöffnet über das (i)-Icon im Canvas. Erklärt, wofür die Seite da ist, und
 * bietet den Einstieg ins Flashcards-Tool (statt eines eigenen Lesezeichens).
 *
 * Props: t, langName, onOpenFlashcards, onClose
 */
export function FlashcardInfoSheet({ t, langName, onOpenFlashcards, onClose }) {
  const [closing, setClosing] = useState(false);
  const fc = t.fc || {};

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
      className={`action-sheet ${closing ? "action-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`action-sheet__panel fc-info ${closing ? "action-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet__handle" />

        <div className="fc-info__title">{fc.infoTitle}</div>
        <p className="fc-info__text">{fc.infoText?.(langName)}</p>

        <button className="fc-info__cta" onClick={() => { onOpenFlashcards?.(); handleClose(); }}>
          <span className="fc-info__cta-icon">
            <FlashcardsIcon size={20} color="#fff" />
          </span>
          {fc.openTool}
        </button>
      </div>
    </div>,
    document.body
  );
}
