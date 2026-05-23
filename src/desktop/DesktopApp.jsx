import { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Cover } from "./Cover";
import { ListArea } from "./ListArea";
import { Rail } from "./Rail";
import { useTweaks, TWEAK_DEFAULTS } from "./useTweaks";
import { buildActivityState } from "./activity";

const PEEK_CLOSE_DELAY = 180; // ms — debounce before auto-closing the hover overlay

/**
 * DesktopApp wires the existing data + mutation context (passed via `ctx`)
 * into the desktop layout primitives. State that is *only* meaningful on
 * desktop (sidebar mode, active cat type selection, search query) is
 * owned here. Anything related to entries/cats is delegated upward.
 */
export function DesktopApp({ ctx }) {
  const { t, lang, CC, theme, state, mutations, push } = ctx;

  const [tweaks, setTweaks] = useTweaks({
    ...TWEAK_DEFAULTS,
    theme: theme === "light" ? "light" : "dark",
  });
  const [activeCatType, setActiveCatType] = useState("project");
  const [searchValue, setSearchValue] = useState("");
  const [peeking, setPeeking] = useState(false);
  const peekTimer = useRef(null);

  const sidebarMode = tweaks.sidebarMode || "locked";
  const treeOpen = tweaks.sidebarTreeOpen || TWEAK_DEFAULTS.sidebarTreeOpen;
  const catOpen = tweaks.sidebarCatOpen || {};
  const railOpen = tweaks.railVisible;

  const setSidebarMode = (m) =>
    setTweaks({ sidebarMode: typeof m === "function" ? m(sidebarMode) : m });
  const setRailOpen = (v) =>
    setTweaks({ railVisible: typeof v === "function" ? v(railOpen) : v });

  const toggleSection = (sectionId) => {
    const next = { ...treeOpen, [sectionId]: !treeOpen[sectionId] };
    setTweaks({ sidebarTreeOpen: next });
  };
  const toggleCat = (catId) => {
    const next = { ...catOpen, [catId]: !catOpen[catId] };
    setTweaks({ sidebarCatOpen: next });
  };

  const openPeek = () => {
    if (peekTimer.current) {
      clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
    setPeeking(true);
  };
  const schedulePeekClose = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeeking(false), PEEK_CLOSE_DELAY);
  };

  // Close peek when mode flips to locked
  useEffect(() => {
    if (sidebarMode === "locked") setPeeking(false);
  }, [sidebarMode]);

  // ⌘1–4 — open & scroll to section in tree
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const map = { 1: "project", 2: "area", 3: "resource", 4: "archive" };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      setActiveCatType(next === "archive" ? "project" : next);
      setTweaks({ sidebarTreeOpen: { ...treeOpen, [next]: true } });
      if (sidebarMode === "hidden") openPeek();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [treeOpen, sidebarMode]);

  const activity = useMemo(
    () => buildActivityState({ entries: state.entries, cats: state.cats, lang }),
    [state.entries, state.cats, lang]
  );

  const activeCats = state.cats.filter((c) => c.type === activeCatType && !c.archived);
  const firstCat = activeCats[0] || null;

  const appClass = [
    "dsk-app",
    `dsk-app--sidebar-${sidebarMode}`,
    sidebarMode === "hidden" && peeking ? "dsk-app--sidebar-peek" : "",
    railOpen ? "" : "dsk-app--rail-collapsed",
    theme === "light" ? "dsk-app--light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const openCat = (cat) => {
    setActiveCatType(cat.type || activeCatType);
    push({ view: "catDetail", catId: cat.id });
  };
  const openEntry = (entry) => push({ view: "entryDetail", entryId: entry.id });
  const toggleCatStar = (catId, nextValue) =>
    mutations.updateCat(catId, { starred: nextValue });

  return (
    <div className={appClass}>
      {sidebarMode === "hidden" && (
        <div
          className="dsk-hover-zone"
          aria-hidden="true"
          onPointerEnter={openPeek}
          onPointerLeave={schedulePeekClose}
        />
      )}

      <Sidebar
        t={t}
        mode={sidebarMode}
        peeking={peeking}
        treeOpen={treeOpen}
        catOpen={catOpen}
        onToggleSection={toggleSection}
        onToggleCat={toggleCat}
        cats={state.cats}
        entries={state.entries}
        onOpenCat={openCat}
        onOpenEntry={openEntry}
        onAddCat={(type) => mutations.addCatModal(type)}
        onOpenSettings={ctx.openSettings}
        onToggleMode={() => setSidebarMode((m) => (m === "locked" ? "hidden" : "locked"))}
        onToggleCatStar={toggleCatStar}
        onSectionMenu={() => { /* TODO: open section menu */ }}
        onPointerEnter={sidebarMode === "hidden" ? openPeek : undefined}
        onPointerLeave={sidebarMode === "hidden" ? schedulePeekClose : undefined}
      />

      <main className="dsk-main">
        {sidebarMode === "hidden" && (
          <button
            type="button"
            className="dsk-main__sidebar-toggle"
            onClick={() => setSidebarMode("locked")}
            title="Sidebar einblenden"
            aria-label="Sidebar einblenden"
          >
            <PanelLeft size={18} strokeWidth={2} />
          </button>
        )}

        <Header
          userName={state.user?.name || tweaks.userName}
          lang={lang}
          railOpen={railOpen}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onOpenSettings={ctx.openSettings}
        />

        <Cover
          t={t}
          lang={lang}
          activeCatType={activeCatType}
          cats={state.cats}
          firstCat={firstCat}
          onOpenCat={(cat) => push({ view: "catDetail", catId: cat.id })}
          onOpenCatType={(type) => push({ view: "catList", type })}
          onUpdateCat={mutations.updateCat}
          onAddCat={(type) => mutations.addCatModal(type)}
        />

        <ListArea
          t={t}
          lang={lang}
          CC={CC}
          entries={state.entries}
          cats={state.cats}
          onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
          toggleTask={mutations.toggleTask}
          onAddEntry={(type) => mutations.addEntryModal(type)}
        />
      </main>

      <Rail
        t={t}
        lang={lang}
        expanded={railOpen}
        activity={activity}
        onToggle={() => setRailOpen((v) => !v)}
        onOpenSettings={ctx.openSettings}
        onOpenEntry={(entryId) => push({ view: "entryDetail", entryId })}
        onOpenCat={(catId) => push({ view: "catDetail", catId })}
      />

    </div>
  );
}
