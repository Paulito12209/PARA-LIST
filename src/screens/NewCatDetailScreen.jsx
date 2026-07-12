import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Square } from "lucide-react";
import { BOOKMARKS, CAT_ICONS, COVER_COLORS } from "../utils";
import { CustomSettingsIcon, DartTargetIcon } from "../components/AppIcons";
import { NewDesignNav } from "../components/NewDesignNav";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { MediaTypeSheet } from "../components/PillSheets";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { DetailsBody } from "../components/DetailsPopup";
import { TaskList, NoteList, CalList, MediaList, LinkList } from "../components/EntryLists";

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

// Erst ab diesem Abstand unter der Icon-Leiste gilt eine Karte beim
// Scroll-Spy als "aktiv" (ihre Oberkante hat die Leiste fast erreicht).
const SPY_OFFSET_PX = 140;
// Eingeklappte Seiteninhalt-Karte: mehr Text als diese Höhe → Fade +
// "Kompletten Inhalt anzeigen"-Button.
const CANVAS_CLIP_PX = 224;

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

// Spotify-artige Detailseite einer Kategorie (neues Design): großes Cover in
// der Typfarbe (Grain-Verlauf, Emblem-Icon, Titel unten versetzt), darunter
// die mitscrollende Icon-Leiste (aktives Icon größer + Label) und der Inhalt
// als Karten-Feed. Scrollen wechselt das aktive Icon automatisch.
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
  onOpenSearch,
  onOpenCatType,
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
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [canvasOverflows, setCanvasOverflows] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showMediaTypeSheet, setShowMediaTypeSheet] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const scrollRef = useRef(null);
  const barRef = useRef(null);
  const sectionRefs = useRef({});
  const tileRefs = useRef({});
  // Beim Tap auf ein Icon nicht vom Scroll-Spy "überstimmt" werden, solange
  // der Smooth-Scroll noch läuft.
  const spyLockUntil = useRef(0);

  // Medien-Upload wie auf der alten Detailseite: Sheet wählt die Medienart,
  // dann öffnet der versteckte File-Input mit passendem accept.
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

  // Scroll-Spy: letzte Karte, deren Oberkante die Icon-Leiste erreicht hat.
  const handleScroll = useCallback(() => {
    if (Date.now() < spyLockUntil.current) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const top = scroller.scrollTop + SPY_OFFSET_PX;
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

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    spyLockUntil.current = Date.now() + 600;
    setActive(id);
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - SPY_OFFSET_PX + 48), behavior: "smooth" });
  };

  // Plus in der Nav: erstellt einen Eintrag des aktiven Bereichs.
  const addForActive = () => {
    if (active === "media") {
      setShowMediaTypeSheet(true);
      return;
    }
    const map = { canvas: "note", tasks: "task", notes: "note", cal: "calendar", link: "link", details: "note" };
    onAddEntry(map[active] || "note");
  };

  const emptyText = {
    tasks: t.noTasks,
    notes: t.noNotes || "Keine Notizen",
    cal: t.noCal,
    media: t.noMedia,
    link: t.noLink,
  };

  return (
    <div className="new-detail" style={{ "--nd-accent-rgb": accentRgb }}>
      <div className="new-detail__scroll" ref={scrollRef} onScroll={handleScroll}>
        {/* Cover: Typfarbe mit Grain-Verlauf, Glas-Buttons, Typ-Label mittig,
            Emblem in der Mitte, Titel unten versetzt. */}
        <div className="new-detail__cover">
          {cat.coverImage && <img className="new-detail__cover-img" src={cat.coverImage} alt="" />}
          <div className="new-detail__grain" style={{ backgroundImage: GRAIN_URI }} />

          <div className="new-detail__topbar">
            <button className="new-detail__glass-btn" onClick={onBack} aria-label={t.back || "Zurück"}>
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <span className="new-detail__type-label">{cfg.sing || cfg.label}</span>
            <button
              className="new-detail__glass-btn"
              onClick={() => setShowOptions(true)}
              aria-label={t.settingsBtn || "Einstellungen"}
            >
              <CustomSettingsIcon size={20} color="currentColor" />
            </button>
          </div>

          {/* Emblem: Projekte = Dart/Zielscheibe, sonst das Typ-Icon –
              entfällt bei eigenem Cover-Bild. */}
          {!cat.coverImage && (
            <div className="new-detail__emblem">
              {safeType === "project" ? (
                <DartTargetIcon size={112} strokeWidth={1.4} />
              ) : (
                <CatIcon size={104} strokeWidth={1.4} />
              )}
            </div>
          )}

          <input
            className="new-detail__title"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t.titlePlaceholder || "Titel…"}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          />
        </div>

        {/* Icon-Leiste: klebt beim Scrollen oben; das Cover läuft dahinter in
            den dunklen Hintergrund aus (transparent → dunkel als Layer). */}
        <div className="new-detail__barwrap">
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
                    style={{ background: color + "24", color }}
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
          {/* Seiteninhalt: Akzent-Karte (wie Spotifys Lyrics-Vorschau) –
              eingeklappt nur ein Ausschnitt, Button zeigt alles. */}
          <section
            className="new-detail__section"
            ref={(el) => { sectionRefs.current.canvas = el; }}
          >
            <div className="new-detail__card new-detail__card--canvas">
              <div className="new-detail__card-eyebrow">{t.pageContent}</div>
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

          {/* Übrige Bereiche als dunkle Karten mit Kopfzeile (Icon · Label ·
              Anzahl · Plus) und den bestehenden Listen-Komponenten. */}
          {SECTIONS.filter((s) => s.id !== "canvas" && s.id !== "details").map((s) => (
            <section
              key={s.id}
              className="new-detail__section"
              ref={(el) => { sectionRefs.current[s.id] = el; }}
            >
              <div className="new-detail__card">
                <div className="new-detail__card-head">
                  <span className="new-detail__card-icon" style={{ background: s.color + "24", color: s.color }}>
                    <s.Icon size={16} color={s.color} />
                  </span>
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
                  <TaskList t={t} CC={CC} entries={openTasks} cats={allCats} onToggle={toggleTask} onDelete={deleteEntry} onOpenEntry={onOpenEntry} />
                ))}

                {s.id === "notes" && (notes.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.notes}</div>
                ) : (
                  <NoteList t={t} CC={CC} entries={notes} cats={allCats} onDelete={deleteEntry} onOpenEntry={onOpenEntry} />
                ))}

                {s.id === "cal" && (cals.length === 0 ? (
                  <div className="new-detail__card-empty">{emptyText.cal}</div>
                ) : (
                  <CalList t={t} CC={CC} entries={cals} cats={allCats} onDelete={deleteEntry} onOpenEntry={onOpenEntry} />
                ))}

                {s.id === "media" && (
                  <>
                    {linkedResources.map((res) => (
                      <button key={res.id} className="new-detail__res-row" onClick={() => onOpenCat?.(res)}>
                        <span className="new-detail__card-icon" style={{ background: CC.resource.color + "24", color: CC.resource.color }}>
                          <Square size={14} color={CC.resource.color} />
                        </span>
                        <span className="new-detail__res-name">{res.name}</span>
                        <ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />
                      </button>
                    ))}
                    {media.length > 0 && (
                      <MediaList t={t} CC={CC} entries={media} cats={allCats} onDelete={deleteEntry} />
                    )}
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

      {/* Untere Navigationsleiste bleibt sichtbar; Plus erstellt einen
          Eintrag des gerade aktiven Bereichs. */}
      <NewDesignNav
        t={t}
        active={safeType}
        onHome={onHome}
        onOpenSearch={onOpenSearch}
        onOpenCatType={onOpenCatType}
        onAdd={addForActive}
      />

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
