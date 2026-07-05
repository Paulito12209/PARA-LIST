import { useState, useRef } from "react";
import { Check, Moon, Sun, ChevronLeft, Search, X, CheckCircle2, Calendar, MoreHorizontal } from "lucide-react";
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
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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

  const activeEntries = subTab === "today" ? todayEntries : overdueEntries;

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

      {open && (
        <div className="command-panel__drawer" style={{ touchAction: "pan-y" }}>
          <div className="command-panel__tabs">
            <button
              className={`command-panel__tab ${
                subTab === "today" ? "command-panel__tab--active-today" : ""
              }`}
              onClick={() => setSubTab("today")}
            >
              {t.todayTabs}{" "}
              {todayEntries.length > 0 && (
                <span className="command-panel__badge command-panel__badge--today">
                  {todayEntries.length}
                </span>
              )}
            </button>
            <button
              className={`command-panel__tab ${
                subTab === "overdue" ? "command-panel__tab--active-overdue" : ""
              }`}
              onClick={() => setSubTab("overdue")}
            >
              {t.overdueTabs}{" "}
              {overdueEntries.length > 0 && (
                <span className="command-panel__badge command-panel__badge--overdue">
                  {overdueEntries.length}
                </span>
              )}
            </button>
          </div>

          <div className="command-panel__list" key={subTab}>
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
          <div className="command-panel__handle command-panel__handle--open" onClick={onToggle}>
            <div className="command-panel__handle-bar" />
          </div>
        </div>
      )}
    </div>
  );
}
