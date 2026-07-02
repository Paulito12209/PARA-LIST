import { useState, useCallback, useRef } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar } from "lucide-react";
import { createPortal } from "react-dom";

const TOKEN_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
  task:     CheckCircle2,
  note:     Pencil,
  cal:      Calendar,
};

export function ZigzagPath({ items, compact = false, light = false, onOpenEntry, onOpenCat }) {
  const [hover, setHover] = useState(null);
  const hideTimer = useRef(null);

  const handleActivate = (item) => {
    if (item.kind === "milestone") return;
    const rawId = item.id.replace(/^(entry|cat)-/, "");
    if (item.kind === "entry") onOpenEntry?.(rawId);
    else if (item.kind === "cat") onOpenCat?.(rawId);
  };

  const showTooltip = useCallback((e, item) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ item, top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 12 });
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setHover(null), 120);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const TokenIcon = hover ? (TOKEN_ICONS[hover.item.token] || Square) : null;

  return (
    <div className={`dsk-zigzag${compact ? " dsk-zigzag--compact" : ""}`}>
      {items.map((item, idx) => {
        if (item.kind === "milestone") {
          return (
            <div key={item.id} className="dsk-zigzag__milestone-row">
              <div
                className="dsk-zigzag__milestone"
                title={`Level ${item.level.level} · ${item.level.name}`}
              >
                <span>{item.level.level}</span>
              </div>
              <div className="dsk-zigzag__milestone-label">
                LV {item.level.level} · {item.level.name.toUpperCase()}
              </div>
            </div>
          );
        }

        const ItemIcon = TOKEN_ICONS[item.token] || Square;
        const isLeft = idx % 2 === 0;

        return (
          <div key={item.id} className="dsk-zigzag__step">
            {idx > 0 && <div className="dsk-zigzag__connector" aria-hidden="true" />}
            <button
              type="button"
              className={`dsk-zigzag__card dsk-zigzag__card--${isLeft ? "left" : "right"}`}
              onClick={() => handleActivate(item)}
              onPointerEnter={compact ? (e) => showTooltip(e, item) : undefined}
              onPointerLeave={compact ? scheduleHide : undefined}
            >
              <span className={`dsk-zigzag__token dsk-zigzag__token--${item.token}`}>
                <ItemIcon size={16} strokeWidth={2.2} />
              </span>
              <span className="dsk-zigzag__card-body">
                <span className="dsk-zigzag__card-title">{item.title}</span>
                <span className="dsk-zigzag__card-xp">+ {item.xp} XP</span>
                <span className="dsk-zigzag__card-meta">
                  {item.subType} · {item.subTime}
                </span>
              </span>
            </button>
          </div>
        );
      })}

      {compact && hover && createPortal(
        <div
          className={`dsk-zigzag-popup${light ? " dsk-zigzag-popup--light" : ""}`}
          style={{ top: hover.top, right: hover.right }}
          onPointerEnter={cancelHide}
          onPointerLeave={scheduleHide}
        >
          <div className="dsk-zigzag-popup__header">
            <span className={`dsk-zigzag-popup__icon dsk-zigzag-popup__icon--${hover.item.token}`}>
              <TokenIcon size={14} strokeWidth={2.2} />
            </span>
            <span className="dsk-zigzag-popup__title">{hover.item.title}</span>
          </div>
          {hover.item.desc && (
            <span className="dsk-zigzag-popup__desc">{hover.item.desc}</span>
          )}
          <div className="dsk-zigzag-popup__footer">
            <span className="dsk-zigzag-popup__date">{hover.item.subDate}</span>
            <span className="dsk-zigzag-popup__xp">+ {hover.item.xp} XP</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
