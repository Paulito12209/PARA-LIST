import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Trash2, Bookmark, Tag, Image, ListChecks,
  Star, Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Image as ImageIcon, Link as LinkIcon,
} from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

// Icons je Item-Typ für die Favoriten-Liste (Kategorien + Einträge)
const FAV_ICON = {
  project: Circle,
  area: Triangle,
  resource: Square,
  task: CheckCircle2,
  note: Pencil,
  calendar: Calendar,
  media: ImageIcon,
  link: LinkIcon,
};

/**
 * Bottom-Sheet für das 3-Punkte-Menü im Input-Dock. Slidet von unten herein
 * (via Portal an <body>). Zeigt oben die Favoriten (gesternte Kategorien und
 * Einträge) und bietet Zugang zum Papierkorb; weitere Listen (Lesezeichen,
 * Tags, Medien, Unteraufgaben) sind als Platzhalter angelegt und deaktiviert.
 *
 * Props:
 *  - cats, entries: zum Ermitteln der Favoriten (starred)
 *  - onOpenCat(cat), onOpenEntry(entry): öffnet das jeweilige Item
 *  - onOpenTrash: öffnet die Papierkorb-Ansicht
 *  - t, onClose
 */
export function DockMenuSheet({ onOpenTrash, cats = [], entries = [], onOpenCat, onOpenEntry, t, onClose }) {
  const [closing, setClosing] = useState(false);

  const favoriteItems = [
    ...cats
      .filter((c) => c.starred && !c.archived)
      .map((c) => ({ kind: "cat", data: c })),
    ...entries
      .filter((e) => e.starred && !e.archived)
      .map((e) => ({ kind: "entry", data: e })),
  ];

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

  const run = (fn) => () => { fn?.(); handleClose(); };

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`action-sheet ${closing ? "action-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`action-sheet__panel ${closing ? "action-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet__handle" />
        <div className="action-sheet__title">{t.menu}</div>

        {favoriteItems.length > 0 && (
          <div className="action-sheet__list">
            <div className="action-sheet__subtitle">
              <Star size={14} />
              <span>{t.favorites || "Favoriten"}</span>
            </div>
            {favoriteItems.map((item) => {
              const isCat = item.kind === "cat";
              const data = item.data;
              const Icon = FAV_ICON[data.type] || Circle;
              const label = isCat ? data.name : data.title;
              return (
                <button
                  key={`${item.kind}-${data.id}`}
                  className="action-sheet__item"
                  onClick={run(() => (isCat ? onOpenCat?.(data) : onOpenEntry?.(data)))}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              );
            })}
            <div className="action-sheet__divider" />
          </div>
        )}

        <div className="action-sheet__list">
          <button className="action-sheet__item" onClick={run(onOpenTrash)}>
            <Trash2 size={18} />
            <span>{t.trash}</span>
          </button>

          <div className="action-sheet__divider" />

          <button className="action-sheet__item" disabled>
            <Bookmark size={18} />
            <span>{t.bookmarks}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <Tag size={18} />
            <span>{t.tagsLabel}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <Image size={18} />
            <span>{t.mediaLabel}</span>
          </button>
          <button className="action-sheet__item" disabled>
            <ListChecks size={18} />
            <span>{t.subtasks}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
