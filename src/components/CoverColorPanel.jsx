import { useRef, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { COVER_COLORS } from "../utils";

// HSL → Hex, damit die im Spektrum gewählte Farbe im selben Format landet wie
// die Vorgabefarben (`coverColor` wird als Hex gespeichert).
function hslToHex(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v) => Math.round(255 * v).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Farbwahl-Ansicht INNERHALB des Options-Sheets – sie ersetzt dort den
 * Individualisieren-Inhalt, statt ein weiteres Sheet darüber zu legen.
 * Oben die Vorgabefarben als Kacheln, darunter ein Spektrum über die volle
 * Breite: die getippte Farbe erscheint rechts als Vorschau und wird erst mit
 * dem Haken übernommen.
 *
 * Props:
 *  - value: aktuell gesetzte Farbe (Hex) oder null für "Standard"
 *  - onPick(hex|null): Farbe übernehmen
 *  - onBack: zurück zur Individualisieren-Ansicht
 *  - onClose: Sheet schließen
 */
export function CoverColorPanel({ t, value, onPick, onBack, onClose }) {
  // Entwurf aus dem Spektrum – erst der Haken übernimmt ihn.
  const [draft, setDraft] = useState(null);
  const fieldRef = useRef(null);
  const dragging = useRef(false);

  // Fingerposition → Farbe: waagerecht der Farbton, senkrecht die Helligkeit
  // (oben Weiß, Mitte reine Farbe, unten Schwarz) – passend zu den beiden
  // Verläufen, die das Feld zeichnen.
  const pickAt = (clientX, clientY) => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    setDraft(hslToHex(x * 360, 100, (1 - y) * 100));
  };

  const onDown = (e) => {
    dragging.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* egal */ }
    pickAt(e.clientX, e.clientY);
  };
  const onMove = (e) => { if (dragging.current) pickAt(e.clientX, e.clientY); };
  const onUp = () => { dragging.current = false; };

  return (
    <>
      <div className="settings-sheet__section-label">{t.coverColors}</div>

      {/* Vorgabefarben als Kachelraster – zuletzt die Kachel "Standard",
          die Farbe und Bild wieder entfernt. */}
      <div className="color-sheet__grid">
        {COVER_COLORS.map((c) => (
          <button
            key={c.hex}
            className={`color-sheet__swatch${value === c.hex ? " color-sheet__swatch--active" : ""}`}
            style={{ background: c.hex }}
            onClick={() => onPick(c.hex)}
            aria-label={c.label}
          />
        ))}
        <button
          className={`color-sheet__swatch color-sheet__swatch--default${!value ? " color-sheet__swatch--active" : ""}`}
          onClick={() => onPick(null)}
          title={t.coverDefault}
          aria-label={t.coverDefault}
        />
      </div>

      <div className="settings-sheet__section-label color-sheet__custom-label">
        {t.customColorLabel}
      </div>

      {/* Spektrum über die volle Breite + Vorschau mit Übernehmen-Haken */}
      <div className="color-sheet__custom">
        <div
          ref={fieldRef}
          className="color-sheet__spectrum"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          tabIndex={0}
          aria-label={t.customColorLabel}
        />
        <button
          className={`color-sheet__preview${draft ? " color-sheet__preview--on" : ""}`}
          style={draft ? { background: draft } : undefined}
          onClick={() => draft && onPick(draft)}
          disabled={!draft}
          aria-label={t.applyLabel}
        >
          {draft && <Check size={18} />}
        </button>
      </div>

      {/* Fuß: zurück zur Individualisieren-Ansicht links, Schließen rechts */}
      <div className="sheet-footer" data-keep-focus="true">
        <button className="sheet-footer__close" onClick={onBack}>
          <ChevronLeft size={16} />
          <span>{t.back}</span>
        </button>
        <div className="sheet-footer__action">
          <button className="sheet-footer__pill" onClick={onClose}>
            {t.closeBtn}
          </button>
        </div>
      </div>
    </>
  );
}
