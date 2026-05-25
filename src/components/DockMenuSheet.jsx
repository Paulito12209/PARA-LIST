import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, Bookmark, Tag, Image, ListChecks } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

/**
 * Bottom-Sheet für das 3-Punkte-Menü im Input-Dock. Slidet von unten herein
 * (via Portal an <body>). Bietet aktuell Zugang zum Papierkorb; weitere
 * Listen (Lesezeichen, Tags, Medien, Unteraufgaben) sind als Platzhalter
 * angelegt und noch deaktiviert.
 *
 * Props:
 *  - onOpenTrash: öffnet die Papierkorb-Ansicht
 *  - t, onClose
 */
export function DockMenuSheet({ onOpenTrash, t, onClose }) {
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

  const run = (fn) => () => { fn?.(); handleClose(); };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`action-sheet ${closing ? "action-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`action-sheet__panel ${closing ? "action-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet__handle" />
        <div className="action-sheet__title">{t.menu}</div>

        <div className="action-sheet__list">
          <button className="action-sheet__item" onClick={run(onOpenTrash)}>
            <Trash2 size={18} />
            <span>{t.trash}</span>
          </button>

          <div className="action-sheet__divider" />

          <button className="action-sheet__item" disabled>
            <Bookmark size={18} />
            <span>{t.bookmarks}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <Tag size={18} />
            <span>{t.tagsLabel}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <Image size={18} />
            <span>{t.mediaLabel}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <ListChecks size={18} />
            <span>{t.subtasks}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
