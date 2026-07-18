import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Calendar, ChevronLeft, Circle, MoreHorizontal, Paperclip, Pencil, Plus, Square } from "lucide-react";
import { BOOKMARKS, CAT_ICONS, COVER_COLORS, fmtDate } from "../utils";
import { DartTargetIcon, GitMergeBranchIcon, CustomSettingsIcon, TagIcon } from "../components/AppIcons";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { MediaTypeSheet } from "../components/PillSheets";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { DetailsBody } from "../components/DetailsPopup";
import { LinkList } from "../components/EntryLists";
import { LinkedPillSheet } from "../components/LinkedPillSheet";
import { CatLinkSheet } from "../components/CatLinkSheet";

// Akzent (RGB) des Covers – Typfarbe der Seite (Projekt rot usw.).
const TYPE_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
};

// Körniger Film über dem Cover ("grained" Verlauf) – SVG-Turbulenz als
// Daten-URI, damit keine externen Assets nötig sind.
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

// Eingeklappte Seiteninhalt-Karte: mehr Text als diese Höhe → Fade +
// "Kompletten Inhalt anzeigen"-Button.
const CANVAS_CLIP_PX = 224;

// Der Karten-Feed wird per negativem Margin so weit an die aktive Icon-Kachel
// herangezogen, dass optisch ~16px Abstand bleiben. Muss mit dem SCSS-Wert
// (--nd-feed-pull) übereinstimmen. Die Cover-Verlaufsfläche endet um genau
// diesen Betrag höher, damit ihr (grund-farbener) Fuß NICHT über die
// hochgezogene erste Karte malt.
const FEED_PULL_UP_PX = 26;

// Auto-wachsendes Textfeld der Seiteninhalt-Karte; meldet per onOverflow,
// ob der Inhalt höher als die eingeklappte Karte ist.
function AutoGrowTextarea({ value, onChange, placeholder, onOverflow }) {
  const ref = useRef(null);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
    onOverflow?.(ta.scrollHeight > CANVAS_CLIP_PX);
  }, [value, onOverflow]);
  return (
    <textarea
      ref={ref}
      className="new-detail__canvas-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
    />
  );
}

// Icon + Farbe der Eintragszeilen (führende Kachel)
const ENTRY_TILE = {
  task: { Icon: Circle, color: "#0B8CE9" },
  note: { Icon: Pencil, color: "#F59E0B" },
  calendar: { Icon: Calendar, color: "#0078D4" },
  media: { Icon: Paperclip, color: "#10B981" },
};

// Eintragszeile im Look der Listen-Zeilen (NewCatListScreen): Kachel · Titel
// (Ellipsis, ohne Lauftext) · Meta-Zeile mit blauem Datum + Typ-Icon der
// verknüpften Seite (nur das Icon) · rechts das Verknüpfen-Mini-Logo.
function DetailEntryRow({ t, CC, entry, allCats, onToggle, onOpen }) {
  const tile = ENTRY_TILE[entry.type] || ENTRY_TILE.note;
  const TileIcon = tile.Icon;

  // Datum: Aufgabe = Fälligkeit, Termin = Datum, sonst Erstellungsdatum.
  const dateStr =
    entry.type === "task" ? entry.due
    : entry.type === "calendar" ? entry.date
    : entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0]
    : null;

  // Verknüpfte Seite: nur deren Typ-Icon in Typfarbe (kein Name).
  const linkedCatId = entry.catIds?.[0] || entry.catId;
  const linkedCat = linkedCatId ? allCats.find((c) => c.id === linkedCatId) : null;
  const linkedCfg = linkedCat && CC[linkedCat.type] ? CC[linkedCat.type] : null;
  const LinkedIcon = linkedCat ? CAT_ICONS[linkedCat.type] || Square : null;

  return (
    <div
      className="new-detail__row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(entry);
        }
      }}
    >
      {entry.type === "task" ? (
        <button
          className="new-detail__row-tile new-detail__row-tile--toggle"
          style={{ background: tile.color + "1F", color: tile.color }}
          onClick={(e) => { e.stopPropagation(); onToggle?.(entry.id); }}
          aria-label={t.markDone || "Erledigt"}
        >
          <TileIcon size={22} strokeWidth={2.2} />
        </button>
      ) : (
        <span
          className="new-detail__row-tile"
          style={{ background: tile.color + "1F", color: tile.color }}
        >
          <TileIcon size={20} strokeWidth={2} />
        </span>
      )}

      <div className="new-detail__row-info">
        <div className="new-detail__row-title">{entry.title}</div>
        <div className="new-detail__row-meta">
          {dateStr && (
            <span className="new-detail__row-date">
              <Calendar size={12} strokeWidth={2.4} />
              {fmtDate(dateStr, t.locale)}
            </span>
          )}
          {linkedCfg && LinkedIcon && (
            <span className="new-detail__row-cat" style={{ color: linkedCfg.color }}>
              <LinkedIcon size={12} strokeWidth={2.4} />
            </span>
          )}
          <button
            className="new-detail__row-link"
            onClick={(e) => { e.stopPropagation(); onOpen?.(entry); }}
            aria-label={t.linkAction || "Verknüpfen"}
          >
            <GitMergeBranchIcon size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Spotify-artige Detailseite einer Kategorie (neues Design): fixe Topbar
// (Zurück · Typ-Label · Einstellungen, immer sichtbar), Cover mit Emblem,
// darunter pinnen Titel + Icon-Leiste (N26-Stil mit durchgehender Linie)
// beim Scrollen fest; der Inhalt ist ein Karten-Feed. Keine Bottom-Nav.
export function NewCatDetailScreen({
  t,
  CC,
  cat,
  user,
  allCats,
  entries,
  onUpdate,
  onTogglePin,
  onDelete,
  onBack,
  toggleTask,
  deleteEntry,
  onAddEntry,
  onAddMediaEntry,
  onOpenCat,
  onOpenEntry,
  onUpdateCat,
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  const accentRgb = cat.coverColor
    ? COVER_COLORS.find((c) => c.hex === cat.coverColor)?.rgb || TYPE_ACCENT_RGB[safeType]
    : TYPE_ACCENT_RGB[safeType] || "88, 88, 160";

  const [active, setActive] = useState("canvas");
  const [pinned, setPinned] = useState(false);
  // Mitscrollende Verlaufsfläche hinter Cover + Titel + Icon-Leiste: EIN
  // durchgehender Verlauf (Akzent oben → Seitenfarbe an der Trennlinie).
  // `coverBgH` = Gesamthöhe bis zur Unterkante des Sticky-Headers. `fadeStartPx`
  // = Position der Trennlinie im Sticky, ab der der gepinnte Header nach unten
  // transparent ausläuft (Content-Fadeout beim Scrollen).
  const [coverBgH, setCoverBgH] = useState(0);
  const [fadeStartPx, setFadeStartPx] = useState(0);
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [canvasOverflows, setCanvasOverflows] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showMediaTypeSheet, setShowMediaTypeSheet] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  // Tag-Zeile: Antippen einer verknüpften Typ-Pille öffnet das kompakte
  // LinkedPillSheet (Liste dieses Typs). `catLinkOpen` = volles Verknüpfungs-
  // Sheet ("Mehr verknüpfen").
  const [pillSheetType, setPillSheetType] = useState(null);
  const [catLinkOpen, setCatLinkOpen] = useState(false);

  const scrollRef = useRef(null);
  const topbarRef = useRef(null);
  const stickyRef = useRef(null);
  const titleElRef = useRef(null);
  const barRef = useRef(null);
  const sectionRefs = useRef({});
  const tileRefs = useRef({});
  const titleRefs = useRef({});
  // Schwebende "Nach oben"-Pille: erst einblenden, wenn spürbar weit gescrollt.
  const [showToTop, setShowToTop] = useState(false);
  // Beim Tap auf ein Icon nicht vom Scroll-Spy "überstimmt" werden, solange
  // der Smooth-Scroll noch läuft.
  const spyLockUntil = useRef(0);

  // Medien-Upload: Sheet wählt die Medienart, dann öffnet der versteckte
  // File-Input mit passendem accept.
  const mediaInputRef = useRef(null);
  const pendingMediaType = useRef(null);
  const handleMediaTypePick = (type) => {
    setShowMediaTypeSheet(false);
    pendingMediaType.current = type.id;
    if (mediaInputRef.current) {
      mediaInputRef.current.accept = type.accept;
      mediaInputRef.current.click();
    }
  };
  const handleMediaFileChange = (e) => {
    const file = e.target.files[0];
    if (file && pendingMediaType.current) {
      onAddMediaEntry?.(pendingMediaType.current, file);
    }
    pendingMediaType.current = null;
    if (e.target) e.target.value = null;
  };

  // Inhalte je Bereich
  const getTs = (x) =>
    typeof x?.createdAt === "number" ? x.createdAt : x?.createdAt ? Date.parse(x.createdAt) || 0 : 0;
  const byNewest = (a, b) => getTs(b) - getTs(a);
  const openTasks = entries.filter((e) => e.type === "task" && !e.done).sort(byNewest);
  const notes = entries.filter((e) => e.type === "note").sort(byNewest);
  const cals = entries.filter((e) => e.type === "calendar").sort(byNewest);
  const media = entries.filter((e) => e.type === "media").sort(byNewest);
  const links = entries.filter((e) => e.type === "link").sort(byNewest);
  const linkedResources = allCats.filter((c) => c.type === "resource" && c.relatedId === cat.id);
  const collaborators = cat.collaborators || [];

  // Verknüpfte Inhalte für die Tag-Zeile unter dem Titel: NUR die mit DIESER
  // Seite verknüpften Kategorien – Elternseite (relatedId dieser Kategorie) +
  // Kindseiten (deren relatedId auf diese Kategorie zeigt). Gruppiert nach Typ,
  // damit pro Typ EINE Pille steht (bei mehreren: "+N"), dazu die eigenen Tags
  // (cat.tags). Es werden bewusst nur seiten-spezifische Verknüpfungen gezeigt,
  // keine globale Tag-Liste.
  const parentCat = cat.relatedId ? allCats.find((c) => c.id === cat.relatedId) : null;
  const childCats = allCats.filter((c) => c.relatedId === cat.id && !c.archived);
  const linkedPages = parentCat ? [parentCat, ...childCats] : childCats;
  const linkedByType = ["project", "area", "resource"]
    .map((type) => ({ type, items: linkedPages.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0);
  const catTags = cat.tags || [];
  const hasTagsRow = linkedByType.length > 0 || catTags.length > 0;

  // Icon-Leiste = Lesezeichen (ohne Tags) mit Label unter dem aktiven Icon.
  // `label` = voller Name (Kartentitel, aria); `tileLabel` = kurzer Name für
  // die aktive Kachel (z.B. "Inhalt" statt "Seiteninhalt"), damit er in das
  // 1:1-Quadrat passt.
  const SECTIONS = BOOKMARKS.filter((b) => b.id !== "tags").map((b) => ({
    ...b,
    label:
      b.id === "canvas" ? t.pageContent
      : b.id === "tasks" ? t.tasks
      : b.id === "notes" ? t.notes
      : b.id === "cal" ? t.events || t.calendar
      : b.id === "media" ? t.mediaTab
      : b.id === "link" ? t.link
      : t.detailsTab || "Details",
    tileLabel:
      b.id === "canvas" ? (t.pageContentShort || "Inhalt")
      : b.id === "tasks" ? t.tasks
      : b.id === "notes" ? t.notes
      : b.id === "cal" ? t.events || t.calendar
      : b.id === "media" ? t.mediaTab
      : b.id === "link" ? t.link
      : t.detailsTab || "Details",
    count:
      b.id === "tasks" ? openTasks.length
      : b.id === "notes" ? notes.length
      : b.id === "cal" ? cals.length
      : b.id === "media" ? linkedResources.length + media.length
      : b.id === "link" ? links.length
      : null,
  }));

  // Höhe des fixierten Kopfes (Topbar + gepinnter Titel/Leiste) – Grundlage
  // für Scroll-Spy-Schwelle und Sprungziel beim Icon-Tap.
  const headerOffset = () =>
    (topbarRef.current?.offsetHeight || 56) + (stickyRef.current?.offsetHeight || 150);

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
    const refLine = headerOffset() + 12;
    let cur = SECTIONS[0]?.id || "canvas";
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (!el) continue;
      const top = el.offsetTop - scroller.scrollTop;
      if (top <= refLine) cur = s.id;
    }
    // Ganz unten angekommen (kein weiteres Scrollen möglich): immer den letzten
    // Abschnitt (Details) aktivieren – seine kurze Karte erreicht die Linie am
    // Seitenende sonst nie.
    if (scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2) {
      cur = SECTIONS[SECTIONS.length - 1]?.id || cur;
    }
    setActive(cur);
    // SECTIONS ist pro Render neu, ändert aber nur Zähler/Labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktives Icon in der (overflow-hidden) Leiste automatisch nach links rücken.
  useEffect(() => {
    const tile = tileRefs.current[active];
    const bar = barRef.current;
    if (tile && bar) {
      bar.scrollTo({ left: Math.max(0, tile.offsetLeft - 16), behavior: "smooth" });
    }
  }, [active]);

  // Geometrie für Cover-Verlauf + Header-Fadeout messen. `coverBgH` = Höhe der
  // durchgehenden Verlaufsfläche bis zur Unterkante des Sticky-Headers.
  // `fadeStartPx` = Trennlinie unter der Icon-Leiste, ab der der gepinnte
  // Header nach unten transparent ausläuft (Content-Fadeout beim Scrollen).
  useLayoutEffect(() => {
    const measure = () => {
      const st = stickyRef.current;
      const bar = barRef.current;
      if (!st || !bar) return;
      setCoverBgH(st.offsetTop + st.offsetHeight - FEED_PULL_UP_PX);
      // Trennlinie exakt unter die Icon-Leiste (Unterkante der Kacheln, inkl.
      // der größeren aktiven Kachel mit Label). Kein Magic-Offset – so sitzt
      // die Linie immer bündig unter den Icons. Darunter folgt die Fade-Zone.
      setFadeStartPx(bar.offsetTop + bar.offsetHeight);
    };
    measure();
    // Einmal den Scroll-Status auswerten, damit das "Seiteninhalt"-Label beim
    // Öffnen korrekt aus ist (Kartentitel ist sichtbar) statt initial zu blinken.
    handleScroll();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cat.name, handleScroll]);

  // Gepinnt klappt der große Titel ein (s. SCSS &--pinned &__title) – die
  // Icon-Leiste rückt dadurch nach oben. Auch der Wechsel der aktiven Kachel
  // (unterschiedlich hoch durch das Label) kann die Leistenhöhe minimal ändern.
  // Beides verschiebt die Trennlinie; sie wird daher neu gemessen und bleibt so
  // immer direkt unter den Icons.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    setFadeStartPx(bar.offsetTop + bar.offsetHeight);
  }, [pinned, active, hasTagsRow]);

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    spyLockUntil.current = Date.now() + 600;
    setActive(id);
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - headerOffset() - 8), behavior: "smooth" });
  };

  const emptyText = {
    tasks: t.noTasks,
    notes: t.noNotes || "Keine Notizen",
    cal: t.noCal,
    media: t.noMedia,
    link: t.noLink,
  };

  return (
    <div
      className={`new-detail${pinned ? " new-detail--pinned" : ""}`}
      style={{
        "--nd-accent-rgb": accentRgb,
        "--nd-fade-start": `${fadeStartPx}px`,
        "--nd-feed-pull": `${FEED_PULL_UP_PX}px`,
      }}
    >
      {/* Fixe Topbar – immer sichtbar: Zurück links, Typ-Label (bzw. beim
          Hochscrollen der Seitentitel) mittig, Einstellungen rechts. */}
      <div className="new-detail__topbar" ref={topbarRef}>
        <button className="new-detail__glass-btn" onClick={onBack} aria-label={t.back || "Zurück"}>
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="new-detail__topbar-center">
          <span className="new-detail__type-label">{cfg.sing || cfg.label}</span>
          {/* Gepinnt: der große Titel ist ausgeblendet; hier steht der Titel als
              editierbares Eingabefeld, damit man ihn direkt ganz oben ändern
              kann. Ungepinnt ist es (via Opacity/pointer-events) inaktiv. */}
          <input
            className="new-detail__topbar-title"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t.titlePlaceholder || "Titel…"}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
            tabIndex={pinned ? 0 : -1}
            aria-hidden={!pinned}
          />
        </span>
        <button
          className="new-detail__glass-btn"
          onClick={() => setShowOptions(true)}
          aria-label={t.menu || t.settingsBtn || "Menü"}
        >
          <MoreHorizontal size={22} strokeWidth={2.2} />
        </button>
      </div>

      <div className="new-detail__scroll" ref={scrollRef} onScroll={handleScroll}>
        {/* Ein durchgehender Verlauf (Akzent oben → Seitenfarbe an der
            Trennlinie unter der Icon-Leiste), scrollt als absolute Fläche mit.
            Volle Breite, KEINE Rundung – so entstehen keine schwarzen Ecken;
            der Verlauf läuft optisch nahtlos vom oberen Rand bis zur Leiste. */}
        <div className="new-detail__cover-bg" style={{ height: coverBgH }}>
          {/* Grain über der GESAMTEN Verlaufsfläche (bis zur Trennlinie) –
              läge er nur überm Cover, entstünde an dessen Unterkante ein
              sichtbarer Helligkeits-Cut im Verlauf. */}
          <div className="new-detail__grain" style={{ backgroundImage: GRAIN_URI }} />
        </div>
        {/* Cover: Emblem bzw. Bild – scrollt komplett weg. */}
        <div className="new-detail__cover">
          {cat.coverImage && <img className="new-detail__cover-img" src={cat.coverImage} alt="" />}
          {cat.coverImage && (
            <div className="new-detail__grain" style={{ backgroundImage: GRAIN_URI }} />
          )}
          {!cat.coverImage && (
            <div className="new-detail__emblem">
              {safeType === "project" ? (
                <DartTargetIcon size={112} strokeWidth={1.4} />
              ) : (
                <CatIcon size={104} strokeWidth={1.4} />
              )}
            </div>
          )}
        </div>

        {/* Pinnt unter der Topbar fest: Titel + Icon-Leiste mit durchgehender
            Linie (N26-Stil). Nur das Cover darüber scrollt aus dem Bild. */}
        <div className="new-detail__sticky" ref={stickyRef}>
          <input
            ref={titleElRef}
            className="new-detail__title"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t.titlePlaceholder || "Titel…"}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          />
          {hasTagsRow && (
            <div className="new-detail__tags">
              {/* Verknüpfte Seiten – eine Pille pro Typ. Einzeln: Icon + Name
                  (öffnet die Seite). Mehrere: Icon + Erste·Name + "+N" (öffnet
                  das LinkedPillSheet mit allen dieses Typs). */}
              {linkedByType.map(({ type, items }) => {
                const pcfg = CC[type] || CC.resource;
                const PIcon = CAT_ICONS[type] || Square;
                const many = items.length > 1;
                return (
                  <button
                    key={type}
                    className="new-detail__tag new-detail__tag--linked"
                    style={{ color: pcfg.color, background: pcfg.color + "1F", borderColor: pcfg.color + "40" }}
                    onClick={() => (many ? setPillSheetType(type) : onOpenCat?.(items[0]))}
                  >
                    <PIcon size={12} strokeWidth={2.4} />
                    <span>{items[0].name}</span>
                    {many && <span className="new-detail__tag-count">+{items.length - 1}</span>}
                  </button>
                );
              })}
              {catTags.map((tag) => (
                <span key={tag} className="new-detail__tag">
                  <TagIcon size={12} strokeWidth={2.4} />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
          <div className="new-detail__iconbar" ref={barRef}>
            {SECTIONS.map(({ id, Icon, color, label, tileLabel }) => {
              const isActive = id === active;
              // Erstes Lesezeichen ("Seiteninhalt") trägt die Kontextfarbe der
              // Seite (Projekt = rot, Ressource = grün …); die übrigen behalten
              // ihre eigene Lesezeichen-Farbe (Aufgaben blau usw.).
              const tileColor = id === "canvas" ? `rgb(${accentRgb})` : color;
              const tint = id === "canvas" ? `rgba(${accentRgb}, 0.16)` : `${color}24`;
              return (
                <button
                  key={id}
                  ref={(el) => { tileRefs.current[id] = el; }}
                  className={`new-detail__tile${isActive ? " new-detail__tile--active" : ""}`}
                  onClick={() => scrollToSection(id)}
                  aria-label={label}
                >
                  {/* Getönte Kachel: inaktiv nur das Icon, aktiv ein größeres
                      1:1-Quadrat mit Icon (oben) + kurzem Lesezeichen-Namen
                      (darunter, z.B. "Inhalt"). */}
                  <span
                    className="new-detail__tile-box"
                    style={
                      isActive
                        ? {
                            backgroundColor: "var(--nd-tile-active-bg)",
                            backgroundImage: `linear-gradient(${tint}, ${tint})`,
                            color: tileColor,
                          }
                        : { background: tint, color: tileColor }
                    }
                  >
                    <Icon size={isActive ? 24 : 20} color={tileColor} />
                    {isActive && <span className="new-detail__tile-label">{tileLabel}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Karten-Feed */}
        <div className="new-detail__feed">
          {/* Seiteninhalt: Akzent-Karte mit eigenem Abschnitttitel. Das Label
              unter dem aktiven Icon erscheint erst, wenn dieser Titel beim
              Hochscrollen hinter dem gepinnten Header verschwindet. */}
          <section
            className="new-detail__section"
            ref={(el) => { sectionRefs.current.canvas = el; }}
          >
            <div className="new-detail__card new-detail__card--canvas">
              <div className="new-detail__card-head">
                <span
                  className="new-detail__card-title"
                  ref={(el) => { titleRefs.current.canvas = el; }}
                >{t.pageContent}</span>
              </div>
              <div
                className={`new-detail__canvas-clip${canvasExpanded || !canvasOverflows ? " new-detail__canvas-clip--open" : ""}`}
              >
                <AutoGrowTextarea
                  value={cat.body || ""}
                  onChange={(body) => onUpdate({ body })}
                  placeholder={t.writeThoughts}
                  onOverflow={setCanvasOverflows}
                />
              </div>
              {canvasOverflows && (
                <button
                  className="new-detail__canvas-toggle"
                  onClick={() => setCanvasExpanded((v) => !v)}
                >
                  {canvasExpanded ? t.showLess : t.showFullContent}
                </button>
              )}
            </div>
          </section>

          {/* Übrige Bereiche: Kopf ohne Icon (steht schon in der Leiste),
              Eintragszeilen bündig im Listen-Look. */}
          {SECTIONS.filter((s) => s.id !== "canvas" && s.id !== "details").map((s) => (
            <section
              key={s.id}
              className="new-detail__section"
              ref={(el) => { sectionRefs.current[s.id] = el; }}
            >
              <div className={`new-detail__card${s.id !== "link" ? " new-detail__card--flush" : ""}`}>
                <div className="new-detail__card-head">
                  <span
                    className="new-detail__card-title"
                    ref={(el) => { titleRefs.current[s.id] = el; }}
                  >{s.label}</span>
                  {s.count > 0 && <span className="new-detail__card-count">{s.count}</span>}
                  <button
                    className="new-detail__card-add"
                    onClick={() => (s.id === "media" ? setShowMediaTypeSheet(true) : onAddEntry(
                      { tasks: "task", notes: "note", cal: "calendar", link: "link" }[s.id] || "note"
                    ))}
                    aria-label={t.add || "+"}
                  >
                    <Plus size={16} strokeWidth={2.4} />
                  </button>
                </div>

                {s.id === "tasks" && (openTasks.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.tasks}</div>
                ) : (
                  openTasks.map((e) => (
                    <DetailEntryRow key={e.id} t={t} CC={CC} entry={e} allCats={allCats} onToggle={toggleTask} onOpen={onOpenEntry} />
                  ))
                ))}

                {s.id === "notes" && (notes.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.notes}</div>
                ) : (
                  notes.map((e) => (
                    <DetailEntryRow key={e.id} t={t} CC={CC} entry={e} allCats={allCats} onOpen={onOpenEntry} />
                  ))
                ))}

                {s.id === "cal" && (cals.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.cal}</div>
                ) : (
                  cals.map((e) => (
                    <DetailEntryRow key={e.id} t={t} CC={CC} entry={e} allCats={allCats} onOpen={onOpenEntry} />
                  ))
                ))}

                {s.id === "media" && (
                  <>
                    {linkedResources.map((res) => (
                      <button key={res.id} className="new-detail__res-row" onClick={() => onOpenCat?.(res)}>
                        <span className="new-detail__row-tile" style={{ background: CC.resource.color + "1F", color: CC.resource.color }}>
                          <Square size={18} color={CC.resource.color} />
                        </span>
                        <span className="new-detail__res-name">{res.name}</span>
                        <ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />
                      </button>
                    ))}
                    {media.map((e) => (
                      <DetailEntryRow key={e.id} t={t} CC={CC} entry={e} allCats={allCats} onOpen={onOpenEntry} />
                    ))}
                    {linkedResources.length === 0 && media.length === 0 && (
                      <div className="new-detail__card-empty">{emptyText.media}</div>
                    )}
                  </>
                )}

                {s.id === "link" && (links.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.link}</div>
                ) : (
                  <LinkList t={t} CC={CC} entries={links} cats={allCats} onDelete={deleteEntry} />
                ))}
              </div>
            </section>
          ))}

          {/* Seiten-Details (Metadaten + Kollaboratoren) als letzte Karte */}
          <section
            className="new-detail__section"
            ref={(el) => { sectionRefs.current.details = el; }}
          >
            <div className="new-detail__card">
              <div className="new-detail__card-head">
                <span
                  className="new-detail__card-title"
                  ref={(el) => { titleRefs.current.details = el; }}
                >{t.detailsTab || "Details"}</span>
              </div>
              <DetailsBody
                t={t}
                item={cat}
                user={user}
                collaborators={collaborators}
                onAddCollaborator={() => setCollabOpen(true)}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Schwebende "Nach oben"-Pille mittig am unteren Rand – erscheint erst,
          wenn spürbar weit gescrollt wurde, und scrollt zurück nach oben. */}
      <button
        className={`new-detail__totop${showToTop ? " new-detail__totop--show" : ""}`}
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t.toTop || "Nach oben"}
      >
        <ArrowUp size={18} strokeWidth={2.4} />
        <span className="new-detail__totop-label">{t.toTop || "Nach oben"}</span>
      </button>

      {/* Options-Sheet (Settings-Glas-Button): Cover-Design + Favorit/
          Anpinnen/Archivieren/Löschen – geteilt mit der Liste. */}
      {showOptions && (
        <CatOptionsSheet
          t={t}
          cat={cat}
          onUpdate={onUpdate}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onClose={() => setShowOptions(false)}
        />
      )}

      {showMediaTypeSheet && (
        <MediaTypeSheet t={t} onPick={handleMediaTypePick} onClose={() => setShowMediaTypeSheet(false)} />
      )}

      {collabOpen && (
        <CollaboratorsModal
          t={t}
          cat={cat}
          onUpdateCat={(_id, patch) => onUpdate(patch)}
          onClose={() => setCollabOpen(false)}
          initialView={collaborators.length === 0 ? "add" : "list"}
        />
      )}

      {/* Tag-Pille mit mehreren Verknüpfungen angetippt: kompakte Liste dieses
          Typs, "Mehr verknüpfen" öffnet das volle Verknüpfungs-Sheet. */}
      {pillSheetType && (
        <LinkedPillSheet
          type={pillSheetType}
          items={(linkedByType.find((g) => g.type === pillSheetType) || {}).items || []}
          CC={CC}
          t={t}
          onMore={() => { setPillSheetType(null); setCatLinkOpen(true); }}
          onClose={() => setPillSheetType(null)}
        />
      )}

      {catLinkOpen && (
        <CatLinkSheet
          cat={cat}
          cats={allCats}
          CC={CC}
          t={t}
          onUpdateCat={onUpdateCat}
          onClose={() => setCatLinkOpen(false)}
        />
      )}

      {/* Versteckter File-Input für den Medien-Upload */}
      <input ref={mediaInputRef} type="file" style={{ display: "none" }} onChange={handleMediaFileChange} />
    </div>
  );
}
