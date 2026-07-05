import { useMemo, useState } from "react";
import { Home, Info } from "lucide-react";
import { buildActivityState } from "../desktop/activity";
import { ZigzagPath } from "../desktop/ZigzagPath";
import { PathInfoSheet } from "./PathInfoSheet";

// Mobiles Fortschritts-Overlay (Pokal-Button im Dock): legt sich über den
// Home-Inhalt und zeigt den aufgeklappten Desktop-Rail-Inhalt (Level,
// Progress-Bar, XP-Stats, Aktivitäts-Pfad). Das Command-Dock ist dabei
// ausgeblendet; zurück geht es über den schwebenden Home-Button unten links
// (gleiche Optik wie auf den Detailseiten). Die .dsk-rail__*/.dsk-zigzag-
// Bausteine werden 1:1 wiederverwendet; die nötigen CSS-Variablen definiert
// .progress-overlay selbst (beide Themes).
export function ProgressOverlay({ t, lang, light, entries, cats, onOpenEntry, onOpenCat, onClose }) {
  const activity = useMemo(
    () => buildActivityState({ entries, cats, lang }),
    [entries, cats, lang]
  );

  const pathHeader = lang === "en" ? "ACTIVITY PATH" : "AKTIVITÄTS-PFAD";

  const [infoOpen, setInfoOpen] = useState(false);
  const infoTitle = lang === "en" ? "Activity Path" : "Aktivitäts-Pfad";
  const infoText =
    lang === "en"
      ? "Here you see your complete timeline – everything you've created, in the order it happened. It's your history at a glance.\n\nEvery entry earns you XP. The more you create, the faster you climb to the next level."
      : "Hier siehst du deine komplette Chronologie – alles, was du erstellt hast, in der Reihenfolge seiner Entstehung. Deine Historie auf einen Blick.\n\nJeder Eintrag bringt dir XP. Je mehr du erstellst, desto schneller steigst du im Level auf.";

  return (
    <div className="progress-overlay">
      <div className="progress-overlay__top">
        <div className="dsk-rail__stats">
          <div className="dsk-rail__stat">
            <div className="dsk-rail__stat-num">+{activity.todayXp}</div>
            <div className="dsk-rail__stat-label">{lang === "en" ? "XP TODAY" : "XP HEUTE"}</div>
          </div>
          <div className="dsk-rail__stat">
            <div className="dsk-rail__stat-num">{activity.totalXp}</div>
            <div className="dsk-rail__stat-label">{lang === "en" ? "TOTAL XP" : "GESAMT XP"}</div>
          </div>
          <div className="dsk-rail__stat">
            <div className="dsk-rail__stat-num">{activity.entryCount}</div>
            <div className="dsk-rail__stat-label">{lang === "en" ? "ENTRIES" : "EINTRÄGE"}</div>
          </div>
        </div>

        <div className="progress-overlay__level-row">
          <div className="dsk-rail__level-badge" style={{ width: 40, height: 40 }}>
            <span className="dsk-rail__level-badge-num">{activity.currentLevel.level}</span>
          </div>
          <div className="dsk-rail__level-inline">
            <span className="dsk-rail__level-title">
              {t?.level || "Level"} {activity.currentLevel.level}
            </span>
          </div>
          {activity.nextLevel && (
            <div
              className="dsk-rail__level-badge progress-overlay__next-badge"
              style={{ width: 40, height: 40 }}
            >
              <span className="dsk-rail__level-badge-num">{activity.nextLevel.level}</span>
            </div>
          )}
        </div>

        <div className="dsk-rail__progress">
          <div className="dsk-rail__progress-track">
            <div
              className="dsk-rail__progress-fill"
              style={{ width: `${Math.round(activity.progress * 100)}%` }}
            />
          </div>
          <div className="dsk-rail__progress-meta">
            <span>{activity.progressLabel}</span>
            {activity.nextLevel && (
              <span className="dsk-rail__progress-next">
                {lang === "en" ? "Next rank" : "Nächster Rang"}: {activity.nextTargetLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="progress-overlay__divider" />

      <div className="dsk-rail__path-header progress-overlay__path-header">
        <span>{pathHeader}</span>
        <button
          type="button"
          className="progress-overlay__info-btn"
          onClick={() => setInfoOpen(true)}
          aria-label={infoTitle}
        >
          <Info size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className="progress-overlay__scroll">
        <ZigzagPath
          items={activity.path}
          light={light}
          onOpenEntry={onOpenEntry}
          onOpenCat={onOpenCat}
        />
      </div>

      <button
        className="home__floating-btn detail-home-fab"
        onClick={onClose}
        aria-label={t.home || "Startseite"}
      >
        <Home size={20} />
      </button>

      {infoOpen && (
        <PathInfoSheet title={infoTitle} text={infoText} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
}
