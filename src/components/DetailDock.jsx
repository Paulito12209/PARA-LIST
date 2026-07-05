import { Home } from "lucide-react";
import { BOOKMARKS } from "../utils";

// Schmale Lesezeichen-Leiste der Detailseiten – sitzt am unteren Rand des
// Headers. Zeigt die Lesezeichen-Icons (Canvas = Kontext-Icon, Aufgaben,
// Kalender, Medien, Links und als 7. "Details"); das aktive Lesezeichen ist
// farbig, der Rest ausgegraut. Das Drei-Punkte-Menü liegt jetzt oben rechts
// im Command-Panel-Header.
export function DetailIconBar({
  active,
  onSelect,
  iconOverrides,
  iconColors,
  onTouchStart,
  onTouchEnd,
}) {
  // "tags" wird nicht mehr als Lesezeichen geführt.
  const items = BOOKMARKS.filter((bm) => bm.id !== "tags");

  return (
    <div className="detail-iconbar" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
    </div>
  );
}

// Unterer Bereich der Detailseiten. Es gibt KEIN Eingabefeld/Dock mehr – nur
// frei schwebende Glass-Buttons: Home unten links (auf allen Lesezeichen) und
// optional eine Aktion unten rechts (Plus/Verknüpfen, Farbe = Lesezeichen-
// Akzent). Die Auswahl-Pille (Offen/Erledigt bzw. Ressourcen/Medien) schwebt
// auf derselben Höhe mittig (eigene Komponente DetailViewSelect).
export function DetailDock({ t, onHome, action = null }) {
  const ActionIcon = action?.Icon;
  return (
    <>
      <button
        className="home__floating-btn detail-home-fab"
        onClick={onHome}
        aria-label={t.home || "Startseite"}
      >
        <Home size={20} />
      </button>
      {action && (
        <button
          className="home__floating-btn detail-home-fab detail-action-fab"
          style={{ color: action.color }}
          onClick={action.onClick}
          aria-label={action.label}
        >
          <ActionIcon size={20} strokeWidth={2.4} />
        </button>
      )}
    </>
  );
}
