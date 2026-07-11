import { Home, Search, Circle, Triangle, Square } from "lucide-react";

// Untere Navigationsleiste des NEUEN Designs (hinter dem "Neues Design
// testen"-Toggle in den Einstellungen). Spotify-Stil: 5 feste Ziele mit
// ausgeschriebenen Labels unter den Icons – ersetzt auf der Startseite den
// CommandDock, solange das neue Design aktiv ist.
const NAV_ITEMS = [
  { id: "home", Icon: Home, labelKey: "home" },
  { id: "search", Icon: Search, labelKey: "searchTitle" },
  { id: "project", Icon: Circle, labelKey: "projects" },
  { id: "area", Icon: Triangle, labelKey: "areas" },
  { id: "resource", Icon: Square, labelKey: "resources" },
];

export function NewDesignNav({ t, active = "home", onHome, onOpenSearch, onOpenCatType }) {
  const handlers = {
    home: onHome,
    search: onOpenSearch,
    project: () => onOpenCatType?.("project"),
    area: () => onOpenCatType?.("area"),
    resource: () => onOpenCatType?.("resource"),
  };

  return (
    <nav className="new-nav">
      {NAV_ITEMS.map(({ id, Icon, labelKey }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            className={`new-nav__tab${isActive ? " new-nav__tab--active" : ""}`}
            onClick={() => handlers[id]?.()}
            aria-label={t[labelKey]}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={24} strokeWidth={isActive ? 2.4 : 2} />
            <span className="new-nav__label">{t[labelKey]}</span>
          </button>
        );
      })}
    </nav>
  );
}
