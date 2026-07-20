import { useRef, useState } from "react";
import { ArrowUp, Calendar, ChevronLeft, Clock, MoreHorizontal, Plus, Square } from "lucide-react";
import { BOOKMARKS, CAT_ICONS, fmtDate, hexToRgbString } from "../utils";
import { DartTargetIcon } from "../components/AppIcons";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { MediaTypeSheet } from "../components/PillSheets";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { DetailsBody } from "../components/DetailsPopup";
import { LinkList } from "../components/EntryLists";
import { LinkedPillSheet } from "../components/LinkedPillSheet";
import { CatLinkSheet } from "../components/CatLinkSheet";
import { SchedulePickerSheet } from "../components/PickerSheets";
import { AutoGrowTextarea, DetailEntryRow } from "../components/NewDetailKit";
import { GRAIN_URI, FEED_PULL_UP_PX, useDetailScaffold } from "../hooks/useDetailScaffold";
import { useCoverLuminance } from "../hooks/useCoverLuminance";

// Akzent (RGB) des Covers – Typfarbe der Seite (Projekt rot usw.).
const TYPE_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
};

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
  tags = [],
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  // Freie Spektrumsfarben stehen in keiner Palette – daher direkt aus dem
  // Hex-Wert umrechnen statt nachschlagen.
  const accentRgb =
    hexToRgbString(cat.coverColor) || TYPE_ACCENT_RGB[safeType] || "88, 88, 160";

  // Helligkeit des Cover-Bildes je Zone – entscheidet, ob Typ-Label,
  // Emblem und Terminierung darüber weiß oder schwarz gezeichnet werden.
  const coverLum = useCoverLuminance(cat.coverImage);

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
  // Eigene Picker-Sheets für die Terminierung am Cover ("date" | "time" | null)
  const [coverPicker, setCoverPicker] = useState(null);

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

  // Verknüpfungen dieser Seite (für den "Verknüpfungen"-Block in der Details-
  // Karte, nicht mehr als Pillen-Zeile oben): Elternseite (relatedId dieser
  // Kategorie) + Kindseiten (deren relatedId auf diese Kategorie zeigt).
  // Gruppiert nach Typ, damit pro Typ EINE Pille steht (bei mehreren: "+N").
  const parentCat = cat.relatedId ? allCats.find((c) => c.id === cat.relatedId) : null;
  const childCats = allCats.filter((c) => c.relatedId === cat.id && !c.archived);
  const linkedPages = parentCat ? [parentCat, ...childCats] : childCats;
  const linkedByType = ["project", "area", "resource"]
    .map((type) => ({ type, items: linkedPages.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0);

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

  // Scroll-Gerüst (Spy, Pinning, Cover-Geometrie, "Nach oben"-Pille)
  const {
    active, pinned, coverBgH, fadeStartPx, showToTop,
    scrollRef, topbarRef, stickyRef, feedRef, barRef, setSectionRef, setTileRef,
    handleScroll, scrollToSection, scrollToTop,
  } = useDetailScaffold(SECTIONS.map((s) => s.id));

  const emptyText = {
    tasks: t.noTasks,
    notes: t.noNotes || "Keine Notizen",
    cal: t.noCal,
    media: t.noMedia,
    link: t.noLink,
  };

  return (
    <div
      className={`new-detail${pinned ? " new-detail--pinned" : ""}${cat.coverImage ? " new-detail--has-cover-img" : ""}${coverLum?.top ? " new-detail--cover-top-light" : ""}${coverLum?.mid ? " new-detail--cover-mid-light" : ""}`}
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
          {/* Ein Cover-Bild liegt in DIESER Fläche (nicht im Cover-Block
              darüber), damit es wie der Farbverlauf bis zur Trennlinie reicht
              und dort nach Schwarz bzw. Weiß ausläuft – so bleibt der Titel
              immer lesbar. */}
          {cat.coverImage && (
            <img className="new-detail__cover-bg-img" src={cat.coverImage} alt="" />
          )}
          {/* Grain über der GESAMTEN Verlaufsfläche (bis zur Trennlinie) –
              läge er nur überm Cover, entstünde an dessen Unterkante ein
              sichtbarer Helligkeits-Cut im Verlauf. */}
          <div className="new-detail__grain" style={{ backgroundImage: GRAIN_URI }} />
        </div>
        {/* Cover-Block: trägt Emblem + Terminierung und scrollt weg. */}
        <div className="new-detail__cover">
          <div className="new-detail__emblem">
            {/* Terminierung neben dem Emblem: links Datum (Kalender-Icon),
                rechts Uhrzeit (Uhr-Icon). Beide Icons sind IMMER sichtbar –
                ohne Wert nur als Placeholder; Tap öffnet das Picker-Sheet. */}
            <button
              className="new-detail__cover-meta new-detail__cover-meta--left"
              onClick={() => setCoverPicker("date")}
              aria-label={t.scheduledLabel || "Terminiert"}
            >
              <Calendar size={14} strokeWidth={2.2} />
              {cat.date && fmtDate(cat.date, t.locale)}
            </button>
            {safeType === "project" ? (
              <DartTargetIcon size={112} strokeWidth={1.4} />
            ) : (
              <CatIcon size={104} strokeWidth={1.4} />
            )}
            <button
              className="new-detail__cover-meta new-detail__cover-meta--right"
              onClick={() => setCoverPicker("time")}
              aria-label={t.timeLabel || "Uhrzeit"}
            >
              <Clock size={14} strokeWidth={2.2} />
              {cat.time}
            </button>
          </div>
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
          {/* Gepinnt: Miniatur-Terminierung unter dem Topbar-Titel – Kalender-
              Icon + Datum, dahinter (falls gesetzt) Mittelpunkt + Uhrzeit ohne
              eigenes Uhr-Icon. IMMER gerendert (auch ohne Datum bleibt das
              Icon als Placeholder stehen), damit die Headerhöhe auf allen
              Seiten identisch ist. Ungepinnt eingeklappt; Tap öffnet das
              kombinierte Terminierungs-Sheet. */}
          <button
            className="new-detail__pinned-meta"
            onClick={() => setCoverPicker("date")}
            aria-label={t.scheduledLabel || "Terminiert"}
          >
            <Calendar size={12} strokeWidth={2.4} />
            {cat.date && (
              <span>
                {fmtDate(cat.date, t.locale)}
                {cat.time ? ` · ${cat.time}` : ""}
              </span>
            )}
          </button>
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
                  ref={setTileRef(id)}
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
                    {/* Wrapper, damit das Icon bei aktiver Kachel exakt die
                        obere Hälfte belegt (Label die untere). */}
                    <span className="new-detail__tile-icon">
                      {/* Gleiche Icon-Größe wie inaktiv – nur die Kachel
                          wächst (Platz für den Namen darunter). */}
                      <Icon size={20} color={tileColor} />
                    </span>
                    {isActive && <span className="new-detail__tile-label">{tileLabel}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Karten-Feed */}
        <div className="new-detail__feed" ref={feedRef}>
          {/* Seiteninhalt: Akzent-Karte mit eigenem Abschnitttitel. Das Label
              unter dem aktiven Icon erscheint erst, wenn dieser Titel beim
              Hochscrollen hinter dem gepinnten Header verschwindet. */}
          <section
            className="new-detail__section"
            ref={setSectionRef("canvas")}
          >
            <div className="new-detail__card new-detail__card--canvas">
              <div className="new-detail__card-head">
                <span className="new-detail__card-title">{t.pageContent}</span>
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
              ref={setSectionRef(s.id)}
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
            ref={setSectionRef("details")}
          >
            <div className="new-detail__card">
              <div className="new-detail__card-head">
                <span className="new-detail__card-title">{t.detailsTab || "Details"}</span>
              </div>

              {/* Verknüpfungen: eine Pille pro Typ (Einzeln → öffnet die Seite;
                  mehrere → "+N", öffnet das LinkedPillSheet). Sitzt VOR den
                  Metadaten (erstellt/geändert/geöffnet). */}
              {linkedByType.length > 0 && (
                <div className="new-detail__conn">
                  <span className="new-detail__conn-label">{t.connectionsLabel || "Verknüpfungen"}</span>
                  <div className="new-detail__conn-pills">
                    {linkedByType.map(({ type, items }) => {
                      const pcfg = CC[type] || CC.resource;
                      const PIcon = CAT_ICONS[type] || Square;
                      const many = items.length > 1;
                      return (
                        <button
                          key={type}
                          className="new-detail__conn-pill"
                          style={{ color: pcfg.color, background: pcfg.color + "1F", borderColor: pcfg.color + "40" }}
                          onClick={() => (many ? setPillSheetType(type) : onOpenCat?.(items[0]))}
                        >
                          <PIcon size={12} strokeWidth={2.4} />
                          <span>{items[0].name}</span>
                          {many && <span className="new-detail__conn-count">+{items.length - 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
        onClick={scrollToTop}
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
          tags={tags}
          CC={CC}
          t={t}
          onUpdateCat={onUpdateCat}
          onClose={() => setCatLinkOpen(false)}
        />
      )}

      {/* Terminierung: EIN kombiniertes Frosted-Glass-Sheet mit den Subtabs
          Datum/Uhrzeit – geöffnet von den Cover-Icons (mit passendem Start-
          Tab) und der Miniatur-Terminierung im gepinnten Header. */}
      {coverPicker && (
        <SchedulePickerSheet
          t={t}
          date={cat.date || null}
          time={cat.time || null}
          accent={`rgb(${accentRgb})`}
          initialTab={coverPicker}
          onChangeDate={(d) => onUpdate({ date: d })}
          onChangeTime={(v) => onUpdate({ time: v })}
          onClose={() => setCoverPicker(null)}
        />
      )}

      {/* Versteckter File-Input für den Medien-Upload */}
      <input ref={mediaInputRef} type="file" style={{ display: "none" }} onChange={handleMediaFileChange} />
    </div>
  );
}
