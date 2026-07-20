import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Ban,
  CalendarClock,
  CheckCircle2,
  Info,
  Pencil,
  Pin,
  PinOff,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { DatePickerSheet } from "./PickerSheets";
import { SheetFooter } from "./SheetFooter";

// Typen, die "erledigt" / "abgesagt" werden können
const COMPLETABLE = ["task", "note", "calendar", "project"];
// Typen mit Datum → "verschoben" möglich
const SCHEDULABLE = ["task", "calendar", "project"];

// Status-Kacheln: bewusst "Abgesagt · Verschoben · Erledigt" – Erledigt liegt
// ganz rechts und damit im bequemsten Daumenbereich, weil es der mit Abstand
// häufigste Griff ist.
const STATUS_TILES = [
  { id: "cancelled", Icon: Ban, color: "#F26565", labelKey: "actionCancelled" },
  { id: "postponed", Icon: CalendarClock, color: "#F59E0B", labelKey: "actionPostpone" },
  { id: "done", Icon: CheckCircle2, color: "#0B8CE9", labelKey: "actionDone" },
];

/**
 * Einheitliches Aktions-Bottom-Sheet für Listeneinträge (Aufgaben, Notizen,
 * Termine) und PARA-Kategorien (Projekt/Bereich/Ressource). Slidet von unten
 * herein. Wird per Portal an <body> gehängt, damit es unabhängig von
 * transformierten Vorfahren (SwipeToDelete) bildschirmfüllend liegt.
 *
 * Props:
 *  - title: Anzeigename des Items
 *  - type: 'task'|'note'|'calendar'|'project'|'area'|'resource'
 *  - flags: { done, starred, pinned, verified, status }
 *  - dateValue: aktuelles Datum (für "Verschoben"-Default)
 *  - on: { done, reopen, postpone(date), cancel, pin, star, verify, edit, archive, trash }
 *  - onClose
 */
export function EntryActionSheet({ title, type, flags = {}, dateValue, on = {}, t, onClose }) {
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
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
  const hasStatus = canComplete || canSchedule || canCancel;

  // Aktueller Status: bevorzugt das explizite Feld, sonst aus dem done-Flag.
  const status = flags.status || (flags.done ? "done" : null);

  const handleStatus = (id) => {
    if (id === "done") {
      // Erneutes Antippen der aktiven Kachel öffnet die Aufgabe wieder.
      run(status === "done" ? on.reopen : on.done)();
    } else if (id === "postponed") {
      // Verschieben heißt neu terminieren – deshalb geht direkt der
      // Datums-Picker auf, statt das Sheet zu schließen.
      setPostponeOpen(true);
    } else {
      run(on.cancel)();
    }
  };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <>
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

          {/* Kopfzeile: Name des Eintrags links, Info-Schalter rechts */}
          {(title || hasStatus) && (
            <div className="action-sheet__head">
              {title && <div className="action-sheet__title">{title}</div>}
              {hasStatus && (
                <button
                  className={`action-sheet__info-btn${infoOpen ? " action-sheet__info-btn--on" : ""}`}
                  onClick={() => setInfoOpen((v) => !v)}
                  aria-expanded={infoOpen}
                  aria-label={t.statusInfoAria || "Info"}
                >
                  <Info size={17} />
                </button>
              )}
            </div>
          )}

          {/* Erklärtext hinter dem ⓘ – klappt über den Kacheln auf */}
          {hasStatus && infoOpen && (
            <div className="action-sheet__info">
              <p>{t.statusInfoDone}</p>
              <p>{t.statusInfoPostponed}</p>
              <p>{t.statusInfoCancelled}</p>
            </div>
          )}

          {/* Status als Kachel-Trio */}
          {hasStatus && (
            <div className="action-sheet__tiles">
              {STATUS_TILES.map(({ id, Icon, color, labelKey }) => {
                const enabled =
                  id === "done" ? canComplete : id === "postponed" ? canSchedule : canCancel;
                if (!enabled) return null;
                const isActive = status === id;
                const label =
                  id === "done" && isActive ? t.actionReopen : t[labelKey];
                return (
                  <button
                    key={id}
                    className={`action-sheet__tile${isActive ? " action-sheet__tile--on" : ""}`}
                    // Aktive Kachel trägt ihre Statusfarbe (Rot/Gelb/Blau).
                    style={isActive ? { color, background: `${color}26`, borderColor: `${color}66` } : undefined}
                    onClick={() => handleStatus(id)}
                    aria-pressed={isActive}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="action-sheet__list">
            {canVerify && (
              <>
                <button className="action-sheet__item" onClick={run(on.verify)}>
                  <ShieldCheck size={18} color={flags.verified ? "#30A060" : undefined} />
                  <span>{flags.verified ? t.actionUnverify : t.actionVerify}</span>
                </button>
                <div className="action-sheet__divider" />
              </>
            )}

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

            {/* Wording bewusst "Löschen" – gleich wie im Options-Sheet der
                Detailseiten; beide legen das Item in den Papierkorb. */}
            <button className="action-sheet__item action-sheet__item--danger" onClick={run(on.trash)}>
              <Trash2 size={18} />
              <span>{t.delete}</span>
            </button>
          </div>

          <SheetFooter onClose={handleClose} closeLabel={t.closeBtn || "Schließen"} />
        </div>
      </div>

      {/* Verschieben: derselbe Frosted-Glass-Kalender wie überall sonst */}
      {postponeOpen && (
        <DatePickerSheet
          t={t}
          value={dateValue || null}
          accent="#F59E0B"
          title={t.postponeTo}
          onSelect={(d) => {
            setPostponeOpen(false);
            if (d) run(() => on.postpone(d))();
          }}
          onClose={() => setPostponeOpen(false)}
        />
      )}
    </>,
    document.body
  );
}
