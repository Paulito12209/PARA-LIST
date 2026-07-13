import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, Circle, Home, MoreHorizontal, Paperclip, Pencil, Plus, Square } from "lucide-react";
import { BOOKMARKS, CAT_ICONS, COVER_COLORS, fmtDate } from "../utils";
import { DartTargetIcon, GitMergeBranchIcon, CustomSettingsIcon } from "../components/AppIcons";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { MediaTypeSheet } from "../components/PillSheets";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { DetailsBody } from "../components/DetailsPopup";
import { LinkList } from "../components/EntryLists";

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

// So weit über der Icon-Leiste ist der rot→schwarz-Verlauf des Covers bereits
// vollständig schwarz – damit die Icons + das "Seiteninhalt"-Label auf
// durchgehend Schwarz sitzen (kein Grauverlauf mehr an den Icons).
const BLACK_ABOVE_ICONS_PX = 24;

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
        </div>
      </div>

      <button
        className="new-detail__row-link"
        onClick={(e) => { e.stopPropagation(); onOpen?.(entry); }}
        aria-label={t.linkAction || "Verknüpfen"}
      >
        <GitMergeBranchIcon size={14} strokeWidth={2.2} />
      </button>
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
  onHome,
  toggleTask,
  deleteEntry,
  onAddEntry,
  onAddMediaEntry,
  onOpenCat,
  onOpenEntry,
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  const accentRgb = cat.coverColor
    ? COVER_COLORS.find((c) => c.hex === cat.coverColor)?.rgb || TYPE_ACCENT_RGB[safeType]
    : TYPE_ACCENT_RGB[safeType] || "88, 88, 160";

  const [active, setActive] = useState("canvas");
  const [pinned, setPinned] = useState(false);
  // Mitscrollende Verlaufsfläche (Akzent → Schwarz) hinter Cover + Titel +
  // Icon-Leiste. `coverBgH` = Höhe bis zur Unterkante des Sticky-Headers, damit
  // die Icon-/Label-Zone auf durchgehend Schwarz sitzt. `blackStartPx` = Punkt
  // (px von oben), an dem der Verlauf voll schwarz ist – oberhalb der Icons.
  // `fadeStartPx` = Position der Trennlinie im Sticky, ab der der gepinnte
  // Header nach unten transparent ausläuft (Content-Fadeout beim Scrollen).
  const [coverBgH, setCoverBgH] = useState(0);
  const [blackStartPx, setBlackStartPx] = useState(0);
  const [fadeStartPx, setFadeStartPx] = useState(0);
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [canvasOverflows, setCanvasOverflows] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showMediaTypeSheet, setShowMediaTypeSheet] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const scrollRef = useRef(null);
  const topbarRef = useRef(null);
  const stickyRef = useRef(null);
  const barRef = useRef(null);
  const sectionRefs = useRef({});
  const tileRefs = useRef({});
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

  // Icon-Leiste = Lesezeichen (ohne Tags) mit Label unter dem aktiven Icon.
  const SECTIONS = BOOKMARKS.filter((b) => b.id !== "tags").map((b) => ({
    ...b,
    label:
      b.id === "canvas" ? t.pageContent
      : b.id === "tasks" ? t.tasks
      : b.id === "notes" ? t.notes
      : b.id === "cal" ? t.events || t.calendar
      : b.id === "media" ? t.mediaTab
      : b.id === "link" ? t.link
      : t.detailsTitle,
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
    if (Date.now() < spyLockUntil.current) return;
    const top = scroller.scrollTop + headerOffset() + 56;
    let cur = "canvas";
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (el && el.offsetTop <= top) cur = s.id;
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

  // Geometrie für Cover-Verlauf + Header-Fadeout messen. Bezugspunkte:
  //  • iconBarTop  = Oberkante der Icon-Leiste (im Scroller)
  //  • divider     = Trennlinie = iconBarTop + 60 (8px Padding + 44px Icon +
  //                  8px Abstand, s. SCSS __iconbar::after)
  // Der rot→schwarz-Verlauf ist schon `BLACK_ABOVE_ICONS_PX` über der Leiste
  // voll schwarz (Icons auf durchgehend Schwarz); die Fläche reicht bis zur
  // Unterkante des Sticky-Headers. `fadeStartPx` markiert die Trennlinie im
  // Sticky – darunter läuft der gepinnte Header transparent aus.
  useLayoutEffect(() => {
    const measure = () => {
      const st = stickyRef.current;
      const bar = barRef.current;
      if (!st || !bar) return;
      const iconBarTop = st.offsetTop + bar.offsetTop;
      setCoverBgH(st.offsetTop + st.offsetHeight);
      setBlackStartPx(Math.max(0, iconBarTop - BLACK_ABOVE_ICONS_PX));
      setFadeStartPx(bar.offsetTop + 60);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cat.name]);

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
        "--nd-black-start": `${blackStartPx}px`,
        "--nd-fade-start": `${fadeStartPx}px`,
      }}
    >
      {/* Fixe Topbar – immer sichtbar: Zurück links, Typ-Label mittig,
          Einstellungen rechts (16px Abstand zum oberen Rand). */}
      <div className="new-detail__topbar" ref={topbarRef}>
        <button className="new-detail__glass-btn" onClick={onBack} aria-label={t.back || "Zurück"}>
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="new-detail__type-label">{cfg.sing || cfg.label}</span>
        <button
          className="new-detail__glass-btn"
          onClick={() => setShowOptions(true)}
          aria-label={t.menu || t.settingsBtn || "Menü"}
        >
          <MoreHorizontal size={22} strokeWidth={2.2} />
        </button>
      </div>

      <div className="new-detail__scroll" ref={scrollRef} onScroll={handleScroll}>
        {/* Durchgehender Hintergrund-Verlauf (Akzent oben → Schwarz an der
            Trennlinie), scrollt als absolute Fläche mit. Liegt hinter Cover
            und Titel/Leiste, damit das Rot linear vom Rand bis zur Linie
            ausläuft – nicht erst im Titel-Container. */}
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
            className="new-detail__title"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t.titlePlaceholder || "Titel…"}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          />
          <div className="new-detail__iconbar" ref={barRef}>
            {SECTIONS.map(({ id, Icon, color, label }) => {
              const isActive = id === active;
              return (
                <button
                  key={id}
                  ref={(el) => { tileRefs.current[id] = el; }}
                  className={`new-detail__tile${isActive ? " new-detail__tile--active" : ""}`}
                  onClick={() => scrollToSection(id)}
                  aria-label={label}
                >
                  <span
                    className="new-detail__tile-icon"
                    style={
                      isActive
                        ? {
                            // Getönte Fläche über opakem, dunklem Grund: das
                            // größere aktive Icon überdeckt die Trennlinie
                            // vollständig (kein Durchscheinen der Linie).
                            backgroundColor: "#08080B",
                            backgroundImage: `linear-gradient(${color}24, ${color}24)`,
                            color,
                          }
                        : { background: color + "24", color }
                    }
                  >
                    <Icon size={isActive ? 26 : 20} color={color} />
                  </span>
                  {/* Label nur unter dem aktiven Icon, ohne Chevron */}
                  <span className="new-detail__tile-label">{isActive ? label : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Karten-Feed */}
        <div className="new-detail__feed">
          {/* Seiteninhalt: Akzent-Karte – Label steht bereits unter dem
              aktiven Icon, daher keine Kopfzeile in der Karte. */}
          <section
            className="new-detail__section"
            ref={(el) => { sectionRefs.current.canvas = el; }}
          >
            <div className="new-detail__card new-detail__card--canvas">
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
                  <span className="new-detail__card-title">{s.label}</span>
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

      {/* Schwebende Home-Pille mittig am unteren Rand – zurück zur Startseite. */}
      <button
        className="new-detail__home"
        onClick={onHome}
        aria-label={t.home || "Startseite"}
      >
        <Home size={20} strokeWidth={2.2} />
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

      {/* Versteckter File-Input für den Medien-Upload */}
      <input ref={mediaInputRef} type="file" style={{ display: "none" }} onChange={handleMediaFileChange} />
    </div>
  );
}
