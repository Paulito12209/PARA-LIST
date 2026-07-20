import { useEffect, useRef } from "react";
import { Calendar, Circle, Paperclip, Pencil, Square } from "lucide-react";
import { CAT_ICONS, fmtDate } from "../utils";
import { CANVAS_CLIP_PX } from "../hooks/useDetailScaffold";
import { GitMergeBranchIcon } from "./AppIcons";

// ============================================================
// Gemeinsame Bausteine der Spotify-artigen Detailseiten (neues Design).
// Genutzt von NewCatDetailScreen (Projekt/Bereich/Ressource) UND
// NewEntryDetailScreen (Aufgabe/Notiz/Termin) – beide teilen sich Layout und
// Zeilen-/Karten-Optik (CSS-Präfix `.new-detail`). Das Scroll-Gerüst liegt in
// `hooks/useDetailScaffold`.
// ============================================================

// Auto-wachsendes Textfeld der Seiteninhalt-Karte; meldet per onOverflow,
// ob der Inhalt höher als die eingeklappte Karte ist.
export function AutoGrowTextarea({ value, onChange, placeholder, onOverflow }) {
  const ref = useRef(null);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
    onOverflow?.(ta.scrollHeight > CANVAS_CLIP_PX);
  }, [value, onOverflow]);
  return (
    <textarea
      ref={ref}
      className="new-detail__canvas-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
    />
  );
}

// Icon + Farbe der Eintragszeilen (führende Kachel)
const ENTRY_TILE = {
  task: { Icon: Circle, color: "#0B8CE9" },
  note: { Icon: Pencil, color: "#F59E0B" },
  calendar: { Icon: Calendar, color: "#0078D4" },
  media: { Icon: Paperclip, color: "#10B981" },
};

/**
 * Eintragszeile im Look der Listen-Zeilen: Kachel · Titel (Ellipsis, ohne
 * Lauftext) · Meta-Zeile mit blauem Datum + Typ-Icon der verknüpften Seite ·
 * Verknüpfen-Mini-Logo.
 */
export function DetailEntryRow({ t, CC, entry, allCats, onToggle, onOpen }) {
  const tile = ENTRY_TILE[entry.type] || ENTRY_TILE.note;
  const TileIcon = tile.Icon;

  // Datum: das Kalender-Icon ist IMMER sichtbar. Aufgabe = Fälligkeit,
  // Termin = Datum – ohne Terminierung bleibt nur das Icon stehen (KEIN
  // Rückfall aufs Erstellungsdatum). Notizen/Lesezeichen/Medien zeigen ihr
  // Erstellungsdatum.
  const dateStr =
    entry.type === "task" ? entry.due
    : entry.type === "calendar" ? entry.date
    : entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0]
    : null;

  // Verknüpfte Seite: nur deren Typ-Icon in Typfarbe (kein Name).
  const linkedCatId = entry.catIds?.[0] || entry.catId;
  const linkedCat = linkedCatId ? allCats.find((c) => c.id === linkedCatId) : null;
  const linkedCfg = linkedCat && CC[linkedCat.type] ? CC[linkedCat.type] : null;
  const LinkedIcon = linkedCat ? CAT_ICONS[linkedCat.type] || Square : null;

  return (
    <div
      className={`new-detail__row${entry.done ? " new-detail__row--done" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(entry);
        }
      }}
    >
      {entry.type === "task" ? (
        <button
          className="new-detail__row-tile new-detail__row-tile--toggle"
          style={{ background: tile.color + "1F", color: tile.color }}
          onClick={(e) => { e.stopPropagation(); onToggle?.(entry.id); }}
          aria-label={t.markDone || "Erledigt"}
        >
          <TileIcon size={22} strokeWidth={2.2} />
        </button>
      ) : (
        <span
          className="new-detail__row-tile"
          style={{ background: tile.color + "1F", color: tile.color }}
        >
          <TileIcon size={20} strokeWidth={2} />
        </span>
      )}

      <div className="new-detail__row-info">
        <div className="new-detail__row-title">{entry.title}</div>
        <div className="new-detail__row-meta">
          <span className="new-detail__row-date">
            <Calendar size={12} strokeWidth={2.4} />
            {dateStr && fmtDate(dateStr, t.locale)}
          </span>
          {linkedCfg && LinkedIcon && (
            <span className="new-detail__row-cat" style={{ color: linkedCfg.color }}>
              <LinkedIcon size={12} strokeWidth={2.4} />
            </span>
          )}
          <button
            className="new-detail__row-link"
            onClick={(e) => { e.stopPropagation(); onOpen?.(entry); }}
            aria-label={t.linkAction || "Verknüpfen"}
          >
            <GitMergeBranchIcon size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
