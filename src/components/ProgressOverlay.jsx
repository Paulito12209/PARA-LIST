import { useMemo } from "react";
import { Home } from "lucide-react";
import { buildActivityState } from "../desktop/activity";
import { ZigzagPath } from "../desktop/ZigzagPath";

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

  const pathHeader = lang === "en" ? "ACTIVITY PATH · NEXT GOAL" : "AKTIVITÄTS-PFAD · NÄCHSTES ZIEL";

  return (
    <div className="progress-overlay">
      <div className="progress-overlay__top">
        <div className="progress-overlay__level-row">
          <div className="dsk-rail__level-badge" style={{ width: 40, height: 40 }}>
            <span className="dsk-rail__level-badge-num">{activity.currentLevel.level}</span>
          </div>
          <div className="dsk-rail__level-inline">
            <span className="dsk-rail__level-kicker">{t?.level || "LEVEL"} {activity.currentLevel.level}</span>
            <span className="dsk-rail__level-name">{activity.currentLevel.name}</span>
          </div>
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
                {lang === "en" ? "Next" : "Nächstes"}: {activity.nextTargetLabel}
              </span>
            )}
          </div>
        </div>

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
      </div>

      <div className="dsk-rail__path-header">{pathHeader}</div>

      <div className="progress-overlay__scroll">
        {activity.nextLevel && (
          <div className="dsk-rail__target">
            <div className="dsk-rail__target-circle">
              <span>{activity.nextLevel.level}</span>
            </div>
            <div className="dsk-rail__target-label">
              LV {activity.nextLevel.level} · {activity.nextLevel.name.toUpperCase()}
            </div>
          </div>
        )}
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
    </div>
  );
}
