import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Trash2, Bookmark, Tag, Image, ListChecks,
  Star, Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Image as ImageIcon, Link as LinkIcon,
  ChevronLeft,
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
 * (via Portal an <body>). Bietet Zugriff auf die Favoriten-Ansicht, den Papierkorb
 * und inaktive Platzhalter.
 */
export function DockMenuSheet({ onOpenTrash, cats = [], entries = [], onOpenCat, onOpenEntry, t, onClose }) {
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState("menu"); // "menu" oder "favorites"

  const favoriteItems = [
    ...cats
      .filter((c) => c.starred && !c.archived)
      .map((c) => ({ kind: "cat", data: c })),
    ...entries
      .filter((e) => e.starred && !e.archived)
      .map((e) => ({ kind: "entry", data: e })),
  ];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (view === "favorites") {
          setView("menu");
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  const run = (fn) => () => {
    fn?.();
    handleClose();
  };

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

        {view === "favorites" ? (
          <>
            <div className="action-sheet__title">
              {t.favorites || "Favoriten"}
            </div>

            <div className="action-sheet__list" style={{ marginTop: "8px" }}>
              {favoriteItems.length === 0 ? (
                <div className="action-sheet__empty">
                  {t.noFavorites || "Keine Favoriten vorhanden"}
                </div>
              ) : (
                favoriteItems.map((item) => {
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
                })
              )}

              <div className="action-sheet__divider" />

              <div className="settings-modal__footer" style={{ marginTop: "12px", padding: 0 }}>
                <button
                  type="button"
                  className="settings-modal__footer-back"
                  onClick={() => setView("menu")}
                  aria-label={t.back || "Zurück"}
                >
                  <ChevronLeft size={20} color="currentColor" />
                </button>
                <button
                  type="button"
                  className="settings-modal__footer-close"
                  onClick={handleClose}
                >
                  {t.closeBtn || t.close || "Schließen"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="action-sheet__title">{t.menu}</div>

            <div className="action-sheet__list">
              {/* Favoriten Option (öffnet Subview) */}
              <button className="action-sheet__item" onClick={() => setView("favorites")}>
                <Star size={18} />
                <span>{t.favorites || "Favoriten"}</span>
              </button>

              <div className="action-sheet__divider" />

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
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
