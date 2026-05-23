import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Cover } from "./Cover";
import { ListArea } from "./ListArea";
import { Rail } from "./Rail";
import { TweaksPanel } from "./TweaksPanel";
import { useTweaks, TWEAK_DEFAULTS } from "./useTweaks";
import { buildActivityState } from "./activity";

/**
 * DesktopApp wires the existing data + mutation context (passed via `ctx`)
 * into the desktop layout primitives. State that is *only* meaningful on
 * desktop (sidebar/rail open, active cat type selection, search query) is
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

  // Sidebar/Rail open state is owned by the Tweaks panel so it can be set
  // both via the in-layout toggle buttons and the dev panel.
  const sidebarExpanded = tweaks.sidebarOpen;
  const railOpen = tweaks.railVisible;
  const setSidebarExpanded = (v) =>
    setTweaks({ sidebarOpen: typeof v === "function" ? v(sidebarExpanded) : v });
  const setRailOpen = (v) =>
    setTweaks({ railVisible: typeof v === "function" ? v(railOpen) : v });

  // ⌘1–4 swaps category in sidebar
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const map = { 1: "project", 2: "area", 3: "resource", 4: "archive" };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      if (next === "archive") {
        ctx.openArchive("tasks");
      } else {
        setActiveCatType(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  const activity = useMemo(
    () => buildActivityState({ entries: state.entries, cats: state.cats, lang }),
    [state.entries, state.cats, lang]
  );

  const activeCats = state.cats.filter((c) => c.type === activeCatType && !c.archived);
  const firstCat = activeCats[0] || null;

  const appClass = [
    "dsk-app",
    sidebarExpanded ? "dsk-app--sidebar-expanded" : "",
    railOpen ? "" : "dsk-app--rail-collapsed",
    theme === "light" ? "dsk-app--light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClass}>
      <Sidebar
        t={t}
        expanded={sidebarExpanded}
        activeCat={activeCatType}
        onSelectCat={setActiveCatType}
        onOpenArchive={() => ctx.openArchive("tasks")}
        onCreateNew={() => mutations.addCatModal(activeCatType)}
        onToggle={() => setSidebarExpanded((v) => !v)}
      />

      <main className="dsk-main">
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
          onFocusTab={(tab) => ctx.focusTab(tab)}
        />
      </main>

      {railOpen ? (
        <Rail
          t={t}
          lang={lang}
          expanded
          activity={activity}
          onToggle={() => setRailOpen(false)}
          onOpenSettings={ctx.openSettings}
          onOpenProfile={ctx.openSettings}
          user={state.user}
        />
      ) : (
        <Rail
          t={t}
          lang={lang}
          expanded={false}
          activity={activity}
          onToggle={() => setRailOpen(true)}
          onOpenSettings={ctx.openSettings}
          onOpenProfile={ctx.openSettings}
          user={state.user}
        />
      )}

      <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />
    </div>
  );
}
