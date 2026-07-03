import { useState, useRef } from "react";
import { Check, Moon, Sun } from "lucide-react";
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

  // Seiten-Modus: auf Detailseiten zeigt der Header Seiten-Icon + Titel,
  // mit dem Datum oberhalb des Titels und ohne Einstellungen-Icon.
  const PageIcon = page?.Icon;

  return (
    <div
      className={`command-panel command-panel--${open ? "open" : "closed"}`}
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
            {page ? (
              <span
                className="command-panel__page-icon"
                style={{ "--page-accent-rgb": page.accentRgb }}
              >
                <PageIcon size={22} color={`rgb(${page.accentRgb})`} strokeWidth={2.4} />
              </span>
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
              <div className={`command-panel__greeting ${page ? "command-panel__greeting--page" : ""}`}>
                {page ? page.title : isVoiceMode ? t.voiceQuestion : (app?.title || title || t.home)}
              </div>
            </div>
          </div>
          <div className="command-panel__actions" style={{ display: "flex", gap: "8px" }}>
            {!open && !page && (
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
                    <span
                      className="command-panel__drawer-dot"
                      style={{
                        background:
                          e.type === "calendar"
                            ? "#0078D4"
                            : isOld(d)
                            ? NOTIF_RED
                            : "#0B8CE9",
                      }}
                    />
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
            <div className="command-panel__qs-pill">
              {["de", "en", "es"].map((l) => (
                <button
                  key={l}
                  className={`command-panel__qs-btn command-panel__qs-btn--lang ${
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
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${
                  theme === "dark" ? "command-panel__qs-btn--active" : ""
                }`}
                onClick={() => setTheme("dark")}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${
                  theme === "light" ? "command-panel__qs-btn--active" : ""
                }`}
                onClick={() => setTheme("light")}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
            </div>

            <button
              className="command-panel__qs-settings-btn"
              onClick={() => onOpenSettings()}
            >
              <CustomSettingsIcon size={18} />
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
