import { useState, useRef, useEffect } from "react";
import { ChevronLeft, FileText, Square } from "lucide-react";
import { I18N, getCC, getTABS } from "./i18n";
import { usePersistedState } from "./hooks/useStorage";
import {
  uid,
  TODAY,
  isOld,
  getNextBirthday,
  ID_BIRTHDAYS,
  SEED,
  computeNotif,
} from "./utils";
import { CatListScreen, CatDetailScreen } from "./screens/FolderScreens";
import { EntryDetailScreen } from "./screens/EntryDetailScreen";
import { CommandPanel } from "./components/CommandPanel";
import { HomeScreen } from "./screens/HomeScreen";
import { ArchiveScreen } from "./screens/ArchiveScreen";
import { CreateModal } from "./modals/CreateModal";
import { NewCatModal } from "./modals/NewCatModal";
import { OnboardingModal } from "./modals/OnboardingModal";
import { SettingsModal } from "./modals/SettingsModal";
import { TaskDoneCelebration, BirthdayCelebration } from "./modals/Celebrations";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { DesktopApp } from "./desktop/DesktopApp";
import "./App.scss";

const SWIPE_BACK_DX_PX = 75;
const SWIPE_BACK_START_PX = 45;
const SWIPE_PANEL_OPEN_PX = 80;
const SWIPE_PANEL_CLOSE_PX = -60;
const SWIPE_AXIS_TOLERANCE_PX = 50;
const HAPTIC_TASK_DONE_PATTERN = [30, 50, 30];
// Papierkorb: nach 30 Tagen werden gelöschte Items endgültig entfernt.
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const VIEW = {
  HOME: "home",
  ARCHIVE: "archive",
  CAT_LIST: "catList",
  CAT_DETAIL: "catDetail",
  ENTRY_DETAIL: "entryDetail",
};

const DEFAULT_COVER_ACCENT_RGB = "224, 62, 62";
const VOICE_ENTRY_BASE = { starred: false, catId: null, catIds: [], tags: [] };

/**
 * One-time migrations to keep older persisted state compatible
 * with the current data model (birthday folder, tags, catIds, createdAt).
 */
function migrateState(state) {
  let dirty = false;
  const next = { ...state };

  if (!next.cats.find((c) => c.id === ID_BIRTHDAYS)) {
    next.cats = [
      ...next.cats,
      {
        id: ID_BIRTHDAYS,
        type: "resource",
        name: "Geburtstage",
        date: null,
        body: "Alle Geburtstage aus dem Kalender.",
        tags: ["System"],
        relatedId: null,
      },
    ];
    dirty = true;
  }

  if (!next.tags) {
    const tagMap = new Map();
    next.cats.forEach((c) =>
      c.tags?.forEach((tagName) => {
        if (!tagMap.has(tagName)) {
          tagMap.set(tagName, { id: uid(), name: tagName, createdAt: new Date().toISOString() });
        }
      })
    );
    next.tags = Array.from(tagMap.values());
    dirty = true;
  }

  if (!next.entries) next.entries = [];

  next.entries = next.entries.map((e) => {
    if (!e.catIds) {
      dirty = true;
      return { ...e, catIds: e.catId ? [e.catId] : [] };
    }
    return e;
  });

  next.cats = next.cats.map((c) => {
    if (!c.createdAt) {
      dirty = true;
      return { ...c, createdAt: new Date().toISOString() };
    }
    return c;
  });

  next.cats = next.cats.map((c) => {
    if (!c.collaborators) {
      dirty = true;
      return { ...c, collaborators: [] };
    }
    return c;
  });

  next.entries = next.entries.map((e) => {
    let patched = e;
    if (!Array.isArray(patched.linkedEntryIds)) {
      dirty = true;
      patched = { ...patched, linkedEntryIds: [] };
    }
    if (patched.parentId === undefined) {
      dirty = true;
      patched = { ...patched, parentId: null };
    }
    return patched;
  });

  // Papierkorb: Array sicherstellen und Items > 30 Tage endgültig entfernen.
  if (!Array.isArray(next.trash)) {
    next.trash = [];
    dirty = true;
  } else {
    const cutoff = Date.now() - TRASH_TTL_MS;
    const kept = next.trash.filter((it) => (it.deletedAt ?? 0) > cutoff);
    if (kept.length !== next.trash.length) {
      next.trash = kept;
      dirty = true;
    }
  }

  return dirty ? next : state;
}

function buildVoiceEntry(tab, title, date) {
  if (tab === "notes") {
    return { type: "note", title, body: "", ...VOICE_ENTRY_BASE };
  }
  if (tab === "calendar") {
    return {
      type: "calendar",
      title,
      date: date || TODAY,
      time: "",
      isBirthday: false,
      ...VOICE_ENTRY_BASE,
    };
  }
  return { type: "task", title, due: date || TODAY, done: false, ...VOICE_ENTRY_BASE };
}

function NotFoundScreen({ Icon, iconColor, onBack }) {
  return (
    <div className="cat-detail">
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          <Icon size={18} color={iconColor} />
          <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
            Eintrag nicht gefunden
          </div>
        </div>
      </div>
      <div className="nav-bottom">
        <button className="nav-bottom__back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState, isLoaded] = usePersistedState(SEED);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (isLoaded) setState(migrateState);
  }, [isLoaded, setState]);

  // Theme-Klasse auf <body> spiegeln, damit per Portal an body gehängte Overlays
  // (Aktions-Bottom-Sheet, Papierkorb) das Light-Theme erben.
  useEffect(() => {
    document.body.classList.toggle("light-theme", state.theme === "light");
  }, [state.theme]);

  const [stack, setStack] = useState([{ view: VIEW.HOME }]);
  const [tab, setTab] = useState("tasks");
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(null);
  const [newCatType, setNewCatType] = useState(null);
  const [expandedCat, setExpandedCat] = useState("project");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationBirthday, setCelebrationBirthday] = useState(null);
  const [coverAccentRgb, setCoverAccentRgb] = useState(DEFAULT_COVER_ACCENT_RGB);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  // Header-Titel der Startseite: null → "Startseite"; beim Aufklappen der Liste → aktiver Typ-Titel
  const [homeHeaderTitle, setHomeHeaderTitle] = useState(null);

  const theme = state.theme || "light";
  const lang = state.lang || "de";
  const t = I18N[lang];
  const CC = getCC(t);
  const TABS = getTABS(t);

  const push = (view) => setStack((s) => [...s, view]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const getArchiveCount = (archiveTab) => {
    if (["project", "area", "resource"].includes(archiveTab)) {
      return state.cats.filter((c) => c.type === archiveTab && c.archived).length;
    }
    if (archiveTab === "tasks") return state.entries.filter((e) => e.type === "task" && e.done).length;
    if (archiveTab === "calendar")
      return state.entries.filter((e) => e.type === "calendar" && (isOld(e.date) || e.done)).length;
    if (archiveTab === "notes")
      return state.entries.filter((e) => e.type === "note" && e.archived).length;
    return 0;
  };

  // Wenn das Archiv nach dem Dearchivieren leer ist, überspringen wir es im Back-Stack.
  const handleSmartBack = () => {
    const prev = stack[stack.length - 2];
    if (prev && prev.view === VIEW.ARCHIVE && getArchiveCount(prev.tab || tab) === 0) {
      setStack((s) => (s.length > 2 ? s.slice(0, -2) : [{ view: VIEW.HOME }]));
      return;
    }
    pop();
  };

  const cur = stack[stack.length - 1];

  /* ── tag mutations ─────────────────────────────────────────── */
  const updateGlobalTag = (id, newName) => {
    setState((s) => {
      const tag = s.tags?.find((tg) => tg.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      return {
        ...s,
        tags: s.tags.map((tg) => (tg.id === id ? { ...tg, name: newName } : tg)),
        cats: s.cats.map((c) =>
          c.tags?.includes(oldName)
            ? { ...c, tags: c.tags.map((old) => (old === oldName ? newName : old)) }
            : c
        ),
      };
    });
  };

  const deleteGlobalTag = (id) => {
    setState((s) => {
      const tag = s.tags?.find((tg) => tg.id === id);
      if (!tag) return s;
      const oldName = tag.name;
      return {
        ...s,
        tags: s.tags.filter((tg) => tg.id !== id),
        cats: s.cats.map((c) =>
          c.tags?.includes(oldName) ? { ...c, tags: c.tags.filter((old) => old !== oldName) } : c
        ),
      };
    });
  };

  const createGlobalTag = (name) => {
    setState((s) => {
      const alreadyExists = s.tags?.some((tg) => tg.name.toLowerCase() === name.toLowerCase());
      if (alreadyExists) return s;
      const newTag = { id: uid(), name, createdAt: new Date().toISOString() };
      return { ...s, tags: [...(s.tags || []), newTag] };
    });
  };

  /* ── entity mutations ──────────────────────────────────────── */
  const addCat = (type, name) =>
    setState((s) => ({
      ...s,
      cats: [
        ...s.cats,
        {
          id: uid(),
          type,
          name,
          date: null,
          body: "",
          tags: [],
          relatedId: null,
          archived: false,
          collaborators: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }));

  const updateCat = (id, patch) =>
    setState((s) => ({
      ...s,
      cats: s.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  // Löschen = in den Papierkorb verschieben (nicht endgültig). Auto-Purge nach
  // 30 Tagen läuft beim App-Start (migrateState).
  const deleteCat = (id) => {
    setState((s) => {
      const cat = s.cats.find((c) => c.id === id);
      if (!cat) return s;
      return {
        ...s,
        cats: s.cats.filter((c) => c.id !== id),
        trash: [...(s.trash || []), { kind: "cat", deletedAt: Date.now(), data: cat }],
      };
    });
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
        entries: [...s.entries, { id: newId, createdAt: Date.now(), linkedEntryIds: [], parentId: null, ...entry }],
      };
    });

  const toggleTask = (id) =>
    setState((s) => {
      const entry = s.entries.find((e) => e.id === id);
      const isNowDone = !entry?.done;
      if (isNowDone && !entry?.isBirthday) {
        setShowCelebration(true);
        navigator.vibrate?.(HAPTIC_TASK_DONE_PATTERN);
      }
      return {
        ...s,
        entries: s.entries.map((e) => (e.id === id ? { ...e, done: !e.done } : e)),
      };
    });

  const toggleStar = (id) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
    }));

  const updateEntry = (id, patch) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if (patch.catId !== undefined) {
          next.catIds = patch.catId ? [patch.catId] : [];
        }
        return next;
      }),
    }));

  // Löschen = in den Papierkorb verschieben. Referenzen (Links/Subtasks) der
  // verbleibenden Einträge werden bereinigt; bei Wiederherstellung werden sie
  // nicht automatisch neu verknüpft (bewusst vereinfacht).
  const deleteEntry = (id) =>
    setState((s) => {
      const entry = s.entries.find((e) => e.id === id);
      const remaining = s.entries
        .filter((e) => e.id !== id)
        .map((e) => {
          let patched = e;
          if (patched.linkedEntryIds?.includes(id)) {
            patched = { ...patched, linkedEntryIds: patched.linkedEntryIds.filter((lid) => lid !== id) };
          }
          if (patched.parentId === id) {
            patched = { ...patched, parentId: null };
          }
          return patched;
        });
      return {
        ...s,
        entries: remaining,
        trash: entry ? [...(s.trash || []), { kind: "entry", deletedAt: Date.now(), data: entry }] : s.trash,
      };
    });

  /* ── Papierkorb: Wiederherstellen / endgültig löschen ──────── */
  const restoreFromTrash = (dataId) =>
    setState((s) => {
      const item = (s.trash || []).find((it) => it.data?.id === dataId);
      if (!item) return s;
      const trash = s.trash.filter((it) => it.data?.id !== dataId);
      if (item.kind === "cat") return { ...s, trash, cats: [...s.cats, item.data] };
      return { ...s, trash, entries: [...s.entries, item.data] };
    });

  const purgeTrashItem = (dataId) =>
    setState((s) => ({ ...s, trash: (s.trash || []).filter((it) => it.data?.id !== dataId) }));

  const emptyTrash = () => setState((s) => ({ ...s, trash: [] }));

  /* ── Fixieren (Pin): pro Liste/Typ nur ein Item ───────────── */
  const togglePin = (id, kind = "entry") =>
    setState((s) => {
      const coll = kind === "cat" ? "cats" : "entries";
      const target = s[coll].find((x) => x.id === id);
      if (!target) return s;
      const turningOn = !target.pinned;
      return {
        ...s,
        [coll]: s[coll].map((x) => {
          if (x.id === id) return { ...x, pinned: turningOn };
          // Beim Anpinnen jedes andere Item derselben Liste (gleicher Typ) lösen
          if (turningOn && x.type === target.type && x.pinned) return { ...x, pinned: false };
          return x;
        }),
      };
    });

  /* ── Verifizieren (nur Ressourcen) ────────────────────────── */
  const toggleVerified = (id) =>
    setState((s) => ({
      ...s,
      cats: s.cats.map((c) => (c.id === id ? { ...c, verified: !c.verified } : c)),
    }));

  const linkEntries = (idA, idB) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => {
        if (e.id === idA && !e.linkedEntryIds?.includes(idB)) {
          return { ...e, linkedEntryIds: [...(e.linkedEntryIds || []), idB] };
        }
        if (e.id === idB && !e.linkedEntryIds?.includes(idA)) {
          return { ...e, linkedEntryIds: [...(e.linkedEntryIds || []), idA] };
        }
        return e;
      }),
    }));

  const unlinkEntries = (idA, idB) =>
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => {
        if (e.id === idA) {
          return { ...e, linkedEntryIds: (e.linkedEntryIds || []).filter((lid) => lid !== idB) };
        }
        if (e.id === idB) {
          return { ...e, linkedEntryIds: (e.linkedEntryIds || []).filter((lid) => lid !== idA) };
        }
        return e;
      }),
    }));

  const addLinkedEntry = (entry, linkToEntryId) =>
    setState((s) => {
      const newId = uid();
      if (entry.type === "calendar" && entry.isBirthday) {
        setCelebrationBirthday({ ...entry, id: newId });
      }
      return {
        ...s,
        entries: [
          ...s.entries.map((e) =>
            e.id === linkToEntryId
              ? { ...e, linkedEntryIds: [...(e.linkedEntryIds || []), newId] }
              : e
          ),
          { id: newId, createdAt: Date.now(), linkedEntryIds: [linkToEntryId], parentId: null, ...entry },
        ],
      };
    });

  const addSubtask = (entry, parentEntryId) =>
    setState((s) => {
      const newId = uid();
      return {
        ...s,
        entries: [
          ...s.entries,
          { id: newId, createdAt: Date.now(), linkedEntryIds: [], parentId: parentEntryId, ...entry },
        ],
      };
    });

  const notif = computeNotif(state.entries);

  /* ── swipe-back & panel gestures ───────────────────────────── */
  const touchX = useRef(0);
  const touchY = useRef(0);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;

    if (
      dx > SWIPE_BACK_DX_PX &&
      touchX.current < SWIPE_BACK_START_PX &&
      stack.length > 1 &&
      !panelOpen
    ) {
      pop();
      return;
    }

    if (dy > SWIPE_PANEL_OPEN_PX && Math.abs(dx) < SWIPE_AXIS_TOLERANCE_PX && !panelOpen) {
      // Bei aufgeklappter Home-Liste die Swipe-down-Geste NICHT zum Öffnen des
      // Panels nutzen – das Panel öffnet erst wieder bei zugeklappter Liste.
      if (cur.view === VIEW.HOME && document.querySelector(".home__list-container--expanded")) {
        return;
      }
      const scrollEl = findScrollContainer(cur.view, e.target);
      if (scrollEl === false) return; // textarea not at top
      if (!scrollEl || scrollEl.scrollTop <= 0) {
        setPanelOpen(true);
      }
    }

    if (dy < SWIPE_PANEL_CLOSE_PX && Math.abs(dx) < SWIPE_AXIS_TOLERANCE_PX && panelOpen) {
      const isBackdrop = e.target.classList.contains("command-panel__backdrop");
      const inList = e.target.closest(".command-panel__list");
      const listEl = document.querySelector(".command-panel__list");

      const listScrolledToBottom =
        !listEl || listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight <= 1;
      if (isBackdrop || !inList || listScrolledToBottom) {
        setPanelOpen(false);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <div className="loading__text">PARA·LIST</div>
      </div>
    );
  }

  const renderRootModals = () => (
    <>
      {settingsOpen && (
        <SettingsModal
          t={t}
          lang={lang}
          setLang={(l) => setState((s) => ({ ...s, lang: l }))}
          theme={theme}
          setTheme={(th) => setState((s) => ({ ...s, theme: th }))}
          user={state.user}
          onUpdateUser={(patch) =>
            setState((s) => ({ ...s, user: { ...s.user, ...patch } }))
          }
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {state.user.name === "" && (
        <OnboardingModal
          onComplete={(l, n) =>
            setState((s) => ({ ...s, lang: l, user: { ...s.user, name: n } }))
          }
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
            if (creating.linkToEntryId) {
              addLinkedEntry(entry, creating.linkToEntryId);
            } else if (creating.parentEntryId) {
              addSubtask(entry, creating.parentEntryId);
            } else {
              addEntry(entry);
            }
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
          count={state.entries.filter((e) => e.type === "task" && e.done).length}
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
    </>
  );

  // ── Desktop branch: HOME view renders the 3-column layout ──
  if (isDesktop && cur.view === VIEW.HOME) {
    const desktopCtx = {
      t,
      lang,
      CC,
      theme,
      state,
      push,
      mutations: {
        toggleTask,
        updateCat,
        addCatModal: (type) => setNewCatType(type),
        addEntryModal: (type) => setCreating({ type, catId: null }),
      },
      openSettings: () => setSettingsOpen(true),
      openArchive: (archiveTab) => push({ view: VIEW.ARCHIVE, tab: archiveTab }),
      focusTab: (focusedTab) => setTab(focusedTab),
    };
    return (
      <div className={theme === "light" ? "light-theme" : ""}>
        <DesktopApp ctx={desktopCtx} />
        {renderRootModals()}
      </div>
    );
  }

  return (
    <div
      className={`app ${theme === "light" ? "light-theme" : ""}`}
      style={cur.view === VIEW.HOME ? { "--cover-accent-rgb": coverAccentRgb } : undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <CommandPanel
        t={t}
        title={cur.view === VIEW.HOME ? homeHeaderTitle : null}
        lang={lang}
        setLang={(l) => setState((s) => ({ ...s, lang: l }))}
        theme={theme}
        setTheme={(th) => setState((s) => ({ ...s, theme: th }))}
        user={state.user}
        notif={notif}
        entries={state.entries}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTask={toggleTask}
        onOpenEntry={(e) => push({ view: VIEW.ENTRY_DETAIL, entryId: e.id })}
        voiceOverlayOpen={voiceOverlayOpen}
      />

      {panelOpen && (
        <div className="command-panel__backdrop" onClick={() => setPanelOpen(false)} />
      )}

      <div className={`main-content ${cur.view === VIEW.HOME ? `main-content--${tab}` : ""}`}>
        {cur.view === VIEW.HOME && (
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
            onOpenCatType={(type) => push({ view: VIEW.CAT_LIST, type })}
            onOpenCat={(cat) => push({ view: VIEW.CAT_DETAIL, catId: cat.id })}
            onQuickCreate={(type, title) => {
              setPanelOpen(false);
              if (type === "project" || type === "area" || type === "resource") {
                addCat(type, title);
              } else {
                addEntry(buildVoiceEntry(type, title));
              }
            }}
            onAddEntry={(type) => {
              setPanelOpen(false);
              const entryType = type || (tab === "tasks" ? "task" : tab === "notes" ? "note" : "calendar");
              setCreating({ type: entryType, catId: null });
            }}
            onAddVoiceEntry={(title, date) => addEntry(buildVoiceEntry(tab, title, date))}
            toggleTask={toggleTask}
            toggleStar={toggleStar}
            togglePin={(id) => togglePin(id, "entry")}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
            onOpenEntry={(e) => push({ view: VIEW.ENTRY_DETAIL, entryId: e.id })}
            onOpenArchive={(currentTab) => {
              setPanelOpen(false);
              push({ view: VIEW.ARCHIVE, tab: currentTab });
            }}
            onArchiveEntry={(id) => updateEntry(id, { archived: true })}
            onUpdateUser={(patch) =>
              setState((s) => ({ ...s, user: { ...s.user, ...patch } }))
            }
            onUpdateCat={updateCat}
            voiceOverlayOpen={voiceOverlayOpen}
            setVoiceOverlayOpen={setVoiceOverlayOpen}
            onHeaderTitleChange={setHomeHeaderTitle}
          />
        )}

        {cur.view === VIEW.ARCHIVE && (
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
            onOpenEntry={(e) => push({ view: VIEW.ENTRY_DETAIL, entryId: e.id })}
            onRestoreNote={(id) => updateEntry(id, { archived: false })}
            onOpenCat={(c) => push({ view: VIEW.CAT_DETAIL, catId: c.id })}
            onQuickCreate={(type, title) => {
              if (type === "project" || type === "area" || type === "resource") {
                addCat(type, title);
              } else {
                addEntry(buildVoiceEntry(type, title));
              }
            }}
            onAddVoiceEntry={(type, title, date) => addEntry(buildVoiceEntry(type, title, date))}
            onHome={() => setStack([{ view: VIEW.HOME }])}
          />
        )}

        {cur.view === VIEW.CAT_LIST && (
          <CatListScreen
            t={t}
            CC={CC}
            type={cur.type}
            cats={state.cats.filter((c) => c.type === cur.type && !c.archived)}
            onOpen={(cat) => push({ view: VIEW.CAT_DETAIL, catId: cat.id })}
            onAdd={() => setNewCatType(cur.type)}
            onBack={pop}
            onOpenArchive={(type) => push({ view: VIEW.ARCHIVE, tab: type })}
          />
        )}

        {cur.view === VIEW.CAT_DETAIL && (() => {
          const cat = state.cats.find((c) => c.id === cur.catId);
          if (!cat) {
            return (
              <NotFoundScreen Icon={Square} iconColor={CC.resource.color} onBack={pop} />
            );
          }

          const childIds = state.cats.filter((c) => c.relatedId === cat.id).map((c) => c.id);
          const inclusiveEntries = state.entries
            .filter((e) => {
              const ids = e.catIds || (e.catId ? [e.catId] : []);
              const isBaseEntry = ids.includes(cat.id) || ids.some((id) => childIds.includes(id));
              if (cat.id === ID_BIRTHDAYS) {
                return isBaseEntry || (e.type === "calendar" && e.isBirthday);
              }
              return isBaseEntry;
            })
            .map((e) => {
              if (cat.id === ID_BIRTHDAYS && e.type === "calendar" && e.isBirthday) {
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
            });

          return (
            <CatDetailScreen
              t={t}
              CC={CC}
              theme={theme}
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
                if (window.confirm(t.confirmDelete(cat.name))) deleteCat(cat.id);
              }}
              onBack={handleSmartBack}
              onHome={() => setStack([{ view: VIEW.HOME }])}
              toggleTask={toggleTask}
              deleteEntry={deleteEntry}
              onAddEntry={(type) => setCreating({ type, catId: cat.id })}
              onOpenCat={(resCat) => push({ view: VIEW.CAT_DETAIL, catId: resCat.id })}
              onOpenEntry={(e) => push({ view: VIEW.ENTRY_DETAIL, entryId: e.id })}
            />
          );
        })()}

        {cur.view === VIEW.ENTRY_DETAIL && (() => {
          const entry = state.entries.find((e) => e.id === cur.entryId);
          if (!entry) {
            return <NotFoundScreen Icon={FileText} iconColor="#5858A0" onBack={pop} />;
          }
          const cat = state.cats.find((c) => c.id === entry.catId);
          return (
            <EntryDetailScreen
              t={t}
              CC={CC}
              theme={theme}
              lang={lang}
              entry={entry}
              cat={cat}
              allCats={state.cats}
              onUpdate={(p) => updateEntry(entry.id, p)}
              onDelete={() => {
                deleteEntry(entry.id);
                pop();
              }}
              onBack={handleSmartBack}
              entries={state.entries}
              onOpenEntry={(e) => push({ view: VIEW.ENTRY_DETAIL, entryId: e.id })}
              toggleTask={toggleTask}
              deleteEntry={deleteEntry}
              onAddLinkedEntry={(type) => setCreating({ type, catId: entry.catIds?.[0] || null, linkToEntryId: entry.id })}
              onAddSubtask={() => setCreating({ type: "task", catId: entry.catIds?.[0] || null, parentEntryId: entry.id })}
              onUnlinkEntry={(linkedId) => unlinkEntries(entry.id, linkedId)}
              tags={state.tags}
              onCreateTag={createGlobalTag}
              onUpdateTag={updateGlobalTag}
              onDeleteTag={deleteGlobalTag}
            />
          );
        })()}
      </div>

      {renderRootModals()}
    </div>
  );
}

// Findet das scrollbare Element je nach aktivem View. Gibt `false` zurück,
// wenn das Panel NICHT geöffnet werden darf (z.B. Textarea ist nicht oben).
function findScrollContainer(view, target) {
  if (view === VIEW.HOME) return document.querySelector(".entry-list");
  if (view === VIEW.CAT_LIST) return document.querySelector(".cat-list__body");
  if (view === VIEW.CAT_DETAIL || view === VIEW.ENTRY_DETAIL) {
    const textarea = target.closest?.(".cat-detail__textarea");
    if (textarea && textarea.scrollTop > 0) return false;
    return document.querySelector(".cat-detail__body");
  }
  return null;
}
