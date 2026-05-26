import { useState } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Home, MoreHorizontal, ArrowUp } from "lucide-react";

// Audio-/Spracheingabe-Icon: 5 vertikale Wellen-Striche in unterschiedlicher Höhe
// (ersetzt das Mikrofon-Icon – wirkt wie ein Equalizer / Herzschlag-Wellen)
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

// PARA + Eintragstypen für die untere Eingabeleiste.
// Aufgaben ist standardmäßig aktiv und als einziges farbig hervorgehoben.
const DOCK_TYPES = [
  { id: "project", Icon: Circle, color: "#E03E3E" },
  { id: "area", Icon: Triangle, color: "#D09020" },
  { id: "resource", Icon: Square, color: "#30A060" },
  { id: "tasks", Icon: CheckCircle2, color: "#0B8CE9" },
  { id: "notes", Icon: Pencil, color: "#F59E0B" },
  // Kalender nutzt theme-aware Akzent (Dark Mode aufgehellt)
  { id: "calendar", Icon: Calendar, color: "var(--cal-accent)" },
];

const SINGULAR_KEY = {
  project: "projectSing",
  area: "areaSing",
  resource: "resourceSing",
  tasks: "task",
  notes: "note",
  calendar: "calSing",
};

// `leadingAction` steuert nur das Styling des linken Home-Buttons:
//   "list" (Default, Startseite) → "aktiv" hervorgehoben
//   "home" (Detailseiten)        → normales Glas
// Geklickt navigiert er IMMER zur Startseite (onHome).
// `canToggleList`: auf der Startseite klappt ein 2. Tap auf das bereits aktive
// Typ-Icon die Liste auf/zu (onToggleList).
export function CommandDock({ t, activeType, onSelectType, onSubmit, onToggleList, canToggleList = false, listExpanded = false, onOpenVoice, onMenu, onHome, leadingAction = "list" }) {
  const [value, setValue] = useState("");
  const isHomeScreen = leadingAction === "list";
  const active = DOCK_TYPES.find((d) => d.id === activeType) || DOCK_TYPES[3];
  const placeholder = t.addPlaceholder(t[SINGULAR_KEY[activeType]] || "");

  const hasText = value.trim().length > 0;

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onSubmit(activeType, title);
    setValue("");
  };

  return (
    <div className="command-dock" style={{ "--dock-accent": active.color }}>
      <div className="command-dock__types">
        {DOCK_TYPES.map((d) => {
          const Icon = d.Icon;
          const isActive = d.id === activeType;
          // Glow erscheint nur, wenn das aktive Icon getappt wurde und die Liste
          // dadurch aufgeklappt ist (nur auf der Startseite relevant).
          const isGlowing = isActive && canToggleList && listExpanded;
          return (
            <button
              key={d.id}
              className={`command-dock__type ${isActive ? "command-dock__type--active" : ""}${isGlowing ? " command-dock__type--glow" : ""}`}
              style={isActive ? { color: d.color, "--type-color": d.color } : undefined}
              onClick={() => {
                // 2. Tap auf das bereits aktive Icon (nur Startseite) → Liste auf/zu
                if (canToggleList && isActive) onToggleList?.();
                else onSelectType(d.id);
              }}
              title={t[SINGULAR_KEY[d.id]]}
            >
              <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
            </button>
          );
        })}

        {/* 7. Icon: Menü – öffnet das Dock-Bottom-Sheet (u.a. Papierkorb) */}
        <button className="command-dock__menu" onClick={onMenu} aria-label="Menü">
          <span className="command-dock__menu-circle">
            <MoreHorizontal size={18} />
          </span>
        </button>
      </div>

      <div className="command-dock__input-row">
        <button
          className={`command-dock__icon-btn command-dock__list-btn ${isHomeScreen ? "command-dock__list-btn--active" : ""}`}
          onClick={() => onHome?.()}
          aria-label={t.home || "Startseite"}
        >
          <Home size={20} />
        </button>
        <input
          className="command-dock__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          enterKeyHint="done"
        />
        <button
          className={`command-dock__icon-btn ${hasText ? "command-dock__send-btn" : "command-dock__voice-btn"}`}
          onClick={() => (hasText ? submit() : onOpenVoice(activeType))}
          aria-label={hasText ? "Senden" : "Spracheingabe"}
        >
          {hasText ? <ArrowUp size={20} /> : <AudioWaveIcon size={20} />}
        </button>
      </div>
    </div>
  );
}
