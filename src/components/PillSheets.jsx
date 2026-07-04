import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, Check } from "lucide-react";
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
