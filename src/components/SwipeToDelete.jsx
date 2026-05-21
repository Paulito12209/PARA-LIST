import { useState, useRef } from "react";
import { Check, Trash2 } from "lucide-react";

const LONG_PRESS_MS = 200;
const MOVE_CANCEL_PX = 10;
const DELETE_THRESHOLD_PX = -100;
const COMPLETE_THRESHOLD_PX = 100;
const HAPTIC_HOLD_MS = 20;

export function SwipeToDelete({ children, onDelete, onComplete, completeColor, CompleteIcon, isActive }) {
  const [swiping, setSwiping] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isHeld = useRef(false);

  const getCoords = (e) => ({
    x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
    y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
  });

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startPos.current = getCoords(e);
    isHeld.current = false;

    pressTimer.current = setTimeout(() => {
      isHeld.current = true;
      setSwiping(true);
      navigator.vibrate?.(HAPTIC_HOLD_MS);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!pressTimer.current && !isHeld.current) return;
    const { x, y } = getCoords(e);
    const dx = x - startPos.current.x;
    const dy = y - startPos.current.y;

    if (!isHeld.current) {
      if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      return;
    }

    if (e.cancelable) e.preventDefault();
    if (dx < 0) setOffsetX(dx);
    else if (dx > 0 && onComplete) setOffsetX(dx);
    else setOffsetX(0);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!isHeld.current) return;

    if (offsetX < DELETE_THRESHOLD_PX) onDelete();
    else if (offsetX > COMPLETE_THRESHOLD_PX && onComplete) onComplete();
    else setOffsetX(0);

    setSwiping(false);
    isHeld.current = false;
  };

  const showDeleteBg = swiping && offsetX < 0;
  const showCompleteBg = swiping && offsetX > 0 && onComplete;

  return (
    <div className="swipe-delete-wrapper" style={{ position: "relative", overflow: "visible" }}>
      <div
        style={{
          position: "absolute",
          inset: "0",
          background: showDeleteBg ? "#DC2626" : "transparent",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: "20px",
          zIndex: 0,
          transition: "background 0.2s ease",
        }}
      >
        {showDeleteBg && <Trash2 color="#fff" size={20} />}
      </div>
      <div
        style={{
          position: "absolute",
          inset: "0",
          background: showCompleteBg ? completeColor || "#16A34A" : "transparent",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: "20px",
          zIndex: 0,
          transition: "background 0.2s ease",
        }}
      >
        {showCompleteBg &&
          (CompleteIcon ? (
            <CompleteIcon color="#fff" size={20} strokeWidth={2.5} />
          ) : (
            <Check color="#fff" size={20} strokeWidth={3} />
          ))}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.2s",
          touchAction: swiping ? "none" : "pan-y",
          position: "relative",
          zIndex: isActive ? 50 : 1,
          willChange: "transform",
        }}
        onClick={(e) => {
          if (Math.abs(offsetX) > 5) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
