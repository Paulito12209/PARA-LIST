import { useCallback, useRef, useState } from "react";
import { Archive, ArchiveRestore, Camera, Check, Image as ImageIcon, Link2, Palette, Pin, PinOff, Star, Trash2 } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { CoverColorPanel } from "./CoverColorPanel";

// Options-Sheet einer Detailseite: oben die Design-Anpassung des Hintergrunds
// (Farben · Foto · Kamera als Kachel-Trio, Cover-URL als Listen-Zeile),
// darunter Favorit/Anpinnen/Archivieren/Löschen. Wird von den Kategorie-Seiten
// (Projekt/Bereich/Ressource), deren Listen-Kebab UND von den Eintrags-
// Detailseiten geöffnet – `cat` ist daher allgemein das bearbeitete Objekt.
// `extraItems` hängt typspezifische Zeilen (z.B. Erledigt, Geburtstag) vor den
// Löschen-Eintrag.
export function CatOptionsSheet({ t, cat, onUpdate, onTogglePin, onDelete, onClose, extraItems }) {
  const [coverMode, setCoverMode] = useState(null);
  // Ansicht des Sheets: "main" = Individualisieren + Aktionen, "colors" =
  // Farbwahl. Die Farbwahl ERSETZT den Inhalt, statt ein weiteres Sheet
  // darüberzulegen.
  const [view, setView] = useState("main");
  // Cover-Bild-URL: nur echte http(s)-Cover vorbelegen – hochgeladene Bilder
  // liegen als data:-URI vor und gehören nicht ins Eingabefeld.
  const [coverUrl, setCoverUrl] = useState(
    cat.coverImage && /^https?:/.test(cat.coverImage) ? cat.coverImage : "",
  );

  const coverInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const close = useCallback(() => {
    setCoverMode(null);
    onClose();
  }, [onClose]);

  // Wisch-nach-unten zum Schließen des Sheets
  const swipe = useSheetSwipeClose(close);

  const applyCoverUrl = useCallback(() => {
    const val = coverUrl.trim();
    if (!val) return;
    onUpdate({ coverImage: val, coverColor: null });
    close();
  }, [coverUrl, onUpdate, close]);

  const handleCoverUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdate({ coverImage: reader.result });
      close();
    };
    reader.readAsDataURL(file);
  }, [onUpdate, close]);

  return (
    <div className="settings-sheet-overlay" onClick={close} {...swipe}>
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sheet__handle" />

        {view === "colors" ? (
          <CoverColorPanel
            t={t}
            value={cat.coverColor || null}
            onPick={(hex) => {
              onUpdate({ coverColor: hex, coverImage: null });
              close();
            }}
            onBack={() => setView("main")}
            onClose={close}
          />
        ) : (
        <>
        {/* Abschnitt 1 – Aussehen der Seite: Kachel-Trio + Cover-Bild-URL */}
        <div className="settings-sheet__section-label">{t.customizeLabel}</div>

        {/* Cover Picker Bubbles */}
        <div className="settings-sheet__bubbles">
          <button
            className="settings-sheet__bubble"
            onClick={() => setView("colors")}
          >
            <Palette size={20} />
            <span>{t.coverColors}</span>
          </button>
          <button
            className={`settings-sheet__bubble ${coverMode === "photo" ? "settings-sheet__bubble--active" : ""}`}
            onClick={() => { setCoverMode("photo"); coverInputRef.current?.click(); }}
          >
            <ImageIcon size={20} />
            <span>{t.coverPhoto}</span>
          </button>
          <button
            className={`settings-sheet__bubble ${coverMode === "camera" ? "settings-sheet__bubble--active" : ""}`}
            onClick={() => { setCoverMode("camera"); cameraInputRef.current?.click(); }}
          >
            <Camera size={20} />
            <span>{t.coverCamera}</span>
          </button>
        </div>

        {/* Cover-Bild-URL gehört zur Individualisierung und steht daher direkt
            unter den Kacheln. Immer sichtbares Eingabefeld im Stil des
            Namensfelds der Einstellungen; seine Unterlinie schließt die Gruppe
            zugleich ab (kein eigener __divider). Der Übernehmen-Haken erscheint
            erst, sobald etwas drinsteht. */}
        <div className="settings-sheet__url-field">
          <Link2 size={18} color="#8a8a96" />
          <input
            className="settings-sheet__url-input"
            type="url"
            placeholder={t.coverUrlPlaceholder}
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyCoverUrl(); }}
          />
          {coverUrl.trim() && (
            <button
              className="settings-sheet__url-apply"
              onClick={applyCoverUrl}
              aria-label={t.applyLabel}
            >
              <Check size={18} />
            </button>
          )}
        </div>

        {/* Abschnitt 2 – Aktionen: Favorit · Anheften · (Erledigt) · Archivieren */}
        <div className="settings-sheet__list">
          <button
            className="settings-sheet__item"
            onClick={() => { onUpdate({ starred: !cat.starred }); close(); }}
          >
            <Star size={18} fill={cat.starred ? "#F59E0B" : "none"} color={cat.starred ? "#F59E0B" : "#8a8a96"} />
            <span>{cat.starred ? t.unmarkFavorite : t.markFavorite}</span>
          </button>
          <button
            className="settings-sheet__item"
            onClick={() => { onTogglePin?.(); close(); }}
          >
            {cat.pinned ? <PinOff size={18} color="#8a8a96" /> : <Pin size={18} color="#8a8a96" />}
            <span>{cat.pinned ? t.actionUnpin : t.actionPin}</span>
          </button>
          {extraItems}
          <button
            className="settings-sheet__item"
            onClick={() => { onUpdate({ archived: !cat.archived }); close(); }}
          >
            {cat.archived ? <ArchiveRestore size={18} color="#8a8a96" /> : <Archive size={18} color="#8a8a96" />}
            <span>{cat.archived ? t.restore : t.archive}</span>
          </button>
          <div className="settings-sheet__divider" />
          <button
            className="settings-sheet__item settings-sheet__item--danger"
            onClick={() => { onDelete(); close(); }}
          >
            <Trash2 size={18} color="#F26565" />
            <span>{t.delete}</span>
          </button>
        </div>

        {/* Schließen als breite Glas-Pille am Fuß des Sheets */}
        <SheetFooter onClose={close} closeLabel={t.closeBtn || "Schließen"} />
        </>
        )}

        {/* Versteckte File-Inputs für Foto/Kamera-Cover */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleCoverUpload}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleCoverUpload}
        />
      </div>
    </div>

  );
}

