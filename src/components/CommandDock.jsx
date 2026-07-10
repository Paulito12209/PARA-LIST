import { useState, useRef, useEffect } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Home, MoreHorizontal, ArrowUp, Search } from "lucide-react";
import { DockKeyboardBar } from "./DockKeyboardBar";
import { LinkSheet } from "./LinkSheet";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { blurActiveInput } from "../utils";

// Audio-/Spracheingabe-Icon: 5 vertikale Wellen-Striche in unterschiedlicher Höhe
// (ersetzt das Mikrofon-Icon – wirkt wie ein Equalizer / Herzschlag-Wellen)
function AudioWaveIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3"    y1="8"  x2="3"    y2="16" />
      <line x1="7.5"  y1="4"  x2="7.5"  y2="20" />
      <line x1="12"   y1="9"  x2="12"   y2="15" />
      <line x1="16.5" y1="6"  x2="16.5" y2="18" />
      <line x1="21"   y1="7"  x2="21"   y2="17" />
    </svg>
  );
}

// PARA + Eintragstypen für die untere Eingabeleiste.
// Aufgaben ist standardmäßig aktiv und als einziges farbig hervorgehoben.
const DOCK_TYPES = [
  { id: "project", Icon: Circle, color: "#E03E3E" },
  { id: "area", Icon: Triangle, color: "#D09020" },
  { id: "resource", Icon: Square, color: "#30A060" },
  { id: "tasks", Icon: CheckCircle2, color: "#0B8CE9" },
  { id: "notes", Icon: Pencil, color: "#F59E0B" },
  // Kalender nutzt theme-aware Akzent (Dark Mode aufgehellt)
  { id: "calendar", Icon: Calendar, color: "var(--cal-accent)" },
];

const SINGULAR_KEY = {
  project: "projectSing",
  area: "areaSing",
  resource: "resourceSing",
  tasks: "task",
  notes: "note",
  calendar: "calSing",
};

const ENTRY_TYPES = ["tasks", "notes", "calendar"];
const EMPTY_DRAFT = { date: null, time: null, catIds: [], tags: [], photo: null };

// `leadingAction` steuert den linken Button:
//   "list" (Default, Startseite) → Pokal-Button (Trophy) in den Desktop-Rail-
//   Farben; öffnet das Fortschritts-Overlay (onOpenProgress), das das Dock
//   ersetzt und über seinen eigenen Home-Button geschlossen wird.
//   "home" (Detailseiten)        → normales Glas mit Home-Icon, navigiert
//   zur Startseite (onHome).
// `canToggleList`: auf der Startseite klappt ein 2. Tap auf das bereits aktive
// Typ-Icon die Liste auf/zu (onToggleList).
// `cats`/`CC`/`allTags` (optional): aktivieren die Tastatur-Aktionsleiste
// (Datum · Verknüpfen · Tag · Kamera) über der iOS-Tastatur.
export function CommandDock({ t, CC, cats, allTags, activeType, onSelectType, onSubmit, onToggleList, canToggleList = false, listExpanded = false, onOpenVoice, onMenu, onHome, onOpenProgress, onOpenSearch, leadingAction = "list" }) {
  const [value, setValue] = useState("");
  // Metadaten des entstehenden Eintrags (aus der Tastatur-Aktionsleiste).
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [popover, setPopover] = useState(null); // null | "date" | "tag"
  const [linkOpen, setLinkOpen] = useState(false);
  // Leiste sichtbar, solange das Dock-Eingabefeld (oder ein Feld der Leiste
  // selbst, z.B. das Datumsfeld) den Fokus hält. Kurzer Timeout überbrückt
  // den Fokuswechsel zwischen den Feldern.
  const [barActive, setBarActive] = useState(false);
  const blurTimer = useRef(null);
  const inputRef = useRef(null);
  const photoInputRef = useRef(null);
  const kbHeight = useKeyboardHeight();

  const isHomeScreen = leadingAction === "list";
  const isEntryType = ENTRY_TYPES.includes(activeType);
  const active = DOCK_TYPES.find((d) => d.id === activeType) || DOCK_TYPES[3];
  const placeholder = t.addPlaceholder(t[SINGULAR_KEY[activeType]] || "");

  const hasText = value.trim().length > 0;

  const markFocus = () => {
    clearTimeout(blurTimer.current);
    setBarActive(true);
  };
  const markBlur = () => {
    // Leiste zu → offene Popover mit schließen.
    blurTimer.current = setTimeout(() => {
      setBarActive(false);
      setPopover(null);
    }, 120);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // Typwechsel: gesammelte Metadaten passen nicht zwingend zum neuen Typ →
  // Draft zurücksetzen (Anpassung in der Render-Phase, kein Effect nötig).
  const [prevType, setPrevType] = useState(activeType);
  if (activeType !== prevType) {
    setPrevType(activeType);
    setDraft(EMPTY_DRAFT);
    setPopover(null);
  }

  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    const extras = {
      time: draft.time || undefined,
      catIds: draft.catIds?.length ? draft.catIds : undefined,
      tags: draft.tags?.length ? draft.tags : undefined,
      photo: draft.photo || undefined,
    };
    onSubmit(activeType, title, draft.date || undefined, extras);
    setValue("");
    setDraft(EMPTY_DRAFT);
    setPopover(null);
  };

  const collapseKeyboard = () => {
    clearTimeout(blurTimer.current);
    setBarActive(false);
    setPopover(null);
    blurActiveInput();
  };

  // Verknüpfen: Sheet öffnen und Tastatur einklappen, damit das Bottom-Sheet
  // frei liegt. Das Sheet lebt im Dock (nicht in der Leiste) und übersteht so
  // das Ausblenden der Leiste.
  const openLinkSheet = () => {
    setLinkOpen(true);
    collapseKeyboard();
  };

  const pickPhoto = () => photoInputRef.current?.click();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) patchDraft({ photo: file });
    e.target.value = "";
    // Zurück ins Eingabefeld (die Kamera/Auswahl hat die Tastatur geschlossen).
    inputRef.current?.focus();
  };

  // Welche Aktions-Buttons zeigt die Leiste für den aktiven Typ?
  const barButtons = {
    date: isEntryType || activeType === "project",
    link: isEntryType && !!cats && !!CC,
    tag: !!allTags?.length,
    camera: isEntryType,
  };
  const showKbBar = barActive && (barButtons.date || barButtons.link || barButtons.tag || barButtons.camera);

  return (
    <div className="command-dock" style={{ "--dock-accent": active.color }}>
      {/* Eingabezeile ZUERST – die Typ-Icons liegen darunter. */}
      <div className="command-dock__input-row">
        {/* Der Pokal-Button ist in den Header gewandert; auf Nicht-Startseiten
            bleibt der Home-Button als führende Aktion erhalten. */}
        {!isHomeScreen && (
          <button
            className="command-dock__icon-btn command-dock__list-btn"
            onClick={() => onHome?.()}
            aria-label={t.home || "Startseite"}
          >
            <Home size={20} />
          </button>
        )}
        {/* Eingabeleiste als Pille: Such-Icon links, Textfeld, Audio-/Senden-
            Button rechts innen. data-keep-focus: Taps auf die Buttons in der
            Pille beenden den Fokus nicht automatisch (Senden hält die
            Tastatur für schnelles Nacheinander-Erfassen offen). */}
        <div className="command-dock__input-wrap" data-keep-focus="true">
          {onOpenSearch && (
            <button
              className="command-dock__icon-btn command-dock__input-action command-dock__search-btn"
              onClick={() => {
                blurActiveInput();
                onOpenSearch();
              }}
              aria-label={t.searchTitle || "Suchen"}
            >
              <Search size={19} />
            </button>
          )}
          <input
            ref={inputRef}
            className="command-dock__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={markFocus}
            onBlur={markBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={placeholder}
            enterKeyHint="done"
          />
          <button
            className={`command-dock__icon-btn command-dock__input-action ${hasText ? "command-dock__send-btn" : "command-dock__voice-btn"}`}
            onMouseDown={(e) => {
              // Senden darf den Fokus nicht klauen – Tastatur bleibt offen.
              if (hasText) e.preventDefault();
            }}
            onClick={() => {
              if (hasText) {
                submit();
              } else {
                blurActiveInput();
                onOpenVoice(activeType);
              }
            }}
            aria-label={hasText ? "Senden" : "Spracheingabe"}
          >
            {hasText ? <ArrowUp size={20} /> : <AudioWaveIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Typ-Icons UNTER dem Eingabefeld. */}
      <div className="command-dock__types">
        {DOCK_TYPES.map((d) => {
          const Icon = d.Icon;
          const isActive = d.id === activeType;
          // Glow erscheint nur, wenn das aktive Icon getappt wurde und die Liste
          // dadurch aufgeklappt ist (nur auf der Startseite relevant).
          const isGlowing = isActive && canToggleList && listExpanded;
          return (
            <button
              key={d.id}
              className={`command-dock__type ${isActive ? "command-dock__type--active" : ""}${isGlowing ? " command-dock__type--glow" : ""}`}
              style={isActive ? { color: d.color, "--type-color": d.color } : undefined}
              onClick={() => {
                // 2. Tap auf das bereits aktive Icon (nur Startseite) → Liste auf/zu
                if (canToggleList && isActive) onToggleList?.();
                else onSelectType(d.id);
              }}
              title={t[SINGULAR_KEY[d.id]]}
            >
              <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
            </button>
          );
        })}

        {/* 7. Icon: Menü – öffnet das Dock-Bottom-Sheet (u.a. Papierkorb) */}
        <button className="command-dock__menu" onClick={onMenu} aria-label="Menü">
          <span className="command-dock__menu-circle">
            <MoreHorizontal size={14} />
          </span>
        </button>
      </div>

      {/* Verstecktes Foto-Feld (Kamera/Fotoauswahl der Aktionsleiste). Lebt im
          Dock, damit die Auswahl auch nach dem Ausblenden der Leiste ankommt. */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Aktionsleiste über der iOS-Tastatur (Apple-Reminders-Stil). */}
      {showKbBar && (
        <DockKeyboardBar
          t={t}
          accent={active.color}
          kbHeight={kbHeight}
          draft={draft}
          onPatchDraft={patchDraft}
          popover={popover}
          onTogglePopover={(name) => setPopover((p) => (p === name ? null : name))}
          allTags={allTags}
          show={barButtons}
          onOpenLink={openLinkSheet}
          onPickPhoto={pickPhoto}
          onCollapse={collapseKeyboard}
          onFieldFocus={markFocus}
          onFieldBlur={markBlur}
        />
      )}

      {/* Kategorie-Verknüpfung für den entstehenden Eintrag. */}
      {linkOpen && (
        <LinkSheet
          currentIds={draft.catIds}
          cats={cats}
          CC={CC}
          t={t}
          onConfirm={(nextIds) => {
            patchDraft({ catIds: nextIds });
            setLinkOpen(false);
            inputRef.current?.focus();
          }}
          onClose={() => setLinkOpen(false)}
        />
      )}
    </div>
  );
}
