import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Circle,
  Triangle,
  Square,
  CheckCircle2,
  Pencil,
  Calendar,
  Image,
  Bookmark,
  Undo2,
  Trash2,
} from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_DAYS = 30;

// Typ-Icon pro Papierkorb-Eintrag (Cats + Einträge).
const TYPE_ICON = {
  project: Circle,
  area: Triangle,
  resource: Square,
  task: CheckCircle2,
  note: Pencil,
  calendar: Calendar,
  media: Image,
  link: Bookmark,
};

/**
 * Bottom-Sheet für den Papierkorb. Zeigt `trash` (neueste zuerst). Pro Item:
 * Typ-Icon, Name, Rest-Tage bis zur Auto-Löschung, Wiederherstellen und
 * endgültig löschen. Header-Aktion: Papierkorb leeren.
 *
 * Props:
 *  - trash: [{ kind, deletedAt, data }]
 *  - onRestore(dataId), onPurge(dataId), onEmpty()
 *  - t, onClose
 */
export function TrashSheet({ trash = [], onRestore, onPurge, onEmpty, t, onClose }) {
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

  const now = Date.now();
  const items = [...trash].sort((a, b) => b.deletedAt - a.deletedAt);

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
        <div className="trash-sheet__header">
          <div className="action-sheet__title trash-sheet__title">{t.trash}</div>
          {items.length > 0 && (
            <button className="trash-sheet__empty-btn" onClick={onEmpty}>
              <Trash2 size={15} />
              <span>{t.emptyTrash}</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="trash-sheet__empty-state">{t.trashEmpty}</div>
        ) : (
          <div className="trash-sheet__list">
            {items.map((it) => {
              const data = it.data || {};
              const name = data.title || data.name || "—";
              const Icon = TYPE_ICON[data.type] || Circle;
              const daysLeft = Math.max(
                0,
                TTL_DAYS - Math.floor((now - it.deletedAt) / DAY_MS)
              );
              return (
                <div key={data.id} className="trash-item">
                  <span className="trash-item__icon">
                    <Icon size={18} />
                  </span>
                  <div className="trash-item__body">
                    <div className="trash-item__name">{name}</div>
                    <div className="trash-item__meta">{t.daysLeft(daysLeft)}</div>
                  </div>
                  <button
                    className="trash-item__action"
                    onClick={() => onRestore?.(data.id)}
                    aria-label={t.restore}
                    title={t.restore}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="trash-item__action trash-item__action--danger"
                    onClick={() => onPurge?.(data.id)}
                    aria-label={t.deleteForever}
                    title={t.deleteForever}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
