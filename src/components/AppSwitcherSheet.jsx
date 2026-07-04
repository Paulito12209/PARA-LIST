import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Languages } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { BrandLogo, FlashcardsBadge } from "./AppIcons";

/**
 * App-Switcher als Bottom-Sheet, geöffnet über das Logo oben links.
 * Zeigt oben die aktuelle Position ("Du bist hier") und darunter den
 * Abschnitt "Tools" mit dem Flashcards-Tool. Slidet via Portal von unten.
 *
 * Props:
 *  - t: Übersetzungen
 *  - app: aktive App/Tool ({ kind: "flashcards", title } | null = Startseite)
 *  - onOpenHome: wechselt zurück zur Startseite (PARA·LIST)
 *  - onOpenFlashcards: öffnet das Flashcards-Tool
 *  - onClose
 */
export function AppSwitcherSheet({ t, app, onOpenHome, onOpenFlashcards, onOpenTranslator, onClose }) {
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

        {/* Aktuelle Position: Label oben, darunter Icon + Name der aktiven App */}
        <div className="app-switcher__current">
          <div className="app-switcher__current-label">{fc.youAreHere}</div>
          <div className="app-switcher__current-row">
            {app?.kind === "flashcards" ? (
              <FlashcardsBadge size={40} />
            ) : (
              <span className="app-switcher__current-icon">
                <BrandLogo size={34} />
              </span>
            )}
            <div className="app-switcher__current-name">
              {app?.title || "PARA·LIST"}
            </div>
          </div>
        </div>

        <div className="action-sheet__divider" />

        {/* Apps */}
        <div className="app-switcher__section-title">{fc.tools}</div>
        <div className="app-switcher__tools">
          {app && (
            <button className="app-switcher__tool" onClick={run(onOpenHome)}>
              <BrandLogo size={40} />
              <span className="app-switcher__tool-name">PARA·LIST</span>
            </button>
          )}

          {app?.kind !== "flashcards" && (
            <button className="app-switcher__tool" onClick={run(onOpenFlashcards)}>
              <FlashcardsBadge size={40} />
              <span className="app-switcher__tool-name">{fc.tool}</span>
            </button>
          )}

          <button className="app-switcher__tool" onClick={run(onOpenTranslator)}>
            <span className="app-switcher__tool-icon app-switcher__tool-icon--tl">
              <Languages size={22} color="#fff" />
            </span>
            <span className="app-switcher__tool-name">{fc.translator}</span>
          </button>
        </div>

        {/* Einheitlicher Schließ-Button unten (wie in den anderen Sheets) */}
        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn} />
      </div>
    </div>,
    document.body
  );
}
