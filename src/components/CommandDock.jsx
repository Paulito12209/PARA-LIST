import { useState, useRef, useEffect } from "react";
import { Circle, Triangle, Square, CheckCircle2, Pencil, Calendar, Home, MoreHorizontal, ArrowUp, Search } from "lucide-react";
import { useKeyboardOpen, useKeyboardHeight } from "../hooks/useKeyboardHeight";
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

// `leadingAction` steuert den linken Button:
//   "list" (Default, Startseite) → Pokal-Button (Trophy) in den Desktop-Rail-
//   Farben; öffnet das Fortschritts-Overlay (onOpenProgress), das das Dock
//   ersetzt und über seinen eigenen Home-Button geschlossen wird.
//   "home" (Detailseiten)        → normales Glas mit Home-Icon, navigiert
//   zur Startseite (onHome).
// `canToggleList`: auf der Startseite klappt ein 2. Tap auf das bereits aktive
// Typ-Icon die Liste auf/zu (onToggleList).
// `onInputFocusChange(typing)`: informiert die Seite über eine aktive
// Tipp-Session (Eingabefeld fokussiert UND Tastatur sichtbar) – die
// Startseite maximiert damit die Liste im Hintergrund.
export function CommandDock({ t, activeType, onSelectType, onSubmit, onToggleList, canToggleList = false, listExpanded = false, onOpenVoice, onMenu, onHome, onOpenProgress, onOpenSearch, onInputFocusChange, leadingAction = "list" }) {
  const [value, setValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const blurTimer = useRef(null);
  const isHomeScreen = leadingAction === "list";
  const active = DOCK_TYPES.find((d) => d.id === activeType) || DOCK_TYPES[3];
  const placeholder = t.addPlaceholder(t[SINGULAR_KEY[activeType]] || "");

  const hasText = value.trim().length > 0;

  // Tipp-Session = Feld fokussiert UND Tastatur sichtbar. Nur dann weicht die
  // Typ-Icon-Reihe (über der Tastatur bleibt allein die Eingabezeile).
  // Fokus allein reicht nicht: der Android-System-Chevron schließt die
  // Tastatur, OHNE das Feld zu bluren – der Dock muss dann wieder komplett
  // (inkl. Icon-Reihe) dastehen.
  const kbOpen = useKeyboardOpen();
  const typing = inputFocused && kbOpen;

  // iOS Safari: Die Tastatur ÜBERLAGERT das Layout (der Viewport schrumpft
  // nicht wie auf Android mit interactive-widget=resizes-content). kbHeight
  // ist dort > 0 und hebt das Dock per `bottom` über die Tastatur; auf
  // Android bleibt kbHeight 0 (innerHeight schrumpft mit) → kein Effekt.
  const kbHeight = useKeyboardHeight();

  // Safaris Auto-Panning zurücksetzen: Weil das Dock ursprünglich hinter der
  // Tastatur liegt, scrollt iOS die ganze Seite hoch, um das fokussierte Feld
  // freizulegen – Header und maximierte Liste wandern dabei aus dem Bild.
  // Sobald das Dock über der Tastatur schwebt, ist das Panning unnötig und
  // wird auf 0 zurückgedreht (auch bei nachträglichen Scroll-Anläufen).
  useEffect(() => {
    if (!(typing && kbHeight > 0)) return undefined;
    const pin = () => window.scrollTo(0, 0);
    pin();
    window.addEventListener("scroll", pin);
    window.visualViewport?.addEventListener("scroll", pin);
    return () => {
      window.removeEventListener("scroll", pin);
      window.visualViewport?.removeEventListener("scroll", pin);
    };
  }, [typing, kbHeight]);

  // Tastaturhöhe als CSS-Variable fürs Layout (z.B. Padding der maximierten
  // Liste, damit die untersten Einträge nicht hinter der Tastatur liegen).
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--kb-inset",
      kbHeight > 0 ? `${kbHeight}px` : "0px"
    );
    return () => document.documentElement.style.setProperty("--kb-inset", "0px");
  }, [kbHeight]);

  const markFocus = () => {
    clearTimeout(blurTimer.current);
    setInputFocused(true);
  };
  const markBlur = () => {
    // Kurzer Timeout überbrückt Fokus-Wechsel (z.B. Tap auf Senden-Button).
    blurTimer.current = setTimeout(() => setInputFocused(false), 120);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // Tipp-Session-Wechsel an die Seite melden (nur echte Übergänge).
  const prevTyping = useRef(false);
  useEffect(() => {
    if (typing !== prevTyping.current) {
      prevTyping.current = typing;
      onInputFocusChange?.(typing);
    }
  }, [typing, onInputFocusChange]);

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onSubmit(activeType, title);
    setValue("");
  };

  return (
    <div
      className={`command-dock${kbHeight > 0 ? " command-dock--kb" : ""}`}
      style={{
        "--dock-accent": active.color,
        // iOS: direkt auf der Tastatur-Oberkante aufsetzen
        bottom: kbHeight > 0 ? kbHeight : undefined,
      }}
    >
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
            className="command-dock__input"
            // type="search": Suchfelder stuft Chrome als NICHT autofillbar
            // ein – zusammen mit autocomplete="off" verschwinden die Android-
            // Autofill-Chips (Passwörter/Karten/Adresse) über der Tastatur.
            // autocomplete="off" allein reicht dort nicht.
            type="search"
            name="quick-add-title"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={markFocus}
            onBlur={markBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={placeholder}
            enterKeyHint="done"
            autoComplete="off"
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

      {/* Typ-Icons UNTER dem Eingabefeld. Bei sichtbarer Tastatur ausgeblendet –
          über der Tastatur bleibt nur die Eingabezeile sichtbar. */}
      <div className={`command-dock__types${typing ? " command-dock__types--hidden" : ""}`}>
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
    </div>
  );
}
