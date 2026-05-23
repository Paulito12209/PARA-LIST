import { Trophy } from "lucide-react";
import { CustomSettingsIcon } from "../components/AppIcons";
import { ZigzagPath } from "./ZigzagPath";

function LevelBadge({ level, size = 40 }) {
  return (
    <div className="dsk-rail__level-badge" style={{ width: size, height: size }}>
      <span className="dsk-rail__level-badge-num">{level}</span>
    </div>
  );
}

export function Rail({
  t,
  lang,
  expanded,
  activity,
  onToggle,
  onOpenSettings,
  onOpenEntry,
  onOpenCat,
}) {
  const pathHeader = lang === "en" ? "ACTIVITY PATH · NEXT GOAL" : "AKTIVITÄTS-PFAD · NÄCHSTES ZIEL";

  return (
    <aside className={`dsk-rail${expanded ? "" : " dsk-rail--collapsed"}`}>
      <div className="dsk-rail__top">
        <div className="dsk-rail__top-actions">
          <LevelBadge level={activity.currentLevel.level} />
          {expanded && (
            <div className="dsk-rail__level-inline">
              <span className="dsk-rail__level-kicker">{t?.level || "LEVEL"} {activity.currentLevel.level}</span>
              <span className="dsk-rail__level-name">{activity.currentLevel.name}</span>
            </div>
          )}
          {expanded && <div className="dsk-rail__spacer" />}
          {expanded && (
            <button
              type="button"
              className="dsk-rail__icon-btn"
              onClick={onOpenSettings}
              title={t?.settings || "Einstellungen"}
              aria-label={t?.settings || "Einstellungen"}
            >
              <CustomSettingsIcon size={22} color="currentColor" />
            </button>
          )}
          <button
            type="button"
            className={`dsk-rail__icon-btn dsk-rail__icon-btn--trophy${expanded ? " dsk-rail__icon-btn--active" : ""}`}
            onClick={onToggle}
            title={expanded ? "Rail einklappen" : "Rail ausklappen"}
            aria-label={expanded ? "Rail einklappen" : "Rail ausklappen"}
          >
            <Trophy size={20} strokeWidth={2} />
          </button>
        </div>

        {expanded && (
          <>
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
          </>
        )}
      </div>

      {expanded && (
        <div className="dsk-rail__path-header">{pathHeader}</div>
      )}

      <div className="dsk-rail__scroll">
        {expanded && activity.nextLevel && (
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
          compact={!expanded}
          onOpenEntry={onOpenEntry}
          onOpenCat={onOpenCat}
        />
      </div>

    </aside>
  );
}

