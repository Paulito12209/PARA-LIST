import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { Circle, Triangle, Square, Archive, Calendar, CheckCircle2, Pencil, User, UserPlus, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { TaskList, NoteList, CalList, HomeCatItem } from "../components/EntryLists";
import { CommandDock } from "../components/CommandDock";
import { DockMenuSheet } from "../components/DockMenuSheet";
import { TrashSheet } from "../components/TrashSheet";
import { VoiceOverlay } from "../modals/VoiceOverlay";
import { AutoScrollText } from "../components/AutoScrollText";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { getNextBirthday, isOld, isToday, fmtDate, getTaskGroup } from "../utils";

const COVER_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
  archive: "124, 131, 247",
};

const DOUBLE_TAP_WINDOW_MS = 300;
const SWIPE_THRESHOLD_PX = 60;
const OVERSCROLL_COLLAPSE_PX = 56;
const SCROLL_TOP_EPS_PX = 4;
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

const TYPE_SINGULAR = {
  project: { de: "Projekt", en: "Project" },
  area: { de: "Bereich", en: "Area" },
  resource: { de: "Ressource", en: "Resource" },
};

// Eintragstypen, die im Favoriten-Karussell des Covers erscheinen dürfen
const FAV_ENTRY_TYPES = ["task", "note", "calendar"];

// Badge (Icon + Singular-Label) für favorisierte Einträge im Cover
const ENTRY_BADGE = {
  task: { Icon: CheckCircle2, de: "Aufgabe", en: "Task" },
  note: { Icon: Pencil, de: "Notiz", en: "Note" },
  calendar: { Icon: Calendar, de: "Termin", en: "Event" },
};

// Akzentfarbe (RGB) für favorisierte Einträge – analog zu COVER_ACCENT_RGB
const ENTRY_ACCENT_RGB = {
  task: "11, 140, 233",
  note: "245, 158, 11",
  calendar: "0, 120, 212",
};

export function HomeScreen({
  t,
  CC,
  TABS,
  lang,
  state,
  tab,
  setTab,
  onOpenCat,
  onQuickCreate,
  onAddEntry,
  onAddVoiceEntry,
  toggleTask,
  toggleStar,
  togglePin,
  toggleVerified,
  trashCat,
  onRestoreFromTrash,
  onPurgeTrashItem,
  onEmptyTrash,
  updateEntry,
  deleteEntry,
  onOpenEntry,
  onOpenArchive,
  onArchiveEntry,
  panelOpen,
  onCoverAccentChange,
  onUpdateUser,
  onUpdateCat,
  voiceOverlayOpen,
  setVoiceOverlayOpen,
  onHeaderTitleChange,
}) {
  const { entries, cats } = state;
  // Aktiver Typ der unteren Eingabeleiste (Standard: Aufgaben)
  const [activeType, setActiveType] = useState("tasks");
  // Aktueller Index im Favoriten-Karussell des Covers
  const [coverIndex, setCoverIndex] = useState(0);
  // Dock-3-Punkte-Menü (Bottom-Sheet) und Papierkorb-Ansicht
  const [dockMenuOpen, setDockMenuOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const ENTRY_TYPES = ["tasks", "notes", "calendar"];
  const isEntryType = ENTRY_TYPES.includes(activeType);
  const [activeGroupHeader, setActiveGroupHeader] = useState(null);

  const TYPE_LABELS = {
    project: t.projects,
    area: t.areas,
    resource: t.resources,
    tasks: t.tasks,
    notes: t.notes,
    calendar: t.calendar,
  };
  const activeLabel = TYPE_LABELS[activeType];

  const handleSelectType = (type) => {
    setActiveType(type);
    if (ENTRY_TYPES.includes(type)) setTab(type);
  };

  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabModalInitialView, setCollabModalInitialView] = useState("list");
  const [listExpanded, setListExpanded] = useState(false);
  const lastScrollTop = useRef(0);

  // Beim Aufklappen der Liste wandert der Abschnittstitel in den Header (statt "Startseite")
  useEffect(() => {
    onHeaderTitleChange?.(listExpanded ? activeLabel : null);
    return () => onHeaderTitleChange?.(null);
  }, [listExpanded, activeLabel, onHeaderTitleChange]);

  // Cover-Karussell: zeigt die fixierten (pinned) Inhalte – genau 1 pro Liste möglich
  // → mehrere Slides. Kategorien (Projekte/Bereiche/Ressourcen) sowie Einträge
  // (Aufgaben/Notizen/Termine).
  const pinnedItems = [
    ...cats
      .filter((c) => c.pinned && !c.archived)
      .map((c) => ({ kind: "cat", id: `cat-${c.id}`, data: c })),
    ...entries
      .filter((e) => e.pinned && !e.archived && FAV_ENTRY_TYPES.includes(e.type))
      .map((e) => ({ kind: "entry", id: `entry-${e.id}`, data: e })),
  ];
  // Fallback ohne Fixierung: EIN favorisiertes Projekt (nur eins), sonst erstes Projekt.
  const fallbackProject =
    cats.find((c) => c.type === "project" && c.starred && !c.archived) ||
    cats.find((c) => c.type === "project" && !c.archived);
  const coverItems =
    pinnedItems.length > 0
      ? pinnedItems
      : fallbackProject
        ? [{ kind: "cat", id: `cat-${fallbackProject.id}`, data: fallbackProject }]
        : [];

  const safeCoverIndex = coverItems.length ? Math.min(coverIndex, coverItems.length - 1) : 0;
  const currentCover = coverItems[safeCoverIndex] || null;
  const currentCat = currentCover?.kind === "cat" ? currentCover.data : null;
  const currentEntry = currentCover?.kind === "entry" ? currentCover.data : null;
  const currentCollabs = currentCat?.collaborators || [];
  const currentCoverImage = currentCat?.coverImage || null;

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
        return e.type === "calendar" && (!e.date || !isOld(e.date)) && !e.done && !e.archived;
      }
      if (tab === "notes") {
        return e.type === "note" && !e.archived && !e.done;
      }
      if (tab === "tasks") {
        const isOverdue = e.type === "task" && !e.done && isOld(e.due);
        return e.type === "task" && !isOverdue && !e.done && !e.archived;
      }
      return false;
    });

  const tabCfg = TABS.find((tCfg) => tCfg.id === tab);
  const tabColor = tabCfg?.color || "#0078D4";

  // Voice-Overlay erstellt je nach aktivem Typ einen Eintrag (Aufgabe/Notiz/
  // Termin) ODER eine Kategorie (Projekt/Bereich/Ressource). Farbe & Akzent
  // richten sich nach dem aktiven Erstell-Typ.
  const voiceColor = isEntryType ? tabColor : (CC[activeType]?.color || tabColor);
  const voiceAccentRgb = isEntryType ? null : COVER_ACCENT_RGB[activeType];

  // Ist die aktuell sichtbare Liste leer? Dann darf der Platzhalter nicht
  // wegscrollbar sein (Scrollen wird per CSS gesperrt).
  const activeListEmpty = isEntryType
    ? tabEntries.length === 0
    : cats.filter((c) => c.type === activeType && !c.archived).length === 0;

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

    const scrollTop = container.scrollTop;
    if (scrollTop > lastScrollTop.current && tabEntries.length > 1 && !listExpanded) {
      setListExpanded(true);
    }
    lastScrollTop.current = scrollTop;

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

    // Only show sticky header when the group's inline header has scrolled out of view
    const inlineHeader = currentGroup.querySelector(".task-group-header:not(.task-group-header--fixed)");
    if (inlineHeader) {
      const headerRect = inlineHeader.getBoundingClientRect();
      if (headerRect.bottom > containerTop) {
        // Inline header still visible → hide sticky header to avoid duplication
        if (activeGroupHeader) setActiveGroupHeader(null);
        return;
      }
    }

    const left = currentGroup.dataset.groupLeft;
    const right = currentGroup.dataset.groupRight;
    const count = currentGroup.dataset.groupCount;
    if (left && (!activeGroupHeader || activeGroupHeader.left !== left || activeGroupHeader.right !== right || activeGroupHeader.count !== count)) {
      setActiveGroupHeader({ left, right, count });
    }
  };

  useEffect(() => {
    if (entryListRef.current) {
      setTimeout(handleListScroll, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabEntries.length]);

  useEffect(() => {
    if (tabEntries.length <= 1) setListExpanded(false);
  }, [tabEntries.length]);

  const lastTap = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTouchY = useRef(0);
  const atTopAtStart = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    const container = entryListRef.current;
    atTopAtStart.current = container ? container.scrollTop <= SCROLL_TOP_EPS_PX : false;
  };

  const handleTouchMove = (e) => {
    lastTouchY.current = e.touches[0].clientY;
  };

  // Nach unten wischen am Listenanfang → aufgeklappte Liste zuklappen (wie der
  // Verkleinern-Button / Doppeltipp aufs Dock-Icon). Liefert true, wenn die
  // Geste erkannt und behandelt wurde.
  const collapseIfSwipedDown = (endX, endY) => {
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    if (
      listExpanded &&
      atTopAtStart.current &&
      dy >= OVERSCROLL_COLLAPSE_PX &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      setListExpanded(false);
      return true;
    }
    return false;
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    if (collapseIfSwipedDown(endX, endY)) return;

    const dx = endX - touchStartX.current;
    if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || panelOpen) return;

    const tabOrder = TABS.map((tCfg) => tCfg.id);
    const currentIndex = tabOrder.indexOf(tab);
    if (dx > 0 && currentIndex > 0) {
      setTab(tabOrder[currentIndex - 1]);
    } else if (dx < 0 && currentIndex < tabOrder.length - 1) {
      setTab(tabOrder[currentIndex + 1]);
    }
  };

  // Fallback: Bricht der Browser die Touch-Sequenz ab (z.B. durch Overscroll),
  // werten wir die zuletzt bekannte Position aus, damit das Einklappen dennoch
  // zuverlässig auslöst.
  const handleTouchCancel = () => {
    collapseIfSwipedDown(touchStartX.current, lastTouchY.current);
  };

  // ── Cover-Karussell: horizontales Wischen zwischen Favoriten ──
  const coverTouchX = useRef(0);
  const coverTouchY = useRef(0);
  const onCoverTouchStart = (e) => {
    coverTouchX.current = e.touches[0].clientX;
    coverTouchY.current = e.touches[0].clientY;
  };
  const onCoverTouchEnd = (e) => {
    if (coverItems.length <= 1) return;
    const dx = e.changedTouches[0].clientX - coverTouchX.current;
    const dy = e.changedTouches[0].clientY - coverTouchY.current;
    if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || Math.abs(dy) > Math.abs(dx)) return;
    setCoverIndex((idx) => {
      const cur = Math.min(idx, coverItems.length - 1);
      return dx < 0 ? Math.min(cur + 1, coverItems.length - 1) : Math.max(cur - 1, 0);
    });
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

  const rgbVal = (() => {
    if (currentCat) {
      const HEX_TO_RGB = {
        "#30A060": "48, 160, 96",
        "#D09020": "208, 144, 32",
        "#F59E0B": "245, 158, 11",
        "#1D4ED8": "29, 78, 216",
        "#7C83F7": "124, 131, 247",
        "#0B8CE9": "11, 140, 233",
        "#0078D4": "0, 120, 212",
        "#10088D": "16, 8, 141",
        "#E03E3E": "224, 62, 62",
        "#5858A0": "88, 88, 160",
      };
      if (currentCat.coverColor && HEX_TO_RGB[currentCat.coverColor]) {
        return HEX_TO_RGB[currentCat.coverColor];
      }
      return COVER_ACCENT_RGB[currentCat.type] || COVER_ACCENT_RGB.archive;
    }
    if (currentEntry) {
      return ENTRY_ACCENT_RGB[currentEntry.type] || COVER_ACCENT_RGB.archive;
    }
    return COVER_ACCENT_RGB.project;
  })();

  useEffect(() => {
    onCoverAccentChange?.(rgbVal);
  }, [rgbVal, onCoverAccentChange]);

  const renderCoverBadge = () => {
    if (currentCat) {
      const config = COVER_BADGE_LABELS[currentCat.type];
      const Icon = COVER_BADGE_ICONS[currentCat.type];
      if (!config || !Icon) return null;
      const fullLabel = t[config.key] || config.fallback;
      // Singular (z.B. "Projekte" → "Projekt")
      const label = fullLabel.toUpperCase().slice(0, -1);
      return (
        <>
          <Icon size={10} strokeWidth={3} className="home-cover__badge-icon" />
          {label}
        </>
      );
    }
    if (currentEntry) {
      const cfg = ENTRY_BADGE[currentEntry.type];
      if (!cfg) return null;
      const Icon = cfg.Icon;
      return (
        <>
          <Icon size={10} strokeWidth={3} className="home-cover__badge-icon" />
          {(lang === "de" ? cfg.de : cfg.en).toUpperCase()}
        </>
      );
    }
    return null;
  };

  const renderEmptyCover = () => (
    <div className="home-cover__main">
      <h1 className="home-cover__title">
        {lang === "de" ? "Keine Favoriten" : "No Favorites"}
      </h1>
      <p className="home-cover__desc">
        {lang === "de"
          ? "Markiere Inhalte als Favorit (Stern), um sie hier durchzuwischen."
          : "Mark content as a favorite (star) to swipe through it here."}
      </p>
    </div>
  );

  // Page-Dots des Karussells (gemeinsam für Kategorien & Einträge)
  const renderCoverDots = () =>
    coverItems.length > 1 ? (
      <div className="home-page-dots">
        {coverItems.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`home-page-dots__dot ${i === safeCoverIndex ? "home-page-dots__dot--active" : ""}`}
            onClick={() => setCoverIndex(i)}
            aria-label={`${i + 1} / ${coverItems.length}`}
          />
        ))}
      </div>
    ) : null;

  // Favorisierte Kategorie (Projekt/Bereich/Ressource) im Cover
  const renderCoverCat = (cat) => {
    const relatedName = cat.relatedId ? cats.find((c) => c.id === cat.relatedId)?.name : null;
    const fallbackTypeLabel = TYPE_SINGULAR[cat.type]?.[lang] || cat.type;
    const areaTagLabel = relatedName || (lang === "de" ? "Allgemein" : "General");
    const placeholderDesc =
      lang === "de"
        ? "Erfasse und verwalte deine Themen mit PARA-LIST."
        : "Organize and manage your topics with PARA-LIST.";
    const SING_KEY = { project: "projectSing", area: "areaSing", resource: "resourceSing" };
    const openText = t.openLabel(t[SING_KEY[cat.type]] || fallbackTypeLabel);

    return (
      <div className="home-cover__main" key={`cat-${cat.id}`}>
        <div className="home-cover__primary-action">
          <div className="home-cover__copy">
            <AutoScrollText className="home-cover__title">{cat.name}</AutoScrollText>
            <p className="home-cover__desc">{cat.desc || cat.body || placeholderDesc}</p>
          </div>
          <div className="home-cover__meta">
            <div className="home-cover__tags">
              <span className="home-cover__tag home-cover__tag--date">
                <Calendar size={12} className="home-cover__tag-icon" />
                {cat.date ? fmtDate(cat.date, t.locale) : lang === "de" ? "Flexibel" : "Flexible"}
              </span>
              <span className="home-cover__tag home-cover__tag--area">
                <Triangle size={12} className="home-cover__tag-icon" />
                {cat.relatedId ? areaTagLabel : fallbackTypeLabel}
              </span>
              {cat.tags && cat.tags.length > 0 && (
                <span className="home-cover__tag">{cat.tags[0]}</span>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="home-cover__open-btn" onClick={() => onOpenCat(cat)}>
          {openText}
        </button>

        {renderCoverDots()}
      </div>
    );
  };

  // Favorisierter Eintrag (Aufgabe/Notiz/Termin) im Cover
  const renderCoverEntry = (entry) => {
    const cfg = ENTRY_BADGE[entry.type];
    const typeLabel = cfg ? (lang === "de" ? cfg.de : cfg.en) : entry.type;
    const openText = t.openLabel(typeLabel);
    const dateVal = entry.due || entry.date || null;
    const linkedCat = entry.catId ? cats.find((c) => c.id === entry.catId) : null;
    const placeholderDesc = lang === "de" ? "Kein weiterer Inhalt." : "No further content.";

    return (
      <div className="home-cover__main" key={`entry-${entry.id}`}>
        <div className="home-cover__primary-action">
          <div className="home-cover__copy">
            <AutoScrollText className="home-cover__title">{entry.title}</AutoScrollText>
            <p className="home-cover__desc">
              {entry.note || entry.body || entry.desc || placeholderDesc}
            </p>
          </div>
          <div className="home-cover__meta">
            <div className="home-cover__tags">
              <span className="home-cover__tag home-cover__tag--date">
                <Calendar size={12} className="home-cover__tag-icon" />
                {dateVal ? fmtDate(dateVal, t.locale) : lang === "de" ? "Flexibel" : "Flexible"}
              </span>
              {linkedCat && (
                <span className="home-cover__tag home-cover__tag--area">
                  <Triangle size={12} className="home-cover__tag-icon" />
                  {linkedCat.name}
                </span>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <span className="home-cover__tag">{entry.tags[0]}</span>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="home-cover__open-btn" onClick={() => onOpenEntry?.(entry)}>
          {openText}
        </button>

        {renderCoverDots()}
      </div>
    );
  };

  const renderTabList = () => {
    if (tabEntries.length === 0) {
      return (
        <div className="entry-list__empty">
          <div className="entry-list__empty-title">{t.noEntries(tabCfg?.label)}</div>
          <div className="entry-list__empty-hint" style={{ color: tabColor }}>{t.doubleTapHint}</div>
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
          onTogglePin={togglePin}
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
          onTogglePin={togglePin}
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
          onTogglePin={togglePin}
          onUpdateEntry={updateEntry}
        />
      );
    }
    return null;
  };

  // Inhalt der Liste je nach aktivem Typ:
  // Eintragstypen → bestehende Listen; PARA-Typen → einfache Kategorien-Liste.
  const renderActiveList = () => {
    if (isEntryType) return renderTabList();
    const paraCats = cats.filter((c) => c.type === activeType && !c.archived);
    if (paraCats.length === 0) {
      return <div className="entry-list__empty">{t.noCats(activeLabel)}</div>;
    }

    const renderCatItem = (c) => (
      <HomeCatItem
        key={c.id}
        c={c}
        t={t}
        CC={CC}
        onOpenCat={onOpenCat}
        onUpdateCat={onUpdateCat}
        onTogglePin={(id) => togglePin(id, "cat")}
        onToggleVerified={toggleVerified}
        onTrash={trashCat}
      />
    );

    // Fixierte Kategorie wird ganz oben angepinnt (genau eine pro Liste).
    const pinnedCat = paraCats.find((c) => c.pinned);
    const restCats = pinnedCat ? paraCats.filter((c) => c.id !== pinnedCat.id) : paraCats;

    // Datums-Gruppierung analog zu den Aufgaben-/Notiz-/Termin-Listen:
    // Einträge ohne Datum (bzw. heute/überfällig) oben ohne Header, künftige
    // Einträge unter Datums-Gruppen-Headern ("Morgen", "Nächste Woche" …).
    const undatedCats = [];
    const groupedCats = new Map();
    restCats.forEach((c) => {
      if (!c.date || isToday(c.date) || isOld(c.date)) {
        undatedCats.push(c);
        return;
      }
      const g = getTaskGroup(c.date, t.locale, true);
      const key = `${g.left}|${g.right}`;
      if (!groupedCats.has(key)) groupedCats.set(key, { ...g, items: [] });
      groupedCats.get(key).items.push(c);
    });
    const futureGroups = Array.from(groupedCats.values());
    futureGroups.sort((a, b) => a.sortKey - b.sortKey);
    futureGroups.forEach((g) => g.items.sort((a, b) => new Date(a.date) - new Date(b.date)));

    return (
      <>
        {pinnedCat && renderCatItem(pinnedCat)}
        {undatedCats.map(renderCatItem)}
        {futureGroups.map((g, i) => (
          <Fragment key={`grp-${i}`}>
            <div className="task-group-header task-group-header--home">
              <span className="task-group-header__left">{g.left}</span>
              <span className="task-group-header__badge">{g.items.length}</span>
              <span className="task-group-header__right">{g.right}</span>
            </div>
            {g.items.map(renderCatItem)}
          </Fragment>
        ))}
      </>
    );
  };

  return (
    <div className={`home home--${tab}`}>
      <div
        className={`home-cover ${currentCoverImage ? "home-cover--has-cover-img" : ""}`}
        style={{ "--cover-accent-rgb": rgbVal }}
        onTouchStart={onCoverTouchStart}
        onTouchEnd={onCoverTouchEnd}
      >
        {state.user.bgImage && (
          <img className="home-cover__bg-img" src={state.user.bgImage} alt="" aria-hidden="true" />
        )}
        {currentCoverImage && (
          <img className="home-cover__bg-img" src={currentCoverImage} alt="" aria-hidden="true" />
        )}
        <div className="home-cover__light-wave" />
        <div className="home-cover__content">
          <div className="home-cover__header">
            <span className="home-cover__badge">{renderCoverBadge()}</span>
            <div className="home-cover__avatar-area">
              {state.user.avatar ? (
                <img
                  src={state.user.avatar}
                  alt="Avatar"
                  className="home-cover__avatar"
                  onClick={() => avatarInputRef.current?.click()}
                />
              ) : (
                <button
                  className="home-cover__avatar-placeholder"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <User size={20} />
                </button>
              )}
              {/* Kollaboratoren gibt es nur bei Kategorien, nicht bei Einträgen */}
              {currentCat && currentCollabs.length > 0 && (
                <button
                  className="home-cover__collab-avatar"
                  onClick={() => {
                    setCollabModalInitialView("list");
                    setCollabModalOpen(true);
                  }}
                >
                  {currentCollabs[0].avatar ? (
                    <img src={currentCollabs[0].avatar} alt={currentCollabs[0].name} />
                  ) : (
                    <span>{currentCollabs[0].name.charAt(0).toUpperCase()}</span>
                  )}
                </button>
              )}
              {currentCat && (
                <button
                  className="home-cover__collab-btn"
                  onClick={() => {
                    setCollabModalInitialView(currentCollabs.length === 0 ? "add" : "list");
                    setCollabModalOpen(true);
                  }}
                >
                  {currentCollabs.length >= 2 ? (
                    <span className="home-cover__collab-count">+{currentCollabs.length - 1}</span>
                  ) : (
                    <UserPlus size={14} />
                  )}
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
          {currentCover
            ? currentCat
              ? renderCoverCat(currentCat)
              : renderCoverEntry(currentEntry)
            : renderEmptyCover()}
        </div>
      </div>

      <div className={`home__list-container${listExpanded ? ' home__list-container--expanded' : ''}`}>
        {/* Eingeklappt: Titel · Aufklappen · Archiv im Section-Header.
            Aufgeklappt: Zuklappen + Archiv wandern als schwebende Glas-Buttons nach unten. */}
        {!listExpanded && (
          <div className="list-section__header">
            <div className="list-section__header-left">
              <span className="list-section__label">{activeLabel}</span>
              <button
                className="list-section__expand"
                onClick={() => setListExpanded(true)}
                aria-label={t.open}
              >
                <Maximize2 size={18} />
              </button>
            </div>
            {/* Archiv-Zugang – immer gegenüber vom Abschnittstitel */}
            <button
              className="list-section__archive"
              onClick={() => onOpenArchive(activeType)}
              aria-label={t.archive}
            >
              <Archive size={20} />
            </button>
          </div>
        )}

        {activeGroupHeader && VOICE_TAB_TYPES.includes(tab) && (
          <div className="task-group-header task-group-header--fixed">
            <span className="task-group-header__left">{activeGroupHeader.left}</span>
            {activeGroupHeader.count && <span className="task-group-header__badge">{activeGroupHeader.count}</span>}
            <span className="task-group-header__right">{activeGroupHeader.right}</span>
          </div>
        )}

        <div
          className={`entry-list${activeListEmpty ? " entry-list--locked" : ""}`}
          onClick={handleDoubleTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          ref={entryListRef}
          onScroll={handleListScroll}
        >
          {renderActiveList()}
        </div>

        {listExpanded && (
          <div className="home__floating-actions">
            <button
              className="home__floating-btn"
              onClick={() => setListExpanded(false)}
              aria-label={t.closeBtn}
            >
              <Minimize2 size={20} />
            </button>
            <button
              className="home__floating-btn"
              onClick={() => onOpenArchive(activeType)}
              aria-label={t.archive}
            >
              <Archive size={20} />
            </button>
          </div>
        )}
      </div>

      {collabModalOpen && currentCat && (
        <CollaboratorsModal
          t={t}
          cat={currentCat}
          onUpdateCat={onUpdateCat}
          onClose={() => setCollabModalOpen(false)}
          initialView={collabModalInitialView}
        />
      )}

      <CommandDock
        t={t}
        activeType={activeType}
        onSelectType={handleSelectType}
        onSubmit={onQuickCreate}
        canToggleList
        onToggleList={() => setListExpanded((v) => !v)}
        onHome={() => setListExpanded(false)}
        onOpenVoice={() => setVoiceOverlayOpen(true)}
        onMenu={() => setDockMenuOpen(true)}
      />

      {dockMenuOpen && (
        <DockMenuSheet
          t={t}
          onOpenTrash={() => setTrashOpen(true)}
          onClose={() => setDockMenuOpen(false)}
        />
      )}

      {trashOpen && (
        <TrashSheet
          t={t}
          trash={state.trash || []}
          onRestore={onRestoreFromTrash}
          onPurge={onPurgeTrashItem}
          onEmpty={onEmptyTrash}
          onClose={() => setTrashOpen(false)}
        />
      )}

      {voiceOverlayOpen && (
        <VoiceOverlay
          t={t}
          tab={tab}
          tabColor={voiceColor}
          accentRgb={voiceAccentRgb}
          lang={lang}
          onTranscribed={(title, date) => {
            if (isEntryType) onAddVoiceEntry(title, date);
            else onQuickCreate(activeType, title);
            setVoiceOverlayOpen(false);
          }}
          onClose={() => setVoiceOverlayOpen(false)}
        />
      )}
    </div>
  );
}
