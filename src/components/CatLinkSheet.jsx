import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Circle, Triangle, Square, Check } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";
import { SheetFooter } from "./SheetFooter";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

// Kategorie-Hierarchie über `relatedId` (ein Elternteil pro Kategorie):
//   Ressource      → Projekt ODER Arbeitsbereich als Elternteil
//   Projekt        → Arbeitsbereich als Elternteil · Ressourcen als Kinder
//   Arbeitsbereich → Projekte & Ressourcen als Kinder
const PARENT_TYPES = { project: ["area"], area: [], resource: ["project", "area"] };
const CHILD_TYPES = { project: ["resource"], area: ["project", "resource"], resource: [] };

/**
 * Verknüpfungs-Bottom-Sheet für Kategorien (Pendant zum LinkSheet der
 * Einträge, gleiche Optik/CSS-Klassen). Eltern-Kandidaten sind Einfachauswahl
 * (relatedId der eigenen Kategorie), Kind-Kandidaten Mehrfachauswahl
 * (relatedId der Kinder zeigt auf diese Kategorie).
 */
export function CatLinkSheet({ cat, cats, CC, t, onUpdateCat, onClose }) {
  const parentTypes = PARENT_TYPES[cat.type] || [];
  const childTypes = CHILD_TYPES[cat.type] || [];

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
  const [closing, setClosing] = useState(false);

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
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  const swipe = useSheetSwipeClose(handleClose);

  const groups = [
    { type: "project", label: t.projects },
    { type: "area", label: t.areas },
    { type: "resource", label: t.resources },
  ].filter((g) => parentTypes.includes(g.type) || childTypes.includes(g.type));

  const isSelected = (item) => parentId === item.id || childIds.has(item.id);

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

        <div className="link-sheet__list link-sheet__scroll">
          {groups.map(({ type, label }) => {
            const items = cats.filter(
              (c) => c.type === type && !c.archived && c.id !== cat.id
            );
            if (items.length === 0) return null;
            const Icon = TYPE_ICONS[type];
            const color = CC[type]?.color;
            return (
              <div className="link-sheet__group" key={type}>
                <div className="link-sheet__group-head">{label}</div>
                {items.map((item) => {
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
                })}
              </div>
            );
          })}
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
