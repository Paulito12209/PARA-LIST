/**
 * Einheitlicher Footer für Sheets/Dialoge mit Primär-Aktion.
 *
 * Look des Picker-Sheets ("Terminiert"): links ein dezenter Text-Button
 * (Schließen/Abbrechen), rechts der Slot für die Primär-Aktion als
 * Akzent-Pille (als `children` übergeben).
 *
 * Props:
 *  - onClose: Handler für den Schließen-Button
 *  - closeLabel: Text des Schließen-Buttons (default "Schließen")
 *  - children: die Primär-Aktion (z.B. ein <button>)
 */
export function SheetFooter({ onClose, closeLabel = "Schließen", children }) {
  // Ohne Primär-Aktion nimmt der Schließ-Button die volle Breite ein
  // (dezente Glas-Pille, wie der Schließen-Button im Einstellungs-Menü).
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
        {closeLabel}
      </button>
      {!closeOnly && <div className="sheet-footer__action">{children}</div>}
    </div>
  );
}
