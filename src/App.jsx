import { useState, useRef, useCallback, useEffect } from "react";
import { I18N, getCC, getTABS } from "./i18n";
import { usePersistedState } from "./hooks/useStorage";
import { useInactivity } from "./hooks/useInactivity";
import { clear } from "idb-keyval";
import {
  Circle, Triangle, Square, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check,
  Bell, Trash2, X, FileText, CheckSquare, Calendar, Home, Edit2, Search,
  Link2, Pencil, Paperclip, Image as ImageIcon,
  CheckCircle2, Archive, ArchiveRestore, Moon, Sun,
  Video as VideoIcon, Headphones as AudioIcon, File as DocumentIcon,
  Star, MoreVertical
} from "lucide-react";
import "./App.scss";
import { EntryMetaTags, HomeEntryItem, TaskList, NoteList, CalList, MediaList, LinkList } from "./EntryLists";
import { CatListScreen, BookmarkRail, CatDetailScreen } from "./FolderScreens";
import { EntryDetailScreen } from "./EntryDetailScreen";
import { TagIcon, ArchiveIcon, BookmarkIcon, CustomSettingsIcon } from "./AppIcons";
import { uid, TODAY, isOld, isToday, getNextBirthday, fmtDate, fmtRelative, getTaskGroup, getYouTubeVideoId, BOOKMARKS, NOTIF_RED, NOTIF_NAVY, NOTIF_VIOL, CAT_ICONS, ID_BIRTHDAYS, SEED, computeNotif, SwipeToDelete, AutoScrollText } from "./shared";

/* ── Command Panel ───────────────────────────────────────────── */
function CommandPanel({ user, notif, entries, open, onToggle, onOpenSettings, onToggleTask, t, onOpenEntry, theme, setTheme, lang, setLang }) {
  const [subTab, setSubTab] = useState("today");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX.current;
    const dy = touchEndY - touchStartY.current;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      e.stopPropagation();
      if (dx > 0 && subTab === "overdue") {
        setSubTab("today");
        if (navigator.vibrate) navigator.vibrate(10);
      } else if (dx < 0 && subTab === "today") {
        setSubTab("overdue");
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  };

  const todayEntries = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && isToday(e.due)) ||
      (e.type === "calendar" && !e.done && isToday(e.date))
  );



  const overdueEntries = entries.filter(
    (e) =>
      (e.type === "task" && !e.done && isOld(e.due)) ||
      (e.type === "calendar" && !e.done && !e.isBirthday && isOld(e.date))
  ).sort((a, b) => {
    const dA = new Date((a.due || a.date) + "T12:00");
    const dB = new Date((b.due || b.date) + "T12:00");
    return dB - dA;
  });

  const activeEntries = subTab === "today" ? todayEntries : overdueEntries;

  return (
    <div
      className={`command-panel command-panel--${open ? "open" : "closed"}`}
      onTouchStart={open ? handleTouchStart : undefined}
      onTouchEnd={open ? handleTouchEnd : undefined}
    >


      <div
        className="command-panel__header"
        onClick={!open ? onToggle : undefined}
        style={!open ? { cursor: 'pointer' } : undefined}
      >
        <div className="command-panel__header-row">
          <div>
            <div className="command-panel__greeting">{t.greeting(new Date().getHours(), user.name)}</div>
            <div className="command-panel__date">
              {new Date().toLocaleDateString(t.locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
          </div>
          <div className="command-panel__actions" style={{ display: 'flex', gap: '8px' }}>
            {!open && (
              <button
                className="command-panel__bell command-panel__profile-btn"
                onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
                style={user.avatar ? { padding: 0 } : {}}
              >
                {user.avatar ? (
                  <div className="command-panel__profile-avatar">
                    <img src={user.avatar} alt="Avatar" />
                    <div className="command-panel__profile-hover">
                      <CustomSettingsIcon size={18} color="#fff" />
                    </div>
                  </div>
                ) : (
                  <CustomSettingsIcon size={17} className="icon-muted" color="currentColor" />
                )}
              </button>
            )}
          </div>
        </div>
        {!open && (
          <div className="command-panel__handle command-panel__handle--closed">
            <div
              className="command-panel__handle-bar"
              style={{}}
            />
          </div>
        )}
      </div>

      {open && (
        <div
          className="command-panel__drawer"
          style={{ touchAction: 'pan-y' }}
        >


          <div className="command-panel__tabs">
            <button
              className={`command-panel__tab ${subTab === "today" ? "command-panel__tab--active-today" : ""}`}
              onClick={() => setSubTab("today")}
            >
              {t.todayTabs} {todayEntries.length > 0 && <span className="command-panel__badge command-panel__badge--today">{todayEntries.length}</span>}
            </button>
            <button
              className={`command-panel__tab ${subTab === "overdue" ? "command-panel__tab--active-overdue" : ""}`}
              onClick={() => setSubTab("overdue")}
            >
              {t.overdueTabs} {overdueEntries.length > 0 && <span className="command-panel__badge command-panel__badge--overdue">{overdueEntries.length}</span>}
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
                    className={`command-panel__drawer-item ${isOld(d) ? "command-panel__drawer-item--overdue" : ""
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
                            ? "#1D4ED8"
                            : isOld(d)
                              ? NOTIF_RED
                              : "#7C83F7",
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
          <div
            className="command-panel__handle command-panel__handle--open"
            onClick={onToggle}
          >
            <div className="command-panel__handle-bar" />
          </div>
          <div className="command-panel__quick-settings" onClick={(e) => e.stopPropagation()}>
            <div className="command-panel__qs-pill">
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'de' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('de')}
                title="Deutsch"
              >
                🇩🇪
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'en' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('en')}
                title="English"
              >
                🇬🇧
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--lang ${lang === 'es' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setLang('es')}
                title="Español"
              >
                🇪🇸
              </button>

              <div className="command-panel__qs-divider" />

              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${theme === 'dark' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
              <button
                className={`command-panel__qs-btn command-panel__qs-btn--theme ${theme === 'light' ? 'command-panel__qs-btn--active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
            </div>

            <button
              className="command-panel__qs-settings-btn command-panel__profile-btn"
              onClick={() => onOpenSettings()}
              style={user.avatar ? { padding: 0 } : {}}
            >
              {user.avatar ? (
                <div className="command-panel__profile-avatar">
                  <img src={user.avatar} alt="Avatar" />
                  <div className="command-panel__profile-hover">
                    <CustomSettingsIcon size={18} color="#fff" />
                  </div>
                </div>
              ) : (
                <CustomSettingsIcon size={18} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Home Screen ─────────────────────────────────────────────── */
function HomeScreen({
  t,
  CC,
  TABS,
  lang,
  state,
  tab,
  setTab,
  onOpenCatType,
  onOpenCat,
  onAddCat,
  onAddEntry,
  onAddVoiceEntry, // Neue Prop für den Sprachassistenten
  toggleTask,
  toggleStar,
  updateEntry,
  deleteEntry,
  onOpenEntry,
  onOpenArchive,
  onArchiveEntry,
  panelOpen,
  expandedCat,
  setExpandedCat,
  onCoverAccentChange,
}) {

  const { entries, cats } = state;
  
  // Zustand für den ausgewählten Kategorie-Typ auf der Startseite (standardmäßig Projekte)
  const [activeCatType, setActiveCatType] = useState("project");
  
  // Zustand für die aktive Sprachaufnahme
  const [isListening, setIsListening] = useState(false);

  // Erstes Element der aktiven Kategorie aus dem State filtern
  const activeCats = cats.filter((c) => c.type === activeCatType && !c.archived);
  const firstCat = activeCats[0];

  const tabEntries = entries.map((e) => {
    if (e.type === "calendar" && e.isBirthday) {
      const nextBd = getNextBirthday(e.date);
      if (nextBd) {
        return { ...e, date: nextBd.date, title: `${e.title} (${nextBd.age} ${t.yearsShort || "J."})` };
      }
    }
    return e;
  }).filter((e) => {
    if (tab === "calendar") {
      return e.type === "calendar" && (!e.date || !isOld(e.date)) && !e.done;
    }
    if (tab === "notes") {
      return e.type === "note" && !e.archived;
    }
    if (tab === "tasks") {
      const isOverdue = e.type === "task" && !e.done && isOld(e.due);
      return e.type === "task" && !isOverdue && !e.done;
    }
    return false;
  });

  const showArchiveButton = () => {
    if (tab === "tasks") return entries.some((e) => e.type === "task" && e.done);
    if (tab === "calendar") return entries.some((e) => e.type === "calendar" && (isOld(e.date) || e.done));
    if (tab === "notes") return entries.some((e) => e.type === "note");
    return false;
  };
  const tabCfg = TABS.find((t) => t.id === tab);
  const tabColor = tabCfg?.color || "#7C83F7";

  const entryListRef = useRef(null);
  const [activeGroupHeader, setActiveGroupHeader] = useState(null);

  const handleListScroll = (e) => {
    if (!entryListRef.current) return;
    const container = entryListRef.current;
    const groups = container.querySelectorAll('.task-group');
    if (!groups.length) {
      if (activeGroupHeader) setActiveGroupHeader(null);
      return;
    }

    let currentGroup = groups[0];
    const containerTop = container.getBoundingClientRect().top;

    // Finde die letzte Gruppe, die den oberen Rand berührt oder überschritten hat
    for (let i = 0; i < groups.length; i++) {
      const rect = groups[i].getBoundingClientRect();
      if (rect.top <= containerTop + 24) {
        currentGroup = groups[i];
      } else {
        break;
      }
    }

    if (currentGroup) {
      const left = currentGroup.dataset.groupLeft;
      const right = currentGroup.dataset.groupRight;
      if (left && (!activeGroupHeader || activeGroupHeader.left !== left || activeGroupHeader.right !== right)) {
        setActiveGroupHeader({ left, right });
      }
    }
  };

  // Scroll-Handler ausführen, wenn sich der Tab oder die Einträge ändern
  useEffect(() => {
    if (entryListRef.current) {
      setTimeout(() => handleListScroll({ currentTarget: entryListRef.current }), 50);
    }
  }, [tab, tabEntries]);

  const lastTap = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX.current;

    if (Math.abs(dx) > 60 && !panelOpen) {
      const tabOrder = TABS.map(t => t.id);
      const currentIndex = tabOrder.indexOf(tab);

      if (dx > 0 && currentIndex > 0) {
        // Swipe nach rechts -> Vorheriger Tab
        setTab(tabOrder[currentIndex - 1]);
      } else if (dx < 0 && currentIndex < tabOrder.length - 1) {
        // Swipe nach links -> Nächster Tab
        setTab(tabOrder[currentIndex + 1]);
      }
    }
  };

  const handleDoubleTap = useCallback(
    (e) => {
      const isEmptyPlaceholder = e.target.closest('.entry-list__empty') || e.target.closest('.cat-detail__section-empty');
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onAddEntry();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [onAddEntry]
  );

  // Spracherkennungsfunktion mit HTML5 SpeechRecognition
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'de'
        ? "Spracherkennung wird in diesem Browser leider nicht unterstützt. Bitte nutze Chrome oder Safari."
        : "Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }
    if (isListening) return;

    const rec = new SpeechRecognition();
    rec.lang = lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      if (navigator.vibrate) navigator.vibrate(20);
    };

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text && text.trim() && onAddVoiceEntry) {
        onAddVoiceEntry(text.trim());
        if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      }
    };

    rec.onerror = (err) => {
      console.error("Speech Recognition error:", err);
      setIsListening(false);
      // Benutzerfreundliche Fehlermeldung je nach Fehlertyp
      if (err.error === 'not-allowed' || err.error === 'permission-denied') {
        alert(lang === 'de'
          ? "Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen."
          : "Microphone access was denied. Please allow microphone access in your browser settings.");
      } else if (err.error === 'no-speech') {
        // Kein Fehler-Alert bei Stille – das ist normales Verhalten
      } else if (err.error === 'network') {
        alert(lang === 'de'
          ? "Netzwerkfehler bei der Spracherkennung. Bitte überprüfe deine Internetverbindung."
          : "Network error during speech recognition. Please check your internet connection.");
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.start();
  };

  // RGB-Farbwerte der ausgewählten Kategorie für die Lichtwellen ermitteln
  const getThemeColorRgb = (type) => {
    if (type === "project") return "224, 62, 62";     // Rot
    if (type === "area") return "208, 144, 32";       // Orange/Gelb
    if (type === "resource") return "48, 160, 96";    // Grün
    return "124, 131, 247";                            // Blau/Lila (Archiv)
  };

  const rgbVal = getThemeColorRgb(activeCatType);

  useEffect(() => {
    if (onCoverAccentChange) {
      onCoverAccentChange(rgbVal);
    }
  }, [rgbVal, onCoverAccentChange]);

  return (
    <div className={`home home--${tab}`}>
      {/* ── OBERES COVER-ELEMENT (LICHTWELLEN & ERSTES ELEMENT) ── */}
      <div 
        className="home-cover" 
        style={{ "--cover-accent-rgb": rgbVal }}
      >
        <div className="home-cover__light-wave" />
        <div className="home-cover__content">
          <div className="home-cover__header">
            <span className="home-cover__badge">
              {activeCatType === "project" && (
                <>
                  <Circle size={10} strokeWidth={3} className="home-cover__badge-icon" />
                  {t.projects ? t.projects.toUpperCase().slice(0, -1) : "PROJEKT"}
                </>
              )}
              {activeCatType === "area" && (
                <>
                  <Triangle size={10} strokeWidth={3} className="home-cover__badge-icon" />
                  {t.areas ? t.areas.toUpperCase().slice(0, -1) : "BEREICH"}
                </>
              )}
              {activeCatType === "resource" && (
                <>
                  <Square size={10} strokeWidth={3} className="home-cover__badge-icon" />
                  {t.resources ? t.resources.toUpperCase().slice(0, -1) : "RESSOURCE"}
                </>
              )}
              {activeCatType === "archive" && (
                <>
                  <Archive size={10} strokeWidth={3} className="home-cover__badge-icon" />
                  {t.archive ? t.archive.toUpperCase() : "ARCHIV"}
                </>
              )}
            </span>
            {state.user.avatar && (
              <img 
                src={state.user.avatar} 
                alt="Avatar" 
                className="home-cover__avatar"
              />
            )}
          </div>

          {firstCat ? (
            <div className="home-cover__main">
              <button
                type="button"
                className="home-cover__primary-action"
                onClick={() => onOpenCat(firstCat)}
              >
                <div className="home-cover__copy">
                  <h1 className="home-cover__title">{firstCat.name}</h1>
                  <p className="home-cover__desc">
                    {firstCat.desc || firstCat.body || (lang === 'de' ? 'Erfasse und verwalte deine Themen mit PARA-LIST.' : 'Organize and manage your topics with PARA-LIST.')}
                  </p>
                </div>

                {/* Eigener Hit-Bereich für die Pills, damit auch Leerraum rechts klickbar ist */}
                <div className="home-cover__meta">
                  <div className="home-cover__tags">
                    <span className="home-cover__tag home-cover__tag--date">
                      <Calendar size={12} className="home-cover__tag-icon" />
                      {firstCat.date ? fmtDate(firstCat.date, t.locale) : (lang === 'de' ? 'Flexibel' : 'Flexible')}
                    </span>
                    <span className="home-cover__tag home-cover__tag--area">
                      <Triangle size={12} className="home-cover__tag-icon" />
                      {
                        firstCat.relatedId 
                          ? (cats.find(c => c.id === firstCat.relatedId)?.name || (lang === 'de' ? 'Allgemein' : 'General'))
                          : firstCat.type === 'project' 
                            ? (lang === 'de' ? 'Projekt' : 'Project')
                            : firstCat.type === 'area'
                              ? (lang === 'de' ? 'Bereich' : 'Area')
                              : (lang === 'de' ? 'Ressource' : 'Resource')
                      }
                    </span>
                    <span className="home-cover__tag">
                      {firstCat.tags && firstCat.tags.length > 0 ? firstCat.tags[0] : 'App'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Separater Link zur Vollansicht des gesamten Typs */}
              <div 
                className="home-cover__textlink"
                onClick={() => onOpenCatType(activeCatType)}
              >
                {activeCatType === "project" && (lang === 'de' ? "Alle Projekte anzeigen" : "Show all projects")}
                {activeCatType === "area" && (lang === 'de' ? "Alle Bereiche anzeigen" : "Show all areas")}
                {activeCatType === "resource" && (lang === 'de' ? "Alle Ressourcen anzeigen" : "Show all resources")}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '11px', height: '11px', flexShrink: 0, marginLeft: '4px', verticalAlign: 'middle' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="home-cover__main">
              <h1 className="home-cover__title">
                {activeCatType === "project" && (lang === 'de' ? "Keine Projekte" : "No Projects")}
                {activeCatType === "area" && (lang === 'de' ? "Keine Bereiche" : "No Areas")}
                {activeCatType === "resource" && (lang === 'de' ? "Keine Ressourcen" : "No Resources")}
              </h1>
              <p className="home-cover__desc">
                {lang === 'de' ? "Erstelle dein erstes Element mit dem Plus-Symbol unten!" : "Create your first item with the plus symbol below!"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── GETEILTE NAVIGATION (SPLIT NAVIGATION) ── */}
      <div className="split-nav">
        {/* Linker Container (Pills mit Dotted-Textur) */}
        <div className={`split-nav__pills split-nav__pills--${activeCatType}`}>
          <div className="split-nav__dots-bg" />
          <div className="split-nav__items">
            {[
              { id: "project", icon: Circle, color: "#E03E3E", label: t.projects || "Projekte" },
              { id: "area", icon: Triangle, color: "#D09020", label: t.areas || "Bereiche" },
              { id: "resource", icon: Square, color: "#30A060", label: t.resources || "Ressourcen" },
              { id: "archive", icon: Archive, color: "#7C83F7", label: t.archive || "Archiv" },
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeCatType === item.id;
              return (
                <button
                  key={item.id}
                  className={`split-nav__btn ${isActive ? "split-nav__btn--active" : ""}`}
                  onClick={() => {
                    if (item.id === "archive") {
                      onOpenArchive(tab);
                    } else {
                      setActiveCatType(item.id);
                    }
                  }}
                  style={isActive ? { color: item.color } : {}}
                  title={item.label}
                >
                  <IconComp size={36} strokeWidth={isActive ? 2.5 : 2} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Rechter Container (Plus-Button mit Dotted-Textur) */}
        <button
          className="split-nav__add"
          onClick={() => onAddCat(activeCatType)}
          style={{}}
          title={lang === 'de' ? "Neu erstellen" : "Create new"}
        >
          <div className="split-nav__dots-bg" />
          <Plus size={36} color={`rgb(${rgbVal})`} strokeWidth={2.4} />
        </button>
      </div>

      {/* ── MINIMALISTISCHE AUFGABENLISTE (16PX GRID) ── */}
      <div className="home__list-container">
        <div className="list-section__header">
          <div className="list-section__header-left">
            <span className="list-section__label">{tabCfg?.label}</span>
          </div>
          <div className="list-switcher">
            {TABS.map((tItem) => {
              const TabIcon = tItem.Icon;
              const isActive = tab === tItem.id;
              return (
                <button
                  key={tItem.id}
                  className={`list-switcher__btn ${isActive ? "list-switcher__btn--active" : ""}`}
                  onClick={() => setTab(tItem.id)}
                  style={
                    isActive
                      ? {
                        background: tItem.color + "22",
                        boxShadow: `0 0 12px ${tItem.color}30`,
                        color: tItem.color,
                      }
                      : {}
                  }
                >
                  <TabIcon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamischer, fixer Gruppen-Header */}
        {activeGroupHeader && (tab === "tasks" || tab === "calendar" || tab === "notes") && (
          <div className="task-group-header task-group-header--fixed">
            <span className="task-group-header__left">{activeGroupHeader.left}</span>
            <span className="task-group-header__right">{activeGroupHeader.right}</span>
          </div>
        )}

        {/* Aufgabenliste ohne umschließenden Container */}
        <div
          className="entry-list"
          onClick={handleDoubleTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          ref={entryListRef}
          onScroll={handleListScroll}
        >
          {tabEntries.length === 0 ? (
            <div className="entry-list__empty">
              <div className="entry-list__empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                {tabCfg && <tabCfg.Icon size={28} color={tabColor} strokeWidth={1.5} />}
              </div>
              {t.noEntries(tabCfg?.label)}
            </div>
          ) : (
            <>
              {tab === "tasks" && (
                <TaskList t={t} CC={CC} lang={lang}
                  entries={tabEntries}
                  cats={cats}
                  onToggle={toggleTask}
                  onToggleStar={toggleStar}
                  onUpdateEntry={updateEntry}
                  onDelete={deleteEntry}
                  grouped={true}
                  color={tabColor}
                  onOpenEntry={onOpenEntry}
                  isHome={true}
                />
              )}
              {tab === "notes" && (
                <NoteList t={t} CC={CC}
                  entries={tabEntries}
                  cats={cats}
                  onDelete={deleteEntry}
                  onToggleStar={toggleStar}
                  onUpdateEntry={updateEntry}
                  grouped={true}
                  color={tabColor}
                  onOpenEntry={onOpenEntry}
                  onArchiveEntry={onArchiveEntry}
                  isHome={true}
                />
              )}
              {tab === "calendar" && (
                <CalList t={t} CC={CC} lang={lang}
                  entries={tabEntries}
                  cats={cats}
                  onDelete={deleteEntry}
                  onToggle={toggleTask}
                  onToggleStar={toggleStar}
                  onUpdateEntry={updateEntry}
                  grouped={true}
                  color={tabColor}
                  onOpenEntry={onOpenEntry}
                  isHome={true}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── PULSIERENDER SPRACHASSISTENT (VOICE FAB) ── */}
      {(tab === "tasks" || tab === "notes" || tab === "calendar") && (
        <div className="voice-fab-container">
          <button
            className={`voice-fab ${isListening ? "voice-fab--listening" : ""}`}
            onClick={handleVoiceInput}
            style={{
              border: `1.5px solid ${tabColor}73`,
              boxShadow: isListening
                ? "0 0 30px rgba(239, 68, 68, 0.6)"
                : `inset 0 0 22px ${tabColor}38, 0 8px 32px rgba(15, 15, 30, 0.55)`,
            }}
            title={
              tab === "notes"
                ? (lang === 'de' ? "Notiz per Spracheingabe hinzufügen" : "Add note via voice")
                : tab === "calendar"
                  ? (lang === 'de' ? "Termin per Spracheingabe hinzufügen" : "Add event via voice")
                  : (lang === 'de' ? "Aufgabe per Spracheingabe hinzufügen" : "Add task via voice")
            }
          >
            {isListening && <div className="voice-fab__pulse-ring" />}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="24"
              height="24"
              className="voice-fab__icon"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Archive Screen ────────────────────────────────────────────── */
function ArchiveScreen({ t, CC, lang, entries, cats, tab, onDelete, onBack, toggleTask, onOpenEntry, onRestoreNote, onOpenCat }) {
  // Lokaler Zustand zur Steuerung des aktiven Archiv-Tabs im Dashboard
  const [activeArchiveTab, setActiveArchiveTab] = useState(null);
  const fabVisible = useInactivity(5000);

  // Zähler für die archivierten Elemente ermitteln
  const archivedProjects = cats.filter(c => c.type === "project" && c.archived);
  const archivedAreas = cats.filter(c => c.type === "area" && c.archived);
  const archivedResources = cats.filter(c => c.type === "resource" && c.archived);

  const completedTasks = entries.filter(e => e.type === "task" && e.done);
  const archivedNotes = entries.filter(e => e.type === "note" && e.archived);
  const archivedEvents = entries.filter(e => e.type === "calendar" && (isOld(e.date) || e.done));

  // Daten für die aktuell geöffnete Detailansicht filtern
  const getArchiveItems = () => {
    if (activeArchiveTab === "project") return archivedProjects;
    if (activeArchiveTab === "area") return archivedAreas;
    if (activeArchiveTab === "resource") return archivedResources;
    if (activeArchiveTab === "tasks") return completedTasks;
    if (activeArchiveTab === "notes") return archivedNotes;
    if (activeArchiveTab === "calendar") return archivedEvents.sort((a, b) => new Date(b.date + "T12:00") - new Date(a.date + "T12:00"));
    return [];
  };

  const archiveItems = getArchiveItems();
  const isCatTab = ["project", "area", "resource"].includes(activeArchiveTab);
  const CatIcon = isCatTab ? CAT_ICONS[activeArchiveTab] : null;

  const getSectionTitle = () => {
    if (activeArchiveTab === "project") return lang === 'de' ? "Archivierte Projekte" : "Archived Projects";
    if (activeArchiveTab === "area") return lang === 'de' ? "Archivierte Bereiche" : "Archived Areas";
    if (activeArchiveTab === "resource") return lang === 'de' ? "Archivierte Ressourcen" : "Archived Resources";
    if (activeArchiveTab === "tasks") return t.completedTasks || (lang === 'de' ? "Erledigte Aufgaben" : "Completed Tasks");
    if (activeArchiveTab === "notes") return t.archivedNotes || (lang === 'de' ? "Archivierte Notizen" : "Archived Notes");
    if (activeArchiveTab === "calendar") return t.pastEvents || (lang === 'de' ? "Vergangene Termine" : "Past Events");
    return "";
  };

  return (
    <div className="cat-detail archive-dashboard-container">
      {/* ── HEADER ── */}
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          <ArchiveIcon size={18} color="#7C83F7" />
          <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
            {activeArchiveTab ? getSectionTitle() : (lang === 'de' ? "Archiv-Dashboard" : "Archive Dashboard")}
          </div>
        </div>
      </div>

      <div className="cat-detail__body" style={{ padding: '16px', paddingBottom: '100px' }}>
        {/* ── DAS DASHBOARD (Wenn kein Tab aktiv ist) ── */}
        {!activeArchiveTab ? (
          <div className="archive-dashboard">
            {/* OBERER BEREICH: Karussell fuer Ordner */}
            <div className="archive-dashboard__section-title">
              {lang === 'de' ? "Archivierte Ordner" : "Archived Folders"}
            </div>
            
            <div className="archive-carousel">
              {/* Projekt-Karte */}
              <div 
                className="archive-card archive-card--project" 
                onClick={() => setActiveArchiveTab("project")}
              >
                <div className="archive-card__dots" />
                <div className="archive-card__header">
                  <div className="archive-card__icon-box">
                    <Circle size={22} strokeWidth={2.5} color="#E03E3E" fill="rgba(224,62,62,0.15)" />
                  </div>
                  <span className="archive-card__count">{archivedProjects.length}</span>
                </div>
                <div className="archive-card__title">
                  {lang === 'de' ? "Projekte" : "Projects"}
                </div>
                <div className="archive-card__desc">
                  {lang === 'de' ? "Hier liegen deine abgeschlossenen Projekte." : "Your completed project archives."}
                </div>
              </div>

              {/* Bereichs-Karte */}
              <div 
                className="archive-card archive-card--area" 
                onClick={() => setActiveArchiveTab("area")}
              >
                <div className="archive-card__dots" />
                <div className="archive-card__header">
                  <div className="archive-card__icon-box">
                    <Triangle size={22} strokeWidth={2.5} color="#D09020" fill="rgba(208,144,32,0.15)" />
                  </div>
                  <span className="archive-card__count">{archivedAreas.length}</span>
                </div>
                <div className="archive-card__title">
                  {lang === 'de' ? "Bereiche" : "Areas"}
                </div>
                <div className="archive-card__desc">
                  {lang === 'de' ? "Archivierte Lebensbereiche und Rollen." : "Your archived life areas."}
                </div>
              </div>

              {/* Ressourcen-Karte */}
              <div 
                className="archive-card archive-card--resource" 
                onClick={() => setActiveArchiveTab("resource")}
              >
                <div className="archive-card__dots" />
                <div className="archive-card__header">
                  <div className="archive-card__icon-box">
                    <Square size={22} strokeWidth={2.5} color="#30A060" fill="rgba(48,160,96,0.15)" />
                  </div>
                  <span className="archive-card__count">{archivedResources.length}</span>
                </div>
                <div className="archive-card__title">
                  {lang === 'de' ? "Ressourcen" : "Resources"}
                </div>
                <div className="archive-card__desc">
                  {lang === 'de' ? "Abgelegtes Wissen und Nachschlagewerke." : "Archived collections of knowledge."}
                </div>
              </div>
            </div>

            {/* UNTERER BEREICH: Grid fuer Eintraege */}
            <div className="archive-dashboard__section-title" style={{ marginTop: '28px' }}>
              {lang === 'de' ? "Archivierte Inhalte" : "Archived Contents"}
            </div>

            <div className="archive-grid">
              {/* Aufgaben-Karte */}
              <div 
                className="archive-grid-card archive-grid-card--tasks"
                onClick={() => setActiveArchiveTab("tasks")}
              >
                <div className="archive-grid-card__header">
                  <CheckCircle2 size={20} color="#7C83F7" />
                  <span className="archive-grid-card__count">{completedTasks.length}</span>
                </div>
                <span className="archive-grid-card__title">
                  {lang === 'de' ? "Aufgaben" : "Tasks"}
                </span>
              </div>

              {/* Notizen-Karte */}
              <div 
                className="archive-grid-card archive-grid-card--notes"
                onClick={() => setActiveArchiveTab("notes")}
              >
                <div className="archive-grid-card__header">
                  <FileText size={20} color="#FBBF24" />
                  <span className="archive-grid-card__count">{archivedNotes.length}</span>
                </div>
                <span className="archive-grid-card__title">
                  {lang === 'de' ? "Notizen" : "Notes"}
                </span>
              </div>

              {/* Kalender-Karte */}
              <div 
                className="archive-grid-card archive-grid-card--calendar"
                onClick={() => setActiveArchiveTab("calendar")}
              >
                <div className="archive-grid-card__header">
                  <Calendar size={20} color="#1E3A8A" />
                  <span className="archive-grid-card__count">{archivedEvents.length}</span>
                </div>
                <span className="archive-grid-card__title">
                  {lang === 'de' ? "Termine" : "Events"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── DETAILED LIST VIEW (Wenn eine Karte angeklickt wurde) ── */
          <div className="archive-detail-list animated fadeIn">
            <button 
              className="archive-detail-list__back-btn"
              onClick={() => setActiveArchiveTab(null)}
            >
              ← {lang === 'de' ? "Zurück zum Dashboard" : "Back to Dashboard"}
            </button>

            <div className="archive-detail-list__content" style={{ marginTop: '16px' }}>
              {archiveItems.length === 0 ? (
                <div className="cat-detail__section-empty">
                  {t.noneArchived || "Keine archivierten Einträge"}
                </div>
              ) : (
                <>
                  {isCatTab && (
                    <div className="cat-list__archive-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {archiveItems.map((cat) => (
                        <button
                          key={cat.id}
                          className="cat-list__item"
                          onClick={() => onOpenCat(cat)}
                        >
                          <div className="cat-list__item-icon">
                            <CatIcon size={18} color={CC[activeArchiveTab].color} />
                          </div>
                          <div className="cat-list__item-info">
                            <div className="cat-list__item-name"><AutoScrollText>{cat.name}</AutoScrollText></div>
                          </div>
                          <ChevronLeft
                            size={16}
                            color="#5858A0"
                            style={{ transform: "rotate(180deg)" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {activeArchiveTab === "tasks" && (
                    <TaskList t={t} CC={CC} lang={lang}
                      entries={archiveItems}
                      cats={cats}
                      onToggle={toggleTask}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      isArchive={true}
                    />
                  )}
                  {activeArchiveTab === "calendar" && (
                    <CalList t={t} CC={CC} lang={lang}
                      entries={archiveItems}
                      cats={cats}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      isArchive={true}
                    />
                  )}
                  {activeArchiveTab === "notes" && (
                    <NoteList t={t} CC={CC}
                      entries={archiveItems}
                      cats={cats}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      onArchiveEntry={onRestoreNote}
                      isArchive={true}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`nav-bottom ${!fabVisible ? 'nav-bottom--inactive' : ''}`}>
        <button 
          className="nav-bottom__back" 
          onClick={activeArchiveTab ? () => setActiveArchiveTab(null) : onBack}
        >
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}

/* ── Create Entry Modal ──────────────────────────────────────── */
function CreateModal({ type, cats, initialCatId, onSave, onClose, t, CC }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  // Multi-Auswahl: Array von ausgewählten Kategorie-IDs
  const [catIds, setCatIds] = useState(initialCatId ? [initialCatId] : []);
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);
  const fileInputRef = useRef(null);

  // Toggle: Kategorie hinzufügen/entfernen
  const toggleCat = (id) => {
    setCatIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMediaGridClick = (mId) => {
    setMediaType(mId);
    if (fileInputRef.current) {
      if (mId === 'image') fileInputRef.current.accept = 'image/*';
      else if (mId === 'video') fileInputRef.current.accept = 'video/*';
      else if (mId === 'audio') fileInputRef.current.accept = 'audio/*';
      else if (mId === 'document') fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,*/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!title) setTitle(file.name);
      setMediaFile(file);
    }
    if (e.target) e.target.value = null;
  };

  const tc =
    type === "task" ? "#7C83F7" :
      type === "note" ? "#F59E0B" :
        type === "calendar" ? "#38BDF8" :
          type === "media" ? "#10B981" :
            "#7C3AED";

  const label =
    type === "task" ? t.task :
      type === "note" ? t.note :
        type === "calendar" ? t.calSing :
          type === "media" ? t.mediaSing :
            t.link;

  const save = () => {
    if (!title.trim()) return;

    // Wir erstellen nur noch EINEN Eintrag mit allen ausgewählten Kategorien
    let finalCatIds = catIds.length > 0 ? catIds : [];

    if (type === "calendar" && isBirthday) {
      // Automatische Verknüpfung mit Geburtstage-Ressource
      finalCatIds = [ID_BIRTHDAYS];
    }

    const entry = {
      type,
      title: title.trim(),
      catIds: finalCatIds,
      // Abwärtskompatibilität: catId ist die erste ID im Array
      catId: finalCatIds[0] || null
    };

    if (type === "task") Object.assign(entry, { done: false, note, due: due || TODAY, time: time || null });
    if (type === "note") Object.assign(entry, { body });
    if (type === "calendar") Object.assign(entry, { date, time, isBirthday });
    if (type === "media") Object.assign(entry, { mediaType, mediaData: mediaFile });
    if (type === "link") Object.assign(entry, { url: url.trim() });

    onSave(entry);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <div className="modal__header-left" />
          <h3 className="modal__title">{t.newLabel(label)}</h3>
          <div className="modal__header-right">
            <button className="modal__close" onClick={onClose}>
              <X size={18} color="#5858A0" />
            </button>
          </div>
        </div>

        <input
          className="modal__input modal__input--title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ borderColor: tc + "45" }}
        />

        {type === "task" && (
          <>
            <input
              className="modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.addNotePlaceholder}
            />
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                style={{ color: due ? "#EDEEFF" : "#5858A0" }}
              />
              <input
                type="time"
                className="modal__time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ color: time ? "#EDEEFF" : "#5858A0" }}
              />
            </div>
          </>
        )}

        {type === "note" && (
          <textarea
            className="modal__textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.writeNotePlaceholder}
            rows={4}
          />
        )}

        {type === "calendar" && (
          <>
            <div className="modal__input-row">
              <input
                type="date"
                className="modal__date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="modal__time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ color: time ? "#EDEEFF" : "#5858A0" }}
              />
            </div>
            <div className="modal__toggle-row">
              <label htmlFor="isBirthday">{t.birthday || "Geburtstag"}</label>
              <label className="modal__switch">
                <input
                  type="checkbox"
                  id="isBirthday"
                  checked={isBirthday}
                  onChange={(e) => setIsBirthday(e.target.checked)}
                />
                <span className="modal__slider"></span>
              </label>
            </div>
          </>
        )}

        {type === "media" && (
          <div className="modal__media-grid">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            {[
              { id: 'image', Icon: ImageIcon, color: '#0D9488', label: t.image },
              { id: 'video', Icon: VideoIcon, color: '#EF4444', label: t.video },
              { id: 'audio', Icon: AudioIcon, color: '#F97316', label: t.audio },
              { id: 'document', Icon: DocumentIcon, color: '#0078D4', label: t.document },
            ].map(m => (
              <button
                key={m.id}
                className={`modal__media-grid-btn ${mediaType === m.id ? 'modal__media-grid-btn--active' : ''}`}
                onClick={() => handleMediaGridClick(m.id)}
                style={{ color: mediaType === m.id ? m.color : '#5858A0' }}
              >
                <div className="icon-wrapper" style={{ background: m.color }}>
                  <m.Icon size={18} />
                </div>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {type === "link" && (
          <input
            className="modal__input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={{ borderColor: tc + "45" }}
          />
        )}

        {/* Multi-Select Dropdown für Kategorien */}
        {(() => {
          const selectedNames = cats.filter(c => catIds.includes(c.id)).map(c => c.name);
          const summary = selectedNames.length === 0
            ? t.noProject
            : selectedNames.length <= 2
              ? selectedNames.join(", ")
              : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`;

          return (
            <div className="modal__multi-select" style={{ position: "relative" }}>
              <button
                className={`modal__multi-select-btn ${catIds.length > 0 ? "modal__multi-select-btn--has-selection" : ""}`}
                onClick={() => setCatDropOpen(!catDropOpen)}
                type="button"
              >
                <span>{summary}</span>
                <ChevronLeft
                  size={14}
                  style={{ transform: catDropOpen ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
                  color="#5858A0"
                />
              </button>
              {catDropOpen && (
                <div className="modal__multi-select-list">
                  {cats.map((c) => {
                    const isSelected = catIds.includes(c.id);
                    const chipColor = CC[c.type]?.color || "#5858A0";
                    const CIcon = CAT_ICONS[c.type];
                    return (
                      <button
                        key={c.id}
                        className={`modal__multi-select-item ${isSelected ? "modal__multi-select-item--selected" : ""}`}
                        onClick={() => toggleCat(c.id)}
                        type="button"
                      >
                        <span
                          className="modal__multi-select-check"
                          style={isSelected ? { background: chipColor, borderColor: chipColor } : {}}
                        >
                          {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                        </span>
                        {CIcon && <CIcon size={14} color={chipColor} strokeWidth={2.5} />}
                        <span className="modal__multi-select-name">{CC[c.type].sing}: {c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <button
          className={`modal__submit ${!title.trim() ? "modal__submit--disabled" : ""
            }`}
          onClick={save}
          style={{ background: tc }}
        >
          {t.create || "Erstellen"}
        </button>
      </div>
    </div>
  );
}

/* ── New Category Modal ──────────────────────────────────────── */
function NewCatModal({ type, onSave, onClose, t, CC }) {
  const [name, setName] = useState("");
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__icon-row">
          <CatIcon size={20} color={cfg.color} />
          <h3 className="modal__title">{t.newSing(cfg.sing)}</h3>
        </div>
        <input
          className="modal__input modal__input--title"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder(cfg.sing)}
          onKeyDown={(e) =>
            e.key === "Enter" && name.trim() && onSave(name.trim())
          }
          style={{ borderColor: cfg.color + "45" }}
        />
        <button
          className={`modal__submit ${!name.trim() ? "modal__submit--disabled" : ""
            }`}
          onClick={() => name.trim() && onSave(name.trim())}
          style={{ background: cfg.color }}
        >
          {t.create || "Erstellen"}
        </button>
      </div>
    </div>
  );
}

/* ── Onboarding Modal ────────────────────────────────────────── */
function OnboardingModal({ t, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");

  const finish = () => {
    if (name.trim()) onComplete(lang, name.trim());
  };

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <div className="onboarding__logo">PARA·LIST</div>

        {step === 0 ? (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{I18N[lang].welcome}</h2>
            <p className="onboarding__text">{I18N[lang].onboardingLang}</p>
            <div className="onboarding__langs">
              {["de", "en", "es"].map(l => (
                <button
                  key={l}
                  className={`onboarding__lang-btn ${lang === l ? "onboarding__lang-btn--active" : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇪🇸"}
                </button>
              ))}
            </div>
            <button className="onboarding__next" onClick={() => setStep(1)}>{I18N[lang].getStarted}</button>
          </div>
        ) : (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{I18N[lang].onboardingName}</h2>
            <input
              autoFocus
              className="onboarding__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name..."
              onKeyDown={e => e.key === "Enter" && finish()}
            />
            <button
              className={`onboarding__next ${!name.trim() ? "onboarding__next--disabled" : ""}`}
              onClick={finish}
            >
              {I18N[lang].getStarted}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Settings Modal ──────────────────────────────────────────── */
function SettingsModal({ user, theme, setTheme, lang, setLang, t, onClose, onUpdateUser }) {
  const [view, setView] = useState("main"); // "main" | "profile" | "feedback"
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const sendFeedback = () => {
    const subject = `Feedback: ${feedbackType === "bug" ? "Bug" : feedbackType === "feature" ? "Feature" : "Verbesserung"}`;
    const mailto = `mailto:kontakt@paulangeles.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(feedbackText)}`;
    window.location.href = mailto;
  };

  const currentTitle =
    view === "main" ? t.settings :
      view === "profile" ? t.personalData :
        t.feedback;

  return (
    <div className="modal" onClick={onClose}>
      <div className={`modal__sheet settings-modal ${view !== "main" ? "settings-modal--sub" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__header">
          {/* Im Main-View keine Buttons im Header (Schließen ist unten) */}
          <div className="modal__header-left">
            {/* Zurück-Button nur im Feedback-View (im Profile-View sind Buttons unten) */}
            {view === "feedback" && (
              <button className="settings-modal__back-inline" onClick={() => setView("main")}>
                <ChevronLeft size={20} color="#5858A0" />
              </button>
            )}
          </div>

          <h3 className="modal__title">{currentTitle}</h3>

          <div className="modal__header-right" />
        </div>

        {view === "main" ? (
          <div className="settings-modal__content">
            {/* Oberer Inhaltsbereich – wird nach oben gedrückt */}
            <div className="settings-modal__body">
              {/* Apple-style Profile Row */}
              <div className="profile-row" onClick={() => setView("profile")}>
                <div
                  className="profile-row__avatar"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="profile-row__avatar-img" />
                  ) : (
                    user.name ? user.name.charAt(0).toUpperCase() : "P"
                  )}
                  <div className="profile-row__avatar-overlay">
                    <ImageIcon size={14} color="white" />
                  </div>
                </div>
                <div className="profile-row__info">
                  <div className="profile-row__name">{user.name || "User"}</div>
                  <div className="profile-row__sub">{t.personalData}</div>
                </div>
                <ChevronRight size={18} color="#5858A0" className="profile-row__chevron" />
              </div>

              <div className="settings-section">
                <div className="settings-label">{t.userName}</div>
                <input
                  className="modal__input"
                  value={user.name}
                  onChange={(e) => onUpdateUser({ name: e.target.value })}
                  placeholder="Name..."
                />
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">{t.appearance}</span>
                  <div className="theme-toggle">
                    <button
                      className={`theme-toggle__btn ${theme === "dark" ? "theme-toggle__btn--active" : ""}`}
                      onClick={() => setTheme("dark")}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Moon size={14} />
                      {t.dark}
                    </button>
                    <button
                      className={`theme-toggle__btn ${theme === "light" ? "theme-toggle__btn--active" : ""}`}
                      onClick={() => setTheme("light")}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Sun size={14} />
                      {t.light}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">{t.language}</span>
                  <div className="theme-toggle">
                    {["de", "en", "es"].map(l => (
                      <button
                        key={l}
                        className={`theme-toggle__btn ${lang === l ? "theme-toggle__btn--active" : ""}`}
                        onClick={() => setLang(l)}
                      >
                        {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇪🇸"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">{t.feedback}</span>
                  <button
                    className="feedback-trigger-btn"
                    onClick={() => setView("feedback")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: 18, height: 18 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Schließen-Button immer am unteren Rand */}
            <div className="settings-modal__footer">
              <button
                className="settings-modal__footer-close"
                onClick={onClose}
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        ) : view === "profile" ? (
          <div className="settings-modal__content settings-modal__content--sub">
            {/* Oberer Inhaltsbereich – wird nach oben gedrückt */}
            <div className="settings-modal__body">
              <div className="settings-group">
                <div className="settings-group__title">{t.dataSection}</div>
                <button
                  className="settings-item settings-item--danger"
                  onClick={async () => {
                    if (window.confirm(t.deleteConfirm)) {
                      localStorage.clear();
                      try {
                        await clear();
                      } catch (e) {
                        console.error('Failed to clear idb', e);
                      }
                      window.location.reload();
                    }
                  }}
                >
                  <div className="settings-item__label">{t.deleteApp}</div>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Untere Aktionsleiste: Zurück-FAB + Schließen-Button – immer am unteren Rand */}
            <div className="settings-modal__footer">
              <button className="settings-modal__footer-back" onClick={() => setView("main")}>
                <ChevronLeft size={20} color="#EDEEFF" />
              </button>
              <button className="settings-modal__footer-close" onClick={onClose}>
                {t.closeBtn}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-modal__content settings-modal__content--sub">
            <div className="feedback-form">
              <div className="feedback-types">
                {[
                  { id: "bug", label: t.bug, desc: t.bugDesc },
                  { id: "improvement", label: t.improvement, desc: t.improvementDesc },
                  { id: "feature", label: t.feature, desc: t.featureDesc }
                ].map(type => (
                  <button
                    key={type.id}
                    className={`feedback-type-btn ${feedbackType === type.id ? "feedback-type-btn--active" : ""}`}
                    onClick={() => setFeedbackType(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="feedback-callout">
                {feedbackType === "bug" && t.bugDesc}
                {feedbackType === "improvement" && t.improvementDesc}
                {feedbackType === "feature" && t.featureDesc}
              </div>

              <div className="feedback-textarea-group">
                <label className="feedback-label">{t.feedbackQuestion}</label>
                <textarea
                  className="modal__textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="..."
                  rows={6}
                />
              </div>

              <button
                className={`modal__submit ${!feedbackText.trim() ? "modal__submit--disabled" : ""}`}
                onClick={sendFeedback}
                style={{ background: "#7C83F7" }}
              >
                {t.send}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Task Done Celebration ────────────────────────────────── */
function TaskDoneCelebration({ t, count, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + "%",
    delay: Math.random() * 2 + "s",
    duration: Math.random() * 2 + 2 + "s",
    color: ["#7C83F7", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"][Math.floor(Math.random() * 5)],
    type: ["circle", "rect", "star"][Math.floor(Math.random() * 3)],
    size: Math.random() * 10 + 5 + "px",
  }));

  return (
    <div className="task-done-overlay" onClick={onClose}>
      <div className="confetti-container">
        {pieces.map((p) => (
          <div
            key={p.id}
            className={`confetti-piece confetti-piece--${p.type}`}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              color: p.color,
              background: p.type !== "star" ? p.color : "transparent",
              width: p.size,
              height: p.type === "rect" ? parseFloat(p.size) * 1.5 + "px" : p.size,
            }}
          />
        ))}
      </div>
      <div className="task-done-card" onClick={(e) => e.stopPropagation()}>
        <div className="task-done-card__rocket">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 11 3 11 7C11 8 11.5 9 12 9C12.5 9 13 8 13 7C13 3 12 2 12 2Z" fill="#F59E0B"/>
            <path d="M12 22C12 22 13 21 13 17C13 16 12.5 15 12 15C11.5 15 11 16 11 17C11 21 12 22 12 22Z" fill="#EF4444"/>
            <path d="M17 12C17 12 16 11 12 11C8 11 7 12 7 12C7 12 6 13 6 17C6 21 12 22 12 22C12 22 18 21 18 17C18 13 17 12 17 12Z" fill="#7C83F7"/>
            <path d="M12 15C13.1046 15 14 14.1046 14 13C14 11.8954 13.1046 11 12 11C10.8954 11 10 11.8954 10 13C10 14.1046 10.8954 15 12 15Z" fill="white" fillOpacity="0.3"/>
            <circle cx="12" cy="13" r="1.5" fill="white"/>
          </svg>
        </div>
        <h2 className="task-done-card__title">{t.taskDone}</h2>
        <p className="task-done-card__message">{t.taskDoneMessage}</p>
        <div className="task-done-card__counter">
          <span>{t.taskDoneCount(count)}</span>
        </div>
        <button className="task-done-card__close-btn" onClick={onClose}>
          {t.taskDoneClose}
        </button>
      </div>
    </div>
  );
}

/* ── Birthday Celebration ────────────────────────────────── */
function BirthdayCelebration({ t, entry, userName, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 12000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + "%",
    delay: Math.random() * 2 + "s",
    duration: Math.random() * 2 + 2 + "s",
    color: ["#F472B6", "#F59E0B", "#10B981", "#7C83F7", "#3B82F6"][Math.floor(Math.random() * 5)],
    type: ["circle", "rect", "star"][Math.floor(Math.random() * 3)],
    size: Math.random() * 10 + 5 + "px",
  }));

  return (
    <div className="task-done-overlay" onClick={onClose}>
      <div className="confetti-container">
        {pieces.map((p) => (
          <div
            key={p.id}
            className={`confetti-piece confetti-piece--${p.type}`}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              color: p.color,
              background: p.type !== "star" ? p.color : "transparent",
              width: p.size,
              height: p.type === "rect" ? parseFloat(p.size) * 1.5 + "px" : p.size,
            }}
          />
        ))}
      </div>
      <div className="task-done-card" onClick={(e) => e.stopPropagation()}>
        <div className="task-done-card__rocket">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 20H20V12H4V20Z" fill="#F472B6"/>
            <path d="M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12V14H4V12Z" fill="#FBCFE8"/>
            <path d="M6 10V8C6 6.89543 6.89543 6 8 6H16C17.1046 6 18 6.89543 18 8V10" stroke="#F472B6" strokeWidth="2"/>
            <path d="M12 6V3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="2" r="1" fill="#EF4444"/>
            <rect x="2" y="20" width="20" height="2" fill="#E5E7EB"/>
          </svg>
        </div>
        <h2 className="task-done-card__title">{t.birthdayCreated(entry.title, userName)}</h2>
        <p className="task-done-card__message" style={{ whiteSpace: 'pre-line' }}>{t.birthdayMessage}</p>
        
        <button className="task-done-card__close-btn" onClick={onClose}>
          {t.birthdayGotIt}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   APP ROOT
   ════════════════════════════════════════════════════════════════ */
export default function App() {
  const [state, setState, isLoaded] = usePersistedState(SEED);
  useEffect(() => {
    if (isLoaded) {
      setState(s => {
        let dirty = false;
        const nextState = { ...s };
        if (!nextState.cats.find(c => c.id === ID_BIRTHDAYS)) {
          nextState.cats = [
            ...nextState.cats,
            { id: ID_BIRTHDAYS, type: "resource", name: "Geburtstage", date: null, body: "Alle Geburtstage aus dem Kalender.", tags: ["System"], relatedId: null }
          ];
          dirty = true;
        }
        if (!nextState.tags) {
          const tagMap = new Map();
          nextState.cats.forEach(c => c.tags?.forEach(t => {
            if (!tagMap.has(t)) tagMap.set(t, { id: uid(), name: t, createdAt: new Date().toISOString() });
          }));
          nextState.tags = Array.from(tagMap.values());
          dirty = true;
        }
        if (!nextState.entries) nextState.entries = [];
        nextState.entries = nextState.entries.map(e => {
          if (!e.catIds) {
            dirty = true;
            return { ...e, catIds: e.catId ? [e.catId] : [] };
          }
          return e;
        });

        nextState.cats = nextState.cats.map(c => {
          if (!c.createdAt) {
            dirty = true;
            return { ...c, createdAt: new Date().toISOString() };
          }
          return c;
        });

        return dirty ? nextState : s;
      });
    }
  }, [isLoaded, setState]);

  const updateGlobalTag = (id, newName) => {
    setState((s) => {
      const tag = s.tags?.find(t => t.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      const nextTags = s.tags.map(t => t.id === id ? { ...t, name: newName } : t);
      const nextCats = s.cats.map(c => {
        if (c.tags && c.tags.includes(oldName)) {
          return { ...c, tags: c.tags.map(old => old === oldName ? newName : old) };
        }
        return c;
      });
      return { ...s, tags: nextTags, cats: nextCats };
    });
  };

  const deleteGlobalTag = (id) => {
    setState((s) => {
      const tag = s.tags?.find(t => t.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      const nextTags = s.tags.filter(t => t.id !== id);
      const nextCats = s.cats.map(c => {
        if (c.tags && c.tags.includes(oldName)) {
          return { ...c, tags: c.tags.filter(old => old !== oldName) };
        }
        return c;
      });
      return { ...s, tags: nextTags, cats: nextCats };
    });
  };

  const createGlobalTag = (name) => {
    setState((s) => {
      if (s.tags && s.tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
        return s; // already exists
      }
      const newTag = { id: uid(), name, createdAt: new Date().toISOString() };
      return { ...s, tags: [...(s.tags || []), newTag] };
    });
  };

  const [stack, setStack] = useState([{ view: "home" }]);
  const [tab, setTab] = useState("tasks");
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(null);
  const [newCatType, setNewCatType] = useState(null);
  const [expandedCat, setExpandedCat] = useState("project");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationBirthday, setCelebrationBirthday] = useState(null);
  const [coverAccentRgb, setCoverAccentRgb] = useState("224, 62, 62");

  const theme = state.theme || "light";
  const lang = state.lang || "de";
  const t = I18N[lang];
  const CC = getCC(t);
  const TABS = getTABS(t);

  const push = (v) => setStack((s) => [...s, v]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  // Hilfsfunktion zur Ermittlung der Anzahl archivierter Elemente für einen Tab
  const getArchiveCount = (archiveTab) => {
    const isCatTab = ["project", "area", "resource"].includes(archiveTab);
    if (isCatTab) {
      return state.cats.filter(c => c.type === archiveTab && c.archived).length;
    }
    if (archiveTab === "tasks") return state.entries.filter(e => e.type === "task" && e.done).length;
    if (archiveTab === "calendar") return state.entries.filter(e => e.type === "calendar" && (isOld(e.date) || e.done)).length;
    if (archiveTab === "notes") return state.entries.filter(e => e.type === "note" && e.archived).length;
    return 0;
  };

  // Smarte Zurück-Logik: Überspringt das Archiv, wenn es nach dem Dearchivieren leer ist
  const handleSmartBack = () => {
    const prev = stack[stack.length - 2];
    if (prev && prev.view === "archive") {
      const count = getArchiveCount(prev.tab || tab);
      if (count === 0) {
        setStack(s => s.length > 2 ? s.slice(0, -2) : [{ view: "home" }]);
        return;
      }
    }
    pop();
  };

  const cur = stack[stack.length - 1];

  /* ── mutations ─────────────────────────────────────────────── */
  const addCat = (type, name) =>
    setState((s) => ({
      ...s,
      cats: [
        ...s.cats,
        { id: uid(), type, name, date: null, body: "", tags: [], relatedId: null, archived: false, createdAt: new Date().toISOString() },
      ],
    }));

  const updateCat = (id, patch) =>
    setState((s) => ({
      ...s,
      cats: s.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const deleteCat = (id) => {
    setState((s) => ({ ...s, cats: s.cats.filter((c) => c.id !== id) }));
    pop();
  };

  const addEntry = (entry) =>
    setState((s) => {
      const newId = uid();
      if (entry.type === "calendar" && entry.isBirthday) {
        setCelebrationBirthday({ ...entry, id: newId });
      }
      return {
        ...s,
        entries: [...s.entries, { id: newId, createdAt: Date.now(), ...entry }],
      };
    });

  const toggleTask = (id) =>
    setState((s) => {
      const entry = s.entries.find((e) => e.id === id);
      const isNowDone = !entry?.done;
      if (isNowDone && !entry?.isBirthday) {
        setShowCelebration(true);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
      return {
        ...s,
        entries: s.entries.map((e) =>
          e.id === id ? { ...e, done: !e.done } : e
        ),
      };
    });

  // Favoriten-Stern umschalten
  const toggleStar = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, starred: !e.starred } : e
      ),
    }));

  const updateEntry = (id, patch) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => {
        if (e.id === id) {
          const next = { ...e, ...patch };
          // Falls catId (alt) gesetzt wird, in catIds überführen
          if (patch.catId !== undefined) {
            next.catIds = patch.catId ? [patch.catId] : [];
          }
          return next;
        }
        return e;
      }),
    }));

  const deleteEntry = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }));

  const notif = computeNotif(state.entries);

  /* ── swipe-back gesture ────────────────────────────────────── */
  const touchX = useRef(0);
  const touchY = useRef(0);
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;

    // Swipe back to previous view
    if (dx > 75 && touchX.current < 45 && stack.length > 1 && !panelOpen) {

      pop();
      return;
    }

    // Swipe down to open command panel
    if (dy > 80 && Math.abs(dx) < 50 && !panelOpen) {
      // Find the active scroll container based on view
      let scrollEl;
      if (cur.view === "home") scrollEl = document.querySelector('.entry-list');
      else if (cur.view === "catList") scrollEl = document.querySelector('.cat-list__body');
      else if (cur.view === "catDetail" || cur.view === "entryDetail") {
        scrollEl = document.querySelector('.cat-detail__body');
        // Wenn in den Detail-Screens eine Textarea vorhanden ist, darf das Panel nur öffnen,
        // wenn die Textarea bereits ganz oben (am Limit) ist.
        const textarea = e.target.closest('.cat-detail__textarea');
        if (textarea && textarea.scrollTop > 0) {
          return;
        }
      }

      if (!scrollEl || scrollEl.scrollTop <= 0) {
        setPanelOpen(true);
      }
    }

    // Swipe up to close command panel
    if (dy < -60 && Math.abs(dx) < 50 && panelOpen) {
      const isBackdrop = e.target.classList.contains('command-panel__backdrop');
      const inList = e.target.closest('.command-panel__list');
      const listEl = document.querySelector('.command-panel__list');

      // Close if swipe up happens outside of the list (e.g. on backdrop, handle, header), 
      // or if there is no list, or if the list is completely scrolled to the bottom.
      if (isBackdrop || !inList || !listEl || listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight <= 1) {
        setPanelOpen(false);
      }
    }
  };

  /* ── loading state ─────────────────────────────────────────── */
  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <div className="loading__text">PARA·LIST</div>
      </div>
    );
  }

  return (
    <div
      className={`app ${theme === 'light' ? 'light-theme' : ''}`}
      style={cur.view === "home" ? { "--cover-accent-rgb": coverAccentRgb } : undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CommandPanel
        t={t}
        lang={lang}
        setLang={(l) => setState(s => ({ ...s, lang: l }))}
        theme={theme}
        setTheme={(t) => setState(s => ({ ...s, theme: t }))}
        user={state.user}
        notif={notif}
        entries={state.entries}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTask={toggleTask}
        onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
      />

      {panelOpen && (
        <div
          className="command-panel__backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}

      <div className={`main-content ${cur.view === "home" ? `main-content--${tab}` : ""}`}>
        {cur.view === "home" && (
          <HomeScreen
            t={t}
            CC={CC}
            TABS={TABS}
            lang={lang}
            state={state}
            tab={tab}
            setTab={setTab}
            panelOpen={panelOpen}
            expandedCat={expandedCat}
            setExpandedCat={setExpandedCat}
            onCoverAccentChange={setCoverAccentRgb}

            onOpenCatType={(type) => push({ view: "catList", type })}
            onOpenCat={(cat) => push({ view: "catDetail", catId: cat.id })}
            onAddCat={(type) => {
              setPanelOpen(false);
              setNewCatType(type);
            }}
            onAddEntry={() => {
              setPanelOpen(false);
              setCreating({
                type:
                  tab === "tasks"
                    ? "task"
                    : tab === "notes"
                      ? "note"
                      : "calendar",
                catId: null,
              });
            }}
            onAddVoiceEntry={(title) => {
              // Neuen Eintrag basierend auf dem aktiven Tab erstellen
              if (tab === "notes") {
                addEntry({
                  type: "note",
                  title,
                  body: "",
                  starred: false,
                  catId: null,
                  catIds: [],
                  tags: []
                });
              } else if (tab === "calendar") {
                addEntry({
                  type: "calendar",
                  title,
                  date: TODAY,
                  time: "",
                  isBirthday: false,
                  starred: false,
                  catId: null,
                  catIds: [],
                  tags: []
                });
              } else {
                addEntry({
                  type: "task",
                  title,
                  due: TODAY,
                  done: false,
                  starred: false,
                  catId: null,
                  catIds: [],
                  tags: []
                });
              }
            }}
            toggleTask={toggleTask}
            toggleStar={toggleStar}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
            onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
            onOpenArchive={(currentTab) => {
              setPanelOpen(false);
              push({ view: "archive", tab: currentTab });
            }}
            onArchiveEntry={(id) => updateEntry(id, { archived: true })}
          />
        )}

        {cur.view === "archive" && (
          <ArchiveScreen
            t={t}
            CC={CC}
            lang={lang}
            entries={state.entries}
            cats={state.cats}
            tab={cur.tab || tab}
            onDelete={deleteEntry}
            onBack={pop}
            toggleTask={toggleTask}
            onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
            onRestoreNote={(id) => updateEntry(id, { archived: false })}
            onOpenCat={(c) => push({ view: "catDetail", catId: c.id })}
          />
        )}

        {cur.view === "catList" && (
          <CatListScreen
            t={t}
            CC={CC}
            type={cur.type}
            cats={state.cats.filter((c) => c.type === cur.type && !c.archived)}
            onOpen={(cat) => push({ view: "catDetail", catId: cat.id })}
            onAdd={() => setNewCatType(cur.type)}
            onBack={pop}
            onOpenArchive={(type) => push({ view: "archive", tab: type })}
          />
        )}

        {cur.view === "catDetail" &&
          (() => {
            const cat = state.cats.find((c) => c.id === cur.catId);
            if (!cat) {
              return (
                <div className="cat-detail">
                  <div className="cat-detail__header">
                    <div className="cat-detail__title-row">
                      <Square size={18} color={CC.resource.color} />
                      <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
                        Eintrag nicht gefunden
                      </div>
                    </div>
                  </div>
                  <div className="nav-bottom">
                    <button className="nav-bottom__back" onClick={pop}>
                      <ChevronLeft size={20} color="#EDEEFF" />
                    </button>
                  </div>
                </div>
              );
            }

            // Inclusive filtering: include entries from "child" categories
            const childIds = state.cats.filter(c => c.relatedId === cat.id).map(c => c.id);
            const inclusiveEntries = state.entries.filter(e => {
              const ids = e.catIds || (e.catId ? [e.catId] : []);
              const isBaseEntry = ids.includes(cat.id) || ids.some(id => childIds.includes(id));
              // Wenn wir in der "Geburtstage" Ressource sind, zeigen wir alle Geburtstage an
              if (cat.id === ID_BIRTHDAYS) {
                return isBaseEntry || (e.type === "calendar" && e.isBirthday);
              }
              return isBaseEntry;
            }).map((e) => {
              if (cat.id === ID_BIRTHDAYS && e.type === "calendar" && e.isBirthday) {
                const nextBd = getNextBirthday(e.date);
                if (nextBd) {
                  return { ...e, date: nextBd.date, title: `${e.title} (${nextBd.age} ${t.yearsShort || "J."})` };
                }
              }
              return e;
            });

            return (
              <CatDetailScreen
                t={t}
                CC={CC}
                lang={lang}
                cat={cat}
                allCats={state.cats}
                entries={inclusiveEntries}
                tags={state.tags}
                onCreateTag={createGlobalTag}
                onUpdateTag={updateGlobalTag}
                onDeleteTag={deleteGlobalTag}
                onUpdate={(p) => updateCat(cat.id, p)}
                onLinkResource={(resourceId) => updateCat(resourceId, { relatedId: cat.id })}
                onDelete={() => {
                  if (window.confirm(t.confirmDelete(cat.name)))
                    deleteCat(cat.id);
                }}
                onBack={handleSmartBack}
                onHome={() => setStack([{ view: "home" }])}
                toggleTask={toggleTask}
                deleteEntry={deleteEntry}
                onAddEntry={(type) =>
                  setCreating({ type, catId: cat.id })
                }
                onOpenCat={(resCat) => push({ view: "catDetail", catId: resCat.id })}
                onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
              />
            );
          })()}

        {cur.view === "entryDetail" &&
          (() => {
            const entry = state.entries.find((e) => e.id === cur.entryId);
            if (!entry) {
              return (
                <div className="cat-detail">
                  <div className="cat-detail__header">
                    <div className="cat-detail__title-row">
                      <FileText size={18} color="#5858A0" />
                      <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
                        Eintrag nicht gefunden
                      </div>
                    </div>
                  </div>
                  <div className="nav-bottom">
                    <button className="nav-bottom__back" onClick={pop}>
                      <ChevronLeft size={20} color="#EDEEFF" />
                    </button>
                  </div>
                </div>
              );
            }

            const cat = state.cats.find(c => c.id === entry.catId);

            return (
              <EntryDetailScreen
                t={t}
                CC={CC}
                theme={theme}
                entry={entry}
                cat={cat}
                allCats={state.cats}
                onUpdate={(p) => updateEntry(entry.id, p)}
                onDelete={() => {
                  deleteEntry(entry.id);
                  pop();
                }}
                onBack={handleSmartBack}
              />
            );
          })()}
      </div>

      {settingsOpen && (
        <SettingsModal
          t={t}
          lang={lang}
          setLang={(l) => setState(s => ({ ...s, lang: l }))}
          theme={theme}
          setTheme={(t) => setState(s => ({ ...s, theme: t }))}
          user={state.user}
          onUpdateUser={(patch) => setState(s => ({ ...s, user: { ...s.user, ...patch } }))}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {state.user.name === "" && (
        <OnboardingModal
          t={t}
          onComplete={(l, n) => setState(s => ({ ...s, lang: l, user: { name: n } }))}
        />
      )}

      {creating && (
        <CreateModal
          t={t}
          CC={CC}
          type={creating.type}
          cats={state.cats}
          initialCatId={creating.catId}
          onSave={(entry) => {
            addEntry(entry);
            setCreating(null);
          }}
          onClose={() => setCreating(null)}
        />
      )}

      {newCatType && (
        <NewCatModal
          t={t}
          CC={CC}
          type={newCatType}
          onSave={(name) => {
            addCat(newCatType, name);
            setNewCatType(null);
          }}
          onClose={() => setNewCatType(null)}
        />
      )}

      {showCelebration && (
        <TaskDoneCelebration
          t={t}
          count={state.entries.filter(e => e.type === "task" && e.done).length}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {celebrationBirthday && (
        <BirthdayCelebration
          t={t}
          entry={celebrationBirthday}
          userName={state.user.name}
          onClose={() => setCelebrationBirthday(null)}
        />
      )}
    </div>
  );
}
