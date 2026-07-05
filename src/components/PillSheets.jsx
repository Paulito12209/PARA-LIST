import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Circle, Triangle, Square, Check,
  Image as ImageIcon, Video as VideoIcon,
  Headphones as AudioIcon, File as DocumentIcon,
} from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { TagIcon } from "./AppIcons";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

/**
 * Tag-Bottom-Sheet (ersetzt das frühere Tag-Popup an der "+ Tag"-Pille).
 * Listet alle globalen Tags mit Mehrfachauswahl; unten links schließen,
 * unten rechts bestätigen. Teilt sich die `.link-sheet`-Styles.
 *
 * Props:
 *  - currentTags: string[] – aktuell gesetzte Tag-Namen
 *  - tags: [{ id, name }]  – globale Tag-Liste
 *  - t
 *  - onConfirm(nextTags: string[])
 *  - onClose()
 */
export function TagSheet({ currentTags = [], tags = [], t, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(currentTags));
  const [closing, setClosing] = useState(false);

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

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const confirm = () => {
    setClosing(true);
    setTimeout(() => onConfirm?.(Array.from(selected)), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);
  const accent = "#EC4899";

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.tagsLabel || "Tags"}</div>

        <div className="link-sheet__scroll">
          <div className="link-sheet__list">
            {tags.length === 0 ? (
              <div className="link-sheet__row link-sheet__row--static">
                <span className="link-sheet__row-name">{t.noTagsPopup || "Keine Tags"}</span>
              </div>
            ) : (
              tags.map((tag) => {
                const isSel = selected.has(tag.name);
                return (
                  <button
                    key={tag.id}
                    className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                    onClick={() => toggle(tag.name)}
                  >
                    <TagIcon size={16} color={accent} />
                    <span className="link-sheet__row-name">{tag.name}</span>
                    <span
                      className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                      style={isSel ? { background: accent, borderColor: accent } : undefined}
                    >
                      {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn}>
          <button className="link-sheet__confirm-btn" onClick={confirm}>
            {t.linkAction}
          </button>
        </SheetFooter>
      </div>
    </div>,
    document.body
  );
}

/**
 * Verknüpfungs-Bottom-Sheet für Ordner-Detailseiten (ersetzt das frühere
 * Conn-Popup): Einfachauswahl der erlaubten Gegenseite (Projekt ↔
 * Arbeitsbereich; Ressourcen → beides). Tippen wählt aus und schließt.
 * "Keine Verknüpfung" hebt die bestehende Verknüpfung auf.
 *
 * Props:
 *  - options: Kategorie-Liste (bereits nach Typ-Regel gefiltert)
 *  - currentId: aktuell verknüpfte ID (oder null)
 *  - CC, t
 *  - onSelect(idOrNull)
 *  - onClose()
 */
export function ConnSheet({ options = [], currentId = null, CC, t, onSelect, onClose }) {
  const [closing, setClosing] = useState(false);

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

  const pick = (id) => {
    setClosing(true);
    setTimeout(() => onSelect?.(id), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.linkSheetTitle}</div>

        <div className="link-sheet__scroll">
          <div className="link-sheet__list">
            {options.length === 0 ? (
              <div className="link-sheet__row link-sheet__row--static">
                <span className="link-sheet__row-name">{t.noCats('?').split('\n')[0]}</span>
              </div>
            ) : (
              options.map((opt) => {
                const Icon = TYPE_ICONS[opt.type] || Square;
                const color = CC[opt.type]?.color || CC.resource.color;
                const isSel = opt.id === currentId;
                return (
                  <button
                    key={opt.id}
                    className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                    onClick={() => pick(opt.id)}
                  >
                    <Icon size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span className="link-sheet__row-name">{opt.name}</span>
                    <span
                      className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                      style={isSel ? { background: color, borderColor: color } : undefined}
                    >
                      {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn}>
          <button className="link-sheet__confirm-btn" onClick={() => pick(null)}>
            {t.noConnection}
          </button>
        </SheetFooter>
      </div>
    </div>,
    document.body
  );
}

/**
 * Ressourcen-Verknüpfungs-Sheet (Medien-Lesezeichen, Sub-Tab "Ressourcen"):
 * Mehrfachauswahl aller Ressourcen; ausgewählte werden mit dieser Seite
 * verknüpft (relatedId → cat.id), abgewählte wieder gelöst. Bestätigen unten
 * rechts, wie beim TagSheet.
 *
 * Props:
 *  - options: alle wählbaren Ressourcen-Kategorien
 *  - linkedIds: string[] – IDs der aktuell verknüpften Ressourcen
 *  - CC, t
 *  - onConfirm(nextIds: string[])
 *  - onClose()
 */
export function ResLinkSheet({ options = [], linkedIds = [], CC, t, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(linkedIds));
  const [closing, setClosing] = useState(false);

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

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirm = () => {
    setClosing(true);
    setTimeout(() => onConfirm?.(Array.from(selected)), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);
  const accent = CC.resource.color;

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.linkResSheetTitle || "Ressourcen verknüpfen"}</div>

        <div className="link-sheet__scroll">
          <div className="link-sheet__list">
            {options.length === 0 ? (
              <div className="link-sheet__row link-sheet__row--static">
                <span className="link-sheet__row-name">{t.noResourcesAvail || "Keine weiteren Ressourcen"}</span>
              </div>
            ) : (
              options.map((res) => {
                const isSel = selected.has(res.id);
                return (
                  <button
                    key={res.id}
                    className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                    onClick={() => toggle(res.id)}
                  >
                    <Square size={16} color={accent} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span className="link-sheet__row-name">{res.name}</span>
                    <span
                      className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                      style={isSel ? { background: accent, borderColor: accent } : undefined}
                    >
                      {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn}>
          <button className="link-sheet__confirm-btn" onClick={confirm}>
            {t.linkAction}
          </button>
        </SheetFooter>
      </div>
    </div>,
    document.body
  );
}

// Auswahl-Reihen des Medien-Typ-Sheets (Reihenfolge: Dokumente, Bilder,
// Videos, Audio) – Farben/Icons identisch zur Medienliste & zum CreateModal.
const MEDIA_SHEET_TYPES = [
  { id: "document", Icon: DocumentIcon, color: "#0078D4", labelKey: "documents", accept: ".pdf,.doc,.docx,.txt,*/*" },
  { id: "image", Icon: ImageIcon, color: "#0D9488", labelKey: "images", accept: "image/*" },
  { id: "video", Icon: VideoIcon, color: "#EF4444", labelKey: "videos", accept: "video/*" },
  { id: "audio", Icon: AudioIcon, color: "#F97316", labelKey: "audios", accept: "audio/*" },
];

/**
 * Medien-Typ-Sheet (Medien-Lesezeichen, Sub-Tab "Medien"): einfache Liste der
 * vier Medienarten. Tippen wählt den Typ und schließt das Sheet – der Aufrufer
 * öffnet dann den Datei-Dialog mit dem passenden accept-Filter.
 *
 * Props: t, onPick({ id, accept }), onClose()
 */
export function MediaTypeSheet({ t, onPick, onClose }) {
  const [closing, setClosing] = useState(false);

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

  const pick = (type) => {
    setClosing(true);
    setTimeout(() => onPick?.(type), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.addMediaSheetTitle || "Medien hinzufügen"}</div>

        <div className="link-sheet__scroll">
          <div className="link-sheet__list">
            {MEDIA_SHEET_TYPES.map((m) => (
              <button
                key={m.id}
                className="link-sheet__row"
                onClick={() => pick(m)}
              >
                <m.Icon size={16} color={m.color} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                <span className="link-sheet__row-name">{t[m.labelKey]}</span>
              </button>
            ))}
          </div>
        </div>

        <SheetFooter onClose={handleClose} closeLabel={t.closeBtn} />
      </div>
    </div>,
    document.body
  );
}
