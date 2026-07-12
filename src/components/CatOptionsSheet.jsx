import { useCallback, useRef, useState } from "react";
import { Archive, ArchiveRestore, Camera, Check, Image as ImageIcon, Link2, Palette, Pin, PinOff, Star, Trash2 } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { COVER_COLORS } from "../utils";

// Options-Sheet einer Kategorie-Seite (Projekt/Bereich/Ressource): oben die
// Design-Anpassung des Hintergrunds (Farben · Foto · Kamera als Kachel-Trio,
// Cover-URL als Listen-Zeile), darunter Favorit/Anpinnen/Archivieren/Löschen.
// Wird von der Detailseite (Drei-Punkte im Header) UND vom Kebab-Menü der
// neuen Listenansicht geöffnet.
export function CatOptionsSheet({ t, cat, onUpdate, onTogglePin, onDelete, onClose }) {
  const [coverMode, setCoverMode] = useState(null);

  const coverInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const close = useCallback(() => {
    setCoverMode(null);
    onClose();
  }, [onClose]);

  // Wisch-nach-unten zum Schließen des Sheets
  const swipe = useSheetSwipeClose(close);

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

        {/* Cover Picker Bubbles */}
        <div className="settings-sheet__bubbles">
          <button
            className={`settings-sheet__bubble ${coverMode === "colors" ? "settings-sheet__bubble--active" : ""}`}
            onClick={() => setCoverMode(coverMode === "colors" ? null : "colors")}
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

        {/* Color Grid (visible when coverMode === "colors") */}
        {coverMode === "colors" && (
          <div className="settings-sheet__color-grid">
            {COVER_COLORS.map((c) => (
              <button
                key={c.hex}
                className={`settings-sheet__color-swatch ${cat.coverColor === c.hex ? "settings-sheet__color-swatch--active" : ""}`}
                style={{ background: c.hex, color: c.hex }}
                onClick={() => {
                  onUpdate({ coverColor: c.hex, coverImage: null });
                  close();
                }}
              />
            ))}
            <button
              className={`settings-sheet__color-swatch settings-sheet__color-swatch--default ${!cat.coverColor && !cat.coverImage ? "settings-sheet__color-swatch--active" : ""}`}
              onClick={() => {
                onUpdate({ coverColor: null, coverImage: null });
                close();
              }}
              title={t.coverDefault}
            />
          </div>
        )}

        <div className="settings-sheet__divider" />

        <div className="settings-sheet__list">
          <button
            className={`settings-sheet__item ${coverMode === "url" ? "settings-sheet__item--active" : ""}`}
            onClick={() => setCoverMode(coverMode === "url" ? null : "url")}
          >
            <Link2 size={18} color="#8a8a96" />
            <span>{t.coverUrl}</span>
          </button>
          {coverMode === "url" && (
            <div className="settings-sheet__url-row">
              <input
                className="settings-sheet__url-input"
                type="url"
                placeholder="https://..."
                autoFocus
                defaultValue={cat.coverImage && /^https?:/.test(cat.coverImage) ? cat.coverImage : ""}
                onKeyDown={(e) => {
                  const val = e.target.value.trim();
                  if (e.key === "Enter" && val) {
                    onUpdate({ coverImage: val, coverColor: null });
                    close();
                  }
                }}
              />
              <button
                className="settings-sheet__url-apply"
                onClick={(e) => {
                  const val = e.currentTarget.previousElementSibling?.value.trim();
                  if (val) { onUpdate({ coverImage: val, coverColor: null }); close(); }
                }}
              >
                <Check size={18} />
              </button>
            </div>
          )}
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
