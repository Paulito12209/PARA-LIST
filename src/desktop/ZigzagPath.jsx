import { useMemo } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar } from "lucide-react";

const TOKEN_ICONS = {
  project:  Circle,
  area:     Triangle,
  resource: Square,
  task:     CheckCircle2,
  note:     Pencil,
  cal:      Calendar,
};

const STEP_H_EXPANDED = 116;
const STEP_H_COMPACT  = 70;

/**
 * Renders the activity path with alternating left/right nodes connected by SVG
 * lines. Nodes are opaque + have a box-shadow outline (set in CSS) so the lines
 * appear "consumed" by the circles.
 *
 * @param {Array} items - mixed list of activity items and milestones (newest first)
 * @param {boolean} compact - collapsed-mode rendering (straight vertical line)
 */
export function ZigzagPath({ items, compact = false }) {
  const stepH = compact ? STEP_H_COMPACT : STEP_H_EXPANDED;
  const totalH = Math.max(stepH, items.length * stepH);
  const width = 100; // percent — we render the path in a 100×totalH viewBox

  const nodes = useMemo(() => {
    return items.map((item, idx) => {
      const yPct = (idx * stepH + stepH / 2) / totalH * 100;
      const sideLeft = compact ? 50 : idx % 2 === 0 ? 26 : 74;
      return { item, idx, yPct, xPct: sideLeft, y: idx * stepH + stepH / 2 };
    });
  }, [items, stepH, totalH, compact]);

  const linePath = useMemo(() => {
    if (nodes.length < 2) return "";
    return nodes
      .map((n, i) => (i === 0 ? `M ${n.xPct} ${n.y}` : `L ${n.xPct} ${n.y}`))
      .join(" ");
  }, [nodes]);

  return (
    <div
      className={`dsk-zigzag${compact ? " dsk-zigzag--compact" : ""}`}
      style={{ height: totalH }}
    >
      <svg
        className="dsk-zigzag__svg"
        width="100%"
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={linePath}
          fill="none"
          stroke="rgba(124, 131, 247, 0.55)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {nodes.map(({ item, idx, xPct, y }) => {
        const left = `${xPct}%`;
        const top = y;
        if (item.kind === "milestone") {
          return (
            <div
              key={item.id}
              className="dsk-zigzag__milestone"
              style={{ left, top, transform: "translate(-50%, -50%)" }}
              title={`Level ${item.level.level} · ${item.level.name}`}
            >
              <span className="dsk-zigzag__milestone-num">{item.level.level}</span>
            </div>
          );
        }
        const TokenIcon = TOKEN_ICONS[item.token] || Square;
        const isLeftSide = !compact && idx % 2 === 0;
        return (
          <div
            key={item.id}
            className={`dsk-zigzag__step dsk-zigzag__step--${isLeftSide ? "left" : "right"}`}
            style={{ left, top, transform: "translate(-50%, -50%)" }}
          >
            <span className={`dsk-zigzag__token dsk-zigzag__token--${item.token}`}>
              <TokenIcon size={14} strokeWidth={2.2} />
            </span>
            {!compact && (
              <div className="dsk-zigzag__card">
                <div className="dsk-zigzag__card-title">{item.title}</div>
                <div className="dsk-zigzag__card-xp">+ {item.xp} XP</div>
                <div className="dsk-zigzag__card-meta">
                  {item.subType} · {item.subTime}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
