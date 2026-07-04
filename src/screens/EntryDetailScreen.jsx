import React, { useState, useRef, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, ListChecks, Palette, Camera, UserPlus, Pin, PinOff, Info } from 'lucide-react';
import { fmtDate, fmtRelative, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, getInitials } from "../utils";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { LinkSheet } from "../components/LinkSheet";
import { TagSheet } from "../components/PillSheets";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { TagIcon, ArchiveIcon, BookmarkIcon } from "../components/AppIcons";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "../components/EntryLists";
import { DetailDock, DetailIconBar } from "../components/DetailDock";
import { useSheetSwipeClose } from "../components/useSheetSwipeClose";

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

export function EntryDetailScreen({
  t, CC, theme, lang, entry, cat: _cat, allCats, user, onUpdate, onTogglePin, onDelete, onHome,
  entries, onOpenEntry, toggleTask, deleteEntry,
  onAddLinkedEntry, onAddSubtask,
  onUnlinkEntry,
  tags, onUpdateTag, onDeleteTag,
}) {
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const collaborators = entry.collaborators || [];
  const [showDate, setShowDate] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [coverMode, setCoverMode] = useState(null);
  const [bm, setBm] = useState("canvas");
  const [taskSubTab, setTaskSubTab] = useState("open");
  const [resSubTab, setResSubTab] = useState("resources");
  const [tagSort, setTagSort] = useState({ by: 'date', desc: true });

  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);
  const subTabTouchX = useRef(0);
  const coverInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Verknüpfung & Tags öffnen Bottom-Sheets (eigenes Backdrop) – Click-Outside
  // wird nur noch für den Datums-Picker gebraucht.
  const handleClickOutside = useCallback((e) => {
    if (showDate && dateInputRef.current && !dateInputRef.current.contains(e.target) && datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
  }, [showDate]);

  const typeIcon = {
    task: CheckCircle2,
    note: FileText,
    calendar: Calendar,
    media: Paperclip,
    link: Link2,
  }[entry.type] || FileText;

  const TypeIcon = typeIcon;
  const cfgColor = entry.type === "task" ? "#0B8CE9" :
    entry.type === "note" ? "#F59E0B" :
    entry.type === "calendar" ? "#0078D4" : "#9CA3AF";

  const defaultAccentRgb = entry.type === "task" ? "11, 140, 233" :
    entry.type === "note" ? "245, 158, 11" :
    entry.type === "calendar" ? "0, 120, 212" : "156, 163, 175";
  const entryAccentRgb = entry.coverColor
    ? (COVER_COLORS.find(c => c.hex === entry.coverColor)?.rgb || defaultAccentRgb)
    : defaultAccentRgb;
  const hasEntryCoverImg = !!entry.coverImage;

  // BookmarkRail-Icons: Canvas = Kontext-Icon (Eintragstyp) in Typ-Farbe;
  // Task-Seiten zeigen zusätzlich das ListChecks-Icon fürs Aufgaben-Lesezeichen.
  const iconOverrides = { canvas: TypeIcon, ...(entry.type === "task" ? { tasks: ListChecks } : {}) };
  const iconColors = { canvas: cfgColor };

  // Linked entries computation
  const allEntries = entries || [];
  const linkedIds = new Set(entry.linkedEntryIds || []);
  const linkedEntries = allEntries.filter(e => linkedIds.has(e.id));
  const subtasks = entry.type === "task" ? allEntries.filter(e => e.parentId === entry.id) : [];
  const linkedTasks = linkedEntries.filter(e => e.type === "task");
  const linkedCalEntries = linkedEntries.filter(e => e.type === "calendar");
  const linkedNotes = linkedEntries.filter(e => e.type === "note");
  const linkedMedia = linkedEntries.filter(e => e.type === "media");
  const linkedLinks = linkedEntries.filter(e => e.type === "link");

  // All tasks for tasks tab (subtasks + linked tasks)
  const allTasksForTab = entry.type === "task" ? [...subtasks, ...linkedTasks] : linkedTasks;

  // Lesezeichen-Auswahl: alle Lesezeichen (inkl. "details") wechseln nur den
  // Inhaltsbereich. Einstellungen liegen jetzt auf dem Zahnrad-Button unten rechts.
  const handleBmSelect = useCallback((id) => {
    setBm(id);
  }, []);

  const openSettingsSheet = useCallback(() => {
    setShowSettingsSheet(true);
  }, []);

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

  // FAB color based on active bookmark
  const getFabColor = useCallback(() => {
    const colorMap = {
      canvas: cfgColor,
      tasks: "#0B8CE9",
      notes: "#F59E0B",
      cal: "#0078D4",
      media: "#10B981",
      link: "#7C3AED",
      tags: "#EC4899",
    };
    return colorMap[bm] || cfgColor;
  }, [bm, cfgColor]);

  // Doppeltipp in den Listen-Bereich → neuen (verknüpften) Eintrag des aktiven
  // Lesezeichen-Typs erstellen (wie auf den Ordner-Detailseiten).
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(
    (e) => {
      const isEmptyPlaceholder = e.target.closest('.cat-detail__empty') || e.target.closest('.cat-detail__section-empty') || e.target.closest('.entry-list__empty');
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
      const typeMap = { tasks: "task", notes: "note", cal: "calendar", media: "media", link: "link" };
      const type = typeMap[bm];
      if (!type) return; // Canvas/Details: kein Erstellen per Doppeltipp
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (type === "task" && entry.type === "task") {
          onAddSubtask?.();
        } else {
          onAddLinkedEntry?.(type);
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [bm, entry.type, onAddSubtask, onAddLinkedEntry]
  );

  // Swipe handler for sub-tab switching
  const onSubTabTouchStart = useCallback((e) => {
    subTabTouchX.current = e.touches[0].clientX;
  }, []);
  const onSubTabTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - subTabTouchX.current;
    if (Math.abs(dx) <= SUB_TAB_SWIPE_THRESHOLD_PX) return;
    const stepInOrder = (order, prev) => {
      const idx = order.indexOf(prev);
      return dx > 0
        ? order[Math.max(0, idx - 1)]
        : order[Math.min(order.length - 1, idx + 1)];
    };
    if (bm === "media") setResSubTab((prev) => stepInOrder(RES_SUB_TAB_ORDER, prev));
    else if (bm === "tasks") setTaskSubTab((prev) => stepInOrder(TASK_SUB_TAB_ORDER, prev));
  }, [bm]);

  return (
    <div
      className={`cat-detail ${hasEntryCoverImg ? "cat-detail--has-cover" : ""}`}
      onClick={handleClickOutside}
      style={{ "--entry-accent-rgb": entryAccentRgb }}
    >
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

      {/* Header */}
      <div className="cat-detail__header">

        {/* Cover-Bild + Lichtwelle — nur innerhalb des Headers */}
        {hasEntryCoverImg && (
          <>
            <img className="cat-detail__cover-bg" src={entry.coverImage} alt="" />
            <div className="cat-detail__cover-wave" />
          </>
        )}

        <div className="cat-detail__header-pattern" />
        {/* Titelzeile bleibt im Layout (Header-Höhe unverändert), wird aber
            ausgeblendet – der Seitentitel steht jetzt oben im Command-Panel. */}
        <div className="cat-detail__title-row cat-detail__title-row--hidden" aria-hidden="true">
          <TypeIcon size={18} color={cfgColor} />
          <input
            className="cat-detail__title-input"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titel..."
            tabIndex={-1}
          />
        </div>

        {/* Avatare der Seite (eigener + Kollaboratoren), über den Pillen –
            identisch zu den Ordner-Detailseiten (Projekte/Bereiche/Ressourcen). */}
        <div className="cat-detail__avatars">
          {user?.avatar ? (
            <img src={user.avatar} className="cat-detail__avatar" alt={user?.name || ""} />
          ) : (
            <span className="cat-detail__avatar cat-detail__avatar--initials">{getInitials(user?.name)}</span>
          )}
          {collaborators.map((c) => (
            c.avatar ? (
              <img key={c.id} src={c.avatar} className="cat-detail__avatar" alt={c.name} />
            ) : (
              <span key={c.id} className="cat-detail__avatar cat-detail__avatar--initials">
                {c.name.charAt(0).toUpperCase()}
              </span>
            )
          ))}
          <button
            type="button"
            className="cat-detail__avatar-add"
            onClick={(e) => { e.stopPropagation(); setCollabOpen(true); }}
            aria-label={t.addCollaborator}
          >
            <UserPlus size={14} />
          </button>
        </div>

        <div className="cat-detail__pills">
          {/* Gleicher Wrapper wie auf den Ordner-Detailseiten → identischer
              vertikaler Abstand zwischen Avataren und Pillen (8px + 4px). */}
          <div className="cat-detail__pills-group">
            {/* 1. Datumspille (Aufgabe / Kalender / Notiz-Erstellung) — kommt zuerst */}
            {(entry.type === "task" || entry.type === "calendar") && (
              <button
                ref={datePillRef}
                className="cat-detail__date-pill"
                onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); setShowConnSelect(false); setShowTagSelect(false); }}
                style={{ gap: "6px" }}
              >
                <Calendar size={14} />
                {(entry.due || entry.date) ? fmtDate((entry.due || entry.date), t.locale) : t.addDate}
              </button>
            )}
            {entry.type === "note" && entry.createdAt && (
              <span className="cat-detail__date-pill" style={{ cursor: 'default' }}>
                {fmtRelative(entry.createdAt, t.locale)}
              </span>
            )}

            {/* 2. PARA-Kategorie-Tag — kommt nach dem Datum */}
            {(() => {
              const selectedCats = allCats.filter(c => (entry.catIds || []).includes(c.id));

              if (selectedCats.length === 0) {
                return (
                  <button
                    className="cat-detail__date-pill"
                    onClick={(e) => { e.stopPropagation(); setShowConnSelect(true); setShowDate(false); }}
                  >
                    {t.connectSelection}
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="cat-detail__date-pill"
                    onClick={(e) => { e.stopPropagation(); setShowConnSelect(true); setShowDate(false); }}
                    style={{
                      background: CC[selectedCats[0].type].color + "18",
                      borderColor: "transparent",
                      color: CC[selectedCats[0].type].color,
                    }}
                  >
                    {selectedCats[0].name}
                  </button>
                  {selectedCats.slice(1).map(c => {
                    const CIcon = CAT_ICONS[c.type] || Circle;
                    return (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); setShowConnSelect(true); setShowDate(false); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <CIcon size={18} color={CC[c.type].color} />
                      </button>
                    )
                  })}
                </div>
              );
            })()}

          {/* 3. Tags — überall verfügbar (wie auf den Ordner-Detailseiten) */}
          <div
            style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); setShowTagSelect(true); setShowDate(false); }}
          >
            {(() => {
              const selectedTags = entry.tags || [];
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
            {(!entry.tags || entry.tags.length === 0) && (
              <span className="cat-detail__tag" style={{ background: "transparent", border: "1px dashed #5858A066", opacity: 0.8 }}>
                {t.addTag || "+ Tag"}
              </span>
            )}
          </div>

          {entry.type === "calendar" && entry.isBirthday && (
            <button
              className="cat-detail__birthday-toggle"
              onClick={() => onUpdate({ isBirthday: !entry.isBirthday })}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                marginLeft: 'auto'
              }}
              title={t.markAsBirthday || "Als Geburtstag markieren"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="url(#birthdayGrad)" style={{ width: 18, height: 18 }}>
                <defs>
                  <linearGradient id="birthdayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F26565" />
                    <stop offset="33%" stopColor="#F59E0B" />
                    <stop offset="66%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056-4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
              </svg>
            </button>
          )}
          </div>

          {/* Details-Lesezeichen ("i"): ganz rechts in der Pillen-Zeile */}
          <button
            className={`cat-detail__details-btn ${bm === "details" ? "cat-detail__details-btn--active" : ""}`}
            style={{ marginLeft: "auto" }}
            onClick={(e) => { e.stopPropagation(); handleBmSelect("details"); }}
            aria-label={t.detailsBm || "Details"}
          >
            <Info size={18} />
          </button>
        </div>

        {/* Date/Time Popup */}
        {(entry.type === "task" || entry.type === "calendar") && showDate && (
          <div ref={dateInputRef} onClick={(e) => e.stopPropagation()} style={{ paddingTop: '8px', zIndex: 10 }}>
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                style={{ marginTop: 0 }}
                value={entry.due || entry.date || ""}
                onChange={(e) => {
                  const patch = entry.type === "task" ? { due: e.target.value } : { date: e.target.value };
                  onUpdate(patch);
                }}
              />
              <input
                type="time"
                className="modal__time-input"
                style={{ marginTop: 0 }}
                value={entry.time || ""}
                onChange={(e) => {
                  onUpdate({ time: e.target.value });
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Schmale Lesezeichen-Leiste zwischen Header und Canvas */}
      <DetailIconBar
        t={t}
        active={bm}
        onSelect={handleBmSelect}
        iconOverrides={iconOverrides}
        iconColors={iconColors}
        onOptions={openSettingsSheet}
      />

      {/* Content */}
      <div className="cat-detail__body" style={{ flex: 1 }} onClick={handleDoubleTap}>
        {bm === "canvas" && (
          <>
            {entry.type === "note" && (
              <textarea
                className="cat-detail__textarea"
                value={entry.body || ""}
                onChange={(e) => onUpdate({ body: e.target.value })}
                placeholder={t.writeNotePlaceholder}
              />
            )}
            {entry.type === "task" && (
              <textarea
                className="cat-detail__textarea"
                value={entry.note || ""}
                onChange={(e) => onUpdate({ note: e.target.value })}
                placeholder={t.addNotePlaceholder}
              />
            )}
            {entry.type === "calendar" && (
              <textarea
                className="cat-detail__textarea"
                value={entry.note || ""}
                onChange={(e) => onUpdate({ note: e.target.value })}
                placeholder={t.addNotePlaceholder}
              />
            )}
          </>
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
                <CheckCircle2 size={14} />
                <span>{t.open || "Offen"}</span>
                {allTasksForTab.filter((e) => !e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--open">{allTasksForTab.filter((e) => !e.done).length}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "completed" ? "res-sub-tabs__btn--active-completed" : ""}`}
                onClick={() => setTaskSubTab("completed")}
              >
                <CheckCircle2 size={14} />
                <span>{t.markDone || "Erledigt"}</span>
                {allTasksForTab.filter((e) => e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--completed">{allTasksForTab.filter((e) => e.done).length}</span>
                )}
              </button>
            </div>

            {taskSubTab === "open" && (
              allTasksForTab.filter((e) => !e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noTasks}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={allTasksForTab.filter((e) => !e.done)}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
            {taskSubTab === "completed" && (
              allTasksForTab.filter((e) => e.done).length === 0 ? (
                <div className="cat-detail__section-empty">{t.noCompletedTasks || "Keine erledigten Aufgaben"}</div>
              ) : (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={allTasksForTab.filter((e) => e.done)}
                  cats={allCats}
                  onToggle={toggleTask}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}
          </div>
        )}

        {bm === "notes" && (
          linkedNotes.length === 0 ? (
            <div className="cat-detail__section-empty">{t.notes}: {t.noMedia}</div>
          ) : (
            <NoteList t={t} CC={CC}
              entries={linkedNotes}
              cats={allCats}
              onDelete={deleteEntry}
              onOpenEntry={onOpenEntry}
            />
          )
        )}

        {bm === "cal" && (
          linkedCalEntries.length === 0 ? (
            <div className="cat-detail__section-empty">{t.noCal}</div>
          ) : (
            <CalList t={t} CC={CC} lang={lang}
              entries={linkedCalEntries}
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
                <Square size={14} />
                <span>{t.linkedRes}</span>
                {linkedNotes.length > 0 && resSubTab !== "resources" && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--res">{linkedNotes.length}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "media" ? "res-sub-tabs__btn--active-media" : ""}`}
                onClick={() => setResSubTab("media")}
              >
                <Paperclip size={14} />
                <span>{t.mediaTab}</span>
                {linkedMedia.length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--media">{linkedMedia.length}</span>
                )}
              </button>
            </div>

            {/* Verknüpfte Notizen-Ansicht (als "Ressourcen" Sub-Tab) */}
            {resSubTab === "resources" && (
              linkedNotes.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noLinkedRes}</div>
              ) : (
                <NoteList t={t} CC={CC}
                  entries={linkedNotes}
                  cats={allCats}
                  onDelete={deleteEntry}
                  onOpenEntry={onOpenEntry}
                />
              )
            )}

            {/* Medien-Ansicht */}
            {resSubTab === "media" && (
              linkedMedia.length === 0 ? (
                <div className="cat-detail__section-empty">{t.noMedia}</div>
              ) : (
                <MediaList t={t} CC={CC}
                  entries={linkedMedia}
                  cats={allCats}
                  onDelete={deleteEntry}
                />
              )
            )}
          </div>
        )}

        {bm === "link" && (
          linkedLinks.length === 0 ? (
            <div className="cat-detail__section-empty">{t.noLink}</div>
          ) : (
            <LinkList t={t} CC={CC}
              entries={linkedLinks}
              cats={allCats}
              onDelete={deleteEntry}
            />
          )
        )}

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
                          onChange={(e) => onUpdateTag?.(tag.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          placeholder={t.tagNamePlaceholder || "..."}
                        />
                        {tag.createdAt && <div className="media-item__meta">{fmtDate(tag.createdAt.split("T")[0], t.locale)}</div>}
                      </div>
                      <button className="media-item__delete" onClick={() => {
                        if (window.confirm(t.confirmDelete(tag.name))) {
                          onDeleteTag?.(tag.id);
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
        {bm === "details" && (() => {
          // Zeitstempel (Zahl oder ISO-String) → "3. Juli 2026, 14:32"
          const fmtStamp = (ts) => {
            if (!ts) return t.neverLabel;
            const d = new Date(ts);
            if (isNaN(d.getTime())) return t.neverLabel;
            return d.toLocaleDateString(t.locale, { day: "numeric", month: "long", year: "numeric" })
              + ", " + d.toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" });
          };
          const rows = [
            { label: t.createdAtLabel, value: fmtStamp(entry.createdAt) },
            { label: t.lastModifiedLabel, value: fmtStamp(entry.updatedAt) },
            { label: t.lastOpenedLabel, value: fmtStamp(entry.lastOpenedAt) },
          ];
          return (
            <div className="cat-detail__details">
              {rows.map((r) => (
                <div key={r.label} className="cat-detail__details-row">
                  <span className="cat-detail__details-label">{r.label}</span>
                  <span className="cat-detail__details-value">{r.value}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Settings Bottom Sheet */}
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

            {/* Color Grid */}
            {coverMode === "colors" && (
              <div className="settings-sheet__color-grid">
                {COVER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`settings-sheet__color-swatch ${entry.coverColor === c.hex ? "settings-sheet__color-swatch--active" : ""}`}
                    style={{ background: c.hex, color: c.hex }}
                    onClick={() => {
                      onUpdate({ coverColor: c.hex, coverImage: null });
                      closeSettingsSheet();
                    }}
                  />
                ))}
                <button
                  className={`settings-sheet__color-swatch settings-sheet__color-swatch--default ${!entry.coverColor && !entry.coverImage ? "settings-sheet__color-swatch--active" : ""}`}
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
                onClick={() => { onUpdate({ starred: !entry.starred }); closeSettingsSheet(); }}
              >
                <Star size={18} fill={entry.starred ? "#F59E0B" : "none"} color={entry.starred ? "#F59E0B" : "#5858A0"} />
                <span>{entry.starred ? t.unmarkFavorite : t.markFavorite}</span>
              </button>
              <button
                className="settings-sheet__item"
                onClick={() => { onTogglePin?.(); closeSettingsSheet(); }}
              >
                {entry.pinned ? <PinOff size={18} color="#5858A0" /> : <Pin size={18} color="#5858A0" />}
                <span>{entry.pinned ? t.actionUnpin : t.actionPin}</span>
              </button>
              <button
                className="settings-sheet__item"
                onClick={() => { onUpdate({ archived: !entry.archived }); closeSettingsSheet(); }}
              >
                {entry.archived ? <ArchiveRestore size={18} color="#5858A0" /> : <Archive size={18} color="#5858A0" />}
                <span>{entry.archived ? t.restore : t.archive}</span>
              </button>
              {entry.type === "calendar" && (
                <button
                  className="settings-sheet__item"
                  onClick={() => { onUpdate({ isBirthday: !entry.isBirthday }); closeSettingsSheet(); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={entry.isBirthday ? "#F59E0B" : "#5858A0"} style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056-4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
                  </svg>
                  <span>{entry.isBirthday ? t.unsetBirthday : t.setBirthday}</span>
                </button>
              )}
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

      {/* Verknüpfungs-Sheet (ersetzt das frühere Popup an der Pille) */}
      {showConnSelect && (
        <LinkSheet
          t={t}
          CC={CC}
          cats={allCats}
          currentIds={entry.catIds || []}
          onConfirm={(nextIds) => {
            onUpdate({ catIds: nextIds, catId: nextIds[0] || null });
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
          currentTags={entry.tags || []}
          onConfirm={(nextTags) => {
            onUpdate({ tags: nextTags });
            setShowTagSelect(false);
          }}
          onClose={() => setShowTagSelect(false)}
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

      {/* Unteres Dock: nur noch Home-Button (Lesezeichen liegen oben in der
          DetailIconBar). Verlinkte Einträge inline hinzufügen kommt später. */}
      <DetailDock
        t={t}
        onHome={onHome}
        showInput={false}
        accentColor={getFabColor()}
      />
    </div>
  );
}
