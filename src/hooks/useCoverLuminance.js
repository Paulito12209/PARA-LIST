import { useEffect, useState } from "react";

// Ab dieser mittleren Helligkeit (0–255) gilt ein Bildbereich als „hell" und
// die darüber liegenden Elemente werden dunkel statt weiß gezeichnet.
const LIGHT_THRESHOLD = 145;

// Das Bild wird auf 32×32 heruntergerechnet – für einen Helligkeitsmittelwert
// völlig ausreichend und schnell genug für jeden Seitenwechsel.
const SAMPLE = 32;

// Zwei Zonen: oben liegt die Topbar (Zurück · Typ-Label · Menü), in der Mitte
// Emblem und Terminierung. Der Titel darunter sitzt bereits auf dem kräftigen
// Ausblendverlauf und braucht keine Messung.
const TOP_BAND = [0, 9];
const MID_BAND = [9, 22];

/**
 * Misst die Helligkeit eines Cover-Bildes zonenweise, damit Beschriftungen
 * darüber zwischen Weiß und Schwarz wechseln können.
 *
 * Gibt `{ top, mid }` mit `true` für einen hellen Bereich zurück – oder `null`,
 * solange nichts gemessen wurde bzw. die Messung nicht möglich war (fremde
 * Bild-URL ohne CORS-Freigabe „verunreinigt" die Canvas und `getImageData`
 * wirft). In dem Fall bleibt es bei Weiß mit Schatten.
 */
export function useCoverLuminance(src) {
  // Die gemessene Quelle wird mitgeführt: so lässt sich ein veraltetes Ergebnis
  // beim Rendern verwerfen, ohne im Effekt-Rumpf synchron State zu setzen.
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!src) return undefined;

    let cancelled = false;
    const img = new Image();
    // Nur relevant für entfernte URLs; data:-URIs sind ohnehin gleichen Ursprungs.
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);

        const bandLuminance = ([from, to]) => {
          const { data } = ctx.getImageData(0, from, SAMPLE, to - from);
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            // Rec. 709 – Grün wiegt fürs Auge am schwersten.
            sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          }
          return sum / (data.length / 4);
        };

        setResult({
          src,
          top: bandLuminance(TOP_BAND) > LIGHT_THRESHOLD,
          mid: bandLuminance(MID_BAND) > LIGHT_THRESHOLD,
        });
      } catch {
        // Canvas verunreinigt (CORS) → keine Aussage möglich.
        setResult({ src, top: false, mid: false });
      }
    };
    img.onerror = () => { if (!cancelled) setResult({ src, top: false, mid: false }); };
    img.src = src;

    return () => { cancelled = true; };
  }, [src]);

  // Ergebnis einer anderen (alten) Quelle verwerfen – bis die Messung des
  // aktuellen Bildes vorliegt, bleibt es bei Weiß mit Schatten.
  return result && result.src === src ? result : null;
}
