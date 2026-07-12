import React, { useState, useRef, useEffect } from 'react';
import { Circle, Triangle, Square, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Bell, Trash2, FileText, CheckSquare, Calendar, Clock, Home, Edit2, Search, Link2, Pencil, Paperclip, Image as ImageIcon, CheckCircle2, Archive, ArchiveRestore, Moon, Sun, Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon, Star, MoreVertical, Pin, ShieldCheck } from 'lucide-react';
import { TODAY, isOld, isToday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, NOTIF_RED, CAT_ICONS, ID_BIRTHDAYS } from "../utils";
import { SwipeToDelete } from "./SwipeToDelete";
import { AutoScrollText } from "./AutoScrollText";
import { EntryActionSheet } from "./EntryActionSheet";
import { LinkSheet } from "./LinkSheet";
import { CatLinkSheet } from "./CatLinkSheet";
import { LinkedPillSheet } from "./LinkedPillSheet";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon, GitMergeBranchIcon } from "./AppIcons";

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
            <Circle size={10} color={CC.project.color} strokeWidth={2.5} style={{ marginRight: 3, flexShrink: 0 }} />
            {projs[0].name}{projs.length > 1 ? ` +${projs.length - 1}` : ""}
          </span>
        )}
        {areas.length > 0 && (
          <span
            className="task-item__cat-tag"
            style={{ color: CC.area.color, background: 'var(--pill-area-bg)' }}
          >
            <Triangle size={10} color={CC.area.color} strokeWidth={2.5} style={{ marginRight: 3, flexShrink: 0 }} />
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
            <Circle size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
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
            <Triangle size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
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
            <Square size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            {res[0].name}{res.length > 1 ? ` +${res.length - 1}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}/* ── Home Entry Item ─────────────────────────────────────────── */


export function HomeEntryItem({ e, cats, onDelete, onToggle, onToggleStar, onTogglePin, onUpdateEntry, onOpenEntry, onArchiveEntry, t, CC, isArchive }) {
  const [menuEntryId, setMenuEntryId] = useState(null);
  const [dateEntryId, setDateEntryId] = useState(null);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [pillSheetType, setPillSheetType] = useState(null);
  const menuRef = useRef(null);
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

  const overdue = isOld(e.due || e.date) && !e.done;
  const ids = e.catIds || (e.catId ? [e.catId] : []);
  const linked = cats.filter((c) => ids.includes(c.id));
  const projs = linked.filter(c => c.type === "project");
  const areas = linked.filter(c => c.type === "area");
  const ress  = linked.filter(c => c.type === "resource");
  const isBirthdayEntry = e.isBirthday || e.catId === ID_BIRTHDAYS || (e.catIds && e.catIds.includes(ID_BIRTHDAYS));

  const PILL_ICONS = { project: Circle, area: Triangle, resource: Square };

  // Verknüpfte Kategorie als farbiges Icon (stellvertretend, ohne Name).
  // Bei mehreren Einträgen derselben Kategorie zusätzlich "+N" in Kategorie-
  // farbe. Tippen öffnet das kompakte Detail-Sheet (LinkedPillSheet).
  const renderLinkedPill = (type, items) => {
    if (items.length === 0) return null;
    const PillIcon = PILL_ICONS[type];
    const cc = CC[type];
    return (
      <button
        key={type}
        className="task-item__pill task-item__pill--cat-icon"
        style={{ color: cc.color }}
        onClick={(ev) => { ev.stopPropagation(); setPillSheetType(type); }}
      >
        <PillIcon size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
        {items.length > 1 && <span>+{items.length - 1}</span>}
      </button>
    );
  };

  return (
    <SwipeToDelete
      key={e.id}
      onDelete={() => onDelete(e.id)}
      onComplete={
        (e.type === 'task' || e.type === 'calendar') && onToggle
          ? () => onToggle(e.id)
          : e.type === 'note' && onUpdateEntry
            ? () => onUpdateEntry(e.id, { done: true })
            : undefined
      }
      isActive={menuEntryId === e.id || dateEntryId === e.id || linkSheetOpen || !!pillSheetType}
    >
      <div
        className={`task-item task-item--home ${e.done ? "task-item--done" : ""} ${isBirthdayEntry ? "task-item--birthday" : ""}`}
        onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
      >
        {e.type === 'task' && (
          <button
            className={`task-item__type-icon ${e.starred ? "task-item__type-icon--starred" : ""} ${e.done ? "task-item__type-icon--done" : ""}`}
            onClick={(ev) => { ev.stopPropagation(); onToggleStar && onToggleStar(e.id); }}
          >
            {e.starred
              ? <Star size={26} fill="#F59E0B" color="#F59E0B" strokeWidth={0} />
              : e.done
                ? <CheckCircle2 size={26} color="#0B8CE9" strokeWidth={2.25} />
                : <Circle size={26} color="#0B8CE9" strokeWidth={2.25} />}
          </button>
        )}
        {e.type === 'note' && (
          <button
            className={`note-item__type-icon ${e.starred ? "note-item__type-icon--starred" : ""}`}
            onClick={(ev) => { ev.stopPropagation(); onToggleStar && onToggleStar(e.id); }}
          >
            {e.starred
              ? <Star size={26} fill="#F59E0B" color="#F59E0B" strokeWidth={0} />
              : <FileText size={26} color="#FBBF24" strokeWidth={2.25} />}
          </button>
        )}
        {e.type === 'calendar' && (
          <button
            className={`cal-item__type-icon ${e.starred ? "cal-item__type-icon--starred" : ""}`}
            onClick={(ev) => { ev.stopPropagation(); onToggleStar && onToggleStar(e.id); }}
          >
            {e.starred
              ? <Star size={26} fill="#F59E0B" color="#F59E0B" strokeWidth={0} />
              : <Calendar size={26} color="#1E3A8A" strokeWidth={2.25} />}
          </button>
        )}
        <div className="task-item__body">
          <div className="task-item__top-row">
            <div className={`task-item__title ${e.done ? "task-item__title--done" : ""}`}>
              <AutoScrollText>{e.title}</AutoScrollText>
            </div>
            {e.pinned && (
              <button
                type="button"
                className="task-item__pin"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onTogglePin?.(e.id);
                }}
                aria-label={t.actionUnpin || "Lösen"}
                title={t.actionUnpin || "Lösen"}
              >
                <Pin size={13} />
              </button>
            )}
          </div>

          <div className="task-item__note-hint">
            <AutoScrollText>{e.body || e.note || t.addNotePlaceholder}</AutoScrollText>
          </div>

          <div className="task-item__pills-row">
            <div className="task-item__pills">
              {e.type === 'note' ? (
                <span className="task-item__pill task-item__pill--date" style={{ cursor: 'default' }}>
                  <Clock size={12} />
                  <span>{new Date(e.createdAt).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })}</span>
                </span>
              ) : (e.type === 'task' || e.type === 'calendar') ? (
                <button
                  className={`task-item__pill task-item__pill--date ${overdue ? 'task-item__pill--overdue' : ''}`}
                  onClick={(ev) => { ev.stopPropagation(); setDateEntryId(dateEntryId === e.id ? null : e.id); }}
                >
                  {isToday(e.type === 'calendar' ? e.date : e.due) ? (
                    <>
                      <Clock size={12} />
                      {e.time && <span>{e.time} {t.oclock}</span>}
                    </>
                  ) : (
                    <>
                      <Calendar size={12} />
                      {(e.type === 'calendar' ? e.date : e.due) && (
                        <span>{fmtDate(e.type === 'calendar' ? e.date : e.due, t.locale)}</span>
                      )}
                      {e.time && <span>· {e.time} {t.oclock}</span>}
                    </>
                  )}
                </button>
              ) : null}

              {renderLinkedPill('project', projs)}
              {renderLinkedPill('area', areas)}
              {renderLinkedPill('resource', ress)}

              <button
                className="task-item__link-btn"
                onClick={(ev) => { ev.stopPropagation(); setLinkSheetOpen(true); }}
                aria-label={t.linkSheetTitle}
              >
                <GitMergeBranchIcon size={16} strokeWidth={2} />
              </button>
            </div>

            <button
              className="task-item__menu-btn"
              onClick={(ev) => { ev.stopPropagation(); setMenuEntryId(menuEntryId === e.id ? null : e.id); }}
            >
              <MoreVertical size={18} color="#C0C0D0" />
            </button>
          </div>

          {dateEntryId === e.id && (
            <div className="task-item__date-popup" style={{ display: 'flex', gap: '8px' }} onClick={(ev) => ev.stopPropagation()}>
              <input
                type="date"
                className="task-item__date-input"
                value={(e.type === 'calendar' ? e.date : e.due) || ""}
                autoFocus
                onChange={(ev) => {
                  const val = ev.target.value || null;
                  if (e.type === 'calendar') {
                    onUpdateEntry && onUpdateEntry(e.id, { date: val });
                  } else {
                    onUpdateEntry && onUpdateEntry(e.id, { due: val });
                  }
                }}
              />
              <input
                type="time"
                className="task-item__date-input"
                value={e.time || ""}
                onChange={(ev) => { onUpdateEntry && onUpdateEntry(e.id, { time: ev.target.value || null }); }}
              />
            </div>
          )}
        </div>

      </div>

      {menuEntryId === e.id && (() => {
        const dateField = e.type === 'calendar' ? 'date' : 'due';
        const addTag = (name) => Array.from(new Set([...(e.tags || []), name]));
        return (
          <EntryActionSheet
            title={e.title}
            type={e.type}
            t={t}
            flags={{ done: !!e.done, starred: !!e.starred, pinned: !!e.pinned }}
            dateValue={e[dateField]}
            onClose={() => setMenuEntryId(null)}
            on={{
              // Erledigt: Aufgabe/Termin via onToggle (Celebration); Notiz via done-Flag
              done: () => (e.type === 'note' ? onUpdateEntry?.(e.id, { done: true }) : onToggle?.(e.id)),
              reopen: () => (e.type === 'note' ? onUpdateEntry?.(e.id, { done: false }) : onToggle?.(e.id)),
              // Verschoben: neues Datum + Tag, bleibt sichtbar
              postpone: (newDate) => onUpdateEntry?.(e.id, { [dateField]: newDate, tags: addTag(t.tagPostponed) }),
              // Abgesagt: wie erledigt (raus aus aktiver Liste, ins Archiv) + Tag
              cancel: () => onUpdateEntry?.(e.id, { done: true, tags: addTag(t.tagCancelled) }),
              pin: () => onTogglePin?.(e.id),
              star: () => onToggleStar?.(e.id),
              edit: () => onOpenEntry?.(e),
              archive: () => onUpdateEntry?.(e.id, { archived: true }),
              trash: () => onDelete?.(e.id),
            }}
          />
        );
      })()}

      {pillSheetType && (
        <LinkedPillSheet
          type={pillSheetType}
          items={pillSheetType === 'project' ? projs : pillSheetType === 'area' ? areas : ress}
          CC={CC}
          t={t}
          onMore={() => { setPillSheetType(null); setLinkSheetOpen(true); }}
          onClose={() => setPillSheetType(null)}
        />
      )}

      {linkSheetOpen && (
        <LinkSheet
          currentIds={ids}
          cats={cats}
          CC={CC}
          t={t}
          onConfirm={(nextIds) => {
            onUpdateEntry && onUpdateEntry(e.id, { catIds: nextIds, catId: nextIds[0] || null });
            setLinkSheetOpen(false);
          }}
          onClose={() => setLinkSheetOpen(false)}
        />
      )}
    </SwipeToDelete>
  );
}

/* ── Home Category Item (PARA-Zeile im Aufgaben-Layout) ──────── */
const CAT_PILL_ICONS = { project: Circle, area: Triangle, resource: Square };

export function HomeCatItem({ c, cats = [], t, CC, onOpenCat, onUpdateCat, onTogglePin, onToggleVerified, onTrash }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const suppressNextClick = useRef(false);
  const Icon = CAT_PILL_ICONS[c.type] || Circle;
  const color = CC[c.type]?.color || "#E03E3E";
  const isProject = c.type === "project";
  const isResource = c.type === "resource";
  const isArea = c.type === "area";
  // Bereiche & Ressourcen haben kein wählbares Datum → Pille zeigt das
  // Entstehungsdatum. Projekte zeigen ihr (ggf. gesetztes) Datum bzw. "Flexibel".
  const pillDate =
    (isResource || isArea)
      ? (c.createdAt ? fmtDate(c.createdAt.split("T")[0], t.locale) : (t.flexible || "Flexibel"))
      : (c.date ? fmtDate(c.date, t.locale) : (t.flexible || "Flexibel"));
  const addTag = (name) => Array.from(new Set([...(c.tags || []), name]));
  const update = (patch) => onUpdateCat?.(c.id, patch);

  return (
    <SwipeToDelete
      key={c.id}
      onDelete={() => onTrash?.(c.id)}
      onComplete={
        isProject
          ? () => update({ archived: true })
          : isResource && onToggleVerified
            ? () => onToggleVerified(c.id)
            : undefined
      }
      completeColor={isResource ? "#30A060" : undefined}
      CompleteIcon={isResource ? ShieldCheck : undefined}
      isActive={menuOpen || linkSheetOpen}
    >
      <div
        className="task-item task-item--home"
        onClick={() => { if (suppressNextClick.current) return; onOpenCat?.(c); }}
      >
        <button
          className={`task-item__type-icon task-item__type-icon--cat ${c.starred ? "task-item__type-icon--starred" : ""}`}
          style={{ "--cat-tint": color }}
          onClick={(ev) => { ev.stopPropagation(); update({ starred: !c.starred }); }}
          aria-label={c.starred ? t.unmarkFavorite : t.markFavorite}
        >
          {c.starred
            ? <Star size={26} fill="#F59E0B" color="#F59E0B" strokeWidth={0} />
            : <Icon size={26} color={color} strokeWidth={2.25} />}
        </button>
        <div className="task-item__body">
          <div className="task-item__top-row">
            <div className="task-item__title">
              <AutoScrollText>{c.name}</AutoScrollText>
            </div>
            {c.pinned && (
              <button
                type="button"
                className="task-item__pin"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onTogglePin?.(c.id);
                }}
                aria-label={t.actionUnpin || "Lösen"}
                title={t.actionUnpin || "Lösen"}
              >
                <Pin size={13} />
              </button>
            )}
          </div>

          <div className="task-item__note-hint">
            <AutoScrollText>{c.body || t.addNotePlaceholder}</AutoScrollText>
          </div>

          <div className="task-item__pills-row">
            <div className="task-item__pills">
              <span className="task-item__pill task-item__pill--date" style={{ cursor: 'default' }}>
                <Calendar size={12} />
                <span>{pillDate}</span>
              </span>
              {isResource && c.verified && (
                <span className="task-item__pill" style={{ color: "#30A060", cursor: 'default' }}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}

              {/* Verknüpfen – wie bei den Eintrags-Zeilen, rechts neben der
                  Datumspille. Verbindet die Kategorie über relatedId
                  (Projekt↔Ressourcen/Bereich, Bereich↔Projekte/Ressourcen,
                  Ressource↔Projekt/Bereich). */}
              <button
                className="task-item__link-btn"
                onClick={(ev) => { ev.stopPropagation(); setLinkSheetOpen(true); }}
                aria-label={t.linkSheetTitle}
              >
                <GitMergeBranchIcon size={16} strokeWidth={2} />
              </button>
            </div>

            <button
              className="task-item__menu-btn"
              onClick={(ev) => { ev.stopPropagation(); setMenuOpen(true); }}
            >
              <MoreVertical size={18} color="#C0C0D0" />
            </button>
          </div>
        </div>
      </div>

      {linkSheetOpen && (
        <CatLinkSheet
          cat={c}
          cats={cats}
          CC={CC}
          t={t}
          onUpdateCat={onUpdateCat}
          onClose={() => setLinkSheetOpen(false)}
        />
      )}

      {menuOpen && (
        <EntryActionSheet
          title={c.name}
          type={c.type}
          t={t}
          flags={{ done: false, starred: !!c.starred, pinned: !!c.pinned, verified: !!c.verified }}
          dateValue={c.date}
          onClose={() => setMenuOpen(false)}
          on={{
            // Projekt: erledigen/absagen = archivieren (Projekte haben kein done-Flag)
            done: isProject ? () => update({ archived: true }) : undefined,
            postpone: isProject ? (d) => update({ date: d, tags: addTag(t.tagPostponed) }) : undefined,
            cancel: isProject ? () => update({ archived: true, tags: addTag(t.tagCancelled) }) : undefined,
            verify: isResource ? () => onToggleVerified?.(c.id) : undefined,
            pin: () => onTogglePin?.(c.id),
            star: () => update({ starred: !c.starred }),
            edit: () => onOpenCat?.(c),
            archive: () => update({ archived: true }),
            trash: () => onTrash?.(c.id),
          }}
        />
      )}
    </SwipeToDelete>
  );
}


export function TaskList({ entries, cats, onToggle, onToggleStar, onTogglePin, onUpdateEntry, onDelete, t, CC, grouped, color: _color, onOpenEntry, isHome, isArchive }) {
  // State für Kontextmenü und Pill-Popup (nur Home)
  const [menuEntryId, setMenuEntryId] = useState(null);
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
          onTogglePin={onTogglePin}
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
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)} onComplete={!isArchive && onToggle ? () => onToggle(e.id) : undefined}>
        <div
          className={`task-item ${e.done && !isArchive ? "task-item--done" : ""} ${isArchive ? "task-item--archive" : ""}`}
          onClick={() => { if (suppressNextClick.current) return; onOpenEntry && onOpenEntry(e); }}
        >
          {!isArchive && (
            <button
              className={`task-item__type-icon ${e.done ? "task-item__type-icon--done" : ""}`}
              onClick={(ev) => { ev.stopPropagation(); onToggle && onToggle(e.id); }}
              aria-label={e.done ? t.markUndone || "Mark as not done" : t.markDone || "Mark as done"}
            >
              {e.done
                ? <CheckCircle2 size={26} color="#0B8CE9" strokeWidth={2.25} />
                : <Circle size={26} color="#0B8CE9" strokeWidth={2.25} />}
            </button>
          )}
          <div className="task-item__body">
            <div
              className={`task-item__title ${
                e.done && !isArchive ? "task-item__title--done" : ""
              }`}
            >
              <AutoScrollText>{e.title}</AutoScrollText>
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
          {isArchive && (
            <button
              className="task-item__archive-restore-btn"
              onClick={(ev) => { ev.stopPropagation(); onToggle(e.id); }}
            >
              <ArchiveRestore size={16} />
            </button>
          )}
        </div>
      </SwipeToDelete>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  // Fixierter Eintrag (genau einer pro Liste) wird ganz oben angepinnt.
  const pinned = isHome ? entries.find((e) => e.pinned) : null;
  const source = pinned ? entries.filter((e) => e.id !== pinned.id) : entries;

  const todayTasks = [];
  const groupedTasks = new Map();

  source.forEach((e) => {
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
      {pinned && renderItem(pinned)}
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={t.todayGroup} data-group-right="" data-group-count={todayTasks.length}>
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right} data-group-count={g.items.length}>
          <div className={`task-group-header ${isHome ? "task-group-header--home" : ""}`}>
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__badge">{g.items.length}</span>
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


export function NoteList({ entries, cats, onDelete, onToggleStar, onTogglePin, onUpdateEntry, CC, grouped, color: _color, t, onOpenEntry, onArchiveEntry, isHome, isArchive }) {
  const renderItem = (e) => {
    if (isHome) {
      return (
        <HomeEntryItem
          key={e.id}
          e={e}
          cats={cats}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
          onTogglePin={onTogglePin}
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
      <SwipeToDelete
        key={e.id}
        onDelete={() => onDelete(e.id)}
        onComplete={!isArchive && onUpdateEntry ? () => onUpdateEntry(e.id, { done: true }) : undefined}
      >
        <div
          className={`note-item ${isHome ? "note-item--home" : ""} ${isArchive ? "note-item--archive" : ""}`}
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          {!isHome && (
            <div className="note-item__type-icon" aria-hidden="true">
              <FileText size={26} color="#FBBF24" strokeWidth={2.25} />
            </div>
          )}
          <div className="note-item__content">
            <div className="note-item__header">
              <div className="note-item__body">
                <div className="note-item__title"><AutoScrollText>{e.title}</AutoScrollText></div>
                {e.body && <div className="note-item__excerpt"><AutoScrollText>{e.body}</AutoScrollText></div>}
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
        </div>
      </SwipeToDelete>
    );
  };

  if (!grouped) {
    return entries.map(renderItem);
  }

  // Fixierte Notiz (genau eine pro Liste) wird ganz oben angepinnt.
  const pinned = isHome ? entries.find((e) => e.pinned) : null;
  const source = pinned ? entries.filter((e) => e.id !== pinned.id) : entries;

  const todayTasks = [];
  const groupedTasks = new Map();

  source.forEach((e) => {
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
    g.items.sort((a, b) => a.createdAt - b.createdAt);
  });

  const getOldestLabel = (items) => {
    if (!items || items.length === 0) return "";
    const oldest = items.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const d = new Date(oldest.createdAt);
    // Nur das Datum – ohne Uhrzeit
    return `${t.oldestEntry}: ${d.toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })}`;
  };

  return (
    <>
      {pinned && renderItem(pinned)}
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={isHome ? getOldestLabel(todayTasks) : t.todayGroup} data-group-right="" data-group-count={todayTasks.length}>
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right} data-group-count={g.items.length}>
          <div className={`task-group-header ${isHome ? "task-group-header--home" : ""}`}>
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__badge">{g.items.length}</span>
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


export function CalList({ entries, cats, onDelete, onToggle, onToggleStar, onTogglePin, onUpdateEntry, t, CC, grouped, color: _color, onOpenEntry, isHome, isArchive }) {
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
          onTogglePin={onTogglePin}
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
      <SwipeToDelete key={e.id} onDelete={() => onDelete(e.id)} onComplete={!isArchive && onToggle ? () => onToggle(e.id) : undefined}>
        <div
          className={`cal-item ${isToday(e.date) ? "cal-item--today" : ""} ${
            past && !isArchive ? "cal-item--past" : ""
          } ${isHome ? "cal-item--home" : ""} ${isArchive ? "cal-item--archive" : ""}`}
          onClick={() => onOpenEntry && onOpenEntry(e)}
        >
          <div className="cal-item__row">
            {!isHome && (
              <div className="cal-item__type-icon" aria-hidden="true">
                <Calendar size={26} color="#1E3A8A" strokeWidth={2.25} />
              </div>
            )}
            <div className="cal-item__info">
              <div className="cal-item__title"><AutoScrollText>{e.title}</AutoScrollText></div>
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

  // Fixierter Termin (genau einer pro Liste) wird ganz oben angepinnt.
  const pinned = isHome ? entries.find((e) => e.pinned) : null;
  const source = pinned ? entries.filter((e) => e.id !== pinned.id) : entries;

  const todayTasks = [];
  const groupedTasks = new Map();

  source.forEach((e) => {
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
      {pinned && renderItem(pinned)}
      {todayTasks.length > 0 && (
        <div className={`task-group task-group--today ${isHome ? "task-group--home" : ""}`} data-group-left={t.todayGroup} data-group-right="" data-group-count={todayTasks.length}>
          {!isHome && (
            <div className="task-group-header task-group-header--today">
              <span className="task-group-header__left">{t.todayGroup}</span>
            </div>
          )}
          {todayTasks.map(renderItem)}
        </div>
      )}
      {futureGroups.map((g, i) => (
        <div key={i} className={`task-group ${isHome ? "task-group--home" : ""}`} data-group-left={g.left} data-group-right={g.right} data-group-count={g.items.length}>
          <div className={`task-group-header ${isHome ? "task-group-header--home" : ""}`}>
            <span className="task-group-header__left">{g.left}</span>
            <span className="task-group-header__badge">{g.items.length}</span>
            <span className="task-group-header__right">{g.right}</span>
          </div>
          {g.items.map(renderItem)}
        </div>
      ))}
    </>
  );
}


// Inline-Vorschau eines Medien-Eintrags (Bild/Video/Audio) aus dem in der
// Persistenz liegenden Blob. Object-URL wird beim Unmount wieder freigegeben.
// Dokumente haben keine Inline-Vorschau (öffnen weiterhin per Tap).
function MediaPreview({ entry }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!(entry.mediaData instanceof Blob)) return undefined;
    const objectUrl = URL.createObjectURL(entry.mediaData);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [entry.mediaData]);

  if (!url) return null;
  if (entry.mediaType === "image") {
    return <img className="media-item__preview" src={url} alt={entry.title} loading="lazy" />;
  }
  if (entry.mediaType === "video") {
    // stopPropagation: Player-Bedienung darf den Datei-Öffnen-Tap nicht auslösen
    return (
      <video
        className="media-item__preview"
        src={url}
        controls
        playsInline
        preload="metadata"
        onClick={(ev) => ev.stopPropagation()}
      />
    );
  }
  if (entry.mediaType === "audio") {
    return (
      <audio
        className="media-item__preview media-item__preview--audio"
        src={url}
        controls
        preload="metadata"
        onClick={(ev) => ev.stopPropagation()}
      />
    );
  }
  return null;
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
    const hasPreview =
      e.mediaData instanceof Blob && ["image", "video", "audio"].includes(e.mediaType);
    return (
      <div
        key={e.id}
        className={`media-item${hasPreview ? " media-item--feed" : ""}`}
        style={{ cursor: e.mediaData ? 'pointer' : 'default' }}
        onClick={() => {
          if (e.mediaData) {
            const url = URL.createObjectURL(e.mediaData);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }}
      >
        <div className="media-item__row">
          <div className="media-item__icon" style={{ background: color + "22", color: color }}>
            <Icon size={18} />
          </div>
          <div className="media-item__body">
            <div className="media-item__title"><AutoScrollText>{e.title}</AutoScrollText></div>
            <div className="media-item__meta"><AutoScrollText>{label}</AutoScrollText></div>
            <EntryMetaTags entry={e} cats={cats} CC={CC} isHome={false} />
          </div>
          <button
            className="media-item__delete"
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete(e.id);
            }}
          >
            <Trash2 size={14} color="#8a8a96" />
          </button>
        </div>
        {hasPreview && <MediaPreview entry={e} />}
      </div>
    );
  });
}


export function LinkList({ entries, cats, onDelete, CC }) {
  return entries.map((e) => {
    const ytId = getYouTubeVideoId(e.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
    return (
      <div
        key={e.id}
        className="media-item media-item--link"
        style={{ cursor: e.url ? "pointer" : "default" }}
        onClick={() => { if (e.url) window.open(e.url, "_blank"); }}
      >
        <div className="media-item__header-row">
          <div className="media-item__title-box">
             <div className="media-item__icon-mini" style={{ color: "#7C3AED" }}>
               <BookmarkIcon size={14} />
             </div>
             <div className="media-item__title"><AutoScrollText>{e.title}</AutoScrollText></div>
          </div>
          <button 
            className="media-item__delete" 
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete(e.id);
            }}
          >
            <Trash2 size={14} color="#8a8a96" />
          </button>
        </div>
        
        <div className="media-item__content">
          {embedUrl && (
            <div className="link-item__preview" onClick={(ev) => ev.stopPropagation()}>
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
            {e.url && <div className="media-item__meta"><AutoScrollText>{e.url}</AutoScrollText></div>}
            {/* Verknüpfungs-Pille bewusst entfernt: Der Link liegt bereits in
                dieser Seite, die verknüpfte Kategorie muss im Lesezeichen-Feed
                nicht erneut angedeutet werden. */}
          </div>
        </div>
      </div>
    );
  });
}


