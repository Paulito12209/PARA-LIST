import { useEffect, useRef, useState } from "react";
import { ChevronRight, Check, CheckCircle2, Trophy } from "lucide-react";
import { fmtDate } from "../utils";
import { XP_BY_TYPE } from "../desktop/activity";

// Begrüßungs-Popup beim App-Start – im Stil der Spotify-Media-Card aus der
// Android-Benachrichtigungszentrale: slidet von der Oberkante rein, füllt
// ~3/4 des Bildschirms und empfiehlt das aktuelle Fokus-Projekt (beim ersten
// Start das mitgelieferte "Onboarding"-Projekt).

const GREET_WORDS = {
  de: ["Guten Morgen", "Guten Tag", "Guten Abend"],
  en: ["Good morning", "Good afternoon", "Good evening"],
  es: ["Buenos días", "Buenas tardes", "Buenas noches"],
};

const LEAD_WORDS = {
  de: "Das steht als Nächstes an",
  en: "Up next for you",
  es: "Lo próximo para ti",
};

const OPEN_WORDS = { de: "Öffnen", en: "Open", es: "Abrir" };

const TASK_LEAD_WORDS = {
  de: "Die erste Aufgabe davon ist",
  en: "The first task of it is",
  es: "La primera tarea es",
};

const XP_HINT_WORDS = {
  de: (xp) => `Schließe diese Aufgabe ab, um ${xp} EXP zu sammeln`,
  en: (xp) => `Complete this task to collect ${xp} EXP`,
  es: (xp) => `Completa esta tarea para ganar ${xp} EXP`,
};

const GOT_IT_WORDS = { de: "Verstanden", en: "Got it", es: "Entendido" };

// Dauer muss zur Slide-out-Animation in _GreetingPopup.scss passen.
const CLOSE_ANIM_MS = 360;

// KI-Helfer-Gesicht: zwei gleich große Augen-Punkte, die ein Lächeln
// verbindet; vom linken Auge schwingt ein Bogen nach unten und endet im
// dritten runden Punkt.
function AiFace() {
  return (
    <svg className="greet__face" viewBox="0 0 48 48" aria-hidden="true">
      <circle className="greet__face-bg" cx="24" cy="24" r="24" />
      {/* Augen */}
      <circle className="greet__face-dot" cx="17" cy="15.5" r="4" />
      <circle className="greet__face-dot" cx="31" cy="15.5" r="4" />
      {/* Lächeln verbindet die beiden Augen */}
      <path className="greet__face-line" d="M17 20.5 Q24 27.5 31 20.5" />
      {/* Bogen vom linken Auge nach unten zum dritten Punkt */}
      <path className="greet__face-line" d="M15 20 Q11.5 26.5 16 31.5" />
      <circle className="greet__face-dot" cx="18.5" cy="33" r="4.5" />
    </svg>
  );
}

export function GreetingPopup({ t, lang, state, onOpenCat, onOpenEntry, onOpenProgress, onClose }) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const touchY = useRef(0);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const { cats, entries } = state;

  // Fokus-Projekt: gepinnt > frühestes Termindatum > erstes Projekt.
  const projects = cats.filter((c) => c.type === "project" && !c.archived);
  const project =
    projects.find((p) => p.pinned) ||
    [...projects]
      .filter((p) => p.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] ||
    projects[0];
  if (!project) return null;

  // Verknüpfte Aufgaben → Segmente der Statusleiste (jede Lücke = 1 Aufgabe;
  // erledigte Segmente sind gefüllt, offene bleiben abgedunkelt).
  const catIdsOf = (e) => e.catIds || (e.catId ? [e.catId] : []);
  const projTasks = entries.filter(
    (e) => e.type === "task" && !e.archived && catIdsOf(e).includes(project.id)
  );
  const doneCount = projTasks.filter((e) => e.done).length;

  // Empfehlung: die erste offene Aufgabe des Projekts (frühestes Fälligkeits-
  // datum zuerst, undatierte zuletzt).
  const firstTask = projTasks
    .filter((e) => !e.done)
    .sort((a, b) => {
      if (!a.due && !b.due) return (a.createdAt || 0) - (b.createdAt || 0);
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    })[0];

  const hour = new Date().getHours();
  const words = GREET_WORDS[lang] || GREET_WORDS.en;
  const hello = words[hour < 12 ? 0 : hour < 18 ? 1 : 2];

  // "Zuletzt"-Zeile wie in der NowBar der Startseite: Termindatum bevorzugt,
  // sonst Erstellungsdatum.
  const datePrefix = project.date
    ? lang === "de" ? "Terminiert" : lang === "es" ? "Vence" : "Due"
    : lang === "de" ? "Erstellt" : lang === "es" ? "Creado" : "Created";
  const dateStr = project.date ? fmtDate(project.date, t.locale) : "";

  const close = (after) => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      onClose();
      after?.();
    }, CLOSE_ANIM_MS);
  };

  const openProject = () => close(() => onOpenCat(project));

  return (
    <div
      className={`greet${closing ? " greet--closing" : ""}`}
      // Touch-Gesten nicht an die App durchreichen (Swipe-down würde sonst
      // das Command-Panel hinter dem Popup öffnen).
      onTouchStart={(e) => {
        e.stopPropagation();
        touchY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        if (e.changedTouches[0].clientY - touchY.current < -48) close();
      }}
    >
      <div className="greet__backdrop" onClick={() => close()} />
      <div className="greet__card" role="dialog" aria-label={`${hello}, ${state.user.name}`}>
        <AiFace />
        <div className="greet__header">
          <span className="greet__hello">{hello}</span>
          <span className="greet__name">{state.user.name}</span>
        </div>

        <div className="greet__spacer" />

        <span className="greet__lead">{(LEAD_WORDS[lang] || LEAD_WORDS.en) + ":"}</span>
        <div className="greet__main">
          <button type="button" className="greet__project" onClick={openProject}>
            <span className="greet__project-copy">
              <span className="greet__project-name">{project.name}</span>
              <span className="greet__project-date">
                {dateStr ? `${datePrefix} · ${dateStr}` : datePrefix}
              </span>
            </span>
            <ChevronRight className="greet__project-chevron" size={22} strokeWidth={2.4} />
          </button>
          <button type="button" className="greet__open" onClick={openProject}>
            {OPEN_WORDS[lang] || OPEN_WORDS.en}
          </button>
        </div>

        {firstTask && (
          <div className="greet__task-block">
            <span className="greet__lead">{(TASK_LEAD_WORDS[lang] || TASK_LEAD_WORDS.en) + ":"}</span>
            <button
              type="button"
              className="greet__task"
              onClick={() => close(() => onOpenEntry?.(firstTask))}
            >
              <span className="greet__task-icon">
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </span>
              <span className="greet__task-copy">
                <span className="greet__task-name">{firstTask.title}</span>
                <span className="greet__task-date">
                  {firstTask.due
                    ? `${lang === "de" ? "Terminiert" : lang === "es" ? "Vence" : "Due"} · ${fmtDate(firstTask.due, t.locale)}`
                    : lang === "de" ? "Ohne Datum" : lang === "es" ? "Sin fecha" : "No date"}
                </span>
              </span>
              <ChevronRight className="greet__task-chevron" size={18} strokeWidth={2.4} />
            </button>
            <span className="greet__xp-hint">
              {(XP_HINT_WORDS[lang] || XP_HINT_WORDS.en)(XP_BY_TYPE.task)}
            </span>
          </div>
        )}

        <div className="greet__footer">
          <span className="greet__check">
            <Check size={12} strokeWidth={3.2} />
          </span>
          <div
            className="greet__taskline"
            aria-label={`${doneCount}/${projTasks.length}`}
          >
            {projTasks.length === 0 ? (
              <span className="greet__seg" />
            ) : (
              [...projTasks]
                .sort((a, b) => (b.done ? 1 : 0) - (a.done ? 1 : 0))
                .map((task) => (
                  <span
                    key={task.id}
                    className={`greet__seg${task.done ? " greet__seg--done" : ""}`}
                  />
                ))
            )}
          </div>
          <button
            type="button"
            className="greet__trophy"
            aria-label={t.progress || "Fortschritt"}
            onClick={() => close(() => onOpenProgress?.())}
          >
            <Trophy size={20} strokeWidth={2.2} />
          </button>
        </div>

        <button type="button" className="greet__done" onClick={() => close()}>
          {GOT_IT_WORDS[lang] || GOT_IT_WORDS.en}
        </button>
      </div>
    </div>
  );
}
