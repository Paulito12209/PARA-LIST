import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar } from "lucide-react";

const TOKEN_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
  task:     CheckCircle2,
  note:     Pencil,
  cal:      Calendar,
};

export function ZigzagPath({ items, compact = false, onOpenEntry, onOpenCat }) {
  const handleActivate = (item) => {
    if (item.kind === "milestone") return;
    const rawId = item.id.replace(/^(entry|cat)-/, "");
    if (item.kind === "entry") onOpenEntry?.(rawId);
    else if (item.kind === "cat") onOpenCat?.(rawId);
  };

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

        const TokenIcon = TOKEN_ICONS[item.token] || Square;
        const isLeft = idx % 2 === 0;

        return (
          <div key={item.id} className="dsk-zigzag__step">
            {idx > 0 && <div className="dsk-zigzag__connector" aria-hidden="true" />}
            <button
              type="button"
              className={`dsk-zigzag__card dsk-zigzag__card--${isLeft ? "left" : "right"}`}
              onClick={() => handleActivate(item)}
            >
              <span className={`dsk-zigzag__token dsk-zigzag__token--${item.token}`}>
                <TokenIcon size={14} strokeWidth={2.2} />
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
    </div>
  );
}
