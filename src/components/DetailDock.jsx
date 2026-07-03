import { useState } from "react";
import { Home, MoreHorizontal, ArrowUp } from "lucide-react";
import { BOOKMARKS } from "../utils";

// Kontextabhängiges Dock für Detailseiten – optisch identisch zum Startseiten-
// Dock (CommandDock), aber die Icon-Reihe zeigt die Lesezeichen der Detailseite
// (Canvas = Kontext-Icon, Aufgaben, Kalender, Medien, Links, Details). Das aktive
// Lesezeichen ist farbig, der Rest ausgegraut. Am Ende das Drei-Punkte-Menü
// (öffnet die Optionen, kein Lesezeichen). Darunter: Home-Button, optionales
// Eingabefeld (nur auf Tabs mit Hinzufügen-Aktion) und Senden-Button.
export function DetailDock({
  t,
  active,
  onSelect,
  iconOverrides,
  iconColors,
  onOptions,
  onHome,
  showInput = false,
  placeholder = "",
  accentColor = "#0B8CE9",
  onSubmit,
}) {
  const [value, setValue] = useState("");
  const hasText = value.trim().length > 0;
  // "tags" wird nicht mehr als Lesezeichen geführt.
  const items = BOOKMARKS.filter((bm) => bm.id !== "tags");

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onSubmit?.(title);
    setValue("");
  };

  return (
    <div className="command-dock command-dock--detail" style={{ "--dock-accent": accentColor }}>
      <div className="command-dock__types">
        {items.map((bm) => {
          const Icon = iconOverrides?.[bm.id] || bm.Icon;
          const isActive = active === bm.id;
          const color = iconColors?.[bm.id] || bm.color;
          return (
            <button
              key={bm.id}
              className={`command-dock__type ${isActive ? "command-dock__type--active" : ""}`}
              style={isActive ? { color, "--type-color": color } : undefined}
              onClick={() => onSelect(bm.id)}
            >
              <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
            </button>
          );
        })}

        <button className="command-dock__menu" onClick={onOptions} aria-label={t.settingsBtn || "Menü"}>
          <span className="command-dock__menu-circle">
            <MoreHorizontal size={18} />
          </span>
        </button>
      </div>

      <div className="command-dock__input-row">
        <button
          className="command-dock__icon-btn command-dock__list-btn"
          onClick={onHome}
          aria-label={t.home || "Startseite"}
        >
          <Home size={20} />
        </button>
        {showInput && (
          <>
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
              onClick={submit}
              disabled={!hasText}
              aria-label={t.send || "Senden"}
            >
              <ArrowUp size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
