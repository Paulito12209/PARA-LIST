import { X } from "lucide-react";

/**
 * Einheitlicher Footer für Sheets/Dialoge mit Primär-Aktion.
 *
 * Struktur analog zur Dock-Eingabezeile: links ein kleiner runder Button in der
 * Form des Home-Buttons – hier rot mit weißem X (Schließen/Zurück); rechts der
 * breite Slot für die Primär-Aktion (als `children` übergeben).
 *
 * Props:
 *  - onClose: Handler für den roten X-Button
 *  - closeLabel: aria-label des X-Buttons (default "Schließen")
 *  - children: die breite Primär-Aktion (z.B. ein <button>)
 */
export function SheetFooter({ onClose, closeLabel = "Schließen", children }) {
  // Ohne Primär-Aktion nimmt der Schließ-Button die volle Breite ein und
  // zeigt das Text-Label (wie der Schließen-Button im Einstellungs-Menü).
  const closeOnly = !children;
  return (
    // data-keep-focus: Taps auf die Footer-Buttons dürfen ein fokussiertes
    // Eingabefeld NICHT über den globalen Blur-Handler (App.jsx) verlassen –
    // sonst klappt auf iOS erst die Tastatur zu, die Seite verschiebt sich
    // und der Tap landet daneben (z.B. auf dem Modal-Backdrop → Sheet
    // schließt, ohne zu speichern).
    <div className="sheet-footer" data-keep-focus="true">
      <button
        type="button"
        className={`sheet-footer__close${closeOnly ? " sheet-footer__close--full" : ""}`}
        onClick={onClose}
        aria-label={closeLabel}
      >
        {closeOnly ? closeLabel : <X size={20} />}
      </button>
      {!closeOnly && <div className="sheet-footer__action">{children}</div>}
    </div>
  );
}
