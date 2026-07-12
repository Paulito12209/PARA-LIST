import { Home, Search, Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Link2, Image, Plus } from "lucide-react";
import { AutoScrollText } from "./AutoScrollText";

// Audio-/Spracheingabe-Icon (Equalizer-Wellen) – identisch zum CommandDock,
// damit der Voice-Button im neuen Design dasselbe Symbol trägt.
function AudioWaveIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3"    y1="8"  x2="3"    y2="16" />
      <line x1="7.5"  y1="4"  x2="7.5"  y2="20" />
      <line x1="12"   y1="9"  x2="12"   y2="15" />
      <line x1="16.5" y1="6"  x2="16.5" y2="18" />
      <line x1="21"   y1="7"  x2="21"   y2="17" />
    </svg>
  );
}

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

// Vorschau-Kachel links neben den Aktions-Buttons – zeigt das aktuell im Cover
// stehende Element (Eintrag oder Kategorie), sobald dessen "Öffnen"-Button beim
// Hochscrollen aus dem Sichtbereich gewandert ist, wie der Mini-Player bei
// Spotify. Tap öffnet die zugehörige Detailseite. Ohne Element bleibt die
// linke Seite leer (die Aktions-Buttons rutschen an den rechten Rand).
function NowPreview({ item }) {
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

export function NewDesignNav({ t, active = "home", onHome, onOpenSearch, onOpenCatType, onAdd, onOpenVoice, nowItem }) {
  const handlers = {
    home: onHome,
    search: onOpenSearch,
    project: () => onOpenCatType?.("project"),
    area: () => onOpenCatType?.("area"),
    resource: () => onOpenCatType?.("resource"),
  };

  return (
    <nav className="new-nav">
      {/* Obere Zeile: links die (optionale) Vorschau-Kachel des Covers, rechts
          die Aktions-Pille mit Erstellen (+) und Spracheingabe. */}
      <div className="new-nav__now-row">
        <NowPreview item={nowItem} />
        <div className="new-nav__actions">
          <button
            type="button"
            className="new-nav__action"
            onClick={onAdd}
            aria-label={t.add || "Erstellen"}
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
          <span className="new-nav__action-divider" aria-hidden="true" />
          <button
            type="button"
            className="new-nav__action"
            onClick={onOpenVoice}
            aria-label={t.voiceInput || "Spracheingabe"}
          >
            <AudioWaveIcon size={20} />
          </button>
        </div>
      </div>
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
