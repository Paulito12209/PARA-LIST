import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { useInactivity } from "./hooks/useInactivity";

export function EntryMetaTags({ entry, cats, CC, isHome }) {
  const ids = entry.catIds || (entry.catId ? [entry.catId] : []);
  if (!isHome && ids.length === 0) return null;

  const linked = cats.filter((c) => ids.includes(c.id));
  const projs = linked.filter((c) => c.type === "project");
  const areas = linked.filter((c) => c.type === "area");
  const res   = linked.filter((c) => c.type === "resource");

  if (!isHome) {
    return (
      <>
        {projs.length > 0 && (
          <span
            className="task-item__cat-tag"
            style={{ color: CC.project.color, background: 'var(--pill-project-bg)' }}
          >
            {projs[0].name}{projs.length > 1 ? ` +${projs.length - 1}` : ""}
          </span>
        )}
        {areas.length > 0 && (
          <span
            className="task-item__cat-tag"
            style={{ color: CC.area.color, background: 'var(--pill-area-bg)' }}
          >
            {areas[0].name}{areas.length > 1 ? ` +${areas.length - 1}` : ""}
          </span>
        )}
        {res.length > 0 && (
          <span
            className="task-item__cat-tag"
            style={{
              color: CC.resource.color,
              background: 'var(--pill-resource-bg)',
            }}
          >
            <Square size={10} color={CC.resource.color} strokeWidth={2.5} style={{ marginRight: 3 }} />
            {res[0].name.trim()}{res.length > 1 ? ` +${res.length - 1}` : ""}
          </span>
        )}
      </>
    );
  }

  return (
    <div className="task-item__pills" style={{ marginTop: 0 }}>
      <div className="task-item__pill-wrap">
        {projs.length === 0 ? (
          <div className="task-item__pill task-item__pill--icon-btn" style={{ color: CC.project.color, cursor: 'default' }}>
            <Circle size={12} strokeWidth={2.5} />
          </div>
        ) : (
          <div className="task-item__pill task-item__pill--cat-btn" style={{ color: CC.project.color, background: 'var(--pill-project-bg)', cursor: 'default' }}>
            {projs[0].name}{projs.length > 1 ? ` +${projs.length - 1}` : ""}
          </div>
        )}
      </div>

      <div className="task-item__pill-wrap">
        {areas.length === 0 ? (
          <div className="task-item__pill task-item__pill--icon-btn" style={{ color: CC.area.color, cursor: 'default' }}>
            <Triangle size={12} strokeWidth={2.5} />
          </div>
        ) : (
          <div className="task-item__pill task-item__pill--cat-btn" style={{ color: CC.area.color, background: 'var(--pill-area-bg)', cursor: 'default' }}>
            {areas[0].name}{areas.length > 1 ? ` +${areas.length - 1}` : ""}
          </div>
        )}
      </div>

      <div className="task-item__pill-wrap">
        {res.length === 0 ? (
          <div className="task-item__pill task-item__pill--icon-btn" style={{ color: CC.resource.color, cursor: 'default' }}>
            <Square size={12} strokeWidth={2.5} />
          </div>
        ) : (
          <div className="task-item__pill task-item__pill--cat-btn" style={{ color: CC.resource.color, background: 'var(--pill-resource-bg)', cursor: 'default' }}>
            {res[0].name}{res.length > 1 ? ` +${res.length - 1}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}/* ── Home Entry Item ─────────────────────────────────────────── */


export function HomeEntryItem({ e, cats, onDelete, onToggle, onToggleStar, onUpdateEntry, onOpenEntry, onArchiveEntry, t, CC, isArchive }) {
  const [menuEntryId, setMenuEntryId] = useState(null);
  const [dateEntryId, setDateEntryId] = useState(null);
  const [pillPopup, setPillPopup] = useState(null);
  const menuRef = useRef(null);
  const pillPopupRef = useRef(null);
  const suppressNextClick = useRef(false);

  useEffect(() => {
    if (!menuEntryId) return;
    const close = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) {
        setMenuEntryId(null);
        suppressNextClick.current = true;
        requestAnimationFrame(() => { setTimeout(() => { suppressNextClick.current = false; }, 0); });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuEntryId]);

  useEffect(() => {
    if (!pillPopup) return;
    const close = (ev) => {
      if (pillPopupRef.current && !pillPopupRef.current.contains(ev.target)) {
        setPillPopup(null);
        suppressNextClick.current = true;
        requestAnimationFrame(() => { setTimeout(() => { suppressNextClick.current = false; }, 0); });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pillPopup]);

  const overdue = isOld(e.due || e.date) && !e.done;
  const ids = e.catIds || (e.catId ? [e.catId] : []);
  const linked = cats.filter((c) => ids.includes(c.id));
  const projs = linked.filter(c => c.type === "project");
  const areas = linked.filter(c => c.type === "area");
  const ress  = linked.filter(c => c.type === "resource");

  const PILL_ICONS = { project: Circle, area: Triangle, resource: Square };

  const renderParaPill = (type, items) => {
    const PillIcon = PILL_ICONS[type];
    const cc = CC[type];
    const isPopupOpen = pillPopup && pillPopup.entryId === e.id && pillPopup.type === type;
    const label = type === 'project' ? t.projectSing : type === 'area' ? t.areaSing : t.resourceSing;
    const available = cats.filter(c => c.type === type && !c.archived && !ids.includes(c.id));

    return (
      <div className="task-item__pill-wrap" key={type}>
        {items.length === 0 ? (
          <button
            className="task-item__pill task-item__pill--icon-btn"
            style={{ color: cc.color }}
            onClick={(ev) => {
              ev.stopPropagation();
              setPillPopup(isPopupOpen ? null : { entryId: e.id, type, showAdd: true });
            }}
          >
            <PillIcon size={12} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            className="task-item__pill task-item__pill--cat-btn"
            style={{ color: cc.color, background: `var(--pill-${type}-bg)` }}
            onClick={(ev) => {
              ev.stopPropagation();
              setPillPopup(isPopupOpen ? null : { entryId: e.id, type, showAdd: false });
            }}
          >
            {items[0].name}{items.length > 1 ? ` +${items.length - 1}` : ''}
          </button>
        )}

        {isPopupOpen && (
          <div className="task-item__pill-popup" ref={pillPopupRef} onClick={(ev) => ev.stopPropagation()}>
            {items.length > 0 && (
              <>
                {items.map(item => (
                  <div key={item.id} className="task-item__pill-popup-item">
                    <PillIcon size={10} color={cc.color} strokeWidth={2.5} />
                    <span className="task-item__pill-popup-name">{item.name}</span>
                    <button
                      className="task-item__pill-popup-remove"
                      onClick={() => {
                        const nextIds = ids.filter(id => id !== item.id);
                        onUpdateEntry && onUpdateEntry(e.id, { catIds: nextIds, catId: nextIds[0] || null });
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <div className="task-item__pill-popup-divider" />
              </>
            )}

            {!pillPopup.showAdd ? (
              <button
                className="task-item__pill-popup-add"
                onClick={() => setPillPopup({ ...pillPopup, showAdd: true })}
              >
                <Plus size={12} />
                <span>{label}</span>
              </button>
            ) : (
              <>
                {available.length === 0 ? (
                  <div className="task-item__pill-popup-empty">
                    {t.noCats(cc.label).split('\n')[0]}
                  </div>
                ) : (
                  available.map(opt => (
                    <button
                      key={opt.id}
                      className="task-item__pill-popup-option"
                      onClick={() => {
                        const nextIds = [...ids, opt.id];
                        onUpdateEntry && onUpdateEntry(e.id, { catIds: nextIds, catId: nextIds[0] || null });
                        setPillPopup({ ...pillPopup, showAdd: false });
                      }}
                    >
                      <PillIcon size={10} color={cc.color} strokeWidth={2} style={{ opacity: 0.5 }} />
                      <span>{opt.name}</span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)} isActive={menuEntryId === e.id || dateEntryId === e.id || (pillPopup && pillPopup.entryId === e.id)}>
      <div
        className={`task-item task-item--home ${e.done ? "task-item--done" : ""}`}
        onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
      >
        <div className="task-item__body">
          <div className="task-item__top-row">
            <div className={`task-item__title ${e.done ? "task-item__title--done" : ""}`}>
              {e.title}
            </div>
            <div className="task-item__actions-home">
              <button
                className="task-item__star-btn"
                onClick={(ev) => { ev.stopPropagation(); onToggleStar && onToggleStar(e.id); }}
              >
                <Star size={18} fill={e.starred ? '#F59E0B' : 'none'} color={e.starred ? '#F59E0B' : '#C0C0D0'} strokeWidth={e.starred ? 0 : 1.5} />
              </button>
              <button
                className="task-item__menu-btn"
                onClick={(ev) => { ev.stopPropagation(); setMenuEntryId(menuEntryId === e.id ? null : e.id); }}
              >
                <MoreVertical size={18} color="#C0C0D0" />
              </button>
            </div>
          </div>

          <div className="task-item__note-hint">
            {e.body || e.note || t.addNotePlaceholder}
          </div>

          <div className="task-item__pills">
            {e.type === 'calendar' ? (
              <span className="task-item__pill task-item__pill--date" style={{ cursor: 'default' }}>
                <Calendar size={12} />
                {e.date && <span>{isToday(e.date) ? t.todayCap : fmtDate(e.date, t.locale)}</span>}
                {e.time && <span>· {e.time} {t.oclock}</span>}
              </span>
            ) : e.type !== 'note' ? (
              <button
                className={`task-item__pill task-item__pill--date ${overdue ? 'task-item__pill--overdue' : ''}`}
                onClick={(ev) => { ev.stopPropagation(); setDateEntryId(dateEntryId === e.id ? null : e.id); }}
              >
                <Calendar size={12} />
                {e.due && <span>{isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}</span>}
              </button>
            ) : null}

            {renderParaPill('project', projs)}
            {renderParaPill('area', areas)}
            {renderParaPill('resource', ress)}
          </div>

          {dateEntryId === e.id && (
            <div className="task-item__date-popup" onClick={(ev) => ev.stopPropagation()}>
              <input
                type="date"
                className="task-item__date-input"
                value={e.due || ""}
                autoFocus
                onChange={(ev) => { onUpdateEntry && onUpdateEntry(e.id, { due: ev.target.value || null }); }}
              />
            </div>
          )}
        </div>

        {menuEntryId === e.id && (
          <div className="task-item__context-menu" ref={menuRef} onClick={(ev) => ev.stopPropagation()}>
            {e.type === 'task' && (
              <button
                className="task-item__context-menu-item"
                onClick={() => { onToggle && onToggle(e.id); setMenuEntryId(null); }}
              >
                <Check size={14} />
                <span>{e.done ? t.markOpen : t.markDone}</span>
              </button>
            )}
            {e.type === 'calendar' && (
              <button
                className="task-item__context-menu-item"
                onClick={() => { onToggle && onToggle(e.id); setMenuEntryId(null); }}
              >
                {e.done ? <ArchiveRestore size={14} /> : <Check size={14} />}
                <span>{e.done ? t.markOpen : t.markAttended}</span>
              </button>
            )}
            <button
              className="task-item__context-menu-item"
              onClick={() => { onOpenEntry && onOpenEntry(e); setMenuEntryId(null); }}
            >
              <Edit2 size={14} />
              <span>{t.edit}</span>
            </button>
            {e.type === 'note' && (
              <button
                className="task-item__context-menu-item"
                onClick={() => { 
                  if (onArchiveEntry) onArchiveEntry(e.id);
                  else if (onUpdateEntry) onUpdateEntry(e.id, { archived: !e.archived });
                  setMenuEntryId(null); 
                }}
              >
                {isArchive ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                <span>{isArchive ? t.restore : t.archive}</span>
              </button>
            )}
            <div className="task-item__context-menu-divider" />
            <button
              className="task-item__context-menu-item task-item__context-menu-item--danger"
              onClick={() => { onDelete(e.id); setMenuEntryId(null); }}
            >
              <Trash2 size={14} />
              <span>{t.delete}</span>
            </button>
          </div>
        )}
      </div>
    </SwipeToDelete>
  );
}


export function TaskList({ entries, cats, onToggle, onToggleStar, onUpdateEntry, onDelete, t, CC, grouped, color, onOpenEntry, isHome, isArchive }) {
  // State für Kontextmenü, Datum-Popup und Pill-Popup (nur Home)
  const [menuEntryId, setMenuEntryId] = useState(null);
  const [dateEntryId, setDateEntryId] = useState(null);
  // pillPopup: { entryId, type, showAdd } – welches Pill-Popup offen ist
  const [pillPopup, setPillPopup] = useState(null);
  const menuRef = useRef(null);
  const pillPopupRef = useRef(null);
  // Flag: unterdrückt den nächsten Click nach dem Schließen eines Popups
  const suppressNextClick = useRef(false);

  // Kontextmenü schließen bei Klick außerhalb
  useEffect(() => {
    if (!menuEntryId) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuEntryId(null);
        // Nächsten Click unterdrücken, damit kein Eintrag geöffnet wird
        suppressNextClick.current = true;
        requestAnimationFrame(() => {
          setTimeout(() => { suppressNextClick.current = false; }, 0);
        });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuEntryId]);

  // Pill-Popup schließen bei Klick außerhalb
  useEffect(() => {
    if (!pillPopup) return;
    const close = (e) => {
      if (pillPopupRef.current && !pillPopupRef.current.contains(e.target)) {
        setPillPopup(null);
        // Nächsten Click unterdrücken
        suppressNextClick.current = true;
        requestAnimationFrame(() => {
          setTimeout(() => { suppressNextClick.current = false; }, 0);
        });
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pillPopup]);

  const renderItem = (e) => {
    const overdue = isOld(e.due) && !e.done;

    // ── Home-Ansicht: Neues Karten-Design ──
    if (isHome) {
      return (
        <HomeEntryItem
          key={e.id}
          e={e}
          cats={cats}
          onDelete={onDelete}
          onToggle={onToggle}
          onToggleStar={onToggleStar}
          onUpdateEntry={onUpdateEntry}
          onOpenEntry={onOpenEntry}
          t={t}
          CC={CC}
          isArchive={isArchive}
        />
      );
    }

    // ── Standard-Ansicht (Kategorie-Detail etc.) ──
    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div
          className={`task-item ${e.done && !isArchive ? "task-item--done" : ""} ${isArchive ? "task-item--archive" : ""}`}
          onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
        >
          <div className="task-item__body">
            <div
              className={`task-item__title ${
                e.done && !isArchive ? "task-item__title--done" : ""
              }`}
            >
              {e.title}
            </div>
            
            <div className="task-item__meta">
              {e.due && (
                <span
                  className={`task-item__due ${overdue ? "task-item__due--overdue" : ""}`}
                >
                  {isToday(e.due) ? t.todayCap : fmtDate(e.due, t.locale)}
                  {e.time && ` · ${e.time} ${t.oclock}`}
                </span>
              )}
              <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={isHome} />
            </div>
          </div>
          {isArchive ? (
            <button
              className="task-item__archive-restore-btn"
              onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
            >
              <ArchiveRestore size={16} />
            </button>
          ) : (
            <button
              className={`task-item__checkbox ${
                e.done ? "task-item__checkbox--checked" : ""
              }`}
              onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
            >
              {e.done && <Check size={12} color="#7C83F7" strokeWidth={3} />}
            </button>
          )}
        </div>
      </SwipeToDelete>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    if (!e.due || isToday(e.due) || isOld(e.due)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(e.due, t.locale, true);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.due) - new Date(b.due));
  });

  return (
    <>
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={t.todayGroup} data-group-right="">
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right}>
          {!isHome && (
            <div className="task-group-header">
              <span className="task-group-header__left">{g.left}</span>
              <span className="task-group-header__right">{g.right}</span>
            </div>
          )}
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


export function NoteList({ entries, cats, onDelete, onToggleStar, onUpdateEntry, CC, grouped, color, t, onOpenEntry, onArchiveEntry, isHome, isArchive }) {
  const renderItem = (e) => {
    if (isHome) {
      return (
        <HomeEntryItem
          key={e.id}
          e={e}
          cats={cats}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
          onUpdateEntry={onUpdateEntry}
          onOpenEntry={onOpenEntry}
          onArchiveEntry={onArchiveEntry}
          t={t}
          CC={CC}
          isArchive={isArchive}
        />
      );
    }

    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div 
          className={`note-item ${isHome ? "note-item--home" : ""} ${isArchive ? "note-item--archive" : ""}`} 
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          <div className="note-item__header">
            <div className="note-item__body">
              <div className="note-item__title">{e.title}</div>
              {e.body && <div className="note-item__excerpt">{e.body}</div>}
            </div>
            <button
               className="note-item__archive-btn"
               onClick={(ev) => {
                 ev.stopPropagation();
                 onArchiveEntry && onArchiveEntry(e.id);
               }}
            >
               {isArchive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px', lineHeight: 1 }}>
            {!isHome && (
              <span className="task-item__due" style={{ marginTop: 0 }}>
                {fmtRelative(e.createdAt, t.locale)}
              </span>
            )}
            <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={isHome} />
          </div>
        </div>
      </SwipeToDelete>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    const d = e.due || e.date;
    if (!d || isToday(d) || isOld(d)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(d, t.locale, true);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.due || a.date) - new Date(b.due || b.date));
  });

  return (
    <>
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={t.todayGroup} data-group-right="">
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right}>
          {!isHome && (
            <div className="task-group-header">
              <span className="task-group-header__left">{g.left}</span>
              <span className="task-group-header__right">{g.right}</span>
            </div>
          )}
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


export function CalList({ entries, cats, onDelete, onToggle, onToggleStar, onUpdateEntry, t, CC, grouped, color, onOpenEntry, isHome, isArchive }) {
  const renderItem = (e) => {
    if (isHome) {
      return (
        <HomeEntryItem
          key={e.id}
          e={e}
          cats={cats}
          onDelete={onDelete}
          onToggle={onToggle}
          onToggleStar={onToggleStar}
          onUpdateEntry={onUpdateEntry}
          onOpenEntry={onOpenEntry}
          t={t}
          CC={CC}
          isArchive={isArchive}
        />
      );
    }

    const past = e.date && e.date < TODAY;
    return (
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)}>
        <div
          className={`cal-item ${isToday(e.date) ? "cal-item--today" : ""} ${
            past && !isArchive ? "cal-item--past" : ""
          } ${isHome ? "cal-item--home" : ""} ${isArchive ? "cal-item--archive" : ""}`}
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          <div className="cal-item__row">
            {!isHome && (
              <div className="cal-item__date-badge">
                <div className="cal-item__date-month">
                  {e.date
                    ? new Date(e.date + "T12:00").toLocaleDateString(t.locale, {
                        month: "short",
                      })
                    : ""}
                </div>
                <div className="cal-item__date-day">
                  {e.date ? new Date(e.date + "T12:00").getDate() : ""}
                </div>
              </div>
            )}
            <div className="cal-item__info">
              <div className="cal-item__title">{e.title}</div>
              {e.time && <div className="cal-item__time">{e.time}{t.oclock ? " " + t.oclock : ""}</div>}
              <div className="cal-item__tags">
                <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={isHome} />
              </div>
            </div>
            {isArchive && (
              <button
                className="task-item__archive-restore-btn"
                style={{ marginLeft: '12px' }}
                onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); /* In archive context, onDelete acts as toggle for some lists? Need to check. */ }}
              >
                <ArchiveRestore size={16} />
              </button>
            )}
          </div>
        </div>
      </SwipeToDelete>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  const todayTasks = [];
  const groupedTasks = new Map();

  entries.forEach((e) => {
    const d = e.date;
    if (!d || isToday(d) || isOld(d)) {
      todayTasks.push(e);
    } else {
      const g = getTaskGroup(d, t.locale, true);
      const key = `${g.left}|${g.right}`;
      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, { ...g, items: [] });
      }
      groupedTasks.get(key).items.push(e);
    }
  });

  const futureGroups = Array.from(groupedTasks.values());
  futureGroups.sort((a, b) => a.sortKey - b.sortKey);
  futureGroups.forEach((g) => {
    g.items.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return (
    <>
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={t.todayGroup} data-group-right="">
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right}>
          {!isHome && (
            <div className="task-group-header">
              <span className="task-group-header__left">{g.left}</span>
              <span className="task-group-header__right">{g.right}</span>
            </div>
          )}
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


export function MediaList({ entries, cats, onDelete, t, CC }) {
  const getMediaConfig = (mediaType) => {
    switch (mediaType) {
      case "image": return { Icon: ImageIcon, color: "#0D9488", label: t.image };
      case "video": return { Icon: VideoIcon, color: "#EF4444", label: t.video };
      case "audio": return { Icon: AudioIcon, color: "#F97316", label: t.audio };
      case "document": return { Icon: DocumentIcon, color: "#0078D4", label: t.document };
      default: return { Icon: Paperclip, color: "#9CA3AF", label: t.file };
    }
  };

  return entries.map((e) => {
    const { Icon, color, label } = getMediaConfig(e.mediaType);
    return (
      <div 
        key={e.id} 
        className="media-item"
        style={{ cursor: e.mediaData ? 'pointer' : 'default' }}
        onClick={() => {
          if (e.mediaData) {
            const url = URL.createObjectURL(e.mediaData);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }}
      >
        <div className="media-item__icon" style={{ background: color + "22", color: color }}>
          <Icon size={18} />
        </div>
        <div className="media-item__body">
          <div className="media-item__title">{e.title}</div>
          <div className="media-item__meta">{label}</div>
          <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={isHome} />
        </div>
        <button 
          className="media-item__delete" 
          onClick={(ev) => { 
            ev.stopPropagation(); 
            onDelete(e.id); 
          }}
        >
          <Trash2 size={14} color="#5858A0" />
        </button>
      </div>
    );
  });
}


export function LinkList({ entries, cats, onDelete, CC }) {
  return entries.map((e) => {
    const ytId = getYouTubeVideoId(e.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
    return (
      <div key={e.id} className="media-item media-item--link">
        <div className="media-item__header-row">
          <div className="media-item__title-box">
             <div className="media-item__icon-mini" style={{ color: "#7C3AED" }}>
               <BookmarkIcon size={14} />
             </div>
             <div className="media-item__title">{e.title}</div>
          </div>
          <button 
            className="media-item__delete" 
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete(e.id);
            }}
          >
            <Trash2 size={14} color="#5858A0" />
          </button>
        </div>
        
        <div className="media-item__content">
          {embedUrl && (
            <div className="link-item__preview">
              <iframe
                title={`YouTube preview ${e.title}`}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
          <div className="media-item__footer-meta">
            {e.url && <div className="media-item__meta">{e.url}</div>}
            <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={isHome} />
          </div>
        </div>
      </div>
    );
  });
}


