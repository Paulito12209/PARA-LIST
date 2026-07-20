import React, { useState, useRef, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, Palette, Camera, Info, Send, MoreHorizontal, UserPlus, Pin, PinOff, AlertTriangle } from 'lucide-react';
import { TODAY, fmtDate, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, hexToRgbString } from "../utils";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { AutoScrollText } from "../components/AutoScrollText";
import { TagIcon, ArchiveIcon, BookmarkIcon, GitMergeBranchIcon } from "../components/AppIcons";
import { DetailsBody } from "../components/DetailsPopup";
import { FlashcardInfoSheet } from "../components/FlashcardInfoSheet";
import { DetailDock, DetailIconBar } from "../components/DetailDock";
import { DetailMetaRow, DetailViewSelect } from "../components/TaskSubtabControls";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "../components/EntryLists";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { ConnSheet, TagSheet, ResLinkSheet, MediaTypeSheet } from "../components/PillSheets";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { CanvasEditor } from "../components/CanvasEditor";

export function CatListScreen({ type, cats, onOpen, onAdd, onBack, onOpenArchive, t, CC }) {
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="cat-list">
      <div className="cat-list__header">
        <CatIcon size={22} color={cfg.color} />
        <h2 className="cat-list__title">{cfg.label}</h2>
        <button 
          className="cat-list__archive-btn" 
          onClick={() => onOpenArchive(type)}
        >
          <ArchiveIcon size={18} color="#9CA3AF" />
        </button>
      </div>

      <div className="cat-list__body">
        {cats.length === 0 ? (
          <div className="cat-list__empty">
            {t.noCats(cfg.label).split("\n")[0]}
            <br />
            {t.noCats(cfg.label).split("\n")[1]}
          </div>
        ) : (
          cats.map((cat) => (
            <button
              key={cat.id}
              className="cat-list__item"
              onClick={() => onOpen(cat)}
            >
              <div
                className="cat-list__item-icon"
                style={{ background: cfg.color + "22" }}
              >
                <CatIcon size={18} color={cfg.color} />
              </div>
              <div className="cat-list__item-info">
                <div className="cat-list__item-name"><AutoScrollText>{cat.name}</AutoScrollText></div>
                {cat.date && (
                  <div className="cat-list__item-date">{fmtDate(cat.date, t.locale)}</div>
                )}
              </div>
              <ChevronLeft
                size={16}
                color="#8a8a96"
                style={{ transform: "rotate(180deg)" }}
              />
            </button>
          ))
        )}
      </div>

      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        <button
          className="nav-bottom__add"
          onClick={onAdd}
          style={{
            background: cfg.color,
            boxShadow: `0 8px 24px ${cfg.color}55`,
          }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}


const CAT_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
};

const SUB_TAB_SWIPE_THRESHOLD_PX = 60;
// Reihenfolge der Lesezeichen für den seitlichen Wisch-Wechsel (wie Iconbar)
const BM_ORDER = BOOKMARKS.filter((b) => b.id !== "tags").map((b) => b.id);

export function CatDetailScreen({
  t,
  CC,
  theme,
  lang,
  cat,
  user,
  allCats,
  entries,
  onUpdate,
  onTogglePin,
  onDelete,
  onHome,
  toggleTask,
  deleteEntry,
  onAddEntry,
  onQuickAddEntry,
  onLinkResource,
  onAddMediaEntry,
  onOpenCat,
  onOpenEntry,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  flashcardDeckId,
  flashcardLang,
  flashcardCards,
  onOpenFlashcards,
  menuTick = 0,
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  const [bm, setBm] = useState("canvas");
  const [tagSort, setTagSort] = useState({ by: 'date', desc: true });
  const [showDate, setShowDate] = useState(false);
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  // Bottom-Sheets des Aktions-Buttons im Medien-Lesezeichen:
  // Ressourcen verknüpfen (Sub-Tab "Ressourcen") / Medienart wählen ("Medien").
  const [showResLinkSheet, setShowResLinkSheet] = useState(false);
  const [showMediaTypeSheet, setShowMediaTypeSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showFcInfo, setShowFcInfo] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const collaborators = cat.collaborators || [];

  // Flashcard-Ressource = hat ein verknüpftes Deck. Diese Seiten sind nicht
  // frei editierbar; der Canvas zeigt stattdessen einen Hinweis + Info-Sheet.
  const isFlashcardRes = !!flashcardDeckId;

  // Cover-Akzent berechnen
  const catAccentRgb = cat.coverColor
    ? hexToRgbString(cat.coverColor) || CAT_ACCENT_RGB[safeType] || "88, 88, 160"
    : CAT_ACCENT_RGB[safeType] || "88, 88, 160";
  const hasCoverImg = !!cat.coverImage;

  // Medien-Upload über das Plus im Medien-Lesezeichen: das Sheet wählt die
  // Medienart, danach öffnet der versteckte File-Input mit passendem accept.
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

  // Sub-Tab für das Ressource-Lesezeichen (standardmäßig "resources")
  const [resSubTab, setResSubTab] = useState("resources");
  const [taskSubTab, setTaskSubTab] = useState("open");
  // Sortierung der Aufgabenliste (Erstellungsdatum neueste zuerst = Default)
  const [taskSort, setTaskSort] = useState({ by: "date", desc: true });
  // Sortierung + Typ-Filter für das Ressourcen-/Medien-Lesezeichen
  const [mediaSort, setMediaSort] = useState({ by: "date", desc: true });
  const [mediaFilter, setMediaFilter] = useState("all");

  // Refs für Click-Outside-Erkennung (nur noch Datums-Picker)
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);


  const related = allCats.find(c => c.id === cat.relatedId);
  const relatedCfg = related && CC[related.type] ? CC[related.type] : null;
  const connOptions = allCats.filter(c => {
    if (c.id === cat.id) return false;
    if (cat.type === "project") return c.type === "area";
    if (cat.type === "area") return c.type === "project";
    return c.type === "project" || c.type === "area";
  });
  // Verknüpfte Ressourcen berechnen (Ressourcen, deren relatedId auf dieses Element zeigt)
  const linkedResources = allCats.filter(c => c.type === 'resource' && c.relatedId === cat.id);
  const resCount = linkedResources.length;
  const ResIcon = CAT_ICONS.resource;

  // createdAt kann Zahl (Einträge: Date.now) oder ISO-String (Kategorien) sein.
  const getTs = (x) =>
    typeof x?.createdAt === "number"
      ? x.createdAt
      : x?.createdAt
        ? Date.parse(x.createdAt) || 0
        : 0;
  // Generischer Sortierer für eine {by,desc}-Konfiguration; `nameKey` = Feld
  // für die alphabetische Sortierung (Aufgaben/Medien: title, Ressourcen: name).
  const makeSorter = (cfg, nameKey) => (list) =>
    [...list].sort((a, b) => {
      if (cfg.by === "date") {
        return cfg.desc ? getTs(b) - getTs(a) : getTs(a) - getTs(b);
      }
      const cmp = (a[nameKey] || "").localeCompare(b[nameKey] || "");
      return cfg.desc ? -cmp : cmp;
    });

  // Aufgaben nach Sub-Tab (offen/erledigt), sortiert nach taskSort.
  const sortTasks = makeSorter(taskSort, "title");
  const openTasks = sortTasks(entries.filter((e) => e.type === "task" && !e.done));
  const doneTasks = sortTasks(entries.filter((e) => e.type === "task" && e.done));

  // Ressourcen (Kategorien) + Medien (Einträge) für das Medien-Lesezeichen.
  const sortedResources = makeSorter(mediaSort, "name")(linkedResources);
  const allMediaEntries = entries.filter((e) => e.type === "media");
  const filteredMedia =
    mediaFilter === "all" ? allMediaEntries : allMediaEntries.filter((e) => e.mediaType === mediaFilter);
  const sortedMedia = makeSorter(mediaSort, "title")(filteredMedia);
  // Lesezeichen (Links) als chronologischer Feed – neueste zuerst.
  const sortedLinks = [...entries.filter((e) => e.type === "link")].sort(
    (a, b) => getTs(b) - getTs(a)
  );
  // Filter-Optionen für Medien (Reihenfolge: Dokumente, Bilder, Videos, Audios).
  const mediaFilterOptions = [
    { id: "all", label: t.filterAll || "Alle" },
    { id: "document", label: t.documents || "Dokumente" },
    { id: "image", label: t.images || "Bilder" },
    { id: "video", label: t.videos || "Videos" },
    { id: "audio", label: t.audios || "Audios" },
  ];

  // Verknüpfung & Tags öffnen Bottom-Sheets (eigenes Backdrop) – Click-Outside
  // wird nur noch für den Datums-Picker gebraucht.
  const handleClickOutside = useCallback((e) => {
    // Datum-Picker schließen
    if (showDate &&
        dateInputRef.current && !dateInputRef.current.contains(e.target) &&
        datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
  }, [showDate]);

  // Event-Listener für Click-Outside
  // (useRef + useCallback statt useEffect, da wir den Handler auf dem cat-detail div setzen)

  // Lesezeichen-Auswahl: alle Lesezeichen (inkl. "details") wechseln nur den
  // Inhaltsbereich. Die Einstellungen liegen jetzt auf dem Zahnrad-Button unten
  // rechts (nicht mehr auf einem Lesezeichen).
  const handleBmSelect = useCallback((id) => {
    setBm(id);
  }, []);

  // Drei-Punkte-Menü oben rechts im Command-Panel-Header: jeder Klick erhöht
  // `menuTick` in App → Sheet öffnen. Render-Phase-Update mit Vergleichs-
  // State, damit der beim Mount vorhandene Zählerstand das Sheet nicht
  // sofort aufreißt (Pattern "adjusting state when props change").
  const [prevMenuTick, setPrevMenuTick] = useState(menuTick);
  if (menuTick !== prevMenuTick) {
    setPrevMenuTick(menuTick);
    setShowSettingsSheet(true);
  }

  // Mapping: Bookmark → Entry-Typ (inkl. Sub-Tab bei Ressource)
  const getEntryTypeFromBookmark = useCallback(() => {
    const map = {
      canvas: "note",
      tasks: "task",
      notes: "note",
      cal: "calendar",
      media: "media",
      link: "link",
      tags: "tags",
    };
    return map[bm] || "note";
  }, [bm]);

  // Mapping: Entry-Typ → FAB-Farbe
  const getFabColor = useCallback(() => {
    const entryType = getEntryTypeFromBookmark();
    const colorMap = {
      note: "#F59E0B",
      task: "#0B8CE9",
      calendar: "#0078D4",
      media: "#10B981",
      link: "#7C3AED",
      tags: "#EC4899",
    };
    return colorMap[entryType] || cfg.color;
  }, [getEntryTypeFromBookmark, cfg.color]);

  const createEntryFromBookmark = useCallback(() => {
    if (bm === "tags") {
      const name = window.prompt("Neues Tag (Label) erstellen:");
      if (name && name.trim()) {
        onCreateTag(name.trim());
      }
      return;
    }
    onAddEntry(getEntryTypeFromBookmark());
  }, [getEntryTypeFromBookmark, bm, onAddEntry, onCreateTag]);

  // Seitliches Wischen (Body + Iconbar): wechselt zwischen den Lesezeichen
  // der Iconbar – rechts→links = nächstes, links→rechts = vorheriges. Sub-Tabs
  // (Offen/Erledigt, Ressourcen/Medien) werden bewusst NICHT per Wisch
  // gewechselt, sondern ausschließlich über die Auswahl-Pille.
  const bmTouch = useRef({ x: 0, y: 0, skip: false });
  const onBmTouchStart = useCallback((e) => {
    bmTouch.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      // Wisch-Gesten auf Einträgen (Löschen/Erledigen) nicht als
      // Lesezeichen-Wechsel deuten. Textareas (Canvas!) wischen mit.
      skip: !!e.target.closest?.(".swipe-delete-wrapper"),
    };
  }, []);
  const onBmTouchEnd = useCallback((e) => {
    if (bmTouch.current.skip) return;
    const dx = e.changedTouches[0].clientX - bmTouch.current.x;
    const dy = e.changedTouches[0].clientY - bmTouch.current.y;
    // Nur klar horizontale Wische zählen (kein Scrollen)
    if (Math.abs(dx) <= SUB_TAB_SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    setBm((prev) => {
      const idx = BM_ORDER.indexOf(prev);
      if (idx === -1) return prev;
      const next = dx > 0 ? Math.max(0, idx - 1) : Math.min(BM_ORDER.length - 1, idx + 1);
      if (BM_ORDER[next] !== prev) navigator.vibrate?.(10);
      return BM_ORDER[next];
    });
  }, []);

  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(
    (e) => {
      const isEmptyPlaceholder = e.target.closest('.cat-detail__empty') || e.target.closest('.cat-detail__section-empty') || e.target.closest('.entry-list__empty');
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        createEntryFromBookmark();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [createEntryFromBookmark]
  );

  return (
    <div
      className={`cat-detail ${hasCoverImg ? "cat-detail--has-cover" : ""}`}
      onClick={handleClickOutside}
      style={{ "--entry-accent-rgb": catAccentRgb }}
    >
      {/* Header */}
      <div className="cat-detail__header">

        {/* Cover-Bild + Lichtwelle — nur innerhalb des Headers */}
        {hasCoverImg && (
          <>
            <img className="cat-detail__cover-bg" src={cat.coverImage} alt="" />
            <div className="cat-detail__cover-wave" />
          </>
        )}

        <div className="cat-detail__header-pattern" />
        {/* Titelzeile bleibt im Layout (Header-Höhe unverändert), wird aber
            ausgeblendet – der Seitentitel steht jetzt oben im Command-Panel. */}
        <div className="cat-detail__title-row cat-detail__title-row--hidden" aria-hidden="true">
          <CatIcon size={18} color={cfg.color} />
          <input
            className="cat-detail__title-input"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Titel..."
            tabIndex={-1}
          />
        </div>

        {/* Kollaboratoren sind aus dem Header ins Details-Popup gewandert –
            die Pillen rücken dadurch nach oben. */}
        <div className="cat-detail__pills">
          <div className="cat-detail__pills-group">
          {(cat.type === "resource" || cat.type === "area") && cat.createdAt && (
            <div className="cat-detail__date-pill cat-detail__date-pill--static">
              {fmtDate(cat.createdAt.split("T")[0], t.locale)}
            </div>
          )}
            {cat.type === "project" && (
              <button
                ref={datePillRef}
                className="cat-detail__date-pill"
                onClick={(e) => { e.stopPropagation(); setShowDate((v) => !v); }}
                style={{ gap: "6px" }}
              >
                <Calendar size={14} />
                {cat.date ? fmtDate(cat.date, t.locale) : t.addDate}
              </button>
            )}

          <button
            className="cat-detail__date-pill"
            onClick={(e) => { e.stopPropagation(); setShowConnSelect(true); setShowDate(false); }}
            style={
              relatedCfg
                ? {
                    // Körper bleibt weiß (via CSS), nur der Inhalt trägt die
                    // Verknüpfungsfarbe.
                    color: relatedCfg.color,
                  }
                : {}
            }
          >
            {related ? related.name : (cat.type === 'project' ? t.connectArea : cat.type === 'area' ? t.connectProject : t.connectSelection)}
          </button>

          {resCount > 0 && (cat.type === 'project' || cat.type === 'area') && (
            <div
              className="cat-detail__res-count"
              style={{ color: CC.resource.color }}
            >
              <ResIcon size={12} strokeWidth={2.5} />
              <span>{resCount}</span>
            </div>
          )}

          <div
            style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); setShowTagSelect(true); setShowDate(false); }}
          >
            {(() => {
              const selectedTags = cat.tags || [];
              if (selectedTags.length === 0) return null;
              if (selectedTags.length === 1) {
                return (
                  <span className="cat-detail__tag">
                    {selectedTags[0]}
                  </span>
                );
              }
              return (
                <span className="cat-detail__tag">
                  {selectedTags[0]} +{selectedTags.length - 1}
                </span>
              );
            })()}
            {(!cat.tags || cat.tags.length === 0) && (
              <span className="cat-detail__tag" style={{ background: "transparent", border: "1px dashed #8a8a9666", opacity: 0.8 }}>
                {t.addTag || "+ Tag"}
              </span>
            )}
          </div>
          </div>

          <div className="cat-detail__archive-placeholder" style={{ flex: 1 }} />
        </div>
        {showDate && (
          <input
            ref={dateInputRef}
            type="date"
            className="cat-detail__date-input"
            value={cat.date || ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              onUpdate({ date: e.target.value });
              setShowDate(false);
            }}
          />
        )}

        {/* Schmale Lesezeichen-Leiste: Teil des 160px-Headers – transparent,
            damit dessen Farbverlauf durchscheint. */}
        <DetailIconBar
          active={bm}
          onSelect={handleBmSelect}
          iconOverrides={{ canvas: CatIcon }}
          iconColors={{ canvas: cfg.color }}
          onTouchStart={onBmTouchStart}
          onTouchEnd={onBmTouchEnd}
        />
      </div>

      {/* Content – seitliches Wischen wechselt das aktive Lesezeichen */}
      <div
        className="cat-detail__body"
        onClick={handleDoubleTap}
        onTouchStart={onBmTouchStart}
        onTouchEnd={onBmTouchEnd}
      >
        {bm === "canvas" && (
          isFlashcardRes ? (
            <div className="fc-table">
              <div className="fc-table__top">
                <button
                  className="cat-detail__info-btn"
                  onClick={() => setShowFcInfo(true)}
                  aria-label={t.fc?.infoTitle}
                >
                  <AlertTriangle size={16} />
                </button>
                <span className="fc-table__hint">{t.fc?.pageNotEditable}</span>
              </div>
              {(() => {
                // Gespeicherte Übersetzungen (Notizen, neueste zuerst), Format
                // "Deutsch ↔ Übersetzung".
                const noteRows = entries
                  .filter((e) => e.type === "note")
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((e) => {
                    const parts = (e.title || "").split(" ↔ ");
                    return { key: e.id, left: parts[0] || e.title, right: parts.slice(1).join(" ↔ ") };
                  });
                // Deck-Vokabeln (front = Fremdsprache, back = Deutsch).
                const deckRows = (flashcardCards || []).map((c) => ({
                  key: c.id, left: c.back, right: c.front,
                }));
                const rows = [...noteRows, ...deckRows];
                if (rows.length === 0) {
                  return <div className="fc-table__empty">{t.fc?.emptyWords}</div>;
                }
                return (
                  <div className="fc-table__list">
                    {rows.map((r) => (
                      <div key={r.key} className="fc-table__row">
                        <span className="fc-table__cell fc-table__cell--front">{r.left}</span>
                        <span className="fc-table__sep">↔</span>
                        <span className="fc-table__cell fc-table__cell--back">{r.right}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <CanvasEditor
              value={cat.body || ""}
              onChange={(body) => onUpdate({ body })}
              placeholder={t.writeThoughts}
            />
          )
        )}
        {bm === "tasks" && (
          <div className="cat-detail__subtab-pane">
            {/* Anzahl links · Sortier-Icon rechts (Auswahl Offen/Erledigt liegt
                als Pille unten über dem Dock) */}
            <DetailMetaRow
              t={t}
              count={taskSubTab === "completed" ? doneTasks.length : openTasks.length}
              tone={taskSubTab === "completed" ? "done" : undefined}
              sort={taskSort}
              onChangeSort={setTaskSort}
            />

            {taskSubTab === "open" && (
              openTasks.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noTasks}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={openTasks}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
            {taskSubTab === "completed" && (
              doneTasks.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noCompletedTasks || "Keine erledigten Aufgaben"}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={doneTasks}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
          </div>
        )}
        {bm === "cal" &&
          (entries.filter((e) => e.type === "calendar").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noCal}</div>
          ) : (
            <CalList t={t} CC={CC} lang={lang}
              entries={entries.filter((e) => e.type === "calendar")}
              cats={allCats}
              onDelete={deleteEntry}
              onOpenEntry={onOpenEntry}
            />
          ))}
        {bm === "notes" && (
          entries.filter((e) => e.type === "note").length === 0 ? (
            <div className="cat-detail__section-empty">{t.notes}: {t.noMedia}</div>
          ) : (
            <NoteList t={t} CC={CC}
              entries={entries.filter((e) => e.type === "note")}
              cats={allCats}
              onDelete={deleteEntry}
              onOpenEntry={onOpenEntry}
            />
          )
        )}

        {bm === "media" && (
          <div className="cat-detail__subtab-pane">
            {/* Anzahl links · (nur Medien:) Filter + Sortier-Icon rechts.
                Auswahl Ressourcen/Medien liegt als Pille unten über dem Dock. */}
            <DetailMetaRow
              t={t}
              count={resSubTab === "media" ? sortedMedia.length : sortedResources.length}
              sort={mediaSort}
              onChangeSort={setMediaSort}
              filterValue={resSubTab === "media" ? mediaFilter : undefined}
              filterOptions={resSubTab === "media" ? mediaFilterOptions : undefined}
              onChangeFilter={setMediaFilter}
            />

            {/* Verknüpfte Ressourcen-Ansicht */}
            {resSubTab === "resources" && (
              sortedResources.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noLinkedRes}</div>
              ) : (
                sortedResources.map((res) => (
                  <button
                    key={res.id}
                    className="cat-list__item"
                    onClick={() => onOpenCat && onOpenCat(res)}
                  >
                    <div
                      className="cat-list__item-icon"
                      style={{ background: CC.resource.color + "22" }}
                    >
                      <Square size={18} color={CC.resource.color} />
                    </div>
                    <div className="cat-list__item-info">
                      <div className="cat-list__item-name"><AutoScrollText>{res.name}</AutoScrollText></div>
                    </div>
                    <ChevronLeft
                      size={16}
                      color="#8a8a96"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </button>
                ))
              )
            )}

            {/* Medien-Ansicht */}
            {resSubTab === "media" && (
              sortedMedia.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noMedia}</div>
              ) : (
                <MediaList t={t} CC={CC}
                  entries={sortedMedia}
                  cats={allCats}
                  onDelete={deleteEntry}
                />
              )
            )}
          </div>
        )}
        {bm === "link" &&
          (sortedLinks.length === 0 ? (
            <div className="cat-detail__section-empty">{t.noLink}</div>
          ) : (
            <LinkList t={t} CC={CC}
              entries={sortedLinks}
              cats={allCats}
              onDelete={deleteEntry}
            />
          ))}
        {bm === "tags" && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="res-sub-tabs" style={{ marginBottom: "8px" }}>
              <button
                className={`res-sub-tabs__btn ${tagSort.by === 'date' ? 'res-sub-tabs__btn--active-res' : ''}`}
                onClick={() => setTagSort(prev => ({ by: 'date', desc: prev.by === 'date' ? !prev.desc : true }))}
              >
                <span>{t.creationDate || "Erstellungsdatum"}</span>
                {tagSort.by === 'date' && (tagSort.desc ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
              </button>
              <button
                className={`res-sub-tabs__btn ${tagSort.by === 'alpha' ? 'res-sub-tabs__btn--active-res' : ''}`}
                onClick={() => setTagSort(prev => ({ by: 'alpha', desc: prev.by === 'alpha' ? !prev.desc : false }))}
              >
                <span>{t.alphabetical || "Alphabetisch"}</span>
                {tagSort.by === 'alpha' && (tagSort.desc ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
              </button>
            </div>
            {(() => {
              const sortedTags = [...(tags || [])].sort((a, b) => {
                if (tagSort.by === 'date') {
                  const da = new Date(a.createdAt || 0).getTime();
                  const db = new Date(b.createdAt || 0).getTime();
                  return tagSort.desc ? db - da : da - db;
                } else {
                  const cmp = a.name.localeCompare(b.name);
                  return tagSort.desc ? -cmp : cmp;
                }
              });
              if (sortedTags.length === 0) {
                return <div className="cat-detail__section-empty">{t.noTags || "Keine Tags vorhanden"}</div>;
              }
              return (
                <div className="tag-list" style={{ overflowY: 'auto' }}>
                  {sortedTags.map(tag => (
                    <div key={tag.id} className="media-item">
                      <div className="media-item__icon" style={{ background: "#EC489922", color: "#EC4899" }}>
                        <TagIcon size={18} />
                      </div>
                      <div className="media-item__body">
                        <input 
                          className="media-item__title media-item__title--input" 
                          value={tag.name}
                          onChange={(e) => onUpdateTag(tag.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          placeholder={t.tagNamePlaceholder || "..."}
                        />
                        {tag.createdAt && <div className="media-item__meta">{fmtDate(tag.createdAt.split("T")[0], t.locale)}</div>}
                      </div>
                      <button className="media-item__delete" onClick={() => {
                        if (window.confirm(t.confirmDelete(tag.name))) {
                          onDeleteTag(tag.id);
                        }
                      }}>
                        <Trash2 size={14} color="#F26565" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Details-Lesezeichen: Metadaten + Kollaboratoren inline im Canvas
            (ersetzt das frühere Popup am Info-Button) */}
        {bm === "details" && (
          <DetailsBody
            t={t}
            item={cat}
            user={user}
            collaborators={collaborators}
            onAddCollaborator={() => setCollabOpen(true)}
          />
        )}
      </div>

      {showFcInfo && (
        <FlashcardInfoSheet
          t={t}
          langName={flashcardLang || cat.name}
          onOpenFlashcards={() => { setShowFcInfo(false); onOpenFlashcards?.(flashcardDeckId); }}
          onClose={() => setShowFcInfo(false)}
        />
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

      {/* Verknüpfungs-Sheet (ersetzt das frühere Popup an der Pille) */}
      {showConnSelect && (
        <ConnSheet
          t={t}
          CC={CC}
          options={connOptions}
          currentId={cat.relatedId || null}
          onSelect={(id) => {
            onUpdate({ relatedId: id });
            setShowConnSelect(false);
          }}
          onClose={() => setShowConnSelect(false)}
        />
      )}

      {/* Tag-Sheet (ersetzt das frühere Popup an der "+ Tag"-Pille) */}
      {showTagSelect && (
        <TagSheet
          t={t}
          tags={tags}
          currentTags={cat.tags || []}
          onConfirm={(nextTags) => {
            onUpdate({ tags: nextTags });
            setShowTagSelect(false);
          }}
          onClose={() => setShowTagSelect(false)}
        />
      )}

      {/* Options-Sheet der Seite (Drei-Punkte im Header): Cover-Design +
          Favorit/Anpinnen/Archivieren/Löschen – geteilte Komponente. */}
      {showSettingsSheet && (
        <CatOptionsSheet
          t={t}
          cat={cat}
          onUpdate={onUpdate}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onClose={() => setShowSettingsSheet(false)}
        />
      )}

      {/* Aufgaben-Ansicht: Offen/Erledigt-Auswahl als schwebende Frosted-Glass-
          Pille auf Höhe des Home-Buttons. */}
      {bm === "tasks" && (
        <DetailViewSelect
          t={t}
          value={taskSubTab}
          onChange={setTaskSubTab}
          options={[
            { id: "open", label: t.open || "Offen", count: openTasks.length },
            { id: "completed", label: t.markDone || "Erledigt", count: doneTasks.length, tone: "done" },
          ]}
        />
      )}

      {/* Medien-Lesezeichen: Ressourcen/Medien-Auswahl als schwebende Pille. */}
      {bm === "media" && (
        <DetailViewSelect
          t={t}
          value={resSubTab}
          onChange={setResSubTab}
          options={[
            { id: "resources", label: t.linkedRes, count: sortedResources.length },
            { id: "media", label: t.mediaTab, count: allMediaEntries.length },
          ]}
        />
      )}

      {/* Versteckter File-Input für den Medien-Upload (accept wird beim
          Öffnen vom gewählten Medientyp gesetzt). */}
      <input
        ref={mediaInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleMediaFileChange}
      />

      {/* Unten: schwebender Home-Button links (alle Lesezeichen) + Aktions-
          Button rechts in der Lesezeichen-Farbe. Kein Eingabefeld-Dock mehr.
          Canvas & Details haben keine Aktion; im Medien-Lesezeichen hängt sie
          vom Sub-Tab ab: Ressourcen verknüpfen bzw. Medien hochladen. */}
      <DetailDock
        t={t}
        onHome={onHome}
        action={(() => {
          if (bm === "canvas" || bm === "details") return null;
          if (bm === "media") {
            return resSubTab === "resources"
              ? {
                  Icon: GitMergeBranchIcon,
                  color: CC.resource.color,
                  label: t.linkResSheetTitle || "Ressourcen verknüpfen",
                  onClick: () => setShowResLinkSheet(true),
                }
              : {
                  Icon: Plus,
                  color: getFabColor(),
                  label: t.addMediaSheetTitle || "Medien hinzufügen",
                  onClick: () => setShowMediaTypeSheet(true),
                };
          }
          return {
            Icon: Plus,
            color: getFabColor(),
            label: t.addPlaceholder(
              bm === "cal" ? (t.calSing || t.calendar)
                : bm === "notes" ? (t.noteSing || t.notes)
                : bm === "link" ? (t.link || "")
                : t.task
            ),
            onClick: createEntryFromBookmark,
          };
        })()}
      />

      {/* Ressourcen-Verknüpfungs-Sheet: Mehrfachauswahl aller Ressourcen;
          Bestätigen verknüpft neue und löst abgewählte (relatedId). */}
      {showResLinkSheet && (
        <ResLinkSheet
          t={t}
          CC={CC}
          options={allCats.filter((c) => c.type === "resource" && c.id !== cat.id && !c.archived)}
          linkedIds={linkedResources.map((r) => r.id)}
          onConfirm={(nextIds) => {
            const next = new Set(nextIds);
            const prev = new Set(linkedResources.map((r) => r.id));
            next.forEach((id) => { if (!prev.has(id)) onLinkResource?.(id, true); });
            prev.forEach((id) => { if (!next.has(id)) onLinkResource?.(id, false); });
            setShowResLinkSheet(false);
          }}
          onClose={() => setShowResLinkSheet(false)}
        />
      )}

      {/* Medienart-Sheet: Dokumente / Bilder / Videos / Audio → Datei-Dialog */}
      {showMediaTypeSheet && (
        <MediaTypeSheet
          t={t}
          onPick={handleMediaTypePick}
          onClose={() => setShowMediaTypeSheet(false)}
        />
      )}
    </div>
  );
}


