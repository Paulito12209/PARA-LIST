import { useEffect, useState } from "react";

/**
 * Höhe der Bildschirmtastatur (px) via visualViewport – 0, wenn zu.
 * Werte unter 80px (z.B. Safari-Leisten-Resizes) werden ignoriert.
 * Gemeinsame Basis für alle schwebenden Eingabe-/Aktionsleisten
 * (Suche, Übersetzer, Dock-Tastaturleiste).
 */
export function useKeyboardHeight() {
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(kb > 80 ? kb : 0);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return kbHeight;
}
