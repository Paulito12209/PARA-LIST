import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Undo2,
  Calendar,
  Ban,
  Pin,
  PinOff,
  Star,
  Pencil,
  Archive,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

// Typen, die "erledigt" / "abgesagt" werden können
const COMPLETABLE = ["task", "note", "calendar", "project"];
// Typen mit Datum → "verschoben" möglich
const SCHEDULABLE = ["task", "calendar", "project"];

/**
 * Einheitliches Aktions-Bottom-Sheet für Listeneinträge (Aufgaben, Notizen,
 * Termine) und PARA-Kategorien (Projekt/Bereich/Ressource). Slidet von unten
 * herein. Wird per Portal an <body> gehängt, damit es unabhängig von
 * transformierten Vorfahren (SwipeToDelete) bildschirmfüllend liegt.
 *
 * Props:
 *  - title: Anzeigename des Items
 *  - type: 'task'|'note'|'calendar'|'project'|'area'|'resource'
 *  - flags: { done, starred, pinned, verified }
 *  - dateValue: aktuelles Datum (für "Verschoben"-Default)
 *  - on: { done, reopen, postpone(date), cancel, pin, star, verify, edit, archive, trash }
 *  - onClose
 */
export function EntryActionSheet({ title, type, flags = {}, dateValue, on = {}, t, onClose }) {
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // ESC schließt das Sheet
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

  // Eine Aktion ausführen und danach schließen
  const run = (fn) => () => { fn?.(); handleClose(); };

  const canComplete = COMPLETABLE.includes(type) && (on.done || on.reopen);
  const canSchedule = SCHEDULABLE.includes(type) && on.postpone;
  const canCancel = COMPLETABLE.includes(type) && on.cancel;
  const canVerify = type === "resource" && on.verify;

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
        {title && <div className="action-sheet__title">{title}</div>}

        {postponeOpen ? (
          <div className="action-sheet__postpone">
            <label className="action-sheet__postpone-label">{t.postponeTo}</label>
            <input
              type="date"
              className="action-sheet__date-input"
              defaultValue={dateValue || ""}
              autoFocus
              onChange={(e) => {
                const val = e.target.value;
                if (val) run(() => on.postpone(val))();
              }}
            />
          </div>
        ) : (
          <div className="action-sheet__list">
            {canComplete && (
              <button className="action-sheet__item" onClick={run(flags.done ? on.reopen : on.done)}>
                {flags.done ? <Undo2 size={18} /> : <Check size={18} />}
                <span>{flags.done ? t.actionReopen : t.actionDone}</span>
              </button>
            )}
            {canSchedule && (
              <button className="action-sheet__item" onClick={() => setPostponeOpen(true)}>
                <Calendar size={18} />
                <span>{t.actionPostpone}</span>
              </button>
            )}
            {canCancel && (
              <button className="action-sheet__item" onClick={run(on.cancel)}>
                <Ban size={18} />
                <span>{t.actionCancelled}</span>
              </button>
            )}
            {canVerify && (
              <button className="action-sheet__item" onClick={run(on.verify)}>
                <ShieldCheck size={18} color={flags.verified ? "#30A060" : undefined} />
                <span>{flags.verified ? t.actionUnverify : t.actionVerify}</span>
              </button>
            )}

            {(canComplete || canSchedule || canVerify) && <div className="action-sheet__divider" />}

            <button className="action-sheet__item" onClick={run(on.pin)}>
              {flags.pinned ? <PinOff size={18} /> : <Pin size={18} />}
              <span>{flags.pinned ? t.actionUnpin : t.actionPin}</span>
            </button>
            <button className="action-sheet__item" onClick={run(on.star)}>
              <Star size={18} fill={flags.starred ? "#F59E0B" : "none"} color={flags.starred ? "#F59E0B" : undefined} />
              <span>{flags.starred ? t.unmarkFavorite : t.markFavorite}</span>
            </button>
            {on.edit && (
              <button className="action-sheet__item" onClick={run(on.edit)}>
                <Pencil size={18} />
                <span>{t.edit}</span>
              </button>
            )}
            <button className="action-sheet__item" onClick={run(on.archive)}>
              <Archive size={18} />
              <span>{t.archive}</span>
            </button>

            <div className="action-sheet__divider" />

            <button className="action-sheet__item action-sheet__item--danger" onClick={run(on.trash)}>
              <Trash2 size={18} />
              <span>{t.actionTrash}</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
