import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, Check } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";
import { TagIcon } from "./AppIcons";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

// Kategorie-Hierarchie über `relatedId` (ein Elternteil pro Kategorie):
//   Ressource      → Projekt ODER Arbeitsbereich als Elternteil
//   Projekt        → Arbeitsbereich als Elternteil · Ressourcen als Kinder
//   Arbeitsbereich → Projekte & Ressourcen als Kinder
const PARENT_TYPES = { project: ["area"], area: [], resource: ["project", "area"] };
const CHILD_TYPES = { project: ["resource"], area: ["project", "resource"], resource: [] };

// Reihenfolge der PARA-Typen; die Tabs zeigen immer die BEIDEN ANDEREN Typen
// (Projekt → Bereiche + Ressourcen, Bereich → Projekte + Ressourcen, …) und
// zuletzt die Tags.
const TYPE_ORDER = ["project", "area", "resource"];

/**
 * Verknüpfungs-Bottom-Sheet für Kategorien (Pendant zum LinkSheet der
 * Einträge, gleiche Optik/CSS-Klassen). Drei Subtabs: die beiden anderen
 * PARA-Typen und Tags. Eltern-Kandidaten sind Einfachauswahl (relatedId der
 * eigenen Kategorie), Kind-Kandidaten Mehrfachauswahl (relatedId der Kinder
 * zeigt auf diese Kategorie), Tags Mehrfachauswahl auf `cat.tags`.
 */
export function CatLinkSheet({ cat, cats, tags = [], CC, t, onUpdateCat, onClose }) {
  const parentTypes = PARENT_TYPES[cat.type] || [];
  const childTypes = CHILD_TYPES[cat.type] || [];

  const tabs = useMemo(
    () => [...TYPE_ORDER.filter((tp) => tp !== cat.type), "tags"],
    [cat.type],
  );
  const [tab, setTab] = useState(tabs[0]);

  const [parentId, setParentId] = useState(() => {
    const parent = cats.find((c) => c.id === cat.relatedId);
    return parent && parentTypes.includes(parent.type) ? parent.id : null;
  });
  const [childIds, setChildIds] = useState(
    () =>
      new Set(
        cats
          .filter((c) => c.relatedId === cat.id && childTypes.includes(c.type))
          .map((c) => c.id)
      )
  );
  const [tagSet, setTagSet] = useState(() => new Set(cat.tags || []));
  const [closing, setClosing] = useState(false);

  // Alle bekannten Tag-Namen: global gepflegte plus die, die nur an
  // Kategorien hängen.
  const tagNames = useMemo(
    () =>
      Array.from(
        new Set([...tags.map((tg) => tg.name), ...cats.flatMap((c) => c.tags || [])]),
      ).sort((a, b) => a.localeCompare(b)),
    [tags, cats],
  );

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (item) => {
    if (parentTypes.includes(item.type)) {
      // Einfachauswahl: neuer Elternteil ersetzt den bisherigen.
      setParentId((prev) => (prev === item.id ? null : item.id));
    } else {
      setChildIds((prev) => {
        const next = new Set(prev);
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
        return next;
      });
    }
  };

  const toggleTag = (name) => {
    setTagSet((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const confirm = () => {
    if (parentTypes.length && (cat.relatedId || null) !== (parentId || null)) {
      onUpdateCat(cat.id, { relatedId: parentId || null });
    }
    cats.forEach((c) => {
      if (!childTypes.includes(c.type)) return;
      const isChild = c.relatedId === cat.id;
      const selected = childIds.has(c.id);
      if (selected && !isChild) onUpdateCat(c.id, { relatedId: cat.id });
      else if (!selected && isChild) onUpdateCat(c.id, { relatedId: null });
    });
    const nextTags = Array.from(tagSet);
    const prevTags = cat.tags || [];
    if (nextTags.length !== prevTags.length || nextTags.some((n) => !prevTags.includes(n))) {
      onUpdateCat(cat.id, { tags: nextTags });
    }
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  const tabLabel = (type) =>
    type === "tags" ? t.tagsLabel
    : type === "project" ? t.projects
    : type === "area" ? t.areas
    : t.resources;

  const isSelected = (item) => parentId === item.id || childIds.has(item.id);

  // Kategorien des aktiven Tabs (ohne die eigene und ohne archivierte).
  const items =
    tab === "tags" ? [] : cats.filter((c) => c.type === tab && !c.archived && c.id !== cat.id);

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

        {/* Subtabs: die beiden anderen PARA-Typen + Tags */}
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
              const isSel = isSelected(item);
              return (
                <button
                  key={item.id}
                  className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                  onClick={() => toggle(item)}
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
