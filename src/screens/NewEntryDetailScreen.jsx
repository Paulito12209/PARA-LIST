import { useState } from "react";
import {
  ArrowUp, Calendar, CheckCircle2, ChevronLeft, Clock, Link2, MoreHorizontal,
  Paperclip, Pencil, Plus, Square,
} from "lucide-react";
import { BOOKMARKS, CAT_ICONS, fmtDate, hexToRgbString } from "../utils";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { DetailsBody } from "../components/DetailsPopup";
import { LinkList } from "../components/EntryLists";
import { LinkSheet } from "../components/LinkSheet";
import { TagSheet } from "../components/PillSheets";
import { SchedulePickerSheet } from "../components/PickerSheets";
import { AutoGrowTextarea, DetailEntryRow } from "../components/NewDetailKit";
import { GRAIN_URI, FEED_PULL_UP_PX, useDetailScaffold } from "../hooks/useDetailScaffold";
import { useCoverLuminance } from "../hooks/useCoverLuminance";

// Akzent (RGB) + Emblem je Eintragstyp – Gegenstück zu TYPE_ACCENT_RGB der
// Kategorie-Detailseite (Projekt rot usw.).
const TYPE_ACCENT_RGB = {
  task: "11, 140, 233",
  note: "245, 158, 11",
  calendar: "0, 120, 212",
  media: "16, 185, 129",
  link: "124, 58, 237",
};

const TYPE_EMBLEM = {
  task: CheckCircle2,
  note: Pencil,
  calendar: Calendar,
  media: Paperclip,
  link: Link2,
};

/**
 * Spotify-artige Detailseite eines EINTRAGS (Aufgabe/Notiz/Termin) im neuen
 * Design – gleicher Aufbau wie NewCatDetailScreen: fixe Topbar, Cover mit
 * Emblem + Terminierung, gepinnter Titel + Icon-Leiste, darunter der
 * Karten-Feed. Verknüpfte Einträge stehen in denselben Abschnittskarten.
 */
export function NewEntryDetailScreen({
  t,
  CC,
  entry,
  allCats,
  entries,
  user,
  tags,
  onUpdate,
  onTogglePin,
  onDelete,
  onBack,
  onOpenEntry,
  onOpenCat,
  toggleTask,
  onAddLinkedEntry,
  onAddSubtask,
}) {
  const safeType = TYPE_ACCENT_RGB[entry.type] ? entry.type : "note";
  const Emblem = TYPE_EMBLEM[safeType] || Pencil;
  // Freie Spektrumsfarben stehen in keiner Palette – daher direkt aus dem
  // Hex-Wert umrechnen statt nachschlagen.
  const accentRgb = hexToRgbString(entry.coverColor) || TYPE_ACCENT_RGB[safeType];

  const typeLabel = {
    task: t.task, note: t.note, calendar: t.calSing, media: t.mediaSing, link: t.link,
  }[safeType] || t.note;

  // Helligkeit des Cover-Bildes je Zone – entscheidet, ob Typ-Label,
  // Emblem und Terminierung darüber weiß oder schwarz gezeichnet werden.
  const coverLum = useCoverLuminance(entry.coverImage);

  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [canvasOverflows, setCanvasOverflows] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  // Terminierungs-Sheet ("date" | "time" | null) – nur für Aufgaben/Termine.
  const [picker, setPicker] = useState(null);

  const collaborators = entry.collaborators || [];

  // ── Verknüpfte Einträge je Abschnitt ──
  const allEntries = entries || [];
  const linkedIds = new Set(entry.linkedEntryIds || []);
  const linkedEntries = allEntries.filter((e) => linkedIds.has(e.id));
  const subtasks = entry.type === "task" ? allEntries.filter((e) => e.parentId === entry.id) : [];

  const getTs = (x) =>
    typeof x?.createdAt === "number" ? x.createdAt : x?.createdAt ? Date.parse(x.createdAt) || 0 : 0;
  const byNewest = (a, b) => getTs(b) - getTs(a);

  // Aufgaben-Abschnitt: Unteraufgaben (nur auf Aufgaben-Seiten) + verknüpfte
  // Aufgaben. Erledigte rutschen ans Ende, statt zu verschwinden.
  const tasksAll = [...subtasks, ...linkedEntries.filter((e) => e.type === "task")]
    .sort(byNewest)
    .sort((a, b) => Number(!!a.done) - Number(!!b.done));
  const openTaskCount = tasksAll.filter((e) => !e.done).length;
  const notes = linkedEntries.filter((e) => e.type === "note").sort(byNewest);
  const cals = linkedEntries.filter((e) => e.type === "calendar").sort(byNewest);
  const media = linkedEntries.filter((e) => e.type === "media").sort(byNewest);
  const links = linkedEntries.filter((e) => e.type === "link").sort(byNewest);

  // Verknüpfte Seiten (Projekte/Bereiche/Ressourcen) des Eintrags, gruppiert
  // nach Typ – erscheinen als Pillen in der Details-Karte.
  const linkedCats = allCats.filter((c) => (entry.catIds || []).includes(c.id));
  const linkedByType = ["project", "area", "resource"]
    .map((type) => ({ type, items: linkedCats.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0);

  // Icon-Leiste = Lesezeichen (ohne Tags), identisch zur Kategorie-Detailseite.
  const SECTIONS = BOOKMARKS.filter((b) => b.id !== "tags").map((b) => ({
    ...b,
    label:
      b.id === "canvas" ? t.pageContent
      : b.id === "tasks" ? (entry.type === "task" ? t.subtasks || t.tasks : t.tasks)
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
      b.id === "tasks" ? openTaskCount
      : b.id === "notes" ? notes.length
      : b.id === "cal" ? cals.length
      : b.id === "media" ? media.length
      : b.id === "link" ? links.length
      : null,
  }));

  const scaffold = useDetailScaffold(SECTIONS.map((s) => s.id));
  const {
    active, pinned, coverBgH, fadeStartPx, showToTop,
    scrollRef, topbarRef, stickyRef, feedRef, barRef, setSectionRef, setTileRef,
    handleScroll, scrollToSection, scrollToTop,
  } = scaffold;

  // Terminierung: Aufgabe = Fälligkeit (due), Termin = date. Notizen und die
  // übrigen Typen haben kein Datum – dort steht das Erstellungsdatum still.
  const isSchedulable = entry.type === "task" || entry.type === "calendar";
  const schedDate = entry.type === "task" ? entry.due || null : entry.date || null;
  const createdDate = entry.createdAt
    ? new Date(entry.createdAt).toISOString().split("T")[0]
    : null;
  const metaDate = isSchedulable ? schedDate : createdDate;

  // Der Canvas schreibt je nach Typ in ein anderes Feld: Notizen haben `body`,
  // Aufgaben/Termine ihre `note`.
  const canvasValue = (entry.type === "note" ? entry.body : entry.note) || "";
  const setCanvasValue = (v) =>
    onUpdate(entry.type === "note" ? { body: v } : { note: v });
  const canvasPlaceholder =
    entry.type === "note" ? t.writeNotePlaceholder : t.addNotePlaceholder;

  // "+"-Button je Abschnitt: auf einer Aufgaben-Seite legt der Aufgaben-Block
  // Unteraufgaben an, sonst wird ein verknüpfter Eintrag erstellt.
  const handleAdd = (sectionId) => {
    if (sectionId === "tasks") {
      if (entry.type === "task") onAddSubtask?.();
      else onAddLinkedEntry?.("task");
      return;
    }
    const type = { notes: "note", cal: "calendar", media: "media", link: "link" }[sectionId];
    if (type) onAddLinkedEntry?.(type);
  };

  const emptyText = {
    tasks: entry.type === "task" ? t.noSubtasks || t.noTasks : t.noTasks,
    notes: t.noNotes || "Keine Notizen",
    cal: t.noCal,
    media: t.noMedia,
    link: t.noLink,
  };

  const sectionEntries = { tasks: tasksAll, notes, cal: cals, media };

  // ── Status (nur Aufgaben/Termine) ──────────────────────────────────
  // `status` ist die sprechende Angabe; `done`/`archived` bleiben die Felder,
  // nach denen die übrigen Listen der App filtern – deshalb werden sie hier
  // mitgeführt statt ersetzt.
  const status = entry.status || (entry.done ? "done" : null);

  const applyStatus = (next) => {
    // "Erledigt" läuft bewusst über toggleTask statt über ein direktes
    // done-Patch: nur dort hängen completedAt, Haptik und die Erfolgs-Animation
    // dran. Die übrigen Status nehmen ein gesetztes done wieder zurück.
    const wasDone = !!entry.done;
    if (next === "done") {
      if (!wasDone) toggleTask?.(entry.id);
      onUpdate({ status: "done", archived: false });
    } else {
      if (wasDone) toggleTask?.(entry.id);
      if (next === "postponed") {
        // Verschieben heißt: offen halten, aber neu terminieren – deshalb geht
        // direkt der Datums-Picker auf.
        onUpdate({ status: "postponed", archived: false });
        setShowOptions(false);
        setPicker("date");
        return;
      }
      // Abgesagt ≠ erledigt: der Eintrag wandert ins Archiv, zählt dort aber
      // nicht zum Fortschritt.
      onUpdate(
        next === "cancelled"
          ? { status: "cancelled", archived: true }
          : { status: null, archived: false },
      );
    }
    setShowOptions(false);
  };

  return (
    <div
      className={`new-detail${pinned ? " new-detail--pinned" : ""}${entry.coverImage ? " new-detail--has-cover-img" : ""}${coverLum?.top ? " new-detail--cover-top-light" : ""}${coverLum?.mid ? " new-detail--cover-mid-light" : ""}`}
      style={{
        "--nd-accent-rgb": accentRgb,
        "--nd-fade-start": `${fadeStartPx}px`,
        "--nd-feed-pull": `${FEED_PULL_UP_PX}px`,
      }}
    >
      {/* Fixe Topbar – immer sichtbar: Zurück links, Typ-Label (gepinnt: der
          Eintragstitel als Eingabefeld) mittig, Menü rechts. */}
      <div className="new-detail__topbar" ref={topbarRef}>
        <button className="new-detail__glass-btn" onClick={onBack} aria-label={t.back || "Zurück"}>
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="new-detail__topbar-center">
          <span className="new-detail__type-label">{typeLabel}</span>
          <input
            className="new-detail__topbar-title"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
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
        {/* Durchgehender Verlauf hinter Cover + Titel + Leiste. Ein Cover-Bild
            liegt in DIESER Fläche (nicht im Cover-Block darüber), damit es wie
            der Farbverlauf bis zur Trennlinie reicht und dort nach Schwarz
            bzw. Weiß ausläuft – so bleibt der Titel immer lesbar. */}
        <div className="new-detail__cover-bg" style={{ height: coverBgH }}>
          {entry.coverImage && (
            <img className="new-detail__cover-bg-img" src={entry.coverImage} alt="" />
          )}
          <div className="new-detail__grain" style={{ backgroundImage: GRAIN_URI }} />
        </div>

        {/* Cover-Block: trägt Emblem + Terminierung und scrollt weg. */}
        <div className="new-detail__cover">
          <div className="new-detail__emblem">
            {/* Terminierung neben dem Emblem: links Datum, rechts Uhrzeit.
                Auf Aufgaben-/Terminseiten öffnen sie das Picker-Sheet; bei
                Notizen steht dort unantastbar das Erstellungsdatum. */}
            {isSchedulable ? (
              <button
                className="new-detail__cover-meta new-detail__cover-meta--left"
                onClick={() => setPicker("date")}
                aria-label={t.scheduledLabel || "Terminiert"}
              >
                <Calendar size={14} strokeWidth={2.2} />
                {metaDate && fmtDate(metaDate, t.locale)}
              </button>
            ) : (
              <span className="new-detail__cover-meta new-detail__cover-meta--left">
                <Calendar size={14} strokeWidth={2.2} />
                {metaDate && fmtDate(metaDate, t.locale)}
              </span>
            )}

            <Emblem size={104} strokeWidth={1.4} />

            {isSchedulable ? (
              <button
                className="new-detail__cover-meta new-detail__cover-meta--right"
                onClick={() => setPicker("time")}
                aria-label={t.timeLabel || "Uhrzeit"}
              >
                <Clock size={14} strokeWidth={2.2} />
                {entry.time}
              </button>
            ) : (
              <span className="new-detail__cover-meta new-detail__cover-meta--right">
                <Clock size={14} strokeWidth={2.2} />
              </span>
            )}
          </div>
        </div>

        {/* Gepinnter Block: Titel + Terminierungs-Miniatur + Icon-Leiste */}
        <div className="new-detail__sticky" ref={stickyRef}>
          <input
            className="new-detail__title"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={t.titlePlaceholder || "Titel…"}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          />
          <button
            className="new-detail__pinned-meta"
            onClick={() => isSchedulable && setPicker("date")}
            aria-label={t.scheduledLabel || "Terminiert"}
          >
            <Calendar size={12} strokeWidth={2.4} />
            {metaDate && (
              <span>
                {fmtDate(metaDate, t.locale)}
                {entry.time ? ` · ${entry.time}` : ""}
              </span>
            )}
          </button>

          <div className="new-detail__iconbar" ref={barRef}>
            {SECTIONS.map(({ id, Icon, color, label, tileLabel }) => {
              const isActive = id === active;
              // Erstes Lesezeichen ("Seiteninhalt") trägt die Kontextfarbe des
              // Eintrags; die übrigen behalten ihre Lesezeichen-Farbe.
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
                    <span className="new-detail__tile-icon">
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
          {/* Seiteninhalt (Notiztext bzw. Notiz der Aufgabe/des Termins) */}
          <section
            className="new-detail__section"
            ref={setSectionRef("canvas")}
          >
            <div className="new-detail__card new-detail__card--canvas">
              <div className="new-detail__card-head">
                <span className="new-detail__card-title">{t.pageContent}</span>
                {/* Aktueller Status als Pille – tippen schaltet "Erledigt"
                    um, die feineren Status setzt man im Kebab-Sheet. */}
                {isSchedulable && (
                  <button
                    className="new-detail__card-done"
                    onClick={() => applyStatus(status === "done" ? null : "done")}
                  >
                    {status === "done" ? t.actionReopen || "Wieder öffnen"
                      : status === "postponed" ? t.actionPostpone
                      : status === "cancelled" ? t.actionCancelled
                      : t.markDone || "Erledigt"}
                  </button>
                )}
              </div>
              <div
                className={`new-detail__canvas-clip${canvasExpanded || !canvasOverflows ? " new-detail__canvas-clip--open" : ""}`}
              >
                <AutoGrowTextarea
                  value={canvasValue}
                  onChange={setCanvasValue}
                  placeholder={canvasPlaceholder}
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

          {/* Verknüpfte Einträge je Lesezeichen */}
          {SECTIONS.filter((s) => s.id !== "canvas" && s.id !== "details").map((s) => {
            const list = sectionEntries[s.id];
            return (
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
                      onClick={() => handleAdd(s.id)}
                      aria-label={t.add || "+"}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                    </button>
                  </div>

                  {s.id === "link" ? (
                    links.length === 0 ? (
                      <div className="new-detail__card-empty">{emptyText.link}</div>
                    ) : (
                      <LinkList t={t} CC={CC} entries={links} cats={allCats} />
                    )
                  ) : list.length === 0 ? (
                    <div className="new-detail__card-empty">{emptyText[s.id]}</div>
                  ) : (
                    list.map((e) => (
                      <DetailEntryRow
                        key={e.id}
                        t={t}
                        CC={CC}
                        entry={e}
                        allCats={allCats}
                        onToggle={toggleTask}
                        onOpen={onOpenEntry}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}

          {/* Details: Verknüpfungen + Tags + Metadaten */}
          <section
            className="new-detail__section"
            ref={setSectionRef("details")}
          >
            <div className="new-detail__card">
              <div className="new-detail__card-head">
                <span className="new-detail__card-title">{t.detailsTab || "Details"}</span>
              </div>

              {/* Verknüpfte Seiten: eine Pille je Kategorie, dahinter die
                  gestrichelte Pille zum Öffnen des Verknüpfungs-Sheets. */}
              <div className="new-detail__conn">
                <span className="new-detail__conn-label">{t.connectionsLabel || "Verknüpfungen"}</span>
                <div className="new-detail__conn-pills">
                  {linkedByType.map(({ type, items }) =>
                    items.map((c) => {
                      const pcfg = CC[type] || CC.resource;
                      const PIcon = CAT_ICONS[type] || Square;
                      return (
                        <button
                          key={c.id}
                          className="new-detail__conn-pill"
                          style={{ color: pcfg.color, background: pcfg.color + "1F", borderColor: pcfg.color + "40" }}
                          onClick={() => onOpenCat?.(c)}
                        >
                          <PIcon size={12} strokeWidth={2.4} />
                          <span>{c.name}</span>
                        </button>
                      );
                    }),
                  )}
                  <button
                    className="new-detail__conn-pill new-detail__conn-pill--add"
                    onClick={() => setLinkSheetOpen(true)}
                  >
                    <Plus size={12} strokeWidth={2.6} />
                    <span>{t.linkAction || "Verknüpfen"}</span>
                  </button>
                </div>
              </div>

              {/* Tags des Eintrags */}
              <div className="new-detail__conn">
                <span className="new-detail__conn-label">{t.tagsLabel || "Tags"}</span>
                <div className="new-detail__conn-pills">
                  {(entry.tags || []).map((tag) => (
                    <button
                      key={tag}
                      className="new-detail__conn-pill"
                      style={{ color: "#EC4899", background: "#EC48991F", borderColor: "#EC489940" }}
                      onClick={() => setTagSheetOpen(true)}
                    >
                      <span>{tag}</span>
                    </button>
                  ))}
                  <button
                    className="new-detail__conn-pill new-detail__conn-pill--add"
                    onClick={() => setTagSheetOpen(true)}
                  >
                    <Plus size={12} strokeWidth={2.6} />
                    <span>{t.tagsLabel || "Tags"}</span>
                  </button>
                </div>
              </div>

              <DetailsBody
                t={t}
                item={entry}
                user={user}
                collaborators={collaborators}
                onAddCollaborator={() => setCollabOpen(true)}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Schwebende "Nach oben"-Pille */}
      <button
        className={`new-detail__totop${showToTop ? " new-detail__totop--show" : ""}`}
        onClick={scrollToTop}
        aria-label={t.toTop || "Nach oben"}
      >
        <ArrowUp size={18} strokeWidth={2.4} />
        <span className="new-detail__totop-label">{t.toTop || "Nach oben"}</span>
      </button>

      {/* Options-Sheet: geteilt mit den Kategorie-Seiten. Aufgaben und Termine
          bekommen oben die Status-Kacheln, Termine zusätzlich den
          Geburtstags-Schalter. */}
      {showOptions && (
        <CatOptionsSheet
          t={t}
          cat={entry}
          onUpdate={onUpdate}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onClose={() => setShowOptions(false)}
          extraItems={
            <>
              {entry.type === "task" && (
                <button
                  className="settings-sheet__item"
                  onClick={() => applyStatus(status === "done" ? null : "done")}
                >
                  <CheckCircle2 size={18} color={status === "done" ? "#0B8CE9" : "#8a8a96"} />
                  <span>{status === "done" ? t.actionReopen || "Wieder öffnen" : t.markDone || "Erledigt"}</span>
                </button>
              )}
              {entry.type === "calendar" && (
                <button
                  className="settings-sheet__item"
                  onClick={() => { onUpdate({ isBirthday: !entry.isBirthday }); setShowOptions(false); }}
                >
                  <Calendar size={18} color={entry.isBirthday ? "#F59E0B" : "#8a8a96"} />
                  <span>{entry.isBirthday ? t.unsetBirthday : t.setBirthday}</span>
                </button>
              )}
            </>
          }
        />
      )}

      {collabOpen && (
        <CollaboratorsModal
          t={t}
          cat={entry}
          onUpdateCat={(_id, patch) => onUpdate(patch)}
          onClose={() => setCollabOpen(false)}
          initialView={collaborators.length === 0 ? "add" : "list"}
        />
      )}

      {linkSheetOpen && (
        <LinkSheet
          t={t}
          CC={CC}
          cats={allCats}
          currentIds={entry.catIds || []}
          onConfirm={(nextIds) => {
            onUpdate({ catIds: nextIds, catId: nextIds[0] || null });
            setLinkSheetOpen(false);
          }}
          onClose={() => setLinkSheetOpen(false)}
        />
      )}

      {tagSheetOpen && (
        <TagSheet
          t={t}
          tags={tags}
          currentTags={entry.tags || []}
          onConfirm={(nextTags) => {
            onUpdate({ tags: nextTags });
            setTagSheetOpen(false);
          }}
          onClose={() => setTagSheetOpen(false)}
        />
      )}

      {/* Terminierung: EIN kombiniertes Frosted-Glass-Sheet (Datum/Uhrzeit) */}
      {picker && (
        <SchedulePickerSheet
          t={t}
          date={schedDate}
          time={entry.time || null}
          accent={`rgb(${accentRgb})`}
          initialTab={picker}
          onChangeDate={(d) => onUpdate(entry.type === "task" ? { due: d } : { date: d })}
          onChangeTime={(v) => onUpdate({ time: v })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
