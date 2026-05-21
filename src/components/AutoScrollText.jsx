import { useState, useRef, useEffect } from "react";

const DEFAULT_START_DELAY_MS = 6000;
const DEFAULT_END_DELAY_MS = 3000;
const DEFAULT_SCROLL_SPEED_MS_PER_PX = 35;
const RECHECK_INTERVAL_MS = 2000;
const LOOP_RESET_MS = 100;
const NO_OVERFLOW_TOLERANCE_PX = 1;

/**
 * Scrolls overflowing text horizontally on a loop. Waits at the start,
 * scrolls to the end, waits, then jumps back to the start.
 */
export function AutoScrollText({
  children,
  className,
  delayStart = DEFAULT_START_DELAY_MS,
  delayEnd = DEFAULT_END_DELAY_MS,
  speed = DEFAULT_SCROLL_SPEED_MS_PER_PX,
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastWidths = useRef({ container: 0, content: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let timer;
    let isActive = true;

    const run = () => {
      if (!isActive) return;
      const containerWidth = container.clientWidth;
      const contentWidth = content.scrollWidth;
      lastWidths.current = { container: containerWidth, content: contentWidth };
      const diff = contentWidth - containerWidth;

      if (diff <= NO_OVERFLOW_TOLERANCE_PX) {
        setOffset(0);
        setDuration(0);
        timer = setTimeout(run, RECHECK_INTERVAL_MS);
        return;
      }

      const cycle = () => {
        if (!isActive) return;
        setOffset(0);
        setDuration(0);

        timer = setTimeout(() => {
          if (!isActive) return;
          const d = diff * speed;
          setOffset(diff);
          setDuration(d);

          timer = setTimeout(() => {
            if (!isActive) return;
            timer = setTimeout(() => {
              if (!isActive) return;
              setOffset(0);
              setDuration(0);
              timer = setTimeout(cycle, LOOP_RESET_MS);
            }, delayEnd);
          }, d);
        }, delayStart);
      };

      cycle();
    };

    const observer = new ResizeObserver(() => {
      if (!isActive) return;
      const cw = container.clientWidth;
      const sw = content.scrollWidth;
      if (cw !== lastWidths.current.container || sw !== lastWidths.current.content) {
        clearTimeout(timer);
        run();
      }
    });
    observer.observe(container);

    run();
    return () => {
      isActive = false;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [children, speed, delayStart, delayEnd]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
        whiteSpace: "nowrap",
        width: "100%",
        maskImage: offset > 0 || duration > 0 ? "none" : undefined,
      }}
    >
      <div
        ref={contentRef}
        style={{
          display: "inline-block",
          transform: `translateX(-${offset}px)`,
          transition: duration > 0 ? `transform ${duration}ms linear` : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
