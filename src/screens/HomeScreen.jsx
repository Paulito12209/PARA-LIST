import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { Circle, Triangle, Square, Archive, Calendar, CheckCircle2, Pencil, UserPlus, ChevronRight, ChevronLeft, ChevronDown, Trash2, RotateCcw, Star, Languages, Layers, Gamepad2, Lock } from "lucide-react";
import { TaskList, NoteList, CalList, LinkList, HomeCatItem } from "../components/EntryLists";
import { BookmarkIcon, TagIcon } from "../components/AppIcons";
import { CommandDock } from "../components/CommandDock";
import { NewDesignNav } from "../components/NewDesignNav";
import { DockMenuSheet } from "../components/DockMenuSheet";
import { ProgressOverlay } from "../components/ProgressOverlay";
import { buildActivityState } from "../desktop/activity";
import { TrashSheet } from "../components/TrashSheet";
import { VoiceOverlay } from "../modals/VoiceOverlay";
import { AutoScrollText } from "../components/AutoScrollText";
import { CollaboratorsModal } from "../modals/CollaboratorsModal";
import { getNextBirthday, isOld, isToday, fmtDate, fmtRelative, getTaskGroup, getInitials, blurActiveInput } from "../utils";

const COVER_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
  archive: "124, 131, 247",
};

const DOUBLE_TAP_WINDOW_MS = 300;
const SWIPE_THRESHOLD_PX = 60;
// Zuklappen per Pull-down: höhere Schwelle = spürbarer Widerstand, damit man
// nicht versehentlich beim Scrollen zuklappt. Erst ein bewusst festerer Zug
// (≈ dieser Wert in roher Fingerbewegung) klappt die Liste zu.
const OVERSCROLL_COLLAPSE_PX = 88;
// Dämpfung der Pull-down-Geste (Gummiband-Gefühl): die Liste folgt dem Finger
// nur zu ~45 %, damit sich das Ziehen "schwerer" anfühlt.
const PULL_DAMPING = 0.45;
const PULL_MAX_PX = 150;
// Nach oben wischen am Listenkopf / Listenanfang → Liste komplett aufklappen.
const EXPAND_SWIPE_PX = 36;
const SCROLL_TOP_EPS_PX = 4;
const GROUP_HEADER_OFFSET_PX = 24;
// Reihenfolge aller 6 Listen im Dock – Grundlage für das Links-/Rechts-Wischen
// zwischen den Listen (Projekte → … → Kalender).
const ALL_LIST_TYPES = ["project", "area", "resource", "tasks", "notes", "calendar"];

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
  onOpenCatType,
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
  onArchiveEntry,
  panelOpen,
  progressTick,
  onOpenSearch,
  onOpenTranslator,
  onOpenFlashcards,
  onCoverAccentChange,
  onUpdateUser,
  onUpdateCat,
  voiceOverlayOpen,
  setVoiceOverlayOpen,
  onHeaderTitleChange,
  onHeaderEyebrowChange,
}) {
  const { entries, cats } = state;
  // Aktiver Typ der unteren Eingabeleiste. Seed aus dem persistenten App-`tab`,
  // damit Titel (activeType) und Entry-Liste (tab) beim Remount nicht divergieren.
  const [activeType, setActiveType] = useState(() => tab);
  // Aktueller Index im Favoriten-Karussell des Covers
  const [coverIndex, setCoverIndex] = useState(0);
  // Dock-3-Punkte-Menü (Bottom-Sheet) und Papierkorb-Ansicht
  const [dockMenuOpen, setDockMenuOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  // Fortschritts-Overlay – der Pokal-Button liegt jetzt im Header (CommandPanel)
  // und triggert das Öffnen über einen Tick-Zähler von oben.
  const [progressOpen, setProgressOpen] = useState(false);
  const [prevProgressTick, setPrevProgressTick] = useState(progressTick);
  if (progressTick !== prevProgressTick) {
    setPrevProgressTick(progressTick);
    setProgressOpen(true);
  }
  const ENTRY_TYPES = ["tasks", "notes", "calendar"];
  const isEntryType = ENTRY_TYPES.includes(activeType);
  const [activeGroupHeader, setActiveGroupHeader] = useState(null);

  // Neues Design: Der Header (CommandPanel) kopiert den Cover-Verlauf und
  // muss beim Ganzseiten-Scroll immer den Ausschnitt zeigen, der aktuell
  // unter ihm liegt. Dafür wird die Scrollposition von .home als CSS-Variable
  // auf den App-Root gespiegelt – der Header verschiebt damit seine
  // Verlaufskopie (background-position in _CommandPanel.scss).
  const homeScrollRef = useRef(null);
  useEffect(() => {
    const el = homeScrollRef.current;
    if (!el || !state.newDesign) return;
    const app = el.closest(".app");
    const sync = () => {
      app?.style.setProperty("--home-scroll-y", `${el.scrollTop}px`);
      // Cover-"Öffnen"-Button vollständig über den oberen Sichtrand gescrollt?
      const btn = el.querySelector(".home-cover__open-btn");
      const away = btn
        ? btn.getBoundingClientRect().bottom < el.getBoundingClientRect().top
        : false;
      if (away !== coverScrolledAwayRef.current) {
        coverScrolledAwayRef.current = away;
        setCoverScrolledAway(away);
      }
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    return () => {
      el.removeEventListener("scroll", sync);
      app?.style.setProperty("--home-scroll-y", "0px");
    };
  }, [state.newDesign]);

  const TYPE_LABELS = {
    project: t.projects,
    area: t.areas,
    resource: t.resources,
    tasks: t.tasks,
    notes: t.notes,
    calendar: t.calendar,
    favorites: t.favorites,
    links: t.bookmarks,
    tags: t.tagsLabel,
  };
  const activeLabel = TYPE_LABELS[activeType];

  const handleSelectType = (type) => {
    // Listenwechsel (Tap aufs Dock-Icon ODER horizontales Wischen) beendet
    // eine laufende Eingabe – Tastatur samt iOS-Assistent-Pille klappt zu.
    blurActiveInput();
    setActiveType(type);
    if (ENTRY_TYPES.includes(type)) setTab(type);
  };

  // Externe tab-Änderungen (Remount, Desktop-Bridge `focusTab`, direktes setTab)
  // auf activeType spiegeln. So bleiben Abschnittstitel (aus activeType) und
  // Entry-Liste (aus tab) immer synchron und können nie divergieren. Bei
  // Kategorie-Auswahl (project/area/resource) ändert sich `tab` nicht, der
  // Effekt feuert also nicht und activeType bleibt auf dem Kategorie-Typ.
  useEffect(() => {
    setActiveType(tab);
  }, [tab]);

  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabModalInitialView, setCollabModalInitialView] = useState("list");
  const [listExpanded, setListExpanded] = useState(false);
  // Wurde die Liste nur wegen einer Tipp-Session im Dock maximiert?
  // Dann klappt sie beim Zuklappen der Tastatur wieder zu (Startseite).
  const expandedByTypingRef = useRef(false);
  // Läuft gerade eine Tipp-Session (Dock-Feld fokussiert + Tastatur sichtbar)?
  // Der Zuklapp-Chevron rückt dann direkt über die Eingabezeile.
  const [dockTyping, setDockTyping] = useState(false);
  // Listen-Filter (nur aufgeklappt): Aktiv · Archiviert · Papierkorb.
  // Archiv/Papierkorb sind damit direkt in der Liste erreichbar (kein eigener
  // Screen-Wechsel nötig); beim Zuklappen wird auf "active" zurückgesetzt.
  const [listFilter, setListFilter] = useState("active");
  // Ausgewählter Tag im Drilldown der Tags-Kachel (null = flache Tag-Liste).
  const [selectedTag, setSelectedTag] = useState(null);
  const lastScrollTop = useRef(0);
  // Ist der "Öffnen"-Button des Covers beim Hochscrollen aus dem Sichtbereich
  // gewandert? Dann erscheint das Cover-Element als Vorschau-Kachel links neben
  // den Aktions-Buttons der neuen Nav-Leiste (Spotify-Mini-Player-Prinzip).
  const [coverScrolledAway, setCoverScrolledAway] = useState(false);
  const coverScrolledAwayRef = useRef(false);

  // Filter beim Zuklappen bzw. Kontextwechsel (Typ/Tab) zurücksetzen.
  useEffect(() => {
    if (!listExpanded) setListFilter("active");
  }, [listExpanded]);
  useEffect(() => {
    setListFilter("active");
    if (activeType !== "tags") setSelectedTag(null);
  }, [activeType, tab]);

  // Beim Aufklappen der Liste wandert der Abschnittstitel in den Header (statt
  // "Startseite"); das Fortschritts-Overlay setzt stattdessen "Fortschritt".
  useEffect(() => {
    onHeaderTitleChange?.(
      progressOpen ? (t.progress || "Fortschritt") : listExpanded ? activeLabel : null
    );
    // Im Fortschritts-Overlay zeigt der Header-Eyebrow den Rang statt des Datums.
    if (progressOpen) {
      const { currentLevel } = buildActivityState({ entries, cats, lang });
      const rankWord = lang === "en" ? "Rank" : lang === "es" ? "Rango" : "Rang";
      onHeaderEyebrowChange?.(`${rankWord}: ${currentLevel.name}`);
    } else {
      onHeaderEyebrowChange?.(null);
    }
    return () => {
      onHeaderTitleChange?.(null);
      onHeaderEyebrowChange?.(null);
    };
  }, [progressOpen, listExpanded, activeLabel, onHeaderTitleChange, onHeaderEyebrowChange, entries, cats, lang, t]);

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

  // Favoriten-Liste (neues Design, Kachel "Favoriten"): alle mit Stern
  // markierten Kategorien und Einträge, jeweils ohne Archivierte/Erledigte.
  const favCats = cats.filter((c) => c.starred && !c.archived);
  const favTasks = entries.filter((e) => e.type === "task" && e.starred && !e.done && !e.archived);
  const favNotes = entries.filter((e) => e.type === "note" && e.starred && !e.done && !e.archived);
  const favCals = entries.filter((e) => e.type === "calendar" && e.starred && !e.done && !e.archived);
  const favCount = favCats.length + favTasks.length + favNotes.length + favCals.length;

  // Voice-Overlay erstellt je nach aktivem Typ einen Eintrag (Aufgabe/Notiz/
  // Termin) ODER eine Kategorie (Projekt/Bereich/Ressource). Farbe & Akzent
  // richten sich nach dem aktiven Erstell-Typ.
  const voiceColor = isEntryType ? tabColor : (CC[activeType]?.color || tabColor);
  const voiceAccentRgb = isEntryType ? null : COVER_ACCENT_RGB[activeType];
  // Datumsauswahl nur für Einträge und Projekte. Bereiche/Ressourcen brauchen
  // kein Datum (ihre Pille zeigt später das Entstehungsdatum).
  const voiceSupportsDate = isEntryType || activeType === "project";

  // Lesezeichen-Kachel: alle Link-Einträge app-weit, neueste zuerst.
  const sortedLinks = entries
    .filter((e) => e.type === "link")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Tags-Kachel: alle vergebenen Tag-Namen (globale Registry + freie
  // Eintrags-Tags, die evtl. noch nicht in state.tags registriert sind).
  const allTagNames = Array.from(
    new Set([
      ...(state.tags || []).map((tg) => tg.name),
      ...entries.flatMap((e) => e.tags || []),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Ist die aktuell sichtbare Liste leer? Dann darf der Platzhalter nicht
  // wegscrollbar sein (Scrollen wird per CSS gesperrt).
  const activeItemsCount =
    activeType === "favorites"
      ? favCount
      : activeType === "links"
        ? sortedLinks.length
        : activeType === "tags"
          ? allTagNames.length
          : isEntryType
            ? tabEntries.length
            : cats.filter((c) => c.type === activeType && !c.archived).length;
  const activeListEmpty = activeItemsCount === 0;

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
    if (scrollTop > lastScrollTop.current && activeItemsCount > 1 && !listExpanded) {
      blurActiveInput();
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

  // Beim Wechsel der Liste (Dock-Icon / Wischen) den fixierten Gruppen-Header
  // sofort zurücksetzen und neu berechnen. Sonst bleibt z.B. der Notiz-Header
  // "Ältester Eintrag: …" stehen, wenn man auf Kalender/Aufgaben/Ressourcen
  // wechselt (dort ergibt diese Beschriftung keinen Sinn). `activeType` als
  // Dependency, damit es auch bei PARA-Typen (kein tab-Wechsel) greift.
  useEffect(() => {
    setActiveGroupHeader(null);
    if (entryListRef.current) {
      setTimeout(handleListScroll, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeType, tabEntries.length]);

  // Beim Auf-/Zuklappen an den Listenanfang springen. Das Aufklappen wird oft
  // durch die Scroll-Geste selbst ausgelöst (handleListScroll) – der dabei
  // entstandene scrollTop bliebe sonst erhalten, wenn der Container auf
  // position:fixed umspringt: der erste Eintrag hängt abgeschnitten über der
  // Oberkante und iOS klemmt den Offset fest, wenn der Inhalt kürzer als der
  // neue Scrollbereich ist (Liste wirkt "eingefroren").
  useEffect(() => {
    const container = entryListRef.current;
    if (container) container.scrollTop = 0;
    lastScrollTop.current = 0;
  }, [listExpanded]);

  // Hinweis: Früher wurde die Liste bei ≤ 1 Eintrag automatisch zugeklappt.
  // Das ist bewusst entfernt – beim Wechsel zwischen den Listen (Dock-Icons /
  // Links-Rechts-Wischen) bleibt die Liste aufgeklappt, auch wenn die Zielliste
  // leer ist (z.B. Kalender). Zugeklappt wird nur explizit: erneuter Tap aufs
  // aktive Icon, Verkleinern-Button oder Pull-down.

  const lastTap = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTouchY = useRef(0);
  const atTopAtStart = useRef(false);
  // Gerichteter "Modus" der laufenden Geste, damit horizontales Wischen und
  // vertikales Pull-down sich nicht gegenseitig stören. null → noch unklar.
  const gestureAxis = useRef(null);
  // Live-Versatz beim Pull-down (gedämpft → Gummiband-/Widerstandsgefühl).
  const [pullDownPx, setPullDownPx] = useState(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    gestureAxis.current = null;
    const container = entryListRef.current;
    atTopAtStart.current = container ? container.scrollTop <= SCROLL_TOP_EPS_PX : false;
  };

  const handleTouchMove = (e) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    lastTouchY.current = y;

    const dx = x - touchStartX.current;
    const dy = y - touchStartY.current;

    // Achse einmal festlegen, sobald die Bewegung eindeutig ist – verhindert,
    // dass ein diagonales Wischen sowohl navigiert als auch zuklappt.
    if (!gestureAxis.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      gestureAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    // Pull-down nur bei aufgeklappter Liste, am Listenanfang und vertikaler Geste.
    if (listExpanded && atTopAtStart.current && gestureAxis.current === "y" && dy > 0) {
      const damped = Math.min(dy * PULL_DAMPING, PULL_MAX_PX);
      setPullDownPx(damped);
    } else if (pullDownPx) {
      setPullDownPx(0);
    }
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;

    const wasPulling = pullDownPx > 0;
    // Egal wie die Geste endet: der Versatz schnappt per CSS-Transition zurück.
    if (wasPulling) setPullDownPx(0);

    // Pull-down über die Schwelle (mit Widerstand) am Listenanfang → zuklappen.
    if (
      listExpanded &&
      atTopAtStart.current &&
      dy >= OVERSCROLL_COLLAPSE_PX &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      blurActiveInput();
      setListExpanded(false);
      return;
    }

    // Nach oben wischen am Listenanfang → komplett aufklappen. Greift vor allem
    // bei leeren/kurzen Listen, die nicht scrollen (sonst übernimmt handleListScroll).
    if (
      !listExpanded &&
      atTopAtStart.current &&
      dy <= -EXPAND_SWIPE_PX &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      blurActiveInput();
      setListExpanded(true);
      return;
    }

    // War es eine vertikale Pull-Geste, nicht als Links-/Rechts-Wischen werten.
    if (wasPulling || gestureAxis.current === "y") return;

    // Horizontales Wischen → zwischen ALLEN 6 Listen blättern (Liste bleibt im
    // aktuellen Auf-/Zuklapp-Zustand). Klar horizontale Geste vorausgesetzt.
    if (Math.abs(dx) <= SWIPE_THRESHOLD_PX || Math.abs(dy) > Math.abs(dx) || panelOpen) return;

    const currentIndex = ALL_LIST_TYPES.indexOf(activeType);
    // Favoriten sind nicht Teil der Wisch-Reihenfolge (nur über die Kachel).
    if (currentIndex === -1) return;
    if (dx > 0 && currentIndex > 0) {
      handleSelectType(ALL_LIST_TYPES[currentIndex - 1]);
    } else if (dx < 0 && currentIndex < ALL_LIST_TYPES.length - 1) {
      handleSelectType(ALL_LIST_TYPES[currentIndex + 1]);
    }
  };

  // Fallback: Bricht der Browser die Touch-Sequenz ab (z.B. durch Overscroll),
  // werten wir die zuletzt bekannte Position aus, damit das Einklappen dennoch
  // zuverlässig auslöst.
  const handleTouchCancel = () => {
    if (pullDownPx) setPullDownPx(0);
    const dy = lastTouchY.current - touchStartY.current;
    if (listExpanded && atTopAtStart.current && dy >= OVERSCROLL_COLLAPSE_PX) {
      setListExpanded(false);
    }
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

  // ── Listenkopf ("Aufgaben" etc.): nach oben wischen klappt die Liste auf ──
  const headerTouchX = useRef(0);
  const headerTouchY = useRef(0);
  const onHeaderTouchStart = (e) => {
    headerTouchX.current = e.touches[0].clientX;
    headerTouchY.current = e.touches[0].clientY;
  };
  const onHeaderTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - headerTouchX.current;
    const dy = e.changedTouches[0].clientY - headerTouchY.current;
    if (!listExpanded && dy <= -EXPAND_SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      setListExpanded(true);
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
    // Neues Design: der Typ-Tag wandert von hier oben in die Meta-Zeile
    // unter der Beschreibung (siehe renderCoverCat/renderCoverEntry).
    if (state.newDesign) return null;
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

    const TypeIcon = COVER_BADGE_ICONS[cat.type];
    const tagsBlock = state.newDesign ? (
      <div className="home-cover__tags home-cover__tags--plain">
        <span className="home-cover__tag-plain home-cover__tag-plain--type">
          {TypeIcon && <TypeIcon size={12} className="home-cover__tag-plain-icon" />}
          {fallbackTypeLabel}
        </span>
        <span className="home-cover__tag-plain home-cover__tag-plain--date">
          <Calendar size={12} className="home-cover__tag-plain-icon" />
          {cat.date ? fmtDate(cat.date, t.locale) : lang === "de" ? "Flexibel" : "Flexible"}
        </span>
        <button
          type="button"
          className={`home-cover__add-info-btn${cat.starred ? " home-cover__add-info-btn--active" : ""}`}
          aria-label={cat.starred ? (lang === "de" ? "Favorit entfernen" : "Unmark favorite") : (lang === "de" ? "Als Favorit markieren" : "Mark as favorite")}
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCat(cat.id, { starred: !cat.starred });
          }}
        >
          <Star size={16} strokeWidth={2} fill={cat.starred ? "currentColor" : "none"} />
        </button>
      </div>
    ) : (
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
    );

    if (state.newDesign) {
      return (
        <div className="home-cover__main" key={`cat-${cat.id}`}>
          <div className="home-cover__toprow">
            <div
              className="home-cover__leftcol"
              role="button"
              tabIndex={0}
              onClick={() => onOpenCat(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenCat(cat);
                }
              }}
            >
              <AutoScrollText as="h1" className="home-cover__header-title">{cat.name}</AutoScrollText>
              <p className="home-cover__desc">{cat.desc || cat.body || placeholderDesc}</p>
              {tagsBlock}
            </div>
            {renderAvatarArea()}
          </div>

          <button type="button" className="home-cover__open-btn" onClick={() => onOpenCat(cat)}>
            {openText}
          </button>

          {renderCoverDots()}
        </div>
      );
    }

    return (
      <div className="home-cover__main" key={`cat-${cat.id}`}>
        <div
          className="home-cover__primary-action"
          role="button"
          tabIndex={0}
          onClick={() => onOpenCat(cat)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenCat(cat);
            }
          }}
        >
          <div className="home-cover__copy">
            <AutoScrollText className="home-cover__title">{cat.name}</AutoScrollText>
            <p className="home-cover__desc">{cat.desc || cat.body || placeholderDesc}</p>
          </div>
          <div className="home-cover__meta">{tagsBlock}</div>
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

    const tagsBlock = state.newDesign ? (
      <div className="home-cover__tags home-cover__tags--plain">
        {cfg && (
          <span className="home-cover__tag-plain home-cover__tag-plain--type">
            <cfg.Icon size={12} className="home-cover__tag-plain-icon" />
            {typeLabel}
          </span>
        )}
        <span className="home-cover__tag-plain home-cover__tag-plain--date">
          <Calendar size={12} className="home-cover__tag-plain-icon" />
          {dateVal ? fmtDate(dateVal, t.locale) : lang === "de" ? "Flexibel" : "Flexible"}
        </span>
        <button
          type="button"
          className={`home-cover__add-info-btn${entry.starred ? " home-cover__add-info-btn--active" : ""}`}
          aria-label={entry.starred ? (lang === "de" ? "Favorit entfernen" : "Unmark favorite") : (lang === "de" ? "Als Favorit markieren" : "Mark as favorite")}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(entry.id);
          }}
        >
          <Star size={16} strokeWidth={2} fill={entry.starred ? "currentColor" : "none"} />
        </button>
      </div>
    ) : (
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
    );

    if (state.newDesign) {
      return (
        <div className="home-cover__main" key={`entry-${entry.id}`}>
          <div className="home-cover__toprow">
            <div
              className="home-cover__leftcol"
              role="button"
              tabIndex={0}
              onClick={() => onOpenEntry?.(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenEntry?.(entry);
                }
              }}
            >
              <AutoScrollText as="h1" className="home-cover__header-title">{entry.title}</AutoScrollText>
              <p className="home-cover__desc">
                {entry.note || entry.body || entry.desc || placeholderDesc}
              </p>
              {tagsBlock}
            </div>
            {renderAvatarArea()}
          </div>

          <button type="button" className="home-cover__open-btn" onClick={() => onOpenEntry?.(entry)}>
            {openText}
          </button>

          {renderCoverDots()}
        </div>
      );
    }

    return (
      <div className="home-cover__main" key={`entry-${entry.id}`}>
        <div
          className="home-cover__primary-action"
          role="button"
          tabIndex={0}
          onClick={() => onOpenEntry?.(entry)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenEntry?.(entry);
            }
          }}
        >
          <div className="home-cover__copy">
            <AutoScrollText className="home-cover__title">{entry.title}</AutoScrollText>
            <p className="home-cover__desc">
              {entry.note || entry.body || entry.desc || placeholderDesc}
            </p>
          </div>
          <div className="home-cover__meta">{tagsBlock}</div>
        </div>

        <button type="button" className="home-cover__open-btn" onClick={() => onOpenEntry?.(entry)}>
          {openText}
        </button>

        {renderCoverDots()}
      </div>
    );
  };

  // Avatar + Kollaboratoren rechts im Cover. Im alten Design Teil der eigenen
  // Header-Zeile (neben dem Badge), im neuen Design Teil der Content-Zeile
  // (neben Titel/Beschreibung/Tags).
  const renderAvatarArea = () => (
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
          className="home-cover__avatar-placeholder home-cover__avatar-placeholder--initials"
          onClick={() => avatarInputRef.current?.click()}
        >
          {getInitials(state.user.name)}
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
  );

  // Papierkorb-Ansicht (Filter "trash"): gelöschte Einträge/Kategorien des
  // aktiven Kontexts, neueste zuerst, mit Wiederherstellen-Aktion.
  const renderTrashList = () => {
    const ctxType = isEntryType
      ? { tasks: "task", notes: "note", calendar: "calendar" }[tab]
      : activeType;
    const items = (state.trash || [])
      .filter((it) =>
        isEntryType
          ? it.kind === "entry" && it.data.type === ctxType
          : it.kind === "cat" && it.data.type === ctxType
      )
      .sort((a, b) => b.deletedAt - a.deletedAt);
    if (items.length === 0) {
      return <div className="entry-list__empty">{t.trashEmpty}</div>;
    }
    return items.map((it) => (
      <div key={it.data.id} className="home-trash-item">
        <div className="home-trash-item__icon">
          <Trash2 size={18} />
        </div>
        <div className="home-trash-item__text">
          <div className="home-trash-item__title">{it.data.title || it.data.name}</div>
          <div className="home-trash-item__meta">{fmtRelative(it.deletedAt, t.locale)}</div>
        </div>
        <button
          className="home-trash-item__restore"
          onClick={() => onRestoreFromTrash?.(it.data.id)}
          aria-label={t.restore}
          title={t.restore}
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="home-trash-item__restore home-trash-item__purge"
          onClick={() => onPurgeTrashItem?.(it.data.id)}
          aria-label={t.deleteForever}
          title={t.deleteForever}
        >
          <Trash2 size={16} />
        </button>
      </div>
    ));
  };

  const renderTabList = () => {
    if (listFilter === "trash") return renderTrashList();
    // Archiviert-Filter: gleiche Logik wie der Archiv-Screen je Eintragstyp.
    const listEntries =
      listFilter === "archived"
        ? entries.filter((e) => {
            if (tab === "tasks") return e.type === "task" && (e.done || e.archived);
            if (tab === "notes") return e.type === "note" && (e.archived || e.done);
            return e.type === "calendar" && (isOld(e.date) || e.done || e.archived);
          })
        : tabEntries;
    if (listEntries.length === 0) {
      return (
        <div className="entry-list__empty">
          {listFilter === "archived" ? (
            <div className="entry-list__empty-title">{t.noneArchived}</div>
          ) : (
            <>
              <div className="entry-list__empty-title">{t.noEntries(tabCfg?.label)}</div>
              <div className="entry-list__empty-hint" style={{ color: tabColor }}>{t.doubleTapHint}</div>
            </>
          )}
        </div>
      );
    }

    const shared = {
      t,
      CC,
      entries: listEntries,
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

  const renderCatItem = (c) => (
    <HomeCatItem
      key={c.id}
      c={c}
      cats={cats}
      t={t}
      CC={CC}
      onOpenCat={onOpenCat}
      onUpdateCat={onUpdateCat}
      onTogglePin={(id) => togglePin(id, "cat")}
      onToggleVerified={toggleVerified}
      onTrash={trashCat}
    />
  );

  // Favoriten-Seite (neues Design): favorisierte Kategorien oben, danach
  // favorisierte Aufgaben/Notizen/Termine – jeweils ungruppiert in der
  // Akzentfarbe des Typs.
  const renderFavoritesList = () => {
    if (favCount === 0) {
      return <div className="entry-list__empty">{t.noFavorites}</div>;
    }
    const shared = { t, CC, cats, grouped: false, onOpenEntry, isHome: true };
    return (
      <>
        {favCats.map(renderCatItem)}
        {favTasks.length > 0 && (
          <TaskList
            {...shared}
            entries={favTasks}
            lang={lang}
            color="#0B8CE9"
            onToggle={toggleTask}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
            onDelete={deleteEntry}
          />
        )}
        {favNotes.length > 0 && (
          <NoteList
            {...shared}
            entries={favNotes}
            color="#F59E0B"
            onDelete={deleteEntry}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
            onArchiveEntry={onArchiveEntry}
          />
        )}
        {favCals.length > 0 && (
          <CalList
            {...shared}
            entries={favCals}
            lang={lang}
            color="#0078D4"
            onDelete={deleteEntry}
            onToggle={toggleTask}
            onToggleStar={toggleStar}
            onTogglePin={togglePin}
            onUpdateEntry={updateEntry}
          />
        )}
      </>
    );
  };

  // Lesezeichen-Seite (neues Design): alle Link-Einträge app-weit, unabhängig
  // von der Kategorie, in der sie liegen – neueste zuerst.
  const renderLinksList = () => {
    if (sortedLinks.length === 0) {
      return <div className="entry-list__empty">{t.noLink}</div>;
    }
    return <LinkList entries={sortedLinks} cats={cats} onDelete={deleteEntry} CC={CC} />;
  };

  // Tags-Seite (neues Design): ohne Auswahl eine flache, alphabetische Liste
  // aller Tags mit Trefferzahl; mit Auswahl die gefilterten aktiven Einträge
  // (Aufgaben/Notizen/Termine/Lesezeichen), die diesen Tag tragen.
  const renderTagsList = () => {
    if (selectedTag) {
      const hasTag = (e) => (e.tags || []).includes(selectedTag);
      const taggedTasks = entries.filter((e) => e.type === "task" && !e.archived && !e.done && hasTag(e));
      const taggedNotes = entries.filter((e) => e.type === "note" && !e.archived && !e.done && hasTag(e));
      const taggedCals = entries.filter((e) => e.type === "calendar" && !e.archived && !e.done && hasTag(e));
      const taggedLinks = entries.filter((e) => e.type === "link" && hasTag(e));
      if (taggedTasks.length + taggedNotes.length + taggedCals.length + taggedLinks.length === 0) {
        return <div className="entry-list__empty">{t.noTags}</div>;
      }
      const shared = { t, CC, cats, grouped: false, onOpenEntry, isHome: true };
      return (
        <>
          {taggedTasks.length > 0 && (
            <TaskList
              {...shared}
              entries={taggedTasks}
              lang={lang}
              color="#0B8CE9"
              onToggle={toggleTask}
              onToggleStar={toggleStar}
              onTogglePin={togglePin}
              onUpdateEntry={updateEntry}
              onDelete={deleteEntry}
            />
          )}
          {taggedNotes.length > 0 && (
            <NoteList
              {...shared}
              entries={taggedNotes}
              color="#F59E0B"
              onDelete={deleteEntry}
              onToggleStar={toggleStar}
              onTogglePin={togglePin}
              onUpdateEntry={updateEntry}
              onArchiveEntry={onArchiveEntry}
            />
          )}
          {taggedCals.length > 0 && (
            <CalList
              {...shared}
              entries={taggedCals}
              lang={lang}
              color="#0078D4"
              onDelete={deleteEntry}
              onToggle={toggleTask}
              onToggleStar={toggleStar}
              onTogglePin={togglePin}
              onUpdateEntry={updateEntry}
            />
          )}
          {taggedLinks.length > 0 && (
            <LinkList entries={taggedLinks} cats={cats} onDelete={deleteEntry} CC={CC} />
          )}
        </>
      );
    }
    if (allTagNames.length === 0) {
      return <div className="entry-list__empty">{t.noTags}</div>;
    }
    const countForTag = (name) =>
      entries.filter((e) => (e.tags || []).includes(name) && !e.archived && (e.type === "link" || !e.done)).length;
    return allTagNames.map((name) => (
      <div key={name} className="media-item" style={{ cursor: "pointer" }} onClick={() => setSelectedTag(name)}>
        <div className="media-item__icon" style={{ background: "#EC489922", color: "#EC4899" }}>
          <TagIcon size={18} />
        </div>
        <div className="media-item__body">
          <div className="media-item__title">{name}</div>
          <div className="media-item__meta">{t.entriesCount(countForTag(name))}</div>
        </div>
      </div>
    ));
  };

  // Inhalt der Liste je nach aktivem Typ:
  // Eintragstypen → bestehende Listen; PARA-Typen → einfache Kategorien-Liste.
  const renderActiveList = () => {
    if (activeType === "favorites") return renderFavoritesList();
    if (activeType === "links") return renderLinksList();
    if (activeType === "tags") return renderTagsList();
    if (isEntryType) return renderTabList();
    if (listFilter === "trash") return renderTrashList();
    const paraCats = cats.filter(
      (c) => c.type === activeType && (listFilter === "archived" ? c.archived : !c.archived)
    );
    if (paraCats.length === 0) {
      return (
        <div className="entry-list__empty">
          {listFilter === "archived" ? t.noneArchived : t.noCats(activeLabel)}
        </div>
      );
    }

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

  // Vorschau-Kachel des neuen Designs (Pendant zum Spotify-Mini-Player über der
  // Tab-Bar). Sie zeigt primär das ZULETZT GEÖFFNETE Element (Eintrag ODER
  // Kategorie, per lastOpenedAt) – so erscheint z.B. eine gerade geöffnete
  // Aufgabe nach der Rückkehr zur Startseite hier als Mini-Kachel. Bevor
  // überhaupt etwas geöffnet wurde (frisches Profil), bleibt die Zeile leer.
  // Als Zusatz-Trigger dient das Cover: wandert dessen "Öffnen"-Button beim
  // Hochscrollen aus dem Sichtbereich, wird ersatzweise das Cover-Element
  // gezeigt. Terminierte Elemente (Aufgabe due, Kalender/Cat date) zeigen ihr
  // Termindatum, alle anderen (Arbeitsbereiche, Notizen, …) das Erstellungsdatum.
  const nowItem = (() => {
    if (!state.newDesign) return null;
    // 1) Zuletzt geöffnetes Element über Kategorien UND Einträge bestimmen.
    let best = null;
    let bestKind = null;
    for (const c of cats) {
      if (!c.archived && c.lastOpenedAt && (!best || c.lastOpenedAt > best.lastOpenedAt)) {
        best = c;
        bestKind = "cat";
      }
    }
    for (const e of entries) {
      if (!e.archived && e.lastOpenedAt && (!best || e.lastOpenedAt > best.lastOpenedAt)) {
        best = e;
        bestKind = "entry";
      }
    }
    // 2) Fallback: nichts geöffnet, aber der Cover-"Öffnen"-Button ist beim
    //    Scrollen aus dem Blick gewandert → das Cover-Element anzeigen.
    if (!best && coverScrolledAway && currentCover) {
      best = currentCover.data;
      bestKind = currentCover.kind;
    }
    if (!best) return null;
    const isCat = bestKind === "cat";
    const terminDate = isCat ? best.date : best.type === "task" ? best.due : best.type === "calendar" ? best.date : null;
    const dateStr = terminDate
      ? fmtDate(terminDate, t.locale)
      : best.createdAt
        ? new Date(best.createdAt).toLocaleDateString(t.locale, { day: "numeric", month: "short" })
        : "";
    const prefix = terminDate
      ? lang === "de" ? "Terminiert" : "Due"
      : lang === "de" ? "Erstellt" : "Created";
    // Icon-Tint wie bei den Listeneinträgen (task-item__type-icon--cat):
    // Projekt/Bereich/Ressource nutzen ihre Kategoriefarbe, restliche
    // Eintragstypen dieselben Akzente wie ihr Dock-Icon (ENTRY_ACCENT_RGB).
    const accentColor = isCat
      ? (CC[best.type]?.color || "#7C7C82")
      : (ENTRY_ACCENT_RGB[best.type] ? `rgb(${ENTRY_ACCENT_RGB[best.type]})` : "#7C7C82");
    return {
      type: best.type,
      title: isCat ? best.name : best.title,
      dateLabel: dateStr ? `${prefix} · ${dateStr}` : prefix,
      accentColor,
      onOpen: () => (isCat ? onOpenCat?.(best) : onOpenEntry?.(best)),
    };
  })();

  return (
    <div className={`home home--${tab}`} ref={homeScrollRef}>
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
          {state.newDesign ? (
            currentCover ? (
              currentCat ? renderCoverCat(currentCat) : renderCoverEntry(currentEntry)
            ) : (
              <div className="home-cover__toprow">
                {renderEmptyCover()}
                {renderAvatarArea()}
              </div>
            )
          ) : (
            <>
              <div className="home-cover__header">
                <span className="home-cover__badge">{renderCoverBadge()}</span>
                {renderAvatarArea()}
              </div>
              {currentCover
                ? currentCat
                  ? renderCoverCat(currentCat)
                  : renderCoverEntry(currentEntry)
                : renderEmptyCover()}
            </>
          )}
        </div>
      </div>

      <div
        className={`home__list-container${listExpanded ? ' home__list-container--expanded' : ''}${pullDownPx > 0 ? ' home__list-container--pulling' : ''}`}
        style={listExpanded && pullDownPx > 0 ? { transform: `translateY(${pullDownPx}px)` } : undefined}
      >
        {/* Neues Design, eingeklappt: fester Abschnitt "Listen" mit Spotify-
            artigen Kacheln (Favoriten · Aufgaben · Notizen · Kalender) statt
            der eingeklappten Einzelliste. Tap auf eine Kachel öffnet die
            jeweilige Liste als eigene Seite (aufgeklappter Zustand). */}
        {!listExpanded && state.newDesign && (
          <>
            <div className="list-section__header list-section__header--static">
              <span className="list-section__label">{t.listsTitle}</span>
            </div>
            <div className="home-lists-grid">
              <button
                type="button"
                className="home-list-tile"
                onClick={() => {
                  handleSelectType("favorites");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon home-list-tile__icon--fav">
                  <Star size={18} fill="currentColor" strokeWidth={0} />
                </span>
                <span className="home-list-tile__label">{t.favorites}</span>
              </button>
              <button
                type="button"
                className="home-list-tile"
                style={{ "--tile-accent-rgb": "245, 158, 11" }}
                onClick={() => {
                  handleSelectType("notes");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon">
                  <Pencil size={18} />
                </span>
                <span className="home-list-tile__label">{t.notes}</span>
              </button>
              <button
                type="button"
                className="home-list-tile"
                onClick={() => {
                  handleSelectType("calendar");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon home-list-tile__icon--calendar">
                  <Calendar size={18} />
                </span>
                <span className="home-list-tile__label">{t.calendar}</span>
              </button>
              <button
                type="button"
                className="home-list-tile"
                style={{ "--tile-accent-rgb": "11, 140, 233" }}
                onClick={() => {
                  handleSelectType("tasks");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon">
                  <CheckCircle2 size={18} />
                </span>
                <span className="home-list-tile__label">{t.tasks}</span>
              </button>
              <button
                type="button"
                className="home-list-tile"
                style={{ "--tile-accent-rgb": "124, 58, 237" }}
                onClick={() => {
                  handleSelectType("links");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon">
                  <BookmarkIcon size={18} />
                </span>
                <span className="home-list-tile__label">{t.bookmarks}</span>
              </button>
              <button
                type="button"
                className="home-list-tile"
                style={{ "--tile-accent-rgb": "236, 72, 153" }}
                onClick={() => {
                  handleSelectType("tags");
                  setListExpanded(true);
                }}
              >
                <span className="home-list-tile__icon">
                  <TagIcon size={18} />
                </span>
                <span className="home-list-tile__label">{t.tagsLabel}</span>
              </button>
            </div>

            {/* Spotify-„Deine Shows"-Prinzip: horizontal scrollbare App-Cover
                für die begleitenden Tools (Übersetzer, Flashcards) sowie eine
                ausgegraute Vorschau auf das kommende ParaWorld. */}
            <div className="list-section__header list-section__header--static home-apps__header">
              <span className="list-section__label">{t.appsTitle}</span>
            </div>
            <div className="home-apps">
              <button
                type="button"
                className="home-app-card"
                style={{ "--app-accent-rgb": "11, 140, 233" }}
                onClick={() => onOpenTranslator?.()}
              >
                <span className="home-app-card__cover">
                  <Languages size={34} strokeWidth={1.8} />
                </span>
                <span className="home-app-card__title">{t.apps.translator.title}</span>
                <span className="home-app-card__desc">{t.apps.translator.desc}</span>
              </button>
              <button
                type="button"
                className="home-app-card"
                style={{ "--app-accent-rgb": "245, 158, 11" }}
                onClick={() => onOpenFlashcards?.()}
              >
                <span className="home-app-card__cover">
                  <Layers size={34} strokeWidth={1.8} />
                </span>
                <span className="home-app-card__title">{t.apps.flashcards.title}</span>
                <span className="home-app-card__desc">{t.apps.flashcards.desc}</span>
              </button>
              <div
                className="home-app-card home-app-card--soon"
                style={{ "--app-accent-rgb": "124, 58, 237" }}
                aria-disabled="true"
              >
                <span className="home-app-card__cover">
                  <Gamepad2 size={34} strokeWidth={1.8} />
                  <span className="home-app-card__soon-badge">
                    <Lock size={11} strokeWidth={2.4} />
                    {t.comingSoon}
                  </span>
                </span>
                <span className="home-app-card__title">{t.apps.paraworld.title}</span>
                <span className="home-app-card__desc">{t.apps.paraworld.desc}</span>
              </div>
            </div>
          </>
        )}

        {/* Eingeklappt: Titel · Aufklappen · Archiv im Section-Header.
            Aufgeklappt: Zuklappen + Archiv wandern als schwebende Glas-Buttons nach unten. */}
        {!listExpanded && !state.newDesign && (
          <div
            className="list-section__header"
            onTouchStart={onHeaderTouchStart}
            onTouchEnd={onHeaderTouchEnd}
          >
            <div
              className="list-section__header-left list-section__header-left--clickable"
              role="button"
              tabIndex={0}
              onClick={() => setListExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setListExpanded(true);
                }
              }}
            >
              <span className="list-section__label">{activeLabel}</span>
              <span className="list-section__expand" aria-hidden="true">
                <ChevronRight size={20} />
              </span>
            </div>
            {/* Archiv & Papierkorb – klappen die Liste auf und aktivieren
                direkt die passende Filter-Pille (kein Screen-Wechsel). */}
            <div className="list-section__header-actions">
              <button
                className="list-section__archive"
                onClick={() => {
                  setListFilter("archived");
                  setListExpanded(true);
                }}
                aria-label={t.archive}
              >
                <Archive size={20} />
              </button>
              <button
                className="list-section__archive list-section__archive--trash"
                onClick={() => {
                  setListFilter("trash");
                  setListExpanded(true);
                }}
                aria-label={t.trash}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Aufgeklappt: Filter-Pillen zwischen Header und Liste –
            Aktiv · Archiviert · Papierkorb (kontextbezogen, kein Screen-Wechsel). */}
        {listExpanded && activeType !== "favorites" && activeType !== "links" && activeType !== "tags" && (
          <div className="home__list-filters">
            <button
              className={`home__filter-pill${listFilter === "active" ? " home__filter-pill--active" : ""}`}
              onClick={() => setListFilter("active")}
            >
              {t.activeFilter || "Aktiv"}
            </button>
            <button
              className={`home__filter-pill${listFilter === "archived" ? " home__filter-pill--active" : ""}`}
              onClick={() => setListFilter("archived")}
            >
              <Archive size={13} strokeWidth={2.2} />
              {t.archivedLabel || "Archiviert"}
            </button>
            <button
              className={`home__filter-trash${listFilter === "trash" ? " home__filter-trash--active" : ""}`}
              onClick={() => setListFilter("trash")}
              aria-label={t.trash}
            >
              <Trash2 size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {activeGroupHeader && isEntryType && listFilter === "active" && (
          <div className="task-group-header task-group-header--fixed">
            <span className="task-group-header__left">{activeGroupHeader.left}</span>
            {activeGroupHeader.count && <span className="task-group-header__badge">{activeGroupHeader.count}</span>}
            <span className="task-group-header__right">{activeGroupHeader.right}</span>
          </div>
        )}

        {activeType === "tags" && selectedTag && (
          <div className="task-group-header task-group-header--fixed">
            <span
              className="task-group-header__left"
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedTag(null)}
            >
              <ChevronLeft size={14} style={{ marginRight: 4 }} />
              {t.tagsLabel}
            </span>
            <span className="task-group-header__right">{selectedTag}</span>
          </div>
        )}

        {/* Neues Design, eingeklappt: das Kachel-Grid ersetzt die Listen-
            Vorschau komplett – die Entry-Liste erscheint erst aufgeklappt. */}
        {!(state.newDesign && !listExpanded) && (
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
        )}

        {/* Aufgeklappt: schlichter Chevron mittig über der Dock-Eingabezeile
            zum Zuklappen (ersetzt die früheren Glas-Buttons unten links/rechts). */}
        {listExpanded && (
          <button
            className={`home__collapse-chevron${dockTyping ? " home__collapse-chevron--typing" : ""}`}
            onClick={() => setListExpanded(false)}
            aria-label={t.closeBtn}
          >
            <ChevronDown size={26} strokeWidth={2.4} />
          </button>
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

      {progressOpen && (
        <ProgressOverlay
          t={t}
          lang={lang}
          light={state.theme === "light"}
          entries={entries}
          cats={cats}
          onOpenEntry={(id) => {
            setProgressOpen(false);
            onOpenEntry({ id });
          }}
          onOpenCat={(id) => {
            setProgressOpen(false);
            onOpenCat({ id });
          }}
          onClose={() => setProgressOpen(false)}
        />
      )}

      {/* Neues Design (Settings-Toggle): Spotify-artige Tab-Leiste statt
          des CommandDocks – Startseite · Suchen · Projekte · Arbeitsbereiche ·
          Ressourcen mit ausgeschriebenen Labels. */}
      {!progressOpen && state.newDesign && (
        <NewDesignNav
          t={t}
          active="home"
          onHome={() => setListExpanded(false)}
          onOpenSearch={onOpenSearch}
          onOpenCatType={onOpenCatType}
          onAdd={() => onAddEntry()}
          onOpenVoice={() => setVoiceOverlayOpen(true)}
          nowItem={nowItem}
        />
      )}

      {/* Bei offenem Fortschritts-Overlay weicht das Dock dem schwebenden
          Home-Button des Overlays. */}
      {!progressOpen && !state.newDesign && (
        <CommandDock
          t={t}
          activeType={activeType}
          onSelectType={handleSelectType}
          onSubmit={onQuickCreate}
          canToggleList
          listExpanded={listExpanded}
          onToggleList={() => setListExpanded((v) => !v)}
          onHome={() => setListExpanded(false)}
          // Tipp-Session im Dock (Feld fokussiert + Tastatur sichtbar):
          // Liste im Hintergrund maximieren, damit man beim Erfassen die
          // vorhandenen Einträge sieht. Der URSPRUNG entscheidet, was nach
          // dem Zuklappen der Tastatur passiert: War die Liste vorher zu
          // (Startseite), klappt sie wieder zu; hatte der Nutzer sie selbst
          // aufgeklappt, bleibt sie offen.
          onInputFocusChange={(typing) => {
            setDockTyping(typing);
            if (typing) {
              if (!listExpanded) {
                expandedByTypingRef.current = true;
                setListExpanded(true);
              }
            } else {
              if (expandedByTypingRef.current) setListExpanded(false);
              expandedByTypingRef.current = false;
            }
          }}
          onOpenProgress={() => setProgressOpen(true)}
          onOpenSearch={onOpenSearch}
          onOpenVoice={() => setVoiceOverlayOpen(true)}
          onMenu={() => setDockMenuOpen(true)}
        />
      )}

      {dockMenuOpen && (
        <DockMenuSheet
          t={t}
          cats={cats}
          entries={entries}
          onOpenCat={onOpenCat}
          onOpenEntry={onOpenEntry}
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
          supportsDate={voiceSupportsDate}
          lang={lang}
          onTranscribed={(title, date) => {
            if (isEntryType) onAddVoiceEntry(title, date);
            else onQuickCreate(activeType, title, date);
            setVoiceOverlayOpen(false);
          }}
          onClose={() => setVoiceOverlayOpen(false)}
        />
      )}
    </div>
  );
}
