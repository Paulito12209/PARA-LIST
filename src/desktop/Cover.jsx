import { useEffect, useMemo, useState } from "react";
import { Circle, Triangle, Square, Archive, Calendar, Plus, UserPlus, CheckCircle2, Pencil, MoreHorizontal, Star, Pin, PinOff } from "lucide-react";
import { fmtDate, getInitials } from "../utils";
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

// Angeheftete Einträge im Karussell (Parität mit Mobile-HomeScreen)
const FAV_ENTRY_TYPES = ["task", "note", "calendar"];

const ENTRY_ACCENT_RGB = {
  task:     "11, 140, 233",
  note:     "245, 158, 11",
  calendar: "0, 120, 212",
};

const ENTRY_BADGE = {
  task:     { Icon: CheckCircle2, de: "Aufgabe", en: "Task",  es: "Tarea" },
  note:     { Icon: Pencil,       de: "Notiz",   en: "Note",  es: "Nota" },
  calendar: { Icon: Calendar,     de: "Termin",  en: "Event", es: "Evento" },
};

const EMPTY_TITLES = {
  project:  { de: "Keine Projekte",   en: "No Projects",   es: "Sin proyectos" },
  area:     { de: "Keine Bereiche",   en: "No Areas",      es: "Sin áreas" },
  resource: { de: "Keine Ressourcen", en: "No Resources",  es: "Sin recursos" },
  archive:  { de: "Archiv",           en: "Archive",       es: "Archivo" },
};

const MAX_AVATARS = 5;
const ROTATE_MS = 10_000; // Karussell-Intervall (wie mit dem Nutzer vereinbart)

const openLabel = (lang, label) =>
  lang === "en" ? `Open ${label.toLowerCase()}` : lang === "es" ? `Abrir ${label.toLowerCase()}` : `${label} öffnen`;

export function Cover({
  t,
  lang,
  activeCatType,
  cats,
  entries = [],
  firstCat,
  user,             // { name, avatar } — Besitzer, immer erster Avatar
  detail = false,   // true: Cat wird bereits als Detailseite im Main-Bereich angezeigt
  onOpenCat,
  onOpenEntry,
  onUpdateCat,
  onTogglePin,
  onToggleStar,
  onAddCat,
}) {
  const [collabOpen, setCollabOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Karussell-Slides: angeheftete (pinned) Cats + Einträge — identische Regeln
  // wie im Mobile-HomeScreen. Fallback: die erste Cat des aktiven Typs.
  const coverItems = useMemo(() => {
    if (!detail) {
      const pinned = [
        ...cats
          .filter((c) => c.pinned && !c.archived)
          .map((c) => ({ kind: "cat", id: `cat-${c.id}`, data: c })),
        ...entries
          .filter((e) => e.pinned && !e.archived && FAV_ENTRY_TYPES.includes(e.type))
          .map((e) => ({ kind: "entry", id: `entry-${e.id}`, data: e })),
      ];
      if (pinned.length > 0) return pinned;
    }
    return firstCat ? [{ kind: "cat", id: `cat-${firstCat.id}`, data: firstCat }] : [];
  }, [detail, cats, entries, firstCat]);

  const safeIndex = coverItems.length ? Math.min(index, coverItems.length - 1) : 0;
  const current = coverItems[safeIndex] || null;
  const currentCat = current?.kind === "cat" ? current.data : null;
  const currentEntry = current?.kind === "entry" ? current.data : null;

  // Auto-Rotation; pausiert bei Hover über dem Cover
  useEffect(() => {
    if (paused || coverItems.length <= 1) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % coverItems.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, coverItems.length]);

  const accentRgb = currentEntry
    ? ENTRY_ACCENT_RGB[currentEntry.type] || COVER_ACCENT_RGB.project
    : COVER_ACCENT_RGB[currentCat?.type || activeCatType] || COVER_ACCENT_RGB.archive;

  const collabs = currentCat?.collaborators || [];
  const visibleAvatars = collabs.slice(0, MAX_AVATARS);
  const overflow = Math.max(0, collabs.length - MAX_AVATARS);

  // Kebab-Menü: Favorit umschalten + aus der Vorschau lösen (defixieren)
  const isFav = currentEntry ? !!currentEntry.starred : !!currentCat?.starred;
  const isPinned = !!current?.data?.pinned;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleToggleFav = () => {
    if (currentEntry) onToggleStar?.(currentEntry.id);
    else if (currentCat) onUpdateCat?.(currentCat.id, { starred: !currentCat.starred });
    setMenuOpen(false);
  };
  const handleTogglePin = () => {
    if (current) onTogglePin?.(current.data.id, current.kind);
    setMenuOpen(false);
  };

  const renderBadge = () => {
    if (currentEntry) {
      const cfg = ENTRY_BADGE[currentEntry.type];
      if (!cfg) return null;
      const BadgeIcon = cfg.Icon;
      return (
        <span className="dsk-cover__badge">
          <BadgeIcon size={10} strokeWidth={3} />
          {(cfg[lang] || cfg.de).toUpperCase()}
        </span>
      );
    }
    const badgeCfg = COVER_BADGE[currentCat?.type || activeCatType];
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

  const renderCat = (cat) => {
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

    const Copy = detail ? "div" : "button";
    return (
      <Copy
        {...(detail ? {} : { type: "button", onClick: () => onOpenCat(cat) })}
        className={`dsk-cover__copy${detail ? "" : " dsk-cover__copy--button"}`}
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
      </Copy>
    );
  };

  const renderEntry = (entry) => {
    const dateVal = entry.due || entry.date || null;
    const linkedCatId = entry.catIds?.[0] || entry.catId || null;
    const linkedCat = linkedCatId ? cats.find((c) => c.id === linkedCatId) : null;
    const desc =
      entry.note || entry.body || entry.desc ||
      (lang === "en" ? "No further content." : lang === "es" ? "Sin más contenido." : "Kein weiterer Inhalt.");
    const dateLabel = dateVal
      ? fmtDate(dateVal, t?.locale || "de-DE")
      : lang === "en" ? "Flexible" : lang === "es" ? "Flexible" : "Flexibel";

    return (
      <button
        type="button"
        className="dsk-cover__copy dsk-cover__copy--button"
        onClick={() => onOpenEntry?.(entry)}
      >
        <h1 className="dsk-cover__title">{entry.title}</h1>
        <p className="dsk-cover__desc">{desc}</p>
        <div className="dsk-cover__tags">
          <span className="dsk-cover__tag dsk-cover__tag--date">
            <Calendar size={12} />
            {dateLabel}
          </span>
          {linkedCat && (
            <span className="dsk-cover__tag dsk-cover__tag--area">
              <Triangle size={12} />
              {linkedCat.name}
            </span>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <span className="dsk-cover__tag">{entry.tags[0]}</span>
          )}
        </div>
      </button>
    );
  };

  const ctaLabel = currentEntry
    ? openLabel(lang, (ENTRY_BADGE[currentEntry.type]?.[lang] || ENTRY_BADGE[currentEntry.type]?.de || currentEntry.type))
    : currentCat
      ? openLabel(lang, TYPE_SINGULAR[currentCat.type]?.[lang] || currentCat.type)
      : "";

  return (
    <section
      className="dsk-cover"
      style={{ "--cover-accent-rgb": accentRgb }}
      data-cat={currentEntry ? currentEntry.type : (currentCat?.type || activeCatType)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="dsk-cover__light-wave" aria-hidden="true" />

      <div className="dsk-cover__inner">
        <div className="dsk-cover__badge-row">
          {renderBadge()}
          {current && !detail && (
            <button
              type="button"
              className={`dsk-cover__fav-btn${isFav ? " dsk-cover__fav-btn--on" : ""}`}
              onClick={handleToggleFav}
              aria-pressed={isFav}
              aria-label={isFav
                ? (lang === "en" ? "Remove favorite" : "Favorit entfernen")
                : (lang === "en" ? "Mark as favorite" : "Als Favorit markieren")}
              title={isFav
                ? (lang === "en" ? "Remove favorite" : "Favorit entfernen")
                : (lang === "en" ? "Mark as favorite" : "Als Favorit markieren")}
            >
              <Star size={20} strokeWidth={2} fill={isFav ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {currentCat && (
          <div className="dsk-cover__avatars">
            <button
              type="button"
              className="dsk-cover__avatar dsk-cover__avatar--owner"
              onClick={() => setCollabOpen(true)}
              title={user?.name || "Ich"}
              aria-label={user?.name || "Ich"}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || ""} />
              ) : (
                <span>{getInitials(user?.name)}</span>
              )}
            </button>
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
              <UserPlus size={15} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {currentEntry
          ? renderEntry(currentEntry)
          : currentCat
            ? renderCat(currentCat)
            : renderEmpty()}

        {current && !detail && (
          <div className="dsk-cover__cta-row">
            <button
              type="button"
              className="dsk-cover__open-btn"
              onClick={() => (currentEntry ? onOpenEntry?.(currentEntry) : onOpenCat(currentCat))}
            >
              <span className="dsk-cover__open-btn-label">{ctaLabel}</span>
            </button>

            <div className="dsk-cover__menu-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="dsk-cover__menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={lang === "en" ? "Options" : "Optionen"}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={20} strokeWidth={2.2} />
              </button>
              {menuOpen && (
                <div className="dsk-cover__menu" role="menu">
                  <button
                    type="button"
                    className="dsk-cover__menu-item"
                    role="menuitem"
                    onClick={handleTogglePin}
                  >
                    {isPinned
                      ? <PinOff size={16} strokeWidth={2} />
                      : <Pin size={16} strokeWidth={2} />}
                    <span>
                      {isPinned
                        ? (lang === "en" ? "Remove from preview" : "Aus Vorschau entfernen")
                        : (lang === "en" ? "Pin to preview" : "An Vorschau anheften")}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {coverItems.length > 1 && (
        <div className="dsk-cover__dots">
          {coverItems.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`dsk-cover__dot${i === safeIndex ? " dsk-cover__dot--active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${coverItems.length}`}
            />
          ))}
        </div>
      )}

      {collabOpen && currentCat && (
        <CollaboratorsModal
          t={t}
          cat={currentCat}
          onUpdateCat={onUpdateCat}
          onClose={() => setCollabOpen(false)}
          initialView={collabs.length === 0 ? "add" : "list"}
        />
      )}
    </section>
  );
}
