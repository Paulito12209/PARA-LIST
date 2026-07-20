import { useMemo, useState } from "react";
import { Archive, ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { fmtRelative, isOld, getNextBirthday } from "../utils";
import { CustomSettingsIcon, ActiveDotIcon, TagIcon } from "../components/AppIcons";
import { NewDesignNav } from "../components/NewDesignNav";
import { VoiceOverlay } from "../modals/VoiceOverlay";
import { DetailMetaRow } from "../components/TaskSubtabControls";
import { TaskList, NoteList, CalList, LinkList } from "../components/EntryLists";

// Konfiguration der Eintrags-Listen (Home-Kacheln): Akzent des Hero-Verlaufs,
// Eintragstyp im Datenmodell und Label-Key in den Übersetzungen.
const LIST_CFG = {
  tasks: { accentRgb: "11, 140, 233", color: "#0B8CE9", entryType: "task", labelKey: "tasks" },
  notes: { accentRgb: "245, 158, 11", color: "#F59E0B", entryType: "note", labelKey: "notes" },
  calendar: { accentRgb: "0, 120, 212", color: "#0078D4", entryType: "calendar", labelKey: "calendar" },
  links: { accentRgb: "124, 58, 237", color: "#7C3AED", entryType: "link", labelKey: "bookmarks" },
  // Tags sind keine Eintragsart, sondern eine Sicht ÜBER alle Einträge –
  // daher ohne `entryType`.
  tags: { accentRgb: "236, 72, 153", color: "#EC4899", entryType: null, labelKey: "tagsLabel" },
};

// Spotify-artige Listenansicht der Eintrags-Listen (Aufgaben/Notizen/Kalender/
// Lesezeichen) im NEUEN Design – gleiches Layout wie NewCatListScreen:
// Kontext-Verlauf mit Glas-Buttons und großem Titel, "N Einträge"-Untertitel,
// Filter-Pillen (Aktiv · Archiviert · Papierkorb) und die Zeilenliste.
// Unten bleibt die NewDesignNav sichtbar – deren Plus erstellt einen neuen
// Eintrag des Listentyps.
export function NewEntryListScreen({
  t,
  CC,
  lang,
  listType,
  entries,
  cats,
  tags = [],
  trash = [],
  onOpenEntry,
  onAdd,
  onBack,
  onHome,
  onOpenSettings,
  onOpenSearch,
  onOpenCatType,
  toggleTask,
  toggleStar,
  togglePin,
  updateEntry,
  deleteEntry,
  onArchiveEntry,
  onRestoreFromTrash,
  onPurgeTrashItem,
  onAddVoiceEntry,
}) {
  const cfg = LIST_CFG[listType] || LIST_CFG.tasks;
  const isTagList = listType === "tags";
  // Tag-Liste: ist ein Tag gewählt, zeigt der Screen dessen Einträge; der
  // Zurück-Pfeil führt dann erst zur Tag-Übersicht zurück.
  const [selectedTag, setSelectedTag] = useState(null);
  const label = isTagList && selectedTag ? selectedTag : t[cfg.labelKey] || cfg.labelKey;
  // Lesezeichen und Tags kennen kein "Archiviert" – die Pille entfällt dort.
  const hasArchive = listType !== "links" && !isTagList;
  // Voice-Erstellung gibt es nur für Aufgaben/Notizen/Termine.
  const hasVoice = listType !== "links" && !isTagList;

  const [filter, setFilter] = useState("active");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sort, setSort] = useState({ by: "date", desc: true });
  const [pinnedFilter, setPinnedFilter] = useState("all");

  const getTs = (e) =>
    typeof e?.createdAt === "number" ? e.createdAt : e?.createdAt ? Date.parse(e.createdAt) || 0 : 0;

  const list = useMemo(() => {
    // Geburtstage zeigen wie auf der Startseite das NÄCHSTE Datum + Alter.
    const mapped = entries.map((e) => {
      if (e.type === "calendar" && e.isBirthday) {
        const nextBd = getNextBirthday(e.date);
        if (nextBd) {
          return { ...e, date: nextBd.date, title: `${e.title} (${nextBd.age} ${t.yearsShort || "J."})` };
        }
      }
      return e;
    });
    // Aktiv/Archiviert je Eintragstyp – gleiche Logik wie die aufgeklappte
    // Startseiten-Liste (Kalender: alte Termine gelten als archiviert).
    const isArchived = (e) =>
      e.type === "calendar" ? (!!e.date && isOld(e.date)) || e.done || e.archived : e.done || e.archived;
    return mapped
      .filter(
        (e) =>
          e.type === cfg.entryType &&
          (hasArchive ? (filter === "archived" ? isArchived(e) : !isArchived(e)) : true) &&
          (pinnedFilter === "pinned" ? e.pinned : true)
      )
      .sort((a, b) => {
        if (sort.by === "date") return sort.desc ? getTs(b) - getTs(a) : getTs(a) - getTs(b);
        const cmp = (a.title || "").localeCompare(b.title || "");
        return sort.desc ? -cmp : cmp;
      });
  }, [entries, cfg.entryType, hasArchive, filter, pinnedFilter, sort, t.yearsShort]);

  // ── Tag-Liste ──────────────────────────────────────────────────────
  // Alle bekannten Tag-Namen: global gepflegte plus die, die nur an Einträgen
  // hängen. Zählung ohne archivierte/erledigte Einträge (Lesezeichen kennen
  // kein "erledigt").
  const tagNames = useMemo(() => {
    if (!isTagList) return [];
    return Array.from(
      new Set([...tags.map((tg) => tg.name), ...entries.flatMap((e) => e.tags || [])]),
    ).sort((a, b) => a.localeCompare(b));
  }, [isTagList, tags, entries]);

  const countForTag = (name) =>
    entries.filter(
      (e) => (e.tags || []).includes(name) && !e.archived && (e.type === "link" || !e.done),
    ).length;

  // Einträge des gewählten Tags, nach Typ getrennt (wie auf der Startseite).
  const tagged = useMemo(() => {
    if (!isTagList || !selectedTag) return null;
    const has = (e) => (e.tags || []).includes(selectedTag);
    return {
      tasks: entries.filter((e) => e.type === "task" && !e.archived && !e.done && has(e)),
      notes: entries.filter((e) => e.type === "note" && !e.archived && !e.done && has(e)),
      cals: entries.filter((e) => e.type === "calendar" && !e.archived && !e.done && has(e)),
      links: entries.filter((e) => e.type === "link" && has(e)),
    };
  }, [isTagList, selectedTag, entries]);

  const taggedCount = tagged
    ? tagged.tasks.length + tagged.notes.length + tagged.cals.length + tagged.links.length
    : 0;

  // Papierkorb: gelöschte Einträge dieses Typs, neueste zuerst.
  const trashItems = useMemo(
    () =>
      trash
        .filter((it) => it.kind === "entry" && it.data.type === cfg.entryType)
        .sort((a, b) => b.deletedAt - a.deletedAt),
    [trash, cfg.entryType]
  );

  // Gemeinsame Props der Eintrags-Listen (flach, ohne Gruppierung – sortiert
  // wird über das Sortier-Icon in der Meta-Zeile).
  const shared = {
    t,
    CC,
    entries: list,
    cats,
    grouped: false,
    color: cfg.color,
    onOpenEntry,
    isHome: true,
    isArchive: filter === "archived",
  };

  return (
    <div className="new-list" style={{ "--nl-accent-rgb": cfg.accentRgb }}>
      {/* Hero: Kontext-Verlauf, Glas-Buttons oben, großer Titel unten */}
      <div className="new-list__hero">
        <div className="new-list__topbar">
          <button
            className="new-list__glass-btn"
            onClick={() => (selectedTag ? setSelectedTag(null) : onBack())}
            aria-label={t.back || "Zurück"}
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
          <button
            className="new-list__glass-btn"
            onClick={onOpenSettings}
            aria-label={t.settingsBtn || "Einstellungen"}
          >
            <CustomSettingsIcon size={20} color="currentColor" />
          </button>
        </div>
        <h1 className="new-list__title">{label}</h1>
        {/* Zähler immer universal als "N Einträge" – unabhängig vom Listentyp. */}
        <div className="new-list__subtitle">
          {(() => {
            const n = isTagList ? (selectedTag ? taggedCount : tagNames.length) : list.length;
            return t.entriesCount ? t.entriesCount(n) : `${n}`;
          })()}
        </div>
      </div>

      {/* Filter-Pillen: Aktiv · Archiviert · Papierkorb; rechts Sortieren +
          Angeheftet-Filter – identisch zur Kategorien-Liste. Die Tag-Übersicht
          hat keine dieser Achsen und blendet die Zeile aus. */}
      {!isTagList && (
      <div className="new-list__pills">
        <div className="new-list__pills-group">
          <button
            className={`new-list__pill${filter === "active" ? " new-list__pill--active" : ""}`}
            onClick={() => setFilter("active")}
          >
            <ActiveDotIcon size={13} strokeWidth={2.4} />
            {t.activeFilter || "Aktiv"}
          </button>
          {hasArchive && (
            <button
              className={`new-list__pill${filter === "archived" ? " new-list__pill--active" : ""}`}
              onClick={() => setFilter("archived")}
            >
              <Archive size={13} strokeWidth={2.2} />
              {t.archivedLabel || "Archiviert"}
            </button>
          )}
          <button
            className={`new-list__pill new-list__pill--trash${filter === "trash" ? " new-list__pill--active" : ""}`}
            onClick={() => setFilter("trash")}
            aria-label={t.trash}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        </div>

        <DetailMetaRow
          t={t}
          hideCount
          sort={sort}
          onChangeSort={setSort}
          filterValue={pinnedFilter}
          filterOptions={[
            { id: "all", label: t.filterAll || "Alle" },
            { id: "pinned", label: t.pinned || "Angeheftet" },
          ]}
          onChangeFilter={setPinnedFilter}
        />
      </div>
      )}

      <div className="new-list__body">
        {isTagList ? (
          selectedTag ? (
            taggedCount === 0 ? (
              <div className="new-list__empty">{t.noEntries(selectedTag)}</div>
            ) : (
              <>
                {tagged.tasks.length > 0 && (
                  <TaskList
                    {...shared}
                    entries={tagged.tasks}
                    lang={lang}
                    color="#0B8CE9"
                    onToggle={toggleTask}
                    onToggleStar={toggleStar}
                    onTogglePin={togglePin}
                    onUpdateEntry={updateEntry}
                    onDelete={deleteEntry}
                  />
                )}
                {tagged.notes.length > 0 && (
                  <NoteList
                    {...shared}
                    entries={tagged.notes}
                    color="#F59E0B"
                    onDelete={deleteEntry}
                    onToggleStar={toggleStar}
                    onTogglePin={togglePin}
                    onUpdateEntry={updateEntry}
                    onArchiveEntry={onArchiveEntry}
                  />
                )}
                {tagged.cals.length > 0 && (
                  <CalList
                    {...shared}
                    entries={tagged.cals}
                    lang={lang}
                    color="#0078D4"
                    onDelete={deleteEntry}
                    onToggle={toggleTask}
                    onToggleStar={toggleStar}
                    onTogglePin={togglePin}
                    onUpdateEntry={updateEntry}
                  />
                )}
                {tagged.links.length > 0 && (
                  <LinkList t={t} CC={CC} entries={tagged.links} cats={cats} onDelete={deleteEntry} />
                )}
              </>
            )
          ) : tagNames.length === 0 ? (
            <div className="new-list__empty">{t.noTags}</div>
          ) : (
            // Zeilen im Layout der Kategorien-Liste: Kachel · Name · Anzahl.
            tagNames.map((name) => (
              <div
                key={name}
                className="new-list__row"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTag(name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTag(name);
                  }
                }}
              >
                <span
                  className="new-list__row-cover new-list__row-cover--tile"
                  style={{ background: `${cfg.color}1F`, color: cfg.color }}
                >
                  <TagIcon size={22} />
                </span>
                <div className="new-list__row-info">
                  <div className="new-list__row-title">{name}</div>
                  <div className="new-list__row-meta">
                    <span className="new-list__row-count">{t.entriesCount(countForTag(name))}</span>
                  </div>
                </div>
              </div>
            ))
          )
        ) : filter === "trash" ? (
          trashItems.length === 0 ? (
            <div className="new-list__empty">{t.trashEmpty}</div>
          ) : (
            trashItems.map((it) => (
              <div key={it.data.id} className="home-trash-item">
                <div className="home-trash-item__icon">
                  <Trash2 size={18} />
                </div>
                <div className="home-trash-item__text">
                  <div className="home-trash-item__title">{it.data.title || it.data.name}</div>
                  <div className="home-trash-item__meta">{fmtRelative(it.deletedAt, t.locale)}</div>
                </div>
                <button
                  className="home-trash-item__restore"
                  onClick={() => onRestoreFromTrash?.(it.data.id)}
                  aria-label={t.restore}
                  title={t.restore}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="home-trash-item__restore home-trash-item__purge"
                  onClick={() => onPurgeTrashItem?.(it.data.id)}
                  aria-label={t.deleteForever}
                  title={t.deleteForever}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )
        ) : list.length === 0 ? (
          <div className="new-list__empty">
            {filter === "archived"
              ? t.noneArchived
              : listType === "links"
                ? t.noLink
                : t.noEntries(label)}
          </div>
        ) : listType === "tasks" ? (
          <TaskList
            {...shared}
            lang={lang}
            onToggle={toggleTask}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
            onDelete={deleteEntry}
          />
        ) : listType === "notes" ? (
          <NoteList
            {...shared}
            onDelete={deleteEntry}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
            onArchiveEntry={onArchiveEntry}
          />
        ) : listType === "calendar" ? (
          <CalList
            {...shared}
            lang={lang}
            onDelete={deleteEntry}
            onToggle={toggleTask}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
          />
        ) : (
          <LinkList entries={list} cats={cats} onDelete={deleteEntry} CC={CC} />
        )}
      </div>

      {/* Untere Navigationsleiste des neuen Designs bleibt sichtbar; das Plus
          erstellt einen neuen Eintrag dieses Listentyps, das Mikro nimmt den
          Titel per Sprache auf (nicht bei Lesezeichen). */}
      <NewDesignNav
        t={t}
        active="home"
        onHome={onHome}
        onOpenSearch={onOpenSearch}
        onOpenCatType={onOpenCatType}
        onAdd={onAdd}
        onOpenVoice={hasVoice ? () => setVoiceOpen(true) : onAdd}
      />

      {voiceOpen && hasVoice && (
        <VoiceOverlay
          t={t}
          tab={listType}
          tabColor={cfg.color}
          accentRgb={cfg.accentRgb}
          supportsDate={listType === "tasks" || listType === "calendar"}
          lang={lang}
          onTranscribed={(title, date) => {
            onAddVoiceEntry?.(listType, title, date);
            setVoiceOpen(false);
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}
