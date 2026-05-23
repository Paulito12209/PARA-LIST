import { useRef, useState } from "react";
import { X, Sliders } from "lucide-react";

export function TweaksPanel({ tweaks, setTweaks }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ right: 24, bottom: 24 });
  const dragRef = useRef(null);

  const onDragStart = (e) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startRight = pos.right;
    const startBottom = pos.bottom;

    const onMove = (ev) => {
      setPos({
        right: Math.max(0, startRight - (ev.clientX - startX)),
        bottom: Math.max(0, startBottom - (ev.clientY - startY)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="dsk-tweaks__fab"
        style={{ right: pos.right, bottom: pos.bottom }}
        onClick={() => setOpen(true)}
        title="Tweaks"
        aria-label="Tweaks"
      >
        <Sliders size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div
      ref={dragRef}
      className="dsk-tweaks"
      style={{ right: pos.right, bottom: pos.bottom }}
    >
      <div className="dsk-tweaks__head" onPointerDown={onDragStart}>
        <span className="dsk-tweaks__title">Tweaks</span>
        <button
          type="button"
          className="dsk-tweaks__close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <div className="dsk-tweaks__body">
        <label className="dsk-tweaks__row">
          <span>Theme</span>
          <select
            value={tweaks.theme}
            onChange={(e) => setTweaks({ theme: e.target.value })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="dsk-tweaks__row">
          <span>Sidebar open</span>
          <input
            type="checkbox"
            checked={tweaks.sidebarOpen}
            onChange={(e) => setTweaks({ sidebarOpen: e.target.checked })}
          />
        </label>
        <label className="dsk-tweaks__row">
          <span>Rail visible</span>
          <input
            type="checkbox"
            checked={tweaks.railVisible}
            onChange={(e) => setTweaks({ railVisible: e.target.checked })}
          />
        </label>
        <label className="dsk-tweaks__row">
          <span>User name</span>
          <input
            type="text"
            value={tweaks.userName}
            onChange={(e) => setTweaks({ userName: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
