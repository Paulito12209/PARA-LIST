import { Circle, Triangle, Square, Archive, Plus, PanelLeft } from "lucide-react";

const CAT_ITEMS = [
  { id: "project",  Icon: Circle,   labelKey: "projects",  fallback: "Projekte",   color: "var(--cat-project)",  hint: "⌘1" },
  { id: "area",     Icon: Triangle, labelKey: "areas",     fallback: "Bereiche",   color: "var(--cat-area)",     hint: "⌘2" },
  { id: "resource", Icon: Square,   labelKey: "resources", fallback: "Ressourcen", color: "var(--cat-resource)", hint: "⌘3" },
  { id: "archive",  Icon: Archive,  labelKey: "archive",   fallback: "Archiv",     color: "var(--cat-archive)",  hint: "⌘4" },
];

export function Sidebar({
  t,
  expanded,
  activeCat,
  onSelectCat,
  onOpenArchive,
  onCreateNew,
  onToggle,
}) {
  return (
    <aside className={`dsk-sidebar${expanded ? " dsk-sidebar--expanded" : ""}`}>
      <div className="dsk-sidebar__brand" title="Paralist">
        <div className="dsk-sidebar__brand-logo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M5 18.5c2-1 3.2-2.6 4-4.4M8 4.5l4.5 5M13 17.5c1.4-2 2.2-4.2 2.2-6.5M12 4.5c3 1.5 4.5 4 4.5 7M19 4.5c-1.5 5-1.5 10 0 15"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="dsk-sidebar__brand-label">Paralist</span>
      </div>

      <nav className="dsk-sidebar__nav">
        {CAT_ITEMS.map((item) => {
          const Icon = item.Icon;
          const isActive =
            item.id === "archive" ? false : activeCat === item.id;
          const label = t?.[item.labelKey] || item.fallback;
          return (
            <button
              key={item.id}
              type="button"
              className={`dsk-sidebar__nav-btn${isActive ? " dsk-sidebar__nav-btn--active" : ""}`}
              onClick={() => (item.id === "archive" ? onOpenArchive() : onSelectCat(item.id))}
              title={label}
              aria-label={label}
              style={isActive ? { color: item.color } : undefined}
            >
              <span className="dsk-sidebar__nav-icon">
                <Icon size={expanded ? 20 : 24} strokeWidth={isActive ? 2.6 : 2} />
              </span>
              <span className="dsk-sidebar__nav-label">{label}</span>
              <span className="dsk-sidebar__nav-kbd">{item.hint}</span>
            </button>
          );
        })}
      </nav>

      <div className="dsk-sidebar__bottom">
        <button
          type="button"
          className="dsk-sidebar__create"
          onClick={onCreateNew}
          title={t?.createNew || "Neu erstellen"}
          aria-label={t?.createNew || "Neu erstellen"}
        >
          <Plus size={20} strokeWidth={2.4} />
          <span className="dsk-sidebar__create-label">{t?.createNew || "Neu erstellen"}</span>
        </button>
        <button
          type="button"
          className="dsk-sidebar__toggle"
          onClick={onToggle}
          title={expanded ? "Sidebar einklappen" : "Sidebar ausklappen"}
          aria-label={expanded ? "Sidebar einklappen" : "Sidebar ausklappen"}
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
