import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, Check } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { TagIcon } from "./AppIcons";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

const TYPE_ORDER = ["project", "area", "resource"];

/**
 * Verknüpfungs-Bottom-Sheet für EINTRÄGE (Aufgabe/Notiz/Termin). Gleiche
 * Optik wie das CatLinkSheet der Kategorien: Subtabs für Projekte,
 * Arbeitsbereiche, Ressourcen und Tags, jede Zeile mit Auswahl-Kreis rechts.
 * Unten links schließt das Sheet, unten rechts bestätigt ("Verknüpfen").
 * Wird per Portal an <body> gehängt.
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
  const [tab, setTab] = useState(TYPE_ORDER[0]);
  const [closing, setClosing] = useState(false);

  const tabs = useMemo(() => [...TYPE_ORDER, "tags"], []);

  // Alle bekannten Tag-Namen: global gepflegte, die an Kategorien hängen und
  // die bereits am Eintrag gesetzten.
  const tagNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...tags.map((tg) => (typeof tg === "string" ? tg : tg.name)),
          ...cats.flatMap((c) => c.tags || []),
          ...currentTags,
        ]),
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [tags, cats, currentTags],
  );

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

  const tabLabel = (type) =>
    type === "tags" ? t.tagsLabel
    : type === "project" ? t.projects
    : type === "area" ? t.areas
    : t.resources;

  // Kategorien des aktiven Tabs (ohne archivierte).
  const items = tab === "tags" ? [] : cats.filter((c) => c.type === tab && !c.archived);

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

        {/* Subtabs: die drei PARA-Typen + Tags */}
        <div className="link-sheet__tabs">
          {tabs.map((type) => (
            <button
              key={type}
              className={`link-sheet__tab${tab === type ? " link-sheet__tab--active" : ""}`}
              onClick={() => setTab(type)}
            >
              {tabLabel(type)}
            </button>
          ))}
        </div>

        <div className="link-sheet__list link-sheet__scroll">
          {tab === "tags" ? (
            tagNames.length === 0 ? (
              <div className="link-sheet__row link-sheet__row--static">
                <span className="link-sheet__row-name">{t.noTags}</span>
              </div>
            ) : (
              tagNames.map((name) => {
                const isSel = tagSet.has(name);
                return (
                  <button
                    key={name}
                    className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                    onClick={() => toggleTag(name)}
                  >
                    <TagIcon size={16} color="#EC4899" strokeWidth={2} />
                    <span className="link-sheet__row-name">{name}</span>
                    <span
                      className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                      style={isSel ? { background: "#EC4899", borderColor: "#EC4899" } : undefined}
                    >
                      {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )
          ) : items.length === 0 ? (
            <div className="link-sheet__row link-sheet__row--static">
              <span className="link-sheet__row-name">{t.noCats(tabLabel(tab))}</span>
            </div>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              const color = CC[item.type]?.color;
              const isSel = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                  onClick={() => toggle(item.id)}
                >
                  <Icon size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span className="link-sheet__row-name">{item.name}</span>
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
