import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical } from 'lucide-react';
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete } from "./shared";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { useInactivity } from "./hooks/useInactivity";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";

export function EntryDetailScreen({ t, CC, theme, entry, cat, allCats, onUpdate, onDelete, onBack }) {
  const fabVisible = useInactivity(5000);
  const [showConnSelect, setShowConnSelect] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const connPopupRef = useRef(null);
  const connPillRef = useRef(null);
  const dateInputRef = useRef(null);
  const datePillRef = useRef(null);
  const menuPopupRef = useRef(null);
  const menuButtonRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (showConnSelect && connPopupRef.current && !connPopupRef.current.contains(e.target) && connPillRef.current && !connPillRef.current.contains(e.target)) {
      setShowConnSelect(false);
    }
    if (showDate && dateInputRef.current && !dateInputRef.current.contains(e.target) && datePillRef.current && !datePillRef.current.contains(e.target)) {
      setShowDate(false);
    }
    if (showMenu && menuPopupRef.current && !menuPopupRef.current.contains(e.target) && menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
      setShowMenu(false);
    }
  }, [showConnSelect, showDate, showMenu]);

  const typeIcon = {
    task: CheckCircle2,
    note: FileText,
    calendar: Calendar,
    media: Paperclip,
    link: Link2,
  }[entry.type] || FileText;
  
  const TypeIcon = typeIcon;
  const cfgColor = entry.type === "task" ? "#7C83F7" : 
    entry.type === "note" ? "#F59E0B" : 
    entry.type === "calendar" ? "#1D4ED8" : "#9CA3AF";

  const alpha = theme === 'light' ? "0C" : "18";

  return (
    <div className="cat-detail" onClick={handleClickOutside}>
      {/* Header */}
      <div
        className="cat-detail__header"
        style={{
          background: entry.type === "calendar"
            ? "linear-gradient(135deg, rgba(29,78,216,0.10) 0%, rgba(29,78,216,0.03) 100%)"
            : cfgColor + alpha,
          borderBottomColor: entry.type === "calendar" ? "rgba(29,78,216,0.18)" : undefined,
        }}
      >
        <div className="cat-detail__title-row">
          <TypeIcon size={18} color={cfgColor} />
          <input
            className="cat-detail__title-input"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
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
                  onClick={() => { onUpdate({ starred: !entry.starred }); setShowMenu(false); }}
                >
                  <Star size={16} fill={entry.starred ? "#F59E0B" : "none"} color={entry.starred ? "#F59E0B" : "#5858A0"} style={{ marginRight: '10px' }} />
                  <span>{entry.starred ? t.unmarkFavorite : t.markFavorite}</span>
                </button>
                <button 
                  className="cat-detail__conn-item"
                  onClick={() => { onUpdate({ archived: !entry.archived }); setShowMenu(false); }}
                >
                  {entry.archived ? <ArchiveRestore size={16} color="#5858A0" style={{ marginRight: '10px' }} /> : <Archive size={16} color="#5858A0" style={{ marginRight: '10px' }} />}
                  <span>{entry.archived ? t.restore : t.archive}</span>
                </button>
                {entry.type === "calendar" && (
                  <button 
                    className="cat-detail__conn-item"
                    onClick={() => { onUpdate({ isBirthday: !entry.isBirthday }); setShowMenu(false); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={entry.isBirthday ? "#F59E0B" : "#5858A0"} style={{ width: 16, height: 16, marginRight: '10px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056-4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
                    </svg>
                    <span>{entry.isBirthday ? t.unsetBirthday : t.setBirthday}</span>
                  </button>
                )}
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
            {/* 1. Datumspille (Aufgabe / Kalender / Notiz-Erstellung) — kommt zuerst */}
            {(entry.type === "task" || entry.type === "calendar") && (
              <button
                ref={datePillRef}
                className="cat-detail__date-pill"
                onClick={(e) => { e.stopPropagation(); setShowDate(!showDate); }}
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
                    ref={connPillRef}
                    className="cat-detail__date-pill"
                    onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
                  >
                    {t.connectSelection}
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} ref={connPillRef}>
                  <button
                    className="cat-detail__date-pill"
                    onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
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
                        onClick={(e) => { e.stopPropagation(); setShowConnSelect(!showConnSelect); }}
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

          {/* Connection Popup */}
          {showConnSelect && (
            <div className="cat-detail__conn-popup" ref={connPopupRef} onClick={(e) => e.stopPropagation()}>
              <div className="cat-detail__conn-list">
                {allCats.length === 0 ? (
                  <div className="cat-detail__conn-empty">{t.noCats('?').split('\n')[0]}</div>
                ) : (
                  allCats.map(opt => {
                    const isSelected = (entry.catIds || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        className={`cat-detail__conn-item ${isSelected ? 'cat-detail__conn-item--selected' : ''}`}
                        onClick={() => {
                          const nextIds = isSelected
                            ? (entry.catIds || []).filter(id => id !== opt.id)
                            : [...(entry.catIds || []), opt.id];
                          onUpdate({ catIds: nextIds, catId: nextIds[0] || null });
                        }}
                      >
                        <span 
                          className="cat-detail__conn-dot" 
                          style={{ 
                            background: (CC[opt.type]?.color || CC.resource.color),
                            border: isSelected ? '2px solid #fff' : 'none',
                            boxShadow: isSelected ? '0 0 0 1px ' + (CC[opt.type]?.color || CC.resource.color) : 'none'
                          }} 
                        />
                        <span className="cat-detail__conn-name" style={{ fontWeight: isSelected ? 600 : 400 }}>{opt.name}</span>
                        {isSelected && <Check size={12} color={CC[opt.type]?.color} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })
                )}
              </div>
              <button
                className="cat-detail__conn-none"
                onClick={() => {
                  onUpdate({ catIds: [], catId: null });
                  setShowConnSelect(false);
                }}
              >
                {t.noConnection}
              </button>
            </div>
          )}

          <div className="cat-detail__archive-placeholder" style={{ flex: 1 }} />
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
      
      {/* Content */}
      <div className="cat-detail__body" style={{ flex: 1 }}>
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
      </div>

      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}


