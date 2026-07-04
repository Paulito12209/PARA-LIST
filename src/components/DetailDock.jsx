import { useState } from "react";
import { Home, MoreHorizontal, ArrowUp } from "lucide-react";
import { BOOKMARKS } from "../utils";

// Schmale Lesezeichen-Leiste der Detailseiten – sitzt zwischen Header und
// Canvas-Bereich. Zeigt die Lesezeichen-Icons (Canvas = Kontext-Icon, Aufgaben,
// Kalender, Medien, Links, Details); das aktive Lesezeichen ist farbig, der
// Rest ausgegraut. Am Ende das Drei-Punkte-Menü (öffnet die Optionen).
export function DetailIconBar({
  t,
  active,
  onSelect,
  iconOverrides,
  iconColors,
  onOptions,
}) {
  // "tags" wird nicht mehr als Lesezeichen geführt; "details" liegt als
  // Info-Button rechts in der Pillen-Zeile des Headers.
  const items = BOOKMARKS.filter((bm) => bm.id !== "tags" && bm.id !== "details");

  return (
    <div className="detail-iconbar">
      {items.map((bm) => {
        const Icon = iconOverrides?.[bm.id] || bm.Icon;
        const isActive = active === bm.id;
        const color = iconColors?.[bm.id] || bm.color;
        return (
          <button
            key={bm.id}
            className={`detail-iconbar__btn ${isActive ? "detail-iconbar__btn--active" : ""}`}
            style={isActive ? { color, "--type-color": color } : undefined}
            onClick={() => onSelect(bm.id)}
          >
            <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
          </button>
        );
      })}

      <button className="detail-iconbar__btn detail-iconbar__menu" onClick={onOptions} aria-label={t.settingsBtn || "Menü"}>
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

// Unterer Bereich der Detailseiten. Ohne Eingabefeld gibt es KEINEN Dock-
// Container mehr – nur ein frei schwebender Home-Button unten links (gleiche
// Glass-Optik wie die Floating-Buttons der aufgeklappten Startseiten-Liste).
// Nur auf Tabs mit Hinzufügen-Aktion erscheint das Dock mit Home + Eingabe.
export function DetailDock({
  t,
  onHome,
  showInput = false,
  placeholder = "",
  accentColor = "#0B8CE9",
  onSubmit,
}) {
  const [value, setValue] = useState("");
  const hasText = value.trim().length > 0;

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onSubmit?.(title);
    setValue("");
  };

  if (!showInput) {
    return (
      <button
        className="home__floating-btn detail-home-fab"
        onClick={onHome}
        aria-label={t.home || "Startseite"}
      >
        <Home size={20} />
      </button>
    );
  }

  return (
    <div className="command-dock command-dock--detail" style={{ "--dock-accent": accentColor }}>
      <div className="command-dock__input-row">
        <button
          className="command-dock__icon-btn command-dock__list-btn"
          onClick={onHome}
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
          onClick={submit}
          disabled={!hasText}
          aria-label={t.send || "Senden"}
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </div>
  );
}
