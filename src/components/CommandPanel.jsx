import { useState, useRef } from "react";
import { Check, Moon, Sun, ChevronLeft, Search, X, CheckCircle2, Calendar, Circle, MoreHorizontal, ChevronsUpDown, Filter, ArrowDownUp, ChevronUp, ChevronDown } from "lucide-react";
import { isOld, isToday, fmtDate, NOTIF_RED } from "../utils";
import { CustomSettingsIcon, BrandLogo, FlashcardsBadge } from "./AppIcons";
import { SearchPanel } from "./SearchPanel";

const SWIPE_THRESHOLD_PX = 60;
const HAPTIC_TAP_MS = 10;

export function CommandPanel({
  title,
  page,
  app,
  entries,
  cats = [],
  open,
  onToggle,
  onOpenSettings,
  onToggleTask,
  t,
  onOpenEntry,
  onOpenCat,
  theme,
  setTheme,
  lang,
  setLang,
  voiceOverlayOpen,
  onOpenAppSwitcher,
  onBack,
  onOpenPageMenu,
  onOpenSearch,
  searchOpen,
  onCloseSearch,
}) {
  const [subTab, setSubTab] = useState("today");
  // Footer-Popups (Frosted Glass): Ansicht (Heute/Überfällig), Sprache, Theme.
  // Metazeile: Typ-Filter (Alle/Aufgaben/Termine) + Sortierung.
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState({ by: "date", desc: true });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const closeMenus = () => {
    setViewMenuOpen(false);
    setFilterMenuOpen(false);
    setSortMenuOpen(false);
    setLangMenuOpen(false);
    setThemeMenuOpen(false);
  };
  const anyMenuOpen = viewMenuOpen || filterMenuOpen || sortMenuOpen || langMenuOpen || themeMenuOpen;

  // Panel geschlossen (Seitenwechsel / X) → alle offenen Popups zurücksetzen,
  // damit beim erneuten Öffnen kein Menü mehr aufgeklappt ist. Anpassung in der
  // Render-Phase (Pattern "adjusting state when a prop changes").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      if (anyMenuOpen) closeMenus();
      if (searchOpen) onCloseSearch?.();
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const isHorizontalSwipe = Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy);
    if (!isHorizontalSwipe) return;

    e.stopPropagation();
    if (dx > 0 && subTab === "overdue") {
      setSubTab("today");
      navigator.vibrate?.(HAPTIC_TAP_MS);
    } else if (dx < 0 && subTab === "today") {
      setSubTab("overdue");
      navigator.vibrate?.(HAPTIC_TAP_MS);
    }
  };

  // Projekte mit Deadline zählen ebenfalls zum Backlog (terminierbar). Als
  // eintragsähnliche Objekte normalisiert (kind: "cat", title = name).
  const datedProjects = cats
    .filter((c) => c.type === "project" && !c.archived && c.date)
    .map((c) => ({ ...c, kind: "cat", title: c.name }));

  const todayEntries = [
    ...entries.filter(
      (e) =>
        (e.type === "task" && !e.done && isToday(e.due)) ||
        (e.type === "calendar" && !e.done && isToday(e.date))
    ),
    ...datedProjects.filter((p) => isToday(p.date)),
  ];

  const overdueEntries = [
    ...entries.filter(
      (e) =>
        (e.type === "task" && !e.done && isOld(e.due)) ||
        (e.type === "calendar" && !e.done && !e.isBirthday && isOld(e.date))
    ),
    ...datedProjects.filter((p) => isOld(p.date)),
  ];

  // Sortierung: nach Fälligkeitsdatum (due/date) oder alphabetisch (Titel).
  const sortEntries = (list) =>
    [...list].sort((a, b) => {
      if (sort.by === "date") {
        const dA = new Date((a.due || a.date || "") + "T12:00").getTime() || 0;
        const dB = new Date((b.due || b.date || "") + "T12:00").getTime() || 0;
        return sort.desc ? dB - dA : dA - dB;
      }
      const cmp = (a.title || "").localeCompare(b.title || "");
      return sort.desc ? -cmp : cmp;
    });

  // Typ-Filter + Sortierung auf beide Ansichten anwenden (Liste + Zähler)
  const byType = (list) =>
    typeFilter === "all" ? list : list.filter((e) => e.type === typeFilter);
  const filteredToday = sortEntries(byType(todayEntries));
  const filteredOverdue = sortEntries(byType(overdueEntries));

  const activeEntries = subTab === "today" ? filteredToday : filteredOverdue;

  // Sortierung weicht von der Norm ab (Standard: Fälligkeitsdatum absteigend,
  // neueste zuerst) → Sortier-Icon blau hervorheben.
  const sortChanged = !(sort.by === "date" && sort.desc === true);

  // Typ-Filter: "Alle" immer oben, die übrigen alphabetisch nach übersetztem
  // Label (DE: Aufgaben·Projekte·Termine, EN: Events·Projects·Tasks …).
  const filterOptions = [
    { id: "all", label: t.filterAll },
    ...[
      { id: "project", label: t.projects },
      { id: "task", label: t.tasks },
      { id: "calendar", label: t.events },
    ].sort((a, b) => a.label.localeCompare(b.label, t.locale)),
  ];

  const isVoiceMode = voiceOverlayOpen && !open;

  const dateStr = new Date().toLocaleDateString(t.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Seiten-Modus: auf Detailseiten zeigt der Header Zurück-Button + Titel,
  // mit dem Datum oberhalb des Titels und ohne Einstellungen-Icon.
  // Geöffnet (Backlog) sieht der Header IMMER gleich aus – Logo + "Backlog" +
  // Settings-Icon –, egal von welcher Seite aus er aufgezogen wurde.
  const headerPage = open ? null : page;

  return (
    <div
      className={`command-panel command-panel--${open ? "open" : "closed"}${
        // Aufgeklappte Startseiten-Liste (title gesetzt): Header opak statt
        // Liquid-Glass, damit das Cover nicht mehr durchscheint.
        !open && !page && title ? " command-panel--solid" : ""
      }`}
      onTouchStart={open ? handleTouchStart : undefined}
      onTouchEnd={open ? handleTouchEnd : undefined}
    >
      <div
        className="command-panel__header"
        onClick={!open && !isVoiceMode ? onToggle : undefined}
        style={!open && !isVoiceMode ? { cursor: "pointer" } : undefined}
      >
        <div className="command-panel__header-row">
          <div className="command-panel__brand">
            {headerPage ? (
              // Detailseiten: Zurück-Button oben links (ersetzt das Page-Icon).
              <button
                type="button"
                className="command-panel__back"
                style={{ "--page-accent-rgb": headerPage.accentRgb }}
                onClick={(e) => { e.stopPropagation(); onBack?.(); }}
                aria-label={t.back || "Zurück"}
              >
                <ChevronLeft size={22} strokeWidth={2.4} />
              </button>
            ) : (
              <button
                type="button"
                className="command-panel__logo-btn"
                aria-label="Tools"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAppSwitcher?.();
                }}
              >
                {app?.kind === "flashcards" ? (
                  <FlashcardsBadge size={48} />
                ) : (
                  <BrandLogo size={48} />
                )}
              </button>
            )}
            <div className="command-panel__titles">
              {/* Einheitlich in allen Modi (Startseite, Detailseiten, Voice):
                  Datum als Eyebrow oben, darunter der große Titel/die Frage. */}
              <div className="command-panel__date">{dateStr}</div>
              <div className={`command-panel__greeting ${headerPage ? "command-panel__greeting--page" : ""}`}>
                {headerPage
                  ? headerPage.title
                  : isVoiceMode
                  ? t.voiceQuestion
                  : open
                  ? searchOpen
                    ? t.searchTitle
                    : t.backlog
                  : (app?.title || title || t.home)}
              </div>
            </div>
          </div>
          <div className="command-panel__actions" style={{ display: "flex", gap: "8px" }}>
            {/* Einstellungen oben rechts – geschlossen UND geöffnet sichtbar.
                Auf Detailseiten stattdessen das Drei-Punkte-Menü der Seite
                (öffnet deren Options-Sheet von unten). */}
            {headerPage ? (
              <button
                className="command-panel__bell command-panel__filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPageMenu?.();
                }}
                aria-label={t.settingsBtn || "Menü"}
              >
                <MoreHorizontal size={22} />
              </button>
            ) : (
              <button
                className="command-panel__bell command-panel__filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
              >
                <CustomSettingsIcon size={22} color="currentColor" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unsichtbarer Backdrop: Tap außerhalb schließt alle Footer-/Meta-Menüs */}
      {open && anyMenuOpen && (
        <div className="command-panel__menu-backdrop" onClick={closeMenus} />
      )}

      {open && searchOpen && (
        <SearchPanel
          t={t}
          entries={entries}
          cats={cats}
          onOpenEntry={(e) => {
            onCloseSearch?.();
            onToggle();
            onOpenEntry?.(e);
          }}
          onOpenCat={(c) => {
            onCloseSearch?.();
            onToggle();
            onOpenCat?.(c);
          }}
          onClose={onCloseSearch}
        />
      )}

      {open && !searchOpen && (
        <div className="command-panel__drawer" style={{ touchAction: "pan-y" }}>
          {/* Anzahl links · Sortier- + Typ-Filter-Icon rechts (Space-Between) */}
          <div className="command-panel__meta-row">
            <span
              className={`command-panel__count ${
                subTab === "overdue" ? "command-panel__count--overdue" : ""
              }`}
            >
              {t.entriesCount(activeEntries.length)}
            </span>
            <div className="command-panel__meta-actions">
              {/* Sortieren */}
              <div className="command-panel__meta-action-wrap">
                <button
                  className={`command-panel__list-filter-btn ${
                    sortChanged ? "command-panel__list-filter-btn--active" : ""
                  }`}
                  onClick={() => {
                    setSortMenuOpen((o) => !o);
                    setFilterMenuOpen(false);
                  }}
                  aria-label={t.sortLabel || "Sortieren"}
                >
                  <ArrowDownUp size={16} strokeWidth={2.2} />
                </button>
                {sortMenuOpen && (
                  <div className="command-panel__glass-menu command-panel__glass-menu--filter">
                    {[
                      { id: "date", label: t.dueDate || t.creationDate },
                      { id: "alpha", label: t.alphabetical },
                    ].map((o) => (
                      <button
                        key={o.id}
                        className={`command-panel__menu-option ${
                          sort.by === o.id ? "command-panel__menu-option--active" : ""
                        }`}
                        onClick={() =>
                          setSort((s) =>
                            s.by === o.id ? { by: o.id, desc: !s.desc } : { by: o.id, desc: o.id === "date" }
                          )
                        }
                      >
                        <span>{o.label}</span>
                        {sort.by === o.id &&
                          (sort.desc ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Typ-Filter */}
              <div className="command-panel__meta-action-wrap">
                <button
                  className={`command-panel__list-filter-btn ${
                    typeFilter !== "all" ? "command-panel__list-filter-btn--active" : ""
                  }`}
                  onClick={() => {
                    setFilterMenuOpen((o) => !o);
                    setSortMenuOpen(false);
                  }}
                  aria-label={t.filterLabel || "Filter"}
                >
                  <Filter size={16} strokeWidth={2.2} />
                </button>
                {filterMenuOpen && (
                  <div className="command-panel__glass-menu command-panel__glass-menu--filter">
                    {filterOptions.map((f) => (
                      <button
                        key={f.id}
                        className={`command-panel__menu-option ${
                          typeFilter === f.id ? "command-panel__menu-option--active" : ""
                        }`}
                        onClick={() => {
                          setTypeFilter(f.id);
                          setFilterMenuOpen(false);
                        }}
                      >
                        <span>{f.label}</span>
                        {typeFilter === f.id && <Check size={14} strokeWidth={2.4} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="command-panel__list" key={subTab + typeFilter}>
            {activeEntries.length === 0 ? (
              <div className="command-panel__drawer-empty">
                {subTab === "today" ? t.emptyToday : t.emptyOverdue}
              </div>
            ) : (
              activeEntries.map((e) => {
                const d = e.due || e.date;
                const isProject = e.kind === "cat";
                return (
                  <div
                    key={e.id}
                    className={`command-panel__drawer-item ${
                      isOld(d) ? "command-panel__drawer-item--overdue" : ""
                    }`}
                    onClick={() => {
                      if (isProject) {
                        onOpenCat?.(e);
                        onToggle();
                      } else if (onOpenEntry) {
                        onOpenEntry(e);
                        onToggle();
                      }
                    }}
                  >
                    {/* Kleines Typ-Icon in der Typ-Farbe (Projekt-Rot/
                        Kalender-Blau/Task-Blau), auch bei überfällig */}
                    <span
                      className="command-panel__drawer-icon"
                      style={{
                        color: isProject
                          ? "#E03E3E"
                          : e.type === "calendar"
                          ? "#0078D4"
                          : "#0B8CE9",
                      }}
                    >
                      {isProject ? (
                        <Circle size={16} strokeWidth={2.2} />
                      ) : e.type === "calendar" ? (
                        <Calendar size={16} strokeWidth={2.2} />
                      ) : (
                        <CheckCircle2 size={16} strokeWidth={2.2} />
                      )}
                    </span>
                    <div className="command-panel__drawer-info">
                      <div className="command-panel__drawer-title">{e.title}</div>
                      <div className="command-panel__drawer-meta">
                        {isProject
                          ? fmtDate(d, t.locale)
                          : e.type === "calendar"
                          ? e.time + (t.oclock ? " " + t.oclock : "")
                          : isOld(d)
                          ? fmtDate(d, t.locale)
                          : t.todayCap}
                      </div>
                    </div>
                    {/* Erledigt-Haken nur für Aufgaben/Termine, nicht für Projekte */}
                    {!isProject && (
                      <button
                        className="command-panel__drawer-delete"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onToggleTask(e.id);
                        }}
                      >
                        <Check size={14} color="#5858A0" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {open && !searchOpen && (
        <div className="command-panel__footer">
          {/* Eine Reihe, alle Elemente gleich hoch: Schließen · Sprache ·
              Heute/Überfällig-Pille · Theme · Suche. Sprache & Theme zeigen nur
              den aktiven Wert und öffnen ein Frosted-Glass-Popup nach oben. */}
          <div className="command-panel__footer-row" onClick={(e) => e.stopPropagation()}>
            {/* Schließen (rund) */}
            <button
              className="command-panel__qs-close-btn"
              onClick={onToggle}
              aria-label={t.closeBtn || "Schließen"}
            >
              <X size={18} />
            </button>

            {/* Sprache (rund) – nur aktive Flagge, Popup mit allen Sprachen */}
            <div className="command-panel__footer-select">
              {langMenuOpen && (
                <div className="command-panel__glass-menu command-panel__glass-menu--lang">
                  {[
                    { id: "de", label: "Deutsch", flag: "🇩🇪" },
                    { id: "en", label: "English", flag: "🇬🇧" },
                    { id: "es", label: "Español", flag: "🇪🇸" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      className={`command-panel__menu-option ${
                        lang === l.id ? "command-panel__menu-option--active" : ""
                      }`}
                      onClick={() => {
                        setLang(l.id);
                        setLangMenuOpen(false);
                      }}
                    >
                      <span className="command-panel__menu-label">
                        <span className="command-panel__menu-flag">{l.flag}</span>
                        {l.label}
                      </span>
                      {lang === l.id && <Check size={14} strokeWidth={2.4} />}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="command-panel__qs-round-btn"
                onClick={() => {
                  setLangMenuOpen((o) => !o);
                  setThemeMenuOpen(false);
                  setViewMenuOpen(false);
                }}
                aria-label={lang === "en" ? "Language" : "Sprache"}
                aria-expanded={langMenuOpen}
              >
                <span className="command-panel__qs-flag">
                  {lang === "de" ? "🇩🇪" : lang === "en" ? "🇬🇧" : "🇪🇸"}
                </span>
              </button>
            </div>

            {/* Ansicht Heute/Überfällig – feste Breite, zentrierter Text */}
            <div className="command-panel__view-select">
              {viewMenuOpen && (
                <div className="command-panel__glass-menu command-panel__glass-menu--view">
                  {[
                    { id: "today", label: t.todayTabs, count: filteredToday.length },
                    { id: "overdue", label: t.overdueTabs, count: filteredOverdue.length },
                  ].map((v) => (
                    <button
                      key={v.id}
                      className={`command-panel__menu-option ${
                        subTab === v.id ? "command-panel__menu-option--active" : ""
                      } ${v.id === "overdue" ? "command-panel__menu-option--overdue" : ""}`}
                      onClick={() => {
                        setSubTab(v.id);
                        setViewMenuOpen(false);
                      }}
                    >
                      <span>{v.label}</span>
                      {v.count > 0 && (
                        <span
                          className={`command-panel__menu-count ${
                            v.id === "overdue" ? "command-panel__menu-count--overdue" : ""
                          }`}
                        >
                          {v.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="command-panel__view-pill"
                onClick={() => {
                  setViewMenuOpen((o) => !o);
                  setLangMenuOpen(false);
                  setThemeMenuOpen(false);
                }}
                aria-expanded={viewMenuOpen}
              >
                <span
                  className={`command-panel__view-pill-label ${
                    subTab === "overdue" ? "command-panel__view-pill-label--overdue" : ""
                  }`}
                >
                  {subTab === "today" ? t.todayTabs : t.overdueTabs}
                </span>
                <ChevronsUpDown size={14} strokeWidth={2.2} />
              </button>
            </div>

            {/* Theme (rund) – nur aktiver Modus, Popup mit Hell/Dunkel */}
            <div className="command-panel__footer-select">
              {themeMenuOpen && (
                <div className="command-panel__glass-menu command-panel__glass-menu--theme">
                  {[
                    { id: "light", label: t.lightMode || "Hell", Icon: Sun },
                    { id: "dark", label: t.darkMode || "Dunkel", Icon: Moon },
                  ].map((m) => (
                    <button
                      key={m.id}
                      className={`command-panel__menu-option ${
                        theme === m.id ? "command-panel__menu-option--active" : ""
                      }`}
                      onClick={() => {
                        setTheme(m.id);
                        setThemeMenuOpen(false);
                      }}
                    >
                      <span className="command-panel__menu-label">
                        <m.Icon size={15} />
                        {m.label}
                      </span>
                      {theme === m.id && <Check size={14} strokeWidth={2.4} />}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="command-panel__qs-round-btn"
                onClick={() => {
                  setThemeMenuOpen((o) => !o);
                  setLangMenuOpen(false);
                  setViewMenuOpen(false);
                }}
                aria-label={theme === "dark" ? "Dark Mode" : "Light Mode"}
                aria-expanded={themeMenuOpen}
              >
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>

            {/* Suche */}
            <button
              type="button"
              className="command-panel__qs-settings-btn command-panel__qs-search-btn"
              aria-label={t.searchTitle}
              onClick={() => onOpenSearch?.()}
            >
              <Search size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
