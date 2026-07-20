import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { LinkTabs, LinkList } from "./LinkPicker";
import { LINK_TABS, useTagNames } from "./linkPickerShared";

/**
 * Verknüpfungs-Bottom-Sheet für EINTRÄGE (Aufgabe/Notiz/Termin). Gleiche
 * Optik wie das CatLinkSheet der Kategorien: Subtabs für Projekte,
 * Arbeitsbereiche, Ressourcen und Tags, jede Zeile mit Auswahl-Kreis rechts.
 * Unten links schließt das Sheet, unten rechts bestätigt ("Verknüpfen").
 * Wird per Portal an <body> gehängt.
 *
 * Dieselbe Ansicht steckt – ohne eigenes Sheet – auch im Erstellen-Sheet
 * (CreateModal); die gemeinsamen Teile liegen in `LinkPicker.jsx`.
 *
 * Props:
 *  - currentIds: number[]     – aktuell verknüpfte Kategorie-IDs
 *  - currentTags: string[]    – aktuell gesetzte Tags des Eintrags
 *  - cats: Kategorie-Liste
 *  - tags: globale Tag-Liste ([{ name }] oder string[])
 *  - CC: Farb-/Label-Konfiguration je Typ
 *  - onConfirm(nextIds, nextTags)
 *  - onClose
 */
export function LinkSheet({ currentIds = [], currentTags = [], cats = [], tags = [], CC, t, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(currentIds));
  const [tagSet, setTagSet] = useState(() => new Set(currentTags));
  const [tab, setTab] = useState(LINK_TABS[0]);
  const [closing, setClosing] = useState(false);

  const tagNames = useTagNames(tags, cats, currentTags);

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

  const toggleCat = (cat) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
      return next;
    });
  };

  const toggleTag = (name) => {
    setTagSet((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const confirm = () => {
    setClosing(true);
    setTimeout(() => onConfirm?.(Array.from(selected), Array.from(tagSet)), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{t.linkSheetTitle}</div>

        <LinkTabs tab={tab} onSelect={setTab} t={t} />

        <LinkList
          tab={tab}
          cats={cats}
          tagNames={tagNames}
          isCatSelected={(c) => selected.has(c.id)}
          isTagSelected={(name) => tagSet.has(name)}
          onToggleCat={toggleCat}
          onToggleTag={toggleTag}
          CC={CC}
          t={t}
        />

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
