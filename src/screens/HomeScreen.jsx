import { useState, useRef, useCallback, useEffect } from "react";
import { Circle, Triangle, Square, Plus, Archive, Calendar, User, UserPlus, ChevronRight } from "lucide-react";
import { TaskList, NoteList, CalList } from "../components/EntryLists";
import { VoiceFab } from "../components/VoiceFab";
import { AutoScrollText } from "../components/AutoScrollText";
import { getNextBirthday, isOld, fmtDate } from "../utils";

const COVER_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
  archive: "124, 131, 247",
};

const CAT_TYPE_CONFIG = [
  { id: "project", Icon: Circle, color: "#E03E3E", labelKey: "projects", fallback: "Projekte" },
  { id: "area", Icon: Triangle, color: "#D09020", labelKey: "areas", fallback: "Bereiche" },
  { id: "resource", Icon: Square, color: "#30A060", labelKey: "resources", fallback: "Ressourcen" },
  { id: "archive", Icon: Archive, color: "#7C83F7", labelKey: "archive", fallback: "Archiv" },
];

const DOUBLE_TAP_WINDOW_MS = 300;
const SWIPE_THRESHOLD_PX = 60;
const GROUP_HEADER_OFFSET_PX = 24;
const VOICE_TAB_TYPES = ["tasks", "notes", "calendar"];

const COVER_BADGE_LABELS = {
  project: { key: "projects", fallback: "Projekt" },
  area: { key: "areas", fallback: "Bereich" },
  resource: { key: "resources", fallback: "Ressource" },
  archive: { key: "archive", fallback: "Archiv" },
};

const COVER_BADGE_ICONS = {
  project: Circle,
  area: Triangle,
  resource: Square,
  archive: Archive,
};

const EMPTY_TYPE_TITLES = {
  project: { de: "Keine Projekte", en: "No Projects" },
  area: { de: "Keine Bereiche", en: "No Areas" },
  resource: { de: "Keine Ressourcen", en: "No Resources" },
};

const TYPE_SINGULAR = {
  project: { de: "Projekt", en: "Project" },
  area: { de: "Bereich", en: "Area" },
  resource: { de: "Ressource", en: "Resource" },
};

export function HomeScreen({
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
  onAddVoiceEntry,
  toggleTask,
  toggleStar,
  updateEntry,
  deleteEntry,
  onOpenEntry,
  onOpenArchive,
  onArchiveEntry,
  panelOpen,
  onCoverAccentChange,
  onUpdateUser,
}) {
  const { entries, cats } = state;
  const [activeCatType, setActiveCatType] = useState("project");
  const [activeGroupHeader, setActiveGroupHeader] = useState(null);

  const activeCats = cats.filter((c) => c.type === activeCatType && !c.archived);
  const firstCat = activeCats[0];

  const tabEntries = entries
    .map((e) => {
      if (e.type === "calendar" && e.isBirthday) {
        const nextBd = getNextBirthday(e.date);
        if (nextBd) {
          return {
            ...e,
            date: nextBd.date,
            title: `${e.title} (${nextBd.age} ${t.yearsShort || "J."})`,
          };
        }
      }
      return e;
    })
    .filter((e) => {
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

  const tabCfg = TABS.find((tCfg) => tCfg.id === tab);
  const tabColor = tabCfg?.color || "#7C83F7";

  const avatarInputRef = useRef(null);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdateUser({ avatar: reader.result });
    reader.readAsDataURL(file);
  };

  const entryListRef = useRef(null);

  const handleListScroll = () => {
    const container = entryListRef.current;
    if (!container) return;
    const groups = container.querySelectorAll(".task-group");
    if (!groups.length) {
      if (activeGroupHeader) setActiveGroupHeader(null);
      return;
    }

    const containerTop = container.getBoundingClientRect().top;
    let currentGroup = groups[0];
    for (let i = 0; i < groups.length; i++) {
      const rect = groups[i].getBoundingClientRect();
      if (rect.top <= containerTop + GROUP_HEADER_OFFSET_PX) {
        currentGroup = groups[i];
      } else {
        break;
      }
    }

    const left = currentGroup.dataset.groupLeft;
    const right = currentGroup.dataset.groupRight;
    if (left && (!activeGroupHeader || activeGroupHeader.left !== left || activeGroupHeader.right !== right)) {
      setActiveGroupHeader({ left, right });
    }
  };

  useEffect(() => {
    if (entryListRef.current) {
      setTimeout(handleListScroll, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabEntries.length]);

  const lastTap = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || panelOpen) return;

    const tabOrder = TABS.map((tCfg) => tCfg.id);
    const currentIndex = tabOrder.indexOf(tab);
    if (dx > 0 && currentIndex > 0) {
      setTab(tabOrder[currentIndex - 1]);
    } else if (dx < 0 && currentIndex < tabOrder.length - 1) {
      setTab(tabOrder[currentIndex + 1]);
    }
  };

  const handleDoubleTap = useCallback(
    (e) => {
      const isEmptyPlaceholder =
        e.target.closest(".entry-list__empty") || e.target.closest(".cat-detail__section-empty");
      if (e.target !== e.currentTarget && !isEmptyPlaceholder) return;
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_WINDOW_MS) {
        onAddEntry();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [onAddEntry]
  );

  const rgbVal = COVER_ACCENT_RGB[activeCatType] || COVER_ACCENT_RGB.archive;

  useEffect(() => {
    onCoverAccentChange?.(rgbVal);
  }, [rgbVal, onCoverAccentChange]);

  const renderCoverBadge = () => {
    const config = COVER_BADGE_LABELS[activeCatType];
    const Icon = COVER_BADGE_ICONS[activeCatType];
    if (!config || !Icon) return null;
    const fullLabel = t[config.key] || config.fallback;
    const label =
      activeCatType === "archive" ? fullLabel.toUpperCase() : fullLabel.toUpperCase().slice(0, -1);
    return (
      <>
        <Icon size={10} strokeWidth={3} className="home-cover__badge-icon" />
        {label}
      </>
    );
  };

  const renderEmptyCover = () => (
    <div className="home-cover__main">
      <h1 className="home-cover__title">
        {EMPTY_TYPE_TITLES[activeCatType]?.[lang] || EMPTY_TYPE_TITLES[activeCatType]?.en}
      </h1>
      <p className="home-cover__desc">
        {lang === "de"
          ? "Erstelle dein erstes Element mit dem Plus-Symbol unten!"
          : "Create your first item with the plus symbol below!"}
      </p>
    </div>
  );

  const renderFirstCat = () => {
    const relatedName = firstCat.relatedId
      ? cats.find((c) => c.id === firstCat.relatedId)?.name
      : null;
    const fallbackTypeLabel = TYPE_SINGULAR[firstCat.type]?.[lang] || firstCat.type;
    const areaTagLabel = relatedName || (lang === "de" ? "Allgemein" : "General");
    const placeholderDesc =
      lang === "de"
        ? "Erfasse und verwalte deine Themen mit PARA-LIST."
        : "Organize and manage your topics with PARA-LIST.";

    return (
      <div className="home-cover__main">
        <button
          type="button"
          className="home-cover__primary-action"
          onClick={() => onOpenCat(firstCat)}
        >
          <div className="home-cover__copy">
            <AutoScrollText className="home-cover__title">
              {firstCat.name}
            </AutoScrollText>
            <p className="home-cover__desc">
              {firstCat.desc || firstCat.body || placeholderDesc}
            </p>
          </div>
          <div className="home-cover__meta">
            <div className="home-cover__tags">
              <span className="home-cover__tag home-cover__tag--date">
                <Calendar size={12} className="home-cover__tag-icon" />
                {firstCat.date
                  ? fmtDate(firstCat.date, t.locale)
                  : lang === "de"
                    ? "Flexibel"
                    : "Flexible"}
              </span>
              <span className="home-cover__tag home-cover__tag--area">
                <Triangle size={12} className="home-cover__tag-icon" />
                {firstCat.relatedId ? areaTagLabel : fallbackTypeLabel}
              </span>
              <span className="home-cover__tag">
                {firstCat.tags && firstCat.tags.length > 0 ? firstCat.tags[0] : "App"}
              </span>
            </div>
          </div>
        </button>

      </div>
    );
  };

  const renderTabList = () => {
    if (tabEntries.length === 0) {
      return (
        <div className="entry-list__empty">
          <div
            className="entry-list__empty-icon"
            style={{ display: "flex", justifyContent: "center" }}
          >
            {tabCfg && <tabCfg.Icon size={28} color={tabColor} strokeWidth={1.5} />}
          </div>
          {t.noEntries(tabCfg?.label)}
        </div>
      );
    }

    const shared = {
      t,
      CC,
      entries: tabEntries,
      cats,
      grouped: true,
      color: tabColor,
      onOpenEntry,
      isHome: true,
    };

    if (tab === "tasks") {
      return (
        <TaskList
          {...shared}
          lang={lang}
          onToggle={toggleTask}
          onToggleStar={toggleStar}
          onUpdateEntry={updateEntry}
          onDelete={deleteEntry}
        />
      );
    }
    if (tab === "notes") {
      return (
        <NoteList
          {...shared}
          onDelete={deleteEntry}
          onToggleStar={toggleStar}
          onUpdateEntry={updateEntry}
          onArchiveEntry={onArchiveEntry}
        />
      );
    }
    if (tab === "calendar") {
      return (
        <CalList
          {...shared}
          lang={lang}
          onDelete={deleteEntry}
          onToggle={toggleTask}
          onToggleStar={toggleStar}
          onUpdateEntry={updateEntry}
        />
      );
    }
    return null;
  };

  return (
    <div className={`home home--${tab}`}>
      <div className="home-cover" style={{ "--cover-accent-rgb": rgbVal }}>
        {state.user.bgImage && (
          <img className="home-cover__bg-img" src={state.user.bgImage} alt="" aria-hidden="true" />
        )}
        <div className="home-cover__light-wave" />
        <div className="home-cover__content">
          <div className="home-cover__header">
            <span className="home-cover__badge">{renderCoverBadge()}</span>
            <div className="home-cover__avatar-area">
              {state.user.avatar ? (
                <>
                  <img
                    src={state.user.avatar}
                    alt="Avatar"
                    className="home-cover__avatar"
                    onClick={() => avatarInputRef.current?.click()}
                  />
                  <button className="home-cover__collab-btn" title="Kollaboration">
                    <UserPlus size={14} />
                  </button>
                </>
              ) : (
                <button
                  className="home-cover__avatar-placeholder"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <User size={20} />
                </button>
              )}
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
            </div>
          </div>
          {firstCat ? renderFirstCat() : renderEmptyCover()}
        </div>

        <div className="split-nav">
          {firstCat && activeCatType !== "archive" && (
            <div className="home-cover__textlink" onClick={() => onOpenCatType(activeCatType)}>
              {activeCatType === "project" && (lang === "de" ? "Alle Projekte anzeigen" : "Show all projects")}
              {activeCatType === "area" && (lang === "de" ? "Alle Bereiche anzeigen" : "Show all areas")}
              {activeCatType === "resource" && (lang === "de" ? "Alle Ressourcen anzeigen" : "Show all resources")}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                style={{
                  width: "11px",
                  height: "11px",
                  flexShrink: 0,
                  marginLeft: "4px",
                  verticalAlign: "middle",
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          )}
          <div className="split-nav__row">
            <div className={`split-nav__pills split-nav__pills--${activeCatType}`}>
              <div className="split-nav__items">
                {CAT_TYPE_CONFIG.map((item) => {
                  const IconComp = item.Icon;
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
                      title={t[item.labelKey] || item.fallback}
                    >
                      <IconComp size={32} strokeWidth={isActive ? 2.5 : 2} />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="split-nav__add"
              onClick={() => onAddCat(activeCatType)}
              title={lang === "de" ? "Neu erstellen" : "Create new"}
            >
              <Plus size={32} color={`rgb(${rgbVal})`} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      <div className="home__list-container">
        <div className="list-section__header">
          <div className="list-section__header-left">
            <div className="list-section__label-wrapper">
              <span className="list-section__label">{tabCfg?.label}</span>
              <ChevronRight size={20} className="list-section__label-chevron" />
            </div>
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
                  <TabIcon size={22} />
                </button>
              );
            })}
          </div>
        </div>

        {activeGroupHeader && VOICE_TAB_TYPES.includes(tab) && (
          <div className="task-group-header task-group-header--fixed">
            <span className="task-group-header__left">{activeGroupHeader.left}</span>
            <span className="task-group-header__right">{activeGroupHeader.right}</span>
          </div>
        )}

        <div
          className="entry-list"
          onClick={handleDoubleTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          ref={entryListRef}
          onScroll={handleListScroll}
        >
          {renderTabList()}
        </div>
      </div>

      {VOICE_TAB_TYPES.includes(tab) && (
        <VoiceFab tab={tab} tabColor={tabColor} lang={lang} onTranscribed={onAddVoiceEntry} />
      )}
    </div>
  );
}
