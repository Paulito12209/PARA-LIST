import { useState } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, List, Mic, MoreHorizontal, ArrowUp } from "lucide-react";

// PARA + Eintragstypen für die untere Eingabeleiste.
// Aufgaben ist standardmäßig aktiv und als einziges farbig hervorgehoben.
const DOCK_TYPES = [
  { id: "project", Icon: Circle, color: "#E03E3E" },
  { id: "area", Icon: Triangle, color: "#D09020" },
  { id: "resource", Icon: Square, color: "#30A060" },
  { id: "tasks", Icon: CheckCircle2, color: "#0078D4" },
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

export function CommandDock({ t, activeType, onSelectType, onSubmit, onOpenList, onOpenVoice, onMenu }) {
  const [value, setValue] = useState("");
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
          return (
            <button
              key={d.id}
              className={`command-dock__type ${isActive ? "command-dock__type--active" : ""}`}
              style={isActive ? { color: d.color, "--type-color": d.color } : undefined}
              onClick={() => onSelectType(d.id)}
              title={t[SINGULAR_KEY[d.id]]}
            >
              <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
            </button>
          );
        })}

        {/* 7. Icon: Menü – noch ohne Funktion, daher disabled gefärbt */}
        <button className="command-dock__menu" onClick={onMenu} aria-label="Menü" disabled>
          <span className="command-dock__menu-circle">
            <MoreHorizontal size={18} />
          </span>
        </button>
      </div>

      <div className="command-dock__input-row">
        <button
          className="command-dock__icon-btn command-dock__list-btn"
          onClick={() => onOpenList(activeType)}
          aria-label="Liste"
        >
          <List size={20} />
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
          {hasText ? <ArrowUp size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </div>
  );
}
