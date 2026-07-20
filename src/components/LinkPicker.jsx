import { Circle, Triangle, Square, Check } from "lucide-react";
import { TagIcon } from "./AppIcons";
import { LINK_TABS, TAG_COLOR, linkTabLabel } from "./linkPickerShared";

const TYPE_ICONS = { project: Circle, area: Triangle, resource: Square };

/**
 * Tab-Leiste der Verknüpfen-Ansicht (Projekte · Arbeitsbereiche · Ressourcen ·
 * Tags). Geteilt von `LinkSheet` (eigenes Bottom-Sheet) und `CreateModal`
 * (dieselbe Ansicht innerhalb des Erstellen-Sheets).
 */
export function LinkTabs({ tabs = LINK_TABS, tab, onSelect, t }) {
  return (
    <div className="link-sheet__tabs">
      {tabs.map((type) => (
        <button
          key={type}
          type="button"
          className={`link-sheet__tab${tab === type ? " link-sheet__tab--active" : ""}`}
          onClick={() => onSelect(type)}
        >
          {linkTabLabel(type, t)}
        </button>
      ))}
    </div>
  );
}

/**
 * Liste des aktiven Verknüpfen-Tabs: Kategorien des Typs bzw. Tag-Namen,
 * jeweils mit Auswahl-Kreis rechts.
 *
 * Props:
 *  - tab: aktiver Tab ("project"|"area"|"resource"|"tags")
 *  - cats / tagNames: Datenquellen
 *  - isCatSelected(cat) / isTagSelected(name): Auswahl-Prädikate
 *  - onToggleCat(cat) / onToggleTag(name)
 *  - excludeId: eigene Kategorie, die nicht mit sich selbst verknüpfbar ist
 */
export function LinkList({
  tab,
  cats = [],
  tagNames = [],
  isCatSelected,
  isTagSelected,
  onToggleCat,
  onToggleTag,
  excludeId,
  CC,
  t,
  className = "",
}) {
  const items =
    tab === "tags"
      ? []
      : cats.filter((c) => c.type === tab && !c.archived && c.id !== excludeId);

  return (
    <div className={`link-sheet__list link-sheet__scroll ${className}`}>
      {tab === "tags" ? (
        tagNames.length === 0 ? (
          <div className="link-sheet__row link-sheet__row--static">
            <span className="link-sheet__row-name">{t.noTags}</span>
          </div>
        ) : (
          tagNames.map((name) => {
            const isSel = isTagSelected(name);
            return (
              <button
                key={name}
                type="button"
                className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
                onClick={() => onToggleTag(name)}
              >
                <TagIcon size={16} color={TAG_COLOR} strokeWidth={2} />
                <span className="link-sheet__row-name">{name}</span>
                <span
                  className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                  style={isSel ? { background: TAG_COLOR, borderColor: TAG_COLOR } : undefined}
                >
                  {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )
      ) : items.length === 0 ? (
        <div className="link-sheet__row link-sheet__row--static">
          <span className="link-sheet__row-name">{t.noCats(linkTabLabel(tab, t))}</span>
        </div>
      ) : (
        items.map((item) => {
          const Icon = TYPE_ICONS[item.type];
          const color = CC[item.type]?.color;
          const isSel = isCatSelected(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`link-sheet__row ${isSel ? "link-sheet__row--selected" : ""}`}
              onClick={() => onToggleCat(item)}
            >
              <Icon size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
              <span className="link-sheet__row-name">{item.name}</span>
              <span
                className={`link-sheet__check ${isSel ? "link-sheet__check--on" : ""}`}
                style={isSel ? { background: color, borderColor: color } : undefined}
              >
                {isSel && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
