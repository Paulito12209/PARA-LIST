import { useState, useRef } from "react";
import { Check, Moon, Sun, ChevronLeft, Search, X, CheckCircle2, Calendar, MoreHorizontal, ChevronsUpDown, Filter } from "lucide-react";
import { isOld, isToday, fmtDate, NOTIF_RED } from "../utils";
import { CustomSettingsIcon, BrandLogo, FlashcardsBadge } from "./AppIcons";

const SWIPE_THRESHOLD_PX = 60;
const HAPTIC_TAP_MS = 10;

export function CommandPanel({
  title,
  page,
  app,
  entries,
  open,
  onToggle,
  onOpenSettings,
  onToggleTask,
  t,
  onOpenEntry,
  theme,
  setTheme,
  lang,
  setLang,
  voiceOverlayOpen,
  onOpenAppSwitcher,
  onBack,
  onOpenPageMenu,
}) {
  const [subTab, setSubTab] = useState("today");
  // Ansicht-Auswahl (Heute/Überfällig) als Frosted-Glass-Pille über den
  // Quick-Settings; Typ-Filter (Alle/Aufgaben/Termine) über das Filter-Icon.
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const closeMenus = () => {
    setViewMenuOpen(false);
    setFilterMenuOpen(false);
  };

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

  const todayEntries = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && isToday(e.due)) ||
      (e.type === "calendar" && !e.done && isToday(e.date))
  );

  const overdueEntries = entries
    .filter(
      (e) =>
        (e.type === "task" && !e.done && isOld(e.due)) ||
        (e.type === "calendar" && !e.done && !e.isBirthday && isOld(e.date))
    )
    .sort((a, b) => {
      const dA = new Date((a.due || a.date) + "T12:00");
      const dB = new Date((b.due || b.date) + "T12:00");
      return dB - dA;
    });

  // Typ-Filter auf beide Ansichten anwenden (steuert Liste + Zähler)
  const byType = (list) =>
    typeFilter === "all" ? list : list.filter((e) => e.type === typeFilter);
  const filteredToday = byType(todayEntries);
  const filteredOverdue = byType(overdueEntries);

  const activeEntries = subTab === "today" ? filteredToday : filteredOverdue;

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
                  ? t.backlog
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

      {/* Unsichtbarer Backdrop: Tap außerhalb schließt Ansicht-/Filter-Menü */}
      {open && (viewMenuOpen || filterMenuOpen) && (
        <div className="command-panel__menu-backdrop" onClick={closeMenus} />
      )}

      {open && (
        <div className="command-panel__drawer" style={{ touchAction: "pan-y" }}>
          {/* Anzahl links · Typ-Filter rechts (Space-Between) */}
          <div className="command-panel__meta-row">
            <span
              className={`command-panel__count ${
                subTab === "overdue" ? "command-panel__count--overdue" : ""
              }`}
            >
              {t.entriesCount(activeEntries.length)}
            </span>
            <button
              className={`command-panel__list-filter-btn ${
                typeFilter !== "all" ? "command-panel__list-filter-btn--active" : ""
              }`}
              onClick={() => {
                setFilterMenuOpen((o) => !o);
                setViewMenuOpen(false);
              }}
              aria-label={t.filterLabel || "Filter"}
            >
              <Filter size={16} strokeWidth={2.2} />
            </button>

            {filterMenuOpen && (
              <div className="command-panel__glass-menu command-panel__glass-menu--filter">
                {[
                  { id: "all", label: t.filterAll },
                  { id: "task", label: t.tasks },
                  { id: "calendar", label: t.events },
                ].map((f) => (
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

          <div className="command-panel__list" key={subTab + typeFilter}>
            {activeEntries.length === 0 ? (
              <div className="command-panel__drawer-empty">
                {subTab === "today" ? t.emptyToday : t.emptyOverdue}
              </div>
            ) : (
              activeEntries.map((e) => {
                const d = e.due || e.date;
                return (
                  <div
                    key={e.id}
                    className={`command-panel__drawer-item ${
                      isOld(d) ? "command-panel__drawer-item--overdue" : ""
                    }`}
                    onClick={() => {
                      if (onOpenEntry) {
                        onOpenEntry(e);
                        onToggle();
                      }
                    }}
                  >
                    {/* Kleines Typ-Icon: Aufgabe bzw. Kalender – immer in der
                        Typ-Farbe (Task-Blau/Kalender-Blau), auch bei überfällig */}
                    <span
                      className="command-panel__drawer-icon"
                      style={{
                        color: e.type === "calendar" ? "#0078D4" : "#0B8CE9",
                      }}
                    >
                      {e.type === "calendar" ? (
                        <Calendar size={16} strokeWidth={2.2} />
                      ) : (
                        <CheckCircle2 size={16} strokeWidth={2.2} />
                      )}
                    </span>
                    <div className="command-panel__drawer-info">
                      <div className="command-panel__drawer-title">{e.title}</div>
                      <div className="command-panel__drawer-meta">
                        {e.type === "calendar"
                          ? e.time + (t.oclock ? " " + t.oclock : "")
                          : isOld(d)
                          ? fmtDate(d, t.locale)
                          : t.todayCap}
                      </div>
                    </div>
                    <button
                      className="command-panel__drawer-delete"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onToggleTask(e.id);
                      }}
                    >
                      <Check size={14} color="#5858A0" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="command-panel__footer">
          {/* Ansicht-Auswahl (Heute/Überfällig): Frosted-Glass-Pille mit
              Chevron; öffnet ein Frosted-Glass-Popup mit beiden Optionen. */}
          <div className="command-panel__view-select" onClick={(e) => e.stopPropagation()}>
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
                setFilterMenuOpen(false);
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

          <div className="command-panel__quick-settings" onClick={(e) => e.stopPropagation()}>
            {/* Rundes Schließ-Icon links neben der Sprach-/Theme-Pille */}
            <button
              className="command-panel__qs-close-btn"
              onClick={onToggle}
              aria-label={t.closeBtn || "Schließen"}
            >
              <X size={18} />
            </button>
            <div className="command-panel__qs-pill">
              {["de", "en", "es"].map((l) => (
                <button
                  key={l}
                  className={`command-panel__qs-btn command-panel__qs-btn--lang command-panel__qs-btn--lang-${l} ${
                    lang === l ? "command-panel__qs-btn--active" : ""
                  }`}
                  onClick={() => setLang(l)}
                  title={l === "de" ? "Deutsch" : l === "en" ? "English" : "Español"}
                >
                  {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇪🇸"}
                </button>
              ))}

              <div className="command-panel__qs-divider" />

              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme command-panel__qs-btn--theme-dark ${
                  theme === "dark" ? "command-panel__qs-btn--active" : ""
                }`}
                onClick={() => setTheme("dark")}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme command-panel__qs-btn--theme-light ${
                  theme === "light" ? "command-panel__qs-btn--active" : ""
                }`}
                onClick={() => setTheme("light")}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
            </div>

            {/* Suche (noch nicht implementiert → deaktiviert dargestellt) */}
            <button
              className="command-panel__qs-settings-btn command-panel__qs-search-btn"
              aria-label={lang === "en" ? "Search" : "Suche"}
              aria-disabled="true"
              disabled
            >
              <Search size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
