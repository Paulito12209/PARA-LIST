import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus } from "lucide-react";
import { getInitials } from "../utils";

// Seiten-Metadaten (erstellt / zuletzt bearbeitet / zuletzt geöffnet) samt
// Kollaboratoren-Zeile. Wird als Inhalt des "Details"-Lesezeichens direkt
// im Canvas-Bereich der Detailseiten gerendert (früher ein Popup).
export function DetailsBody({ t, item, user, collaborators = [], onAddCollaborator }) {
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

  return (
    <div className="details-popup__rows">
      {rows.map((r) => (
        <div key={r.label} className="details-popup__row">
          <span className="details-popup__label">{r.label}</span>
          <span className="details-popup__value">{r.value}</span>
        </div>
      ))}

      {/* Kollaboratoren: eigener Avatar + Team, dahinter der
          Hinzufügen-Button (öffnet das Kollaboratoren-Sheet) */}
      {(user || onAddCollaborator) && (
        <div className="details-popup__row">
          <span className="details-popup__label">{t.collaborators || "Kollaborateure"}</span>
          <span className="details-popup__avatars">
            {user?.avatar ? (
              <img src={user.avatar} className="details-popup__avatar" alt={user?.name || ""} />
            ) : (
              <span className="details-popup__avatar details-popup__avatar--initials">{getInitials(user?.name)}</span>
            )}
            {collaborators.map((c) => (
              c.avatar ? (
                <img key={c.id} src={c.avatar} className="details-popup__avatar" alt={c.name} />
              ) : (
                <span key={c.id} className="details-popup__avatar details-popup__avatar--initials">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              )
            ))}
            {onAddCollaborator && (
              <button
                type="button"
                className="details-popup__avatar-add"
                onClick={onAddCollaborator}
                aria-label={t.addCollaborator}
              >
                <UserPlus size={13} />
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// Zentriertes Popup-Fenster um DetailsBody (Legacy-Variante; die Detail-
// seiten zeigen die Details inzwischen inline im Canvas-Bereich).
export function DetailsPopup({ t, item, user, collaborators = [], onAddCollaborator, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <DetailsBody
            t={t}
            item={item}
            user={user}
            collaborators={collaborators}
            onAddCollaborator={onAddCollaborator}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
