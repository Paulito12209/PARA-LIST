import { useEffect, useState } from "react";

/**
 * Ist die Bildschirmtastatur sichtbar? Erkennt das Schrumpfen des Viewports
 * gegenüber der größten gesehenen Höhe (Baseline pro Orientierung).
 *
 * Wichtig für Android mit interactive-widget=resizes-content: dort schrumpft
 * der GESAMTE Layout-Viewport mit der Tastatur, sodass die klassische
 * Rechnung `innerHeight - visualViewport.height` (useKeyboardHeight) 0
 * ergibt. Außerdem schließt der Android-System-Chevron die Tastatur OHNE
 * das Eingabefeld zu bluren – Fokus allein sagt also nichts über die
 * Sichtbarkeit der Tastatur aus.
 */
export function useKeyboardOpen(threshold = 150) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    let maxH = 0;
    const measure = () => {
      const h = vv ? vv.height : window.innerHeight;
      if (h > maxH) maxH = h;
      setOpen(maxH - h > threshold);
    };
    const reset = () => {
      maxH = 0;
      measure();
    };
    vv?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", reset);
    measure();
    return () => {
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", reset);
    };
  }, [threshold]);

  return open;
}

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
