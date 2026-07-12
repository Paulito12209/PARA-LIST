import { Home, Search, Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Link2, Image } from "lucide-react";
import { AutoScrollText } from "./AutoScrollText";

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

// Typ-Icon der "Zuletzt geöffnet"-Leiste (Spotify-Mini-Player-Pendant)
const NOW_ICONS = {
  project: Circle,
  area: Triangle,
  resource: Square,
  task: CheckCircle2,
  note: Pencil,
  calendar: Calendar,
  link: Link2,
  media: Image,
};

// Schwebende Leiste über der Tab-Bar – zeigt das zuletzt geöffnete Element
// (Eintrag oder Kategorie) mit Titel + Termin- bzw. Erstellungsdatum, wie der
// Mini-Player bei Spotify. Tap öffnet die zugehörige Detailseite.
function NowBar({ item }) {
  if (!item) return null;
  const Icon = NOW_ICONS[item.type] || Circle;
  return (
    <button type="button" className="new-nav__now" onClick={item.onOpen}>
      <span className="new-nav__now-icon" style={{ "--now-icon-tint": item.accentColor }}>
        <Icon size={16} strokeWidth={2.2} color={item.accentColor} />
      </span>
      <span className="new-nav__now-copy">
        <AutoScrollText className="new-nav__now-title">{item.title}</AutoScrollText>
        <span className="new-nav__now-date">{item.dateLabel}</span>
      </span>
    </button>
  );
}

export function NewDesignNav({ t, active = "home", onHome, onOpenSearch, onOpenCatType, nowItem }) {
  const handlers = {
    home: onHome,
    search: onOpenSearch,
    project: () => onOpenCatType?.("project"),
    area: () => onOpenCatType?.("area"),
    resource: () => onOpenCatType?.("resource"),
  };

  return (
    <nav className="new-nav">
      <NowBar item={nowItem} />
      <div className="new-nav__tabs">
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
      </div>
    </nav>
  );
}
