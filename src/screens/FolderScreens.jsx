import React, { useState, useRef, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, Palette, Camera, Info, Send, MoreHorizontal, UserPlus, Pin, PinOff } from 'lucide-react';
import { TODAY, fmtDate, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS } from "../utils";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { AutoScrollText } from "../components/AutoScrollText";
import { TagIcon, ArchiveIcon, BookmarkIcon } from "../components/AppIcons";
import { DetailsBody } from "../components/DetailsPopup";
import { FlashcardInfoSheet } from "../components/FlashcardInfoSheet";
import { DetailDock, DetailIconBar } from "../components/DetailDock";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "../components/EntryLists";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { ConnSheet, TagSheet } from "../components/PillSheets";
import { useSheetSwipeClose } from "../components/useSheetSwipeClose";

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
                color="#5858A0"
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

const COVER_COLORS = [
  { hex: "#30A060", rgb: "48, 160, 96",   label: "resource" },
  { hex: "#D09020", rgb: "208, 144, 32",  label: "area" },
  { hex: "#F59E0B", rgb: "245, 158, 11",  label: "note" },
  { hex: "#0078D4", rgb: "0, 120, 212",   label: "calendar" },
  { hex: "#0B8CE9", rgb: "11, 140, 233",  label: "task" },
  { hex: "#E03E3E", rgb: "224, 62, 62",   label: "project" },
  { hex: "#5858A0", rgb: "88, 88, 160",   label: "archive" },
];

const RES_SUB_TAB_ORDER = ["resources", "media"];
const TASK_SUB_TAB_ORDER = ["open", "completed"];
const SUB_TAB_SWIPE_THRESHOLD_PX = 60;

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
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [coverMode, setCoverMode] = useState(null);
  const [showFcInfo, setShowFcInfo] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const collaborators = cat.collaborators || [];

  // Flashcard-Ressource = hat ein verknüpftes Deck. Diese Seiten sind nicht
  // frei editierbar; der Canvas zeigt stattdessen einen Hinweis + Info-Sheet.
  const isFlashcardRes = !!flashcardDeckId;

  // Cover-Akzent berechnen
  const catAccentRgb = cat.coverColor
    ? COVER_COLORS.find(c => c.hex === cat.coverColor)?.rgb || CAT_ACCENT_RGB[safeType] || "88, 88, 160"
    : CAT_ACCENT_RGB[safeType] || "88, 88, 160";
  const hasCoverImg = !!cat.coverImage;

  // Refs für Cover-Upload
  const coverInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Sub-Tab für das Ressource-Lesezeichen (standardmäßig "resources")
  const [resSubTab, setResSubTab] = useState("resources");
  const [taskSubTab, setTaskSubTab] = useState("open");

  // Refs für Click-Outside-Erkennung (nur noch Datums-Picker)
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);

  // Swipe-Refs für Sub-Tab-Wechsel (wiederverwendbar)
  const subTabTouchX = useRef(0);

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

  // Anzahl der Notizen und Medien für Sub-Tab-Badges
  const noteCount = entries.filter(e => e.type === "note").length;
  const mediaCount = entries.filter(e => e.type === "media").length;

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

  const closeSettingsSheet = useCallback(() => {
    setShowSettingsSheet(false);
    setCoverMode(null);
  }, []);

  // Wisch-nach-unten zum Schließen des Settings-Sheets
  const settingsSwipe = useSheetSwipeClose(closeSettingsSheet);

  const handleCoverUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdate({ coverImage: reader.result });
      closeSettingsSheet();
    };
    reader.readAsDataURL(file);
  }, [onUpdate, closeSettingsSheet]);

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

  // Swipe-Handler für Sub-Tab-Wechsel (3 Tabs bei Projekt/Bereich/Ressource)
  const onSubTabTouchStart = useCallback((e) => {
    subTabTouchX.current = e.touches[0].clientX;
  }, []);
  const onSubTabTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - subTabTouchX.current;
    if (Math.abs(dx) <= SUB_TAB_SWIPE_THRESHOLD_PX) return;

    const stepInOrder = (order, prev) => {
      const idx = order.indexOf(prev);
      // dx > 0 → Swipe rechts → vorheriger Tab; dx < 0 → nächster Tab
      return dx > 0
        ? order[Math.max(0, idx - 1)]
        : order[Math.min(order.length - 1, idx + 1)];
    };

    if (bm === "media") setResSubTab((prev) => stepInOrder(RES_SUB_TAB_ORDER, prev));
    else if (bm === "tasks") setTaskSubTab((prev) => stepInOrder(TASK_SUB_TAB_ORDER, prev));
  }, [bm]);

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
                    background: relatedCfg.color + "20",
                    borderColor: "transparent",
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
              style={{ 
                background: CC.resource.color + "18", 
                borderColor: CC.resource.color + "45",
                color: CC.resource.color 
              }}
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
              <span className="cat-detail__tag" style={{ background: "transparent", border: "1px dashed #5858A066", opacity: 0.8 }}>
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
        />
      </div>

      {/* Content */}
      <div className="cat-detail__body" onClick={handleDoubleTap}>
        {bm === "canvas" && (
          isFlashcardRes ? (
            <div className="fc-table">
              <div className="fc-table__top">
                <button
                  className="cat-detail__info-btn"
                  onClick={() => setShowFcInfo(true)}
                  aria-label={t.fc?.infoTitle}
                >
                  <Info size={16} />
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
            <textarea
              className="cat-detail__textarea"
              value={cat.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder={t.writeThoughts}
            />
          )
        )}
        {bm === "tasks" && (
          <div
            onTouchStart={onSubTabTouchStart}
            onTouchEnd={onSubTabTouchEnd}
            style={{ flex: 1 }}
          >
            {/* Sub-Tab-Leiste: Offen / Erledigt */}
            <div className="res-sub-tabs">
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "open" ? "res-sub-tabs__btn--active-open" : ""}`}
                onClick={() => setTaskSubTab("open")}
              >
                <span>{t.open || "Offen"}</span>
                {entries.filter((e) => e.type === "task" && !e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--open">{entries.filter((e) => e.type === "task" && !e.done).length}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "completed" ? "res-sub-tabs__btn--active-completed" : ""}`}
                onClick={() => setTaskSubTab("completed")}
              >
                <span>{t.markDone || "Erledigt"}</span>
                {entries.filter((e) => e.type === "task" && e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--completed">{entries.filter((e) => e.type === "task" && e.done).length}</span>
                )}
              </button>
            </div>

            {/* Task-Listen basierend auf Sub-Tab */}
            {taskSubTab === "open" && (
              entries.filter((e) => e.type === "task" && !e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noTasks}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={entries.filter((e) => e.type === "task" && !e.done)}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
            {taskSubTab === "completed" && (
              entries.filter((e) => e.type === "task" && e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noCompletedTasks || "Keine erledigten Aufgaben"}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={entries.filter((e) => e.type === "task" && e.done)}
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
          <div
            onTouchStart={onSubTabTouchStart}
            onTouchEnd={onSubTabTouchEnd}
            style={{ flex: 1 }}
          >
            {/* Sub-Tab-Leiste: Ressourcen / Notizen / Medien */}
            <div className="res-sub-tabs">
              <button
                className={`res-sub-tabs__btn ${resSubTab === "resources" ? "res-sub-tabs__btn--active-res" : ""}`}
                onClick={() => setResSubTab("resources")}
              >
                <span>{t.linkedRes}</span>
                {resCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--res">{resCount}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "media" ? "res-sub-tabs__btn--active-media" : ""}`}
                onClick={() => setResSubTab("media")}
              >
                <span>{t.mediaTab}</span>
                {mediaCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--media">{mediaCount}</span>
                )}
              </button>
            </div>

            {/* Verknüpfte Ressourcen-Ansicht */}
            {resSubTab === "resources" && (
              linkedResources.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noLinkedRes}</div>
              ) : (
                linkedResources.map((res) => (
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
                      color="#5858A0"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </button>
                ))
              )
            )}

            {/* Medien-Ansicht */}
            {resSubTab === "media" && (
              entries.filter((e) => e.type === "media").length === 0 ? (
                <div className="cat-detail__section-empty">{t.noMedia}</div>
              ) : (
                <MediaList t={t} CC={CC}
                  entries={entries.filter((e) => e.type === "media")}
                  cats={allCats}
                  onDelete={deleteEntry}
                />
              )
            )}
          </div>
        )}
        {bm === "link" &&
          (entries.filter((e) => e.type === "link").length === 0 ? (
            <div className="cat-detail__section-empty">{t.noLink}</div>
          ) : (
            <LinkList t={t} CC={CC}
              entries={entries.filter((e) => e.type === "link")}
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

      {/* Hidden file inputs for cover upload */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleCoverUpload}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleCoverUpload}
      />

      {/* Settings Bottom Sheet */}
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

      {showSettingsSheet && (
        <div className="settings-sheet-overlay" onClick={closeSettingsSheet} {...settingsSwipe}>
          <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sheet__handle" />

            {/* Cover Picker Bubbles */}
            <div className="settings-sheet__bubbles">
              <button
                className={`settings-sheet__bubble ${coverMode === "colors" ? "settings-sheet__bubble--active" : ""}`}
                onClick={() => setCoverMode(coverMode === "colors" ? null : "colors")}
              >
                <Palette size={20} />
                <span>{t.coverColors}</span>
              </button>
              <button
                className={`settings-sheet__bubble ${coverMode === "photo" ? "settings-sheet__bubble--active" : ""}`}
                onClick={() => { setCoverMode("photo"); coverInputRef.current?.click(); }}
              >
                <ImageIcon size={20} />
                <span>{t.coverPhoto}</span>
              </button>
              <button
                className={`settings-sheet__bubble ${coverMode === "camera" ? "settings-sheet__bubble--active" : ""}`}
                onClick={() => { setCoverMode("camera"); cameraInputRef.current?.click(); }}
              >
                <Camera size={20} />
                <span>{t.coverCamera}</span>
              </button>
            </div>

            {/* Color Grid (visible when coverMode === "colors") */}
            {coverMode === "colors" && (
              <div className="settings-sheet__color-grid">
                {COVER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`settings-sheet__color-swatch ${cat.coverColor === c.hex ? "settings-sheet__color-swatch--active" : ""}`}
                    style={{ background: c.hex, color: c.hex }}
                    onClick={() => {
                      onUpdate({ coverColor: c.hex, coverImage: null });
                      closeSettingsSheet();
                    }}
                  />
                ))}
                <button
                  className={`settings-sheet__color-swatch settings-sheet__color-swatch--default ${!cat.coverColor && !cat.coverImage ? "settings-sheet__color-swatch--active" : ""}`}
                  onClick={() => {
                    onUpdate({ coverColor: null, coverImage: null });
                    closeSettingsSheet();
                  }}
                  title={t.coverDefault}
                />
              </div>
            )}

            <div className="settings-sheet__divider" />

            <div className="settings-sheet__list">
              <button
                className="settings-sheet__item"
                onClick={() => { onUpdate({ starred: !cat.starred }); closeSettingsSheet(); }}
              >
                <Star size={18} fill={cat.starred ? "#F59E0B" : "none"} color={cat.starred ? "#F59E0B" : "#5858A0"} />
                <span>{cat.starred ? t.unmarkFavorite : t.markFavorite}</span>
              </button>
              <button
                className="settings-sheet__item"
                onClick={() => { onTogglePin?.(); closeSettingsSheet(); }}
              >
                {cat.pinned ? <PinOff size={18} color="#5858A0" /> : <Pin size={18} color="#5858A0" />}
                <span>{cat.pinned ? t.actionUnpin : t.actionPin}</span>
              </button>
              <button
                className="settings-sheet__item"
                onClick={() => { onUpdate({ archived: !cat.archived }); closeSettingsSheet(); }}
              >
                {cat.archived ? <ArchiveRestore size={18} color="#5858A0" /> : <Archive size={18} color="#5858A0" />}
                <span>{cat.archived ? t.restore : t.archive}</span>
              </button>
              <div className="settings-sheet__divider" />
              <button
                className="settings-sheet__item settings-sheet__item--danger"
                onClick={() => { onDelete(); closeSettingsSheet(); }}
              >
                <Trash2 size={18} color="#F26565" />
                <span>{t.delete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unteres Dock: Home + optionales Eingabefeld (Lesezeichen liegen oben
          in der DetailIconBar). Eingabefeld nur auf Tabs mit Hinzufügen-
          Aktion – auf Canvas & Details ausgeblendet. */}
      <DetailDock
        t={t}
        onHome={onHome}
        showInput={bm !== "canvas" && bm !== "details"}
        placeholder={t.addPlaceholder(
          bm === "cal" ? (t.calSing || t.calendar)
            : bm === "notes" ? (t.noteSing || t.notes)
            : bm === "media" ? (t.media || "")
            : bm === "link" ? (t.link || "")
            : t.task
        )}
        accentColor={getFabColor()}
        onSubmit={(title) => onQuickAddEntry?.(getEntryTypeFromBookmark(), title)}
      />
    </div>
  );
}


