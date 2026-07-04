import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Zentriertes Popup-Fenster mit den Seiten-Metadaten (erstellt / zuletzt
// bearbeitet / zuletzt geöffnet). Wird vom Info-Button ("i") in der
// Pillen-Zeile der Detailseiten geöffnet – ersetzt den früheren
// Details-Tab im Inhaltsbereich.
export function DetailsPopup({ t, item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Zeitstempel (Zahl oder ISO-String) → "3. Juli 2026, 14:32"
  const fmtStamp = (ts) => {
    if (!ts) return t.neverLabel;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return t.neverLabel;
    return d.toLocaleDateString(t.locale, { day: "numeric", month: "long", year: "numeric" })
      + ", " + d.toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" });
  };

  const rows = [
    { label: t.createdAtLabel, value: fmtStamp(item.createdAt) },
    { label: t.lastModifiedLabel, value: fmtStamp(item.updatedAt) },
    { label: t.lastOpenedLabel, value: fmtStamp(item.lastOpenedAt) },
  ];

  // Portal + Theme-Wrapper (analog CollaboratorsModal), damit das Popup
  // über allem liegt und die Light-Theme-Styles weiter greifen.
  const isLight =
    typeof document !== "undefined" &&
    !!document.querySelector(".dsk-app--light, .app.light-theme");

  return createPortal(
    <div className={`modal-portal app${isLight ? " light-theme" : ""}`}>
      <div className="details-popup" onClick={onClose}>
        <div className="details-popup__card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="details-popup__header">
            <h2 className="details-popup__title">{t.detailsBm || "Details"}</h2>
            <button className="details-popup__close" onClick={onClose} aria-label={t.closeBtn}>
              <X size={16} />
            </button>
          </div>
          <div className="details-popup__rows">
            {rows.map((r) => (
              <div key={r.label} className="details-popup__row">
                <span className="details-popup__label">{r.label}</span>
                <span className="details-popup__value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
