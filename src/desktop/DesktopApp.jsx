import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeft, Circle, Triangle, Square, Archive, Search, ChevronLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Cover } from "./Cover";
import { ListArea } from "./ListArea";
import { Rail } from "./Rail";
import { useTweaks, TWEAK_DEFAULTS } from "./useTweaks";
import { buildActivityState, typeLabel } from "./activity";

const PEEK_CLOSE_DELAY = 180;

const CAT_TYPE_ICON = { project: Circle, area: Triangle, resource: Square };

function QuickSwitch({ cats, lang, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [sel, setSel] = useState(0);

  // Zuletzt geöffnete zuerst; nie geöffnete danach (nach Erstelldatum)
  const sorted = useMemo(() => {
    const active = cats.filter((c) => !c.archived);
    active.sort((a, b) => {
      const ao = a.lastOpenedAt || 0;
      const bo = b.lastOpenedAt || 0;
      if (ao !== bo) return bo - ao;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return active;
  }, [cats]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [sorted, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [query]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.children[sel];
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const handleKey = useCallback((e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && filtered[sel]) { e.preventDefault(); onSelect(filtered[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }, [filtered, sel, onSelect, onClose]);

  return (
    <div className="dsk-qswitch__backdrop" onClick={onClose}>
      <div className="dsk-qswitch" onClick={(e) => e.stopPropagation()}>
        <div className="dsk-qswitch__input-row">
          <Search size={16} strokeWidth={2} className="dsk-qswitch__search-icon" />
          <input
            ref={inputRef}
            className="dsk-qswitch__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === "de" ? "Seite öffnen…" : lang === "es" ? "Abrir página…" : "Open page…"}
          />
        </div>
        <ul className="dsk-qswitch__list" ref={listRef}>
          {filtered.length === 0 && (
            <li className="dsk-qswitch__empty">
              {lang === "de" ? "Keine Ergebnisse" : lang === "es" ? "Sin resultados" : "No results"}
            </li>
          )}
          {filtered.map((cat, i) => {
            const Icon = CAT_TYPE_ICON[cat.type] || Archive;
            const color = cat.type === "project" ? "var(--cat-project)"
              : cat.type === "area" ? "var(--cat-area)"
              : cat.type === "resource" ? "var(--cat-resource)"
              : "var(--text-3)";
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  className={`dsk-qswitch__item${i === sel ? " dsk-qswitch__item--active" : ""}`}
                  onClick={() => onSelect(cat)}
                  onPointerEnter={() => setSel(i)}
                >
                  <span className="dsk-qswitch__item-icon" style={{ color }}>
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                  <span className="dsk-qswitch__item-name">{cat.name}</span>
                  <span className="dsk-qswitch__item-type">{typeLabel(cat.type, lang)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * DesktopApp wires the existing data + mutation context (passed via `ctx`)
 * into the desktop layout primitives. State that is *only* meaningful on
 * desktop (sidebar mode, active cat type selection, search query) is
 * owned here. Anything related to entries/cats is delegated upward.
 */
export function DesktopApp({ ctx }) {
  const { t, lang, CC, theme, state, mutations, push, pop, detailCatId } = ctx;

  const [tweaks, setTweaks] = useTweaks({
    ...TWEAK_DEFAULTS,
    theme: theme === "light" ? "light" : "dark",
  });
  const [activeCatType, setActiveCatType] = useState("project");
  const [peeking, setPeeking] = useState(false);
  const [qswitchOpen, setQswitchOpen] = useState(false);
  const peekTimer = useRef(null);
  const mainRef = useRef(null);

  // Reveal the header's frosted-glass backdrop only once content scrolls
  // underneath it — at the very top the hero stays clean. Toggled
  // imperatively to avoid a re-render on every scroll frame.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      el.classList.toggle("dsk-main--scrolled", el.scrollTop > 8);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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

  // ⌘1–4 — open & scroll to section in tree  |  ⌘K — quick switch
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setQswitchOpen((v) => !v);
        return;
      }

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

  // Detail-Modus: eine konkrete Cat-Seite wird im Main-Bereich angezeigt
  // (Sidebar + Rail bleiben sichtbar). Fällt auf HOME zurück, wenn die
  // Cat nicht (mehr) existiert.
  const detailCat = detailCatId
    ? state.cats.find((c) => c.id === detailCatId) || null
    : null;

  const coverCat = detailCat || firstCat;
  const coverCatType = detailCat ? detailCat.type : activeCatType;

  // Im Detail-Modus zeigt der Main-Bereich nur die Einträge dieser Cat
  const visibleEntries = useMemo(() => {
    if (!detailCat) return state.entries;
    return state.entries.filter((e) => {
      const ids = e.catIds && e.catIds.length ? e.catIds : (e.catId ? [e.catId] : []);
      return ids.includes(detailCat.id);
    });
  }, [state.entries, detailCat]);

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
    if (cat.id === detailCatId) return; // schon geöffnet
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
        activeCatId={detailCat?.id}
        onOpenCat={openCat}
        onOpenEntry={openEntry}
        onAddCat={(type) => mutations.addCatModal(type)}
        user={state.user}
        onOpenSettings={ctx.openSettings}
        onToggleMode={() => setSidebarMode((m) => (m === "locked" ? "hidden" : "locked"))}
        onToggleCatStar={toggleCatStar}
        onSectionMenu={() => { /* TODO: open section menu */ }}
        onPointerEnter={sidebarMode === "hidden" ? openPeek : undefined}
        onPointerLeave={sidebarMode === "hidden" ? schedulePeekClose : undefined}
      />

      <main className="dsk-main" ref={mainRef}>
        {sidebarMode === "hidden" && !peeking && (
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
          onOpenSettings={ctx.openSettings}
        />

        {detailCat && (
          <button
            type="button"
            className="dsk-main__back"
            onClick={pop}
            aria-label={lang === "en" ? "Back" : "Zurück"}
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
            {lang === "en" ? "Back" : lang === "es" ? "Atrás" : "Zurück"}
          </button>
        )}

        <Cover
          t={t}
          lang={lang}
          activeCatType={coverCatType}
          cats={state.cats}
          firstCat={coverCat}
          detail={!!detailCat}
          onOpenCat={openCat}
          onUpdateCat={mutations.updateCat}
          onAddCat={(type) => mutations.addCatModal(type)}
        />

        <ListArea
          t={t}
          lang={lang}
          CC={CC}
          entries={visibleEntries}
          cats={state.cats}
          onOpenEntry={(e) => push({ view: "entryDetail", entryId: e.id })}
          toggleTask={mutations.toggleTask}
          onAddEntry={(type) => mutations.addEntryModal(type)}
        />
      </main>

      <Rail
        t={t}
        lang={lang}
        light={theme === "light"}
        expanded={railOpen}
        activity={activity}
        onToggle={() => setRailOpen((v) => !v)}
        onOpenEntry={(entryId) => push({ view: "entryDetail", entryId })}
        onOpenCat={(catId) => {
          const cat = state.cats.find((c) => c.id === catId);
          if (cat) setActiveCatType(cat.type || activeCatType);
          push({ view: "catDetail", catId });
        }}
      />

      {qswitchOpen && (
        <QuickSwitch
          cats={state.cats}
          lang={lang}
          onSelect={(cat) => { setQswitchOpen(false); openCat(cat); }}
          onClose={() => setQswitchOpen(false)}
        />
      )}
    </div>
  );
}
