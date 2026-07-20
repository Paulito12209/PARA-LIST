import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ============================================================
// Scroll-Gerüst der Spotify-artigen Detailseiten (neues Design).
// Geteilt von NewCatDetailScreen (Projekt/Bereich/Ressource) und
// NewEntryDetailScreen (Aufgabe/Notiz/Termin).
// ============================================================

// Körniger Film über dem Cover ("grained" Verlauf) – SVG-Turbulenz als
// Daten-URI, damit keine externen Assets nötig sind.
export const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

// Eingeklappte Seiteninhalt-Karte: mehr Text als diese Höhe → Fade +
// "Kompletten Inhalt anzeigen"-Button.
export const CANVAS_CLIP_PX = 224;

// Der Karten-Feed wird per negativem Margin so weit an die aktive Icon-Kachel
// herangezogen, dass optisch ~16px Abstand bleiben. Muss mit dem SCSS-Wert
// (--nd-feed-pull) übereinstimmen. Die Cover-Verlaufsfläche endet um genau
// diesen Betrag höher, damit ihr (grund-farbener) Fuß NICHT über die
// hochgezogene erste Karte malt.
export const FEED_PULL_UP_PX = 26;

// Abstand zwischen der Trennlinie und der Oberkante der ersten Karte – gleich
// dem seitlichen Kartenpadding (16px), damit die Karte ringsum gleich „atmet".
export const CARD_LINE_GAP_PX = 16;

/**
 * Scroll-Spy für die Icon-Leiste, Pin-Status des Sticky-Headers, Geometrie der
 * mitscrollenden Cover-Verlaufsfläche und die "Nach oben"-Pille.
 *
 * @param {string[]} sectionIds – Reihenfolge der Abschnitte (= Icon-Leiste)
 * @returns Refs + State + Handler für das Markup der Seite
 */
export function useDetailScaffold(sectionIds) {
  const [active, setActive] = useState(sectionIds[0] || "canvas");
  const [pinned, setPinned] = useState(false);
  // Mitscrollende Verlaufsfläche hinter Cover + Titel + Icon-Leiste: EIN
  // durchgehender Verlauf (Akzent oben → Seitenfarbe an der Trennlinie).
  // `coverBgH` = Gesamthöhe bis zur Unterkante des Sticky-Headers. `fadeStartPx`
  // = Position der Trennlinie im Sticky, ab der der gepinnte Header nach unten
  // transparent ausläuft (Content-Fadeout beim Scrollen).
  const [coverBgH, setCoverBgH] = useState(0);
  const [fadeStartPx, setFadeStartPx] = useState(0);
  // Schwebende "Nach oben"-Pille: erst einblenden, wenn spürbar weit gescrollt.
  const [showToTop, setShowToTop] = useState(false);

  const scrollRef = useRef(null);
  const topbarRef = useRef(null);
  const stickyRef = useRef(null);
  const feedRef = useRef(null);
  const barRef = useRef(null);
  const sectionRefs = useRef({});
  const tileRefs = useRef({});
  // Beim Tap auf ein Icon nicht vom Scroll-Spy "überstimmt" werden, solange
  // der Smooth-Scroll noch läuft.
  const spyLockUntil = useRef(0);
  // Die Abschnittsliste ist pro Render neu (Zähler/Labels ändern sich) – über
  // eine Ref gespiegelt, damit der Scroll-Handler stabil bleibt. Der Abgleich
  // läuft als Layout-Effekt VOR dem messenden Effekt weiter unten, damit der
  // dort ausgelöste handleScroll bereits die aktuelle Liste sieht.
  const idsRef = useRef(sectionIds);
  useLayoutEffect(() => {
    idsRef.current = sectionIds;
  });

  // Höhe des fixierten Kopfes (Topbar + gepinnter Titel/Leiste) – Grundlage
  // für Scroll-Spy-Schwelle und Sprungziel beim Icon-Tap.
  const headerOffset = useCallback(
    () => (topbarRef.current?.offsetHeight || 56) + (stickyRef.current?.offsetHeight || 150),
    [],
  );

  // Scroll-Spy + Pinned-Erkennung (Topbar/Titelblock bekommen festen Grund).
  const handleScroll = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const stickyEl = stickyRef.current;
    const topbarH = topbarRef.current?.offsetHeight || 56;
    if (stickyEl) {
      setPinned(scroller.scrollTop >= stickyEl.offsetTop - topbarH - 1);
    }
    // "Nach oben"-Pille erst nach etwa einer Bildschirmhöhe Scrollstrecke.
    setShowToTop(scroller.scrollTop > scroller.clientHeight * 0.8);
    if (Date.now() < spyLockUntil.current) return;

    // Aktiv = der Abschnitt, dessen Karte gerade "oben unter dem Header" liegt:
    // der letzte Abschnitt, dessen Oberkante bereits über die Trennlinie
    // (Header-Unterkante) gescrollt ist. So bleibt z.B. "Seiteninhalt" aktiv,
    // solange seine (große) Karte noch prominent im Bild ist – der nächste
    // Abschnitt greift erst, wenn dessen Karte tatsächlich oben ankommt (nicht
    // schon, wenn sie flächenmäßig überwiegt = "zu früh").
    const ids = idsRef.current;
    const refLine = headerOffset() + 12;
    let cur = ids[0] || "canvas";
    for (const id of ids) {
      const el = sectionRefs.current[id];
      if (!el) continue;
      const top = el.offsetTop - scroller.scrollTop;
      if (top <= refLine) cur = id;
    }
    // Ganz unten angekommen (kein weiteres Scrollen möglich): immer den letzten
    // Abschnitt (Details) aktivieren – seine kurze Karte erreicht die Linie am
    // Seitenende sonst nie.
    if (scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2) {
      cur = ids[ids.length - 1] || cur;
    }
    setActive(cur);
  }, [headerOffset]);

  // Aktives Icon in der (overflow-hidden) Leiste automatisch nach links rücken.
  useEffect(() => {
    const tile = tileRefs.current[active];
    const bar = barRef.current;
    if (tile && bar) {
      bar.scrollTo({ left: Math.max(0, tile.offsetLeft - 16), behavior: "smooth" });
    }
  }, [active]);

  // Geometrie für Cover-Verlauf + Trennlinie messen – IMMER beides zusammen,
  // aus derselben Sticky-Höhe, damit Verlaufsfuß und Linie nie auseinander-
  // laufen. `coverBgH` = Höhe der Verlaufsfläche (endet exakt an der Oberkante
  // der ersten Karte, die um FEED_PULL_UP_PX hochgezogen ist). `fadeStartPx` =
  // Trennlinie, 16px über dieser Kartenoberkante (CARD_LINE_GAP_PX) – gleicher
  // Abstand wie das seitliche Kartenpadding. Sie liegt damit optisch UNTER der
  // aktiven Kachel: die (opake) Kachel ragt über die Linie und verdeckt sie
  // ein Stück, ohne dass die Icon-Leiste selbst verschoben wird.
  // WICHTIG: NICHT über st.offsetTop messen – bei einem festgeklebten
  // position:sticky-Element liefert offsetTop die VERSCHOBENE Position (wächst
  // mit dem Scrollstand); die Verlaufsfläche würde dann mitwachsen und ihr
  // opaker Fuß als schwarzer Balken im Viewport über dem Inhalt kleben.
  // feed.offsetTop ist dagegen reine Flow-Geometrie (inkl. des negativen
  // Pull-up-Margins) und entspricht exakt der Oberkante der ersten Karte.
  const measureGeometry = useCallback(() => {
    const st = stickyRef.current;
    const feed = feedRef.current;
    if (!st || !feed) return;
    setCoverBgH(feed.offsetTop);
    setFadeStartPx(st.offsetHeight - FEED_PULL_UP_PX - CARD_LINE_GAP_PX);
  }, []);

  // Neu messen bei JEDER Höhenänderung des Sticky-Blocks (ResizeObserver):
  // Beim Pinnen klappt der große Titel ein (~Titelhöhe weniger), beim Wechsel
  // der aktiven Kachel ändert sich die Leistenhöhe minimal – beides verschiebt
  // Kartenoberkante UND Trennlinie. Ohne sofortige Neumessung malt der (unten
  // opake) Verlaufsfuß mit veralteter Höhe als schwarzer Balken über die
  // Karten bzw. reißt beim Zurückscrollen ein Loch in den Verlauf.
  useLayoutEffect(() => {
    measureGeometry();
    // Einmal den Scroll-Status auswerten, damit das "Seiteninhalt"-Label beim
    // Öffnen korrekt aus ist (Kartentitel ist sichtbar) statt initial zu blinken.
    handleScroll();
    const ro = new ResizeObserver(measureGeometry);
    if (stickyRef.current) ro.observe(stickyRef.current);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener("resize", measureGeometry);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureGeometry);
    };
  }, [handleScroll, measureGeometry]);

  // Zusätzlich synchron VOR dem Paint nachmessen, wenn Pin-Status oder aktive
  // Kachel wechseln – der ResizeObserver feuert erst im nächsten Frame; ohne
  // diese Messung blitzte der Verlauf einen Frame lang mit alter Höhe auf.
  useLayoutEffect(() => {
    measureGeometry();
  }, [pinned, active, measureGeometry]);

  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    spyLockUntil.current = Date.now() + 600;
    setActive(id);
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - headerOffset() - 8), behavior: "smooth" });
  }, [headerOffset]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Ref-Callbacks für Abschnitte und Icon-Kacheln: die Maps gehören dem Hook,
  // die Seiten registrieren ihre Elemente nur darüber.
  const setSectionRef = useCallback((id) => (el) => { sectionRefs.current[id] = el; }, []);
  const setTileRef = useCallback((id) => (el) => { tileRefs.current[id] = el; }, []);

  return {
    active, pinned, coverBgH, fadeStartPx, showToTop,
    scrollRef, topbarRef, stickyRef, feedRef, barRef,
    setSectionRef, setTileRef,
    handleScroll, scrollToSection, scrollToTop, measureGeometry,
  };
}
