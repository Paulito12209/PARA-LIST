import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Home, Languages } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { BrandLogo, FlashcardsIcon } from "./AppIcons";

/**
 * App-Switcher als Bottom-Sheet, geöffnet über das Logo oben links.
 * Zeigt oben die aktuelle Position ("Du bist hier") und darunter den
 * Abschnitt "Tools" mit dem Flashcards-Tool. Slidet via Portal von unten.
 *
 * Props:
 *  - t: Übersetzungen
 *  - currentLabel: Name der aktuellen Ansicht (z.B. "Startseite")
 *  - onOpenFlashcards: öffnet das Flashcards-Tool
 *  - onClose
 */
export function AppSwitcherSheet({ t, currentLabel, onOpenFlashcards, onOpenTranslator, onClose }) {
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

  const run = (fn) => () => { fn?.(); handleClose(); };
  const swipe = useSheetSwipeClose(handleClose);
  const fc = t.fc || {};

  return createPortal(
    <div
      className={`action-sheet ${closing ? "action-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`action-sheet__panel app-switcher ${closing ? "action-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet__handle" />

        {/* Aktuelle Position */}
        <div className="app-switcher__current">
          <span className="app-switcher__current-icon">
            <Home size={18} />
          </span>
          <div className="app-switcher__current-text">
            <div className="app-switcher__current-label">{fc.youAreHere}</div>
            <div className="app-switcher__current-name">{currentLabel}</div>
          </div>
          <BrandLogo size={32} />
        </div>

        <div className="action-sheet__divider" />

        {/* Tools */}
        <div className="app-switcher__section-title">{fc.tools}</div>
        <div className="app-switcher__tools">
          <button className="app-switcher__tool" onClick={run(onOpenFlashcards)}>
            <span className="app-switcher__tool-icon app-switcher__tool-icon--fc">
              <FlashcardsIcon size={22} color="#fff" />
            </span>
            <span className="app-switcher__tool-name">{fc.tool}</span>
          </button>

          <button className="app-switcher__tool" onClick={run(onOpenTranslator)}>
            <span className="app-switcher__tool-icon app-switcher__tool-icon--tl">
              <Languages size={22} color="#fff" />
            </span>
            <span className="app-switcher__tool-name">{fc.translator}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
