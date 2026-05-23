import { useMemo } from "react";
import {
  Circle,
  Triangle,
  Square,
  Archive,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  PanelLeft,
  Folder,
  Star,
  CheckCircle2,
  Pencil,
  Calendar,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { CustomSettingsIcon } from "../components/AppIcons";

const SECTIONS = [
  { id: "project",  type: "project",  Icon: Circle,   labelKey: "projects",  fallback: "Projekte",     color: "var(--cat-project)",  canAdd: true },
  { id: "area",     type: "area",     Icon: Triangle, labelKey: "areas",     fallback: "Arbeitsbereiche", color: "var(--cat-area)",   canAdd: true },
  { id: "resource", type: "resource", Icon: Square,   labelKey: "resources", fallback: "Ressourcen",   color: "var(--cat-resource)", canAdd: true },
  { id: "archive",  type: null,       Icon: Archive,  labelKey: "archive",   fallback: "Archiv",       color: "var(--cat-archive)",  canAdd: false },
];

const ENTRY_ICON = {
  task:     CheckCircle2,
  note:     Pencil,
  calendar: Calendar,
  media:    ImageIcon,
  link:     LinkIcon,
};

const ENTRY_TYPES_BY_CAT_TYPE = {
  project:  ["task", "note", "calendar"],
  area:     ["task", "note", "calendar"],
  resource: ["media", "link"],
};

export function Sidebar({
  t,
  mode,                  // "locked" | "hidden"
  peeking,               // bool — when hidden, true while hover-overlay is open
  treeOpen,              // { project, area, resource, archive: bool }
  catOpen,               // { [catId]: bool } — per-cat expand state
  onToggleSection,       // (sectionId) => void
  onToggleCat,           // (catId) => void
  cats,                  // state.cats
  entries,               // state.entries
  activeCatId,           // currently open cat (for highlight) — optional
  activeEntryId,         // currently open entry (for highlight) — optional
  onOpenCat,             // (cat) => void
  onOpenEntry,           // (entry) => void
  onAddCat,              // (type) => void
  onOpenSettings,        // () => void
  onToggleMode,          // () => void — switches locked ↔ hidden
  onToggleCatStar,       // (catId, nextValue) => void
  onSectionMenu,         // (sectionId) => void — placeholder
  onPointerEnter,        // for hover-overlay tracking
  onPointerLeave,
}) {
  const visible = mode === "locked" || peeking;

  const grouped = useMemo(() => {
    // Build { project: cats[], area: cats[], resource: cats[], archive: cats[] }
    const out = { project: [], area: [], resource: [], archive: [] };
    for (const c of cats) {
      if (c.archived) {
        out.archive.push(c);
      } else if (out[c.type]) {
        out[c.type].push(c);
      }
    }
    // Starred first, then by createdAt desc
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => {
        const sa = a.starred ? 1 : 0;
        const sb = b.starred ? 1 : 0;
        if (sa !== sb) return sb - sa;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }
    return out;
  }, [cats]);

  const entriesByCat = useMemo(() => {
    const out = new Map();
    for (const e of entries) {
      const ids = e.catIds && e.catIds.length ? e.catIds : (e.catId ? [e.catId] : []);
      for (const cid of ids) {
        if (!out.has(cid)) out.set(cid, []);
        out.get(cid).push(e);
      }
    }
    for (const arr of out.values()) {
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return out;
  }, [entries]);

  const className = [
    "dsk-sidebar",
    `dsk-sidebar--${mode}`,
    visible ? "dsk-sidebar--visible" : "",
    peeking ? "dsk-sidebar--peek" : "",
  ].filter(Boolean).join(" ");

  return (
    <aside
      className={className}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-hidden={!visible}
    >
      <div className="dsk-sidebar__brand">
        <div className="dsk-sidebar__brand-logo">
          <img src={`${import.meta.env.BASE_URL}paralist_logo.png`} alt="Paralist" />
        </div>
        <span className="dsk-sidebar__brand-label">PARA·LIST</span>
        <button
          type="button"
          className="dsk-sidebar__brand-toggle"
          onClick={onToggleMode}
          title={mode === "locked" ? "Sidebar einklappen" : "Sidebar fixieren"}
          aria-label={mode === "locked" ? "Sidebar einklappen" : "Sidebar fixieren"}
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="dsk-sidebar__tree">
        {SECTIONS.map((section) => {
          const list = grouped[section.id] || [];
          const isOpen = !!treeOpen?.[section.id];
          const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
          const sectionLabel = t?.[section.labelKey] || section.fallback;

          return (
            <section
              key={section.id}
              className={`dsk-tree__section${isOpen ? " dsk-tree__section--open" : ""}`}
            >
              <div className="dsk-tree__section-head">
                <button
                  type="button"
                  className="dsk-tree__section-title"
                  onClick={() => onToggleSection(section.id)}
                  aria-expanded={isOpen}
                >
                  <span
                    className="dsk-tree__section-icon"
                    style={{ color: section.color }}
                  >
                    <section.Icon size={16} strokeWidth={2.2} />
                  </span>
                  <span className="dsk-tree__section-label">{sectionLabel}</span>
                </button>
                <div className="dsk-tree__section-actions">
                  <button
                    type="button"
                    className="dsk-tree__action"
                    onClick={() => onToggleSection(section.id)}
                    title={isOpen ? "Einklappen" : "Ausklappen"}
                    aria-label={isOpen ? "Einklappen" : "Ausklappen"}
                  >
                    <ChevronIcon size={14} strokeWidth={2.4} />
                  </button>
                  {section.canAdd && (
                    <>
                      <button
                        type="button"
                        className="dsk-tree__action"
                        onClick={(e) => { e.stopPropagation(); onSectionMenu?.(section.id); }}
                        title="Mehr"
                        aria-label="Mehr"
                      >
                        <MoreHorizontal size={14} strokeWidth={2.4} />
                      </button>
                      <button
                        type="button"
                        className="dsk-tree__action"
                        onClick={(e) => { e.stopPropagation(); onAddCat?.(section.type); }}
                        title="Neu erstellen"
                        aria-label="Neu erstellen"
                      >
                        <Plus size={14} strokeWidth={2.4} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isOpen && (
                <ul className="dsk-tree__cats">
                  {list.length === 0 && (
                    <li className="dsk-tree__empty">— leer —</li>
                  )}
                  {list.map((cat) => {
                    const subEntries = entriesByCat.get(cat.id) || [];
                    const filteredSub = subEntries.filter((e) =>
                      cat.archived
                        ? true
                        : (ENTRY_TYPES_BY_CAT_TYPE[cat.type] || []).includes(e.type)
                    );
                    const isStar = !!cat.starred;
                    const RowIcon = isStar ? Star : Folder;
                    const isActive = cat.id === activeCatId;
                    const hasSub = filteredSub.length > 0;
                    const isCatOpen = !!catOpen?.[cat.id];
                    const CatChevron = isCatOpen ? ChevronDown : ChevronRight;
                    return (
                      <li key={cat.id} className="dsk-tree__cat">
                        <div className={`dsk-tree__row-wrap${isActive ? " dsk-tree__row-wrap--active" : ""}`}>
                          <button
                            type="button"
                            className="dsk-tree__row"
                            onClick={() => onOpenCat?.(cat)}
                            title={cat.name}
                          >
                            <span
                              className={`dsk-tree__row-icon${isStar ? " dsk-tree__row-icon--star" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCatStar?.(cat.id, !isStar);
                              }}
                              role="button"
                              tabIndex={-1}
                              aria-label={isStar ? "Favorit entfernen" : "Als Favorit"}
                            >
                              <RowIcon
                                size={14}
                                strokeWidth={2}
                                fill={isStar ? "currentColor" : "none"}
                              />
                            </span>
                            <span className="dsk-tree__row-label">{cat.name}</span>
                          </button>
                          {hasSub && (
                            <button
                              type="button"
                              className="dsk-tree__row-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCat?.(cat.id);
                              }}
                              aria-label={isCatOpen ? "Einklappen" : "Ausklappen"}
                            >
                              <span className="dsk-tree__row-toggle-icon">
                                <CatChevron size={12} strokeWidth={2.4} />
                              </span>
                            </button>
                          )}
                        </div>
                        {hasSub && isCatOpen && (
                          <ul className="dsk-tree__entries">
                            {filteredSub.slice(0, 8).map((entry) => {
                              const EntryIcon = ENTRY_ICON[entry.type] || Folder;
                              const entryTitle = entry.title || entry.body?.slice(0, 40) || "—";
                              const isEntryActive = entry.id === activeEntryId;
                              return (
                                <li key={entry.id} className="dsk-tree__entry">
                                  <button
                                    type="button"
                                    className={`dsk-tree__entry-row${isEntryActive ? " dsk-tree__entry-row--active" : ""}`}
                                    onClick={() => onOpenEntry?.(entry)}
                                    title={entryTitle}
                                  >
                                    <span className="dsk-tree__entry-icon">
                                      <EntryIcon size={13} strokeWidth={2} />
                                    </span>
                                    <span className="dsk-tree__entry-label">{entryTitle}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="dsk-sidebar__footer">
        <button
          type="button"
          className="dsk-sidebar__settings-btn"
          onClick={onOpenSettings}
        >
          <CustomSettingsIcon size={18} color="currentColor" />
          <span>{t?.settings || "Einstellungen"}</span>
        </button>
      </div>
    </aside>
  );
}
