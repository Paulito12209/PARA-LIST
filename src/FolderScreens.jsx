import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { useInactivity } from "./hooks/useInactivity";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";

export function CatListScreen({ type, cats, onOpen, onAdd, onBack, onOpenArchive, t, CC }) {
  const fabVisible = useInactivity(5000);
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
                <div className="cat-list__item-name">{cat.name}</div>
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

      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
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


export function BookmarkRail({ active, onSelect, baseColor }) {
  return (
    <div className="bookmark-rail">
      {BOOKMARKS.map((bm) => {
        const BmIcon = bm.Icon;
        const isActive = active === bm.id;
        const color = (bm.id === 'canvas' && baseColor) ? baseColor : bm.color;
        
        return (
          <button
            key={bm.id}
            className={`bookmark-rail__tab ${
              isActive
                ? "bookmark-rail__tab--active"
                : "bookmark-rail__tab--inactive"
            }`}
            onClick={() => onSelect(bm.id)}
            style={{
              background: isActive ? color : color + "28",
              borderWidth: "1px 0px 1px 1px",
              borderStyle: "solid",
              borderColor: `${color}${isActive ? "" : "50"}`,
            }}
          >
            <BmIcon size={11} color={isActive ? "#fff" : color} />
          </button>
        );
      })}
    </div>
  );
}


export function CatDetailScreen({
  t,
  CC,
  lang,
  cat,
  allCats,
  entries,
  onUpdate,
  onDelete,
  onBack,
  onHome,
  toggleTask,
  deleteEntry,
  onAddEntry,
  onOpenCat,
  onOpenEntry,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onLinkResource,
}) {
  const safeType = cat?.type && CC[cat.type] ? cat.type : "resource";
  const cfg = CC[safeType];
  const CatIcon = CAT_ICONS[safeType] || Square;
  const [bm, setBm] = useState("canvas");
  const fabVisible = useInactivity(5000);
  const [tagSort, setTagSort] = useState({ by: 'date', desc: true });
  const [showDate, setShowDate] = useState(false);
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [resSearch, setResSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  // Alle Ordner (inkl. Ressourcen) haben 3 Sub-Tabs im Media/Ressourcen Lesezeichen
  const isProjectOrArea = cat.type === "project" || cat.type === "area";
  
  // Sub-Tab für das Ressource-Lesezeichen (standardmäßig "resources")
  const [resSubTab, setResSubTab] = useState("resources");
  const [taskSubTab, setTaskSubTab] = useState("open");

  // Refs für Click-Outside-Erkennung
  const connPopupRef = useRef(null);
  const connPillRef = useRef(null);
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);
  const tagPopupRef = useRef(null);
  const tagTriggerRef = useRef(null);
  const menuPopupRef = useRef(null);
  const menuButtonRef = useRef(null);

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

  // Click-Outside: Popups schließen wenn außerhalb geklickt wird
  const handleClickOutside = useCallback((e) => {
    // Connection-Popup schließen
    if (showConnSelect &&
        connPopupRef.current && !connPopupRef.current.contains(e.target) &&
        connPillRef.current && !connPillRef.current.contains(e.target)) {
      setShowConnSelect(false);
    }
    // Datum-Picker schließen
    if (showDate &&
        dateInputRef.current && !dateInputRef.current.contains(e.target) &&
        datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
    // Tag-Popup schließen
    if (showTagSelect &&
        tagPopupRef.current && !tagPopupRef.current.contains(e.target) &&
        tagTriggerRef.current && !tagTriggerRef.current.contains(e.target)) {
      setShowTagSelect(false);
    }
    // Kontextmenü schließen
    if (showMenu &&
        menuPopupRef.current && !menuPopupRef.current.contains(e.target) &&
        menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
      setShowMenu(false);
    }
  }, [showConnSelect, showDate, showTagSelect, showMenu]);

  // Event-Listener für Click-Outside
  // (useRef + useCallback statt useEffect, da wir den Handler auf dem cat-detail div setzen)

  // Mapping: Bookmark → Entry-Typ (inkl. Sub-Tab bei Ressource)
  const getEntryTypeFromBookmark = useCallback(() => {
    if (bm === "media") {
      return resSubTab === "notes" ? "note" : "media";
    }
    const map = {
      canvas: "note",
      tasks: "task",
      cal: "calendar",
      link: "link",
      tags: "tags",
    };
    return map[bm] || "note";
  }, [bm, resSubTab]);

  // Mapping: Entry-Typ → FAB-Farbe
  const getFabColor = useCallback(() => {
    const entryType = getEntryTypeFromBookmark();
    const colorMap = {
      note: "#F59E0B",
      task: "#7C83F7",
      calendar: "#1E40AF",
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
  const resSubTabOrder = ["resources", "notes", "media"];
  const taskSubTabOrder = ["open", "completed"];
  const onSubTabTouchStart = useCallback((e) => {
    subTabTouchX.current = e.touches[0].clientX;
  }, []);
  const onSubTabTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - subTabTouchX.current;
    if (Math.abs(dx) > 60) {
      if (bm === "media") {
        setResSubTab(prev => {
          const idx = resSubTabOrder.indexOf(prev);
          if (dx > 0) {
            // Swipe rechts → vorheriger Tab
            return resSubTabOrder[Math.max(0, idx - 1)];
          } else {
            // Swipe links → nächster Tab
            return resSubTabOrder[Math.min(resSubTabOrder.length - 1, idx + 1)];
          }
        });
      } else if (bm === "tasks") {
        setTaskSubTab(prev => {
          const idx = taskSubTabOrder.indexOf(prev);
          if (dx > 0) {
            // Swipe rechts → vorheriger Tab
            return taskSubTabOrder[Math.max(0, idx - 1)];
          } else {
            // Swipe links → nächster Tab
            return taskSubTabOrder[Math.min(taskSubTabOrder.length - 1, idx + 1)];
          }
        });
      }
    }
  }, [resSubTabOrder, taskSubTabOrder, bm]);

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
    <div className="cat-detail" onClick={handleClickOutside}>
      {/* Header */}
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          <CatIcon size={18} color={cfg.color} />
          <input
            className="cat-detail__title-input"
            value={cat.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Titel..."
          />
          <button 
            ref={menuButtonRef}
            className="cat-detail__delete-btn" 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          >
            <MoreVertical size={18} color="#5858A0" />
          </button>

          {showMenu && (
            <div className="cat-detail__conn-popup" ref={menuPopupRef} style={{ top: '40px', right: '0', left: 'auto' }}>
              <div className="cat-detail__conn-list">
                <button 
                  className="cat-detail__conn-item"
                  onClick={() => { onUpdate({ starred: !cat.starred }); setShowMenu(false); }}
                >
                  <Star size={16} fill={cat.starred ? "#F59E0B" : "none"} color={cat.starred ? "#F59E0B" : "#5858A0"} style={{ marginRight: '10px' }} />
                  <span>{cat.starred ? t.unmarkFavorite : t.markFavorite}</span>
                </button>
                <button 
                  className="cat-detail__conn-item"
                  onClick={() => { onUpdate({ archived: !cat.archived }); setShowMenu(false); }}
                >
                  {cat.archived ? <ArchiveRestore size={16} color="#5858A0" style={{ marginRight: '10px' }} /> : <Archive size={16} color="#5858A0" style={{ marginRight: '10px' }} />}
                  <span>{cat.archived ? t.restore : t.archive}</span>
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                <button 
                  className="cat-detail__conn-item"
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  style={{ color: '#F26565' }}
                >
                  <Trash2 size={16} color="#F26565" style={{ marginRight: '10px' }} />
                  <span>{t.delete}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="cat-detail__pills">
          <div className="cat-detail__pills-group">
          {cat.type === "resource" && cat.createdAt && (
            <div className="cat-detail__date-pill cat-detail__date-pill--static">
              {fmtDate(cat.createdAt.split("T")[0], t.locale)}
            </div>
          )}
            {cat.type === "project" && (
              <button
                ref={datePillRef}
                className="cat-detail__date-pill"
                onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
                style={{ gap: "6px" }}
              >
                <Calendar size={14} />
                {cat.date ? fmtDate(cat.date, t.locale) : t.addDate}
              </button>
            )}

          <button
            ref={connPillRef}
            className="cat-detail__date-pill"
            onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
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
            ref={tagTriggerRef}
            onClick={(e) => { e.stopPropagation(); setShowTagSelect(!showTagSelect); }}
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
          {showConnSelect && (
            <div className="cat-detail__conn-popup" ref={connPopupRef} onClick={(e) => e.stopPropagation()}>
              <div className="cat-detail__conn-list">
                {connOptions.length === 0 ? (
                  <div className="cat-detail__conn-empty">{t.noCats('?').split('\n')[0]}</div>
                ) : (
                  connOptions.map(opt => (
                    <button
                      key={opt.id}
                      className="cat-detail__conn-item"
                      onClick={() => {
                        onUpdate({ relatedId: opt.id });
                        setShowConnSelect(false);
                      }}
                    >
                      <span 
                        className="cat-detail__conn-dot" 
                        style={{ background: (CC[opt.type]?.color || CC.resource.color) }} 
                      />
                      <span className="cat-detail__conn-name">{opt.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                className="cat-detail__conn-none"
                onClick={() => {
                  onUpdate({ relatedId: null });
                  setShowConnSelect(false);
                }}
              >
                {t.noConnection}
              </button>
            </div>
          )}
          {showTagSelect && (
            <div className="cat-detail__conn-popup" ref={tagPopupRef} onClick={(e) => e.stopPropagation()} style={{ left: "auto", right: 0 }}>
              <div className="cat-detail__conn-list">
                {(!tags || tags.length === 0) ? (
                  <div className="cat-detail__conn-empty">{t.noTagsPopup || "Keine Tags"}</div>
                ) : (
                  tags.map(tag => {
                    const isSelected = (cat.tags || []).includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        className="cat-detail__conn-item"
                        onClick={() => {
                          const currentTags = cat.tags || [];
                          if (isSelected) {
                            onUpdate({ tags: currentTags.filter(t => t !== tag.name) });
                          } else {
                            onUpdate({ tags: [...currentTags, tag.name] });
                          }
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span className="cat-detail__conn-name" style={{ color: isSelected ? CC.resource.color : 'inherit', fontWeight: isSelected ? 600 : 400 }}>
                          {tag.name}
                        </span>
                        {isSelected && <Check size={14} color={CC.resource.color} />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
      </div>

      {/* Content */}
      <div className="cat-detail__body" onClick={handleDoubleTap}>
        {bm === "canvas" && (
          <textarea
            className="cat-detail__textarea"
            value={cat.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder={t.writeThoughts}
          />
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
                {entries.filter((e) => e.type === "task" && !e.done).length > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--open">{entries.filter((e) => e.type === "task" && !e.done).length}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${taskSubTab === "completed" ? "res-sub-tabs__btn--active-completed" : ""}`}
                onClick={() => setTaskSubTab("completed")}
              >
                <CheckCircle2 size={14} />
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
                {resCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--res">{resCount}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "notes" ? "res-sub-tabs__btn--active-notes" : ""}`}
                onClick={() => setResSubTab("notes")}
              >
                <Pencil size={14} />
                <span>{t.notes}</span>
                {noteCount > 0 && (
                  <span className="res-sub-tabs__count res-sub-tabs__count--notes">{noteCount}</span>
                )}
              </button>
              <button
                className={`res-sub-tabs__btn ${resSubTab === "media" ? "res-sub-tabs__btn--active-media" : ""}`}
                onClick={() => setResSubTab("media")}
              >
                <Paperclip size={14} />
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
                      <div className="cat-list__item-name">{res.name}</div>
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

            {/* Notizen-Ansicht */}
            {resSubTab === "notes" && (
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
      </div>

      <BookmarkRail active={bm} onSelect={setBm} baseColor={cfg.color} />

      {/* Bottom nav */}
      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`} style={{ position: "relative" }}>
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        
        {/* Suchfeld für Ressourcen-Verknüpfungen (Nur im "resources" Sub-Tab sichtbar) */}
        {bm === "media" && resSubTab === "resources" && (
          <div className="nav-bottom__res-search">
            <div className="nav-bottom__res-search-container">
              <Search className="nav-bottom__res-search-icon" size={16} color={CC.resource.color} />
              <input
                type="text"
                className="nav-bottom__res-search-input"
                value={resSearch}
                onChange={(e) => setResSearch(e.target.value)}
                placeholder={t.searchResources || "Ressourcen suchen..."}
              />
            </div>
            {resSearch.trim() && (
              <div className="nav-bottom__res-search-results">
                {allCats
                  .filter(c => c.type === 'resource' && c.id !== cat.id && c.relatedId !== cat.id && c.name.toLowerCase().includes(resSearch.toLowerCase()))
                  .map(res => (
                    <button
                      key={res.id}
                      className="nav-bottom__res-search-item"
                      onClick={() => {
                        onLinkResource(res.id);
                        setResSearch("");
                      }}
                    >
                      <Square size={14} color={CC.resource.color} />
                      <span>{res.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="nav-bottom__actions">
          {bm === "canvas" ? (
            <button
              className="nav-bottom__back"
              onClick={onHome}
            >
              <Home size={20} color="#EDEEFF" />
            </button>
          ) : (
            <button
              className="nav-bottom__add"
              onClick={createEntryFromBookmark}
              style={{
                background: getFabColor(),
                boxShadow: `0 8px 24px ${getFabColor()}55`,
              }}
            >
              <Plus size={22} color="#fff" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


