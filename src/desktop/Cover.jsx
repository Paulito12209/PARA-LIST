import { useState } from "react";
import { Circle, Triangle, Square, Archive, Calendar, Plus, ChevronRight } from "lucide-react";
import { fmtDate } from "../utils";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";

const COVER_ACCENT_RGB = {
  project:  "224, 62, 62",
  area:     "208, 144, 32",
  resource: "48, 160, 96",
  archive:  "124, 131, 247",
};

const COVER_BADGE = {
  project:  { Icon: Circle,   labelKey: "projects",  fallback: "PROJEKT",   singular: true },
  area:     { Icon: Triangle, labelKey: "areas",     fallback: "BEREICH",   singular: true },
  resource: { Icon: Square,   labelKey: "resources", fallback: "RESSOURCE", singular: true },
  archive:  { Icon: Archive,  labelKey: "archive",   fallback: "ARCHIV",    singular: false },
};

const TYPE_SINGULAR = {
  project:  { de: "Projekt",   en: "Project",   es: "Proyecto" },
  area:     { de: "Bereich",   en: "Area",      es: "Área" },
  resource: { de: "Ressource", en: "Resource",  es: "Recurso" },
};

const EMPTY_TITLES = {
  project:  { de: "Keine Projekte",   en: "No Projects",   es: "Sin proyectos" },
  area:     { de: "Keine Bereiche",   en: "No Areas",      es: "Sin áreas" },
  resource: { de: "Keine Ressourcen", en: "No Resources",  es: "Sin recursos" },
  archive:  { de: "Archiv",           en: "Archive",       es: "Archivo" },
};

const MAX_AVATARS = 5;

export function Cover({
  t,
  lang,
  activeCatType,
  cats,
  firstCat,
  onOpenCat,
  onOpenCatType,
  onUpdateCat,
  onAddCat,
}) {
  const [collabOpen, setCollabOpen] = useState(false);
  const accentRgb = COVER_ACCENT_RGB[activeCatType] || COVER_ACCENT_RGB.archive;

  const badgeCfg = COVER_BADGE[activeCatType];
  const collabs = firstCat?.collaborators || [];
  const visibleAvatars = collabs.slice(0, MAX_AVATARS);
  const overflow = Math.max(0, collabs.length - MAX_AVATARS);

  const renderBadge = () => {
    if (!badgeCfg) return null;
    const BadgeIcon = badgeCfg.Icon;
    const full = (t?.[badgeCfg.labelKey] || badgeCfg.fallback).toUpperCase();
    const label = badgeCfg.singular ? full.slice(0, -1) : full;
    return (
      <span className="dsk-cover__badge">
        <BadgeIcon size={10} strokeWidth={3} />
        {label}
      </span>
    );
  };

  const renderEmpty = () => (
    <div className="dsk-cover__copy">
      <h1 className="dsk-cover__title">
        {EMPTY_TITLES[activeCatType]?.[lang] || EMPTY_TITLES[activeCatType]?.de}
      </h1>
      <p className="dsk-cover__desc">
        {lang === "en"
          ? "Create your first item via + in the sidebar."
          : lang === "es"
            ? "Crea tu primer elemento con el botón + en la barra lateral."
            : "Erstelle dein erstes Element über das + in der Sidebar."}
      </p>
      <div className="dsk-cover__tags">
        <button
          type="button"
          className="dsk-cover__tag dsk-cover__tag--cta"
          onClick={() => onAddCat?.(activeCatType)}
        >
          <Plus size={12} />
          {lang === "en" ? "Add" : lang === "es" ? "Añadir" : "Neu hinzufügen"}
        </button>
      </div>
    </div>
  );

  const renderFirst = () => {
    const cat = firstCat;
    const relatedName = cat.relatedId
      ? cats.find((c) => c.id === cat.relatedId)?.name
      : null;
    const fallbackTypeLabel = TYPE_SINGULAR[cat.type]?.[lang] || cat.type;
    const areaTagLabel = relatedName || (lang === "en" ? "General" : lang === "es" ? "General" : "Allgemein");
    const desc =
      cat.desc ||
      cat.body ||
      (lang === "en"
        ? "Organize and manage your topics with PARA-LIST."
        : lang === "es"
          ? "Organiza y gestiona tus temas con PARA-LIST."
          : "Erfasse und verwalte deine Themen mit PARA-LIST.");
    const dateLabel = cat.date
      ? fmtDate(cat.date, t?.locale || "de-DE")
      : lang === "en"
        ? "Flexible"
        : lang === "es"
          ? "Flexible"
          : "Flexibel";

    return (
      <button
        type="button"
        className="dsk-cover__copy dsk-cover__copy--button"
        onClick={() => onOpenCat(cat)}
      >
        <h1 className="dsk-cover__title">{cat.name}</h1>
        <p className="dsk-cover__desc">{desc}</p>
        <div className="dsk-cover__tags">
          <span className="dsk-cover__tag dsk-cover__tag--date">
            <Calendar size={12} />
            {dateLabel}
          </span>
          <span className="dsk-cover__tag dsk-cover__tag--area">
            <Triangle size={12} />
            {cat.relatedId ? areaTagLabel : fallbackTypeLabel}
          </span>
          {cat.tags && cat.tags.length > 0 && (
            <span className="dsk-cover__tag">{cat.tags[0]}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <section
      className="dsk-cover"
      style={{ "--cover-accent-rgb": accentRgb }}
      data-cat={activeCatType}
    >
      <div className="dsk-cover__light-wave" aria-hidden="true" />
      <div className="dsk-cover__inner">
        {renderBadge()}

        {firstCat && (
          <div className="dsk-cover__avatars">
            {visibleAvatars.map((collab, idx) => (
              <button
                key={collab.id || idx}
                type="button"
                className="dsk-cover__avatar"
                style={collab.color ? { background: collab.color } : undefined}
                onClick={() => setCollabOpen(true)}
                title={collab.name}
                aria-label={collab.name}
              >
                {collab.avatar ? (
                  <img src={collab.avatar} alt={collab.name} />
                ) : (
                  <span>{(collab.name || "?").charAt(0).toUpperCase()}</span>
                )}
              </button>
            ))}
            {overflow > 0 && (
              <button
                type="button"
                className="dsk-cover__avatar dsk-cover__avatar--more"
                onClick={() => setCollabOpen(true)}
              >
                <span>+{overflow}</span>
              </button>
            )}
            <button
              type="button"
              className="dsk-cover__avatar dsk-cover__avatar--add"
              onClick={() => setCollabOpen(true)}
              aria-label={lang === "en" ? "Add collaborator" : "Mitarbeitende hinzufügen"}
            >
              <Plus size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {firstCat ? renderFirst() : renderEmpty()}

        {firstCat && activeCatType !== "archive" && (
          <button
            type="button"
            className="dsk-cover__textlink"
            onClick={() => onOpenCatType(activeCatType)}
          >
            <ChevronRight size={12} />
            {activeCatType === "project" && (lang === "en" ? "Show all projects" : "Alle Projekte anzeigen")}
            {activeCatType === "area" && (lang === "en" ? "Show all areas" : "Alle Bereiche anzeigen")}
            {activeCatType === "resource" && (lang === "en" ? "Show all resources" : "Alle Ressourcen anzeigen")}
          </button>
        )}
      </div>

      {collabOpen && firstCat && (
        <CollaboratorsModal
          t={t}
          cat={firstCat}
          onUpdateCat={onUpdateCat}
          onClose={() => setCollabOpen(false)}
          initialView={collabs.length === 0 ? "add" : "list"}
        />
      )}
    </section>
  );
}
