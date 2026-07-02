// Pure helpers for the desktop Rail: XP/level model + activity path build.

export const XP_BY_TYPE = {
  project: 10,
  area: 1,
  resource: 1,
  task: 2,
  note: 1,
  calendar: 1,
  link: 1,
};

export const LEVELS = [
  { level: 1, name: "Starter", threshold: 0 },
  { level: 2, name: "Sammler", threshold: 50 },
  { level: 3, name: "Sucher", threshold: 150 },
  { level: 4, name: "Profi", threshold: 300 },
  { level: 5, name: "Meister", threshold: 600 },
  { level: 6, name: "Legende", threshold: 1000 },
];

const TYPE_TO_TOKEN = {
  project: "project",
  area: "area",
  resource: "resource",
  task: "task",
  note: "note",
  calendar: "cal",
  link: "resource",
};

function getCreatedTs(item) {
  if (typeof item.createdAt === "number") return item.createdAt;
  if (typeof item.createdAt === "string") {
    const t = Date.parse(item.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

const TYPE_LABELS = {
  de: { task: "Aufgabe", note: "Notiz", calendar: "Termin", project: "Projekt", area: "Bereich", resource: "Ressource" },
  en: { task: "task", note: "note", calendar: "event", project: "project", area: "area", resource: "resource" },
  es: { task: "tarea", note: "nota", calendar: "evento", project: "proyecto", area: "área", resource: "recurso" },
};

export function typeLabel(type, lang) {
  return (TYPE_LABELS[lang] || TYPE_LABELS.de)[type] || type;
}

function formatTime(ts, locale = "de-DE") {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(ts, locale = "de-DE") {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Build the gamification snapshot:
 * - total XP across all entries + cats
 * - today XP (created today)
 * - entry count
 * - current level, next level, progress to next
 * - activity items (newest first), with XP, type, token kind, sub-meta
 * - milestones spliced in between activity items at the moment cumulative XP crossed a level
 */
export function buildActivityState({ entries = [], cats = [], lang = "de" }) {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "de-DE";

  // Combine cats + entries into a single timeline (cats also award XP at
  // creation). Mitgelieferte Default-/Onboarding-Items (`seed`) zählen NICHT —
  // XP muss man sich verdienen. Ausnahme: eine Default-Aufgabe, die man wirklich
  // abschließt (done), wird ab dem Abschlusszeitpunkt gutgeschrieben.
  const timeline = [
    ...cats
      .filter((c) => !c.archived && !c.seed)
      .map((c) => ({
        id: `cat-${c.id}`,
        kind: "cat",
        type: c.type,
        title: c.name,
        ts: getCreatedTs(c),
      })),
    ...entries
      .filter((e) => !e.seed || e.done)
      .map((e) => ({
        id: `entry-${e.id}`,
        kind: "entry",
        type: e.type,
        title: e.title || "(ohne Titel)",
        desc: e.body || e.note || "",
        ts: e.seed ? getCreatedTs({ createdAt: e.completedAt }) : getCreatedTs(e),
      })),
  ].filter((it) => it.ts > 0);

  // Sort oldest → newest, then accumulate XP and detect milestone crossings
  timeline.sort((a, b) => a.ts - b.ts);

  let running = 0;
  let prevLevel = LEVELS[0];
  const withMilestones = [];
  for (const item of timeline) {
    const xp = XP_BY_TYPE[item.type] ?? 1;
    const before = running;
    running += xp;
    withMilestones.push({ ...item, xp });

    // detect every level whose threshold sits in (before, running]
    for (const lv of LEVELS) {
      if (lv.threshold > before && lv.threshold <= running && lv.level > prevLevel.level) {
        withMilestones.push({
          id: `milestone-${lv.level}`,
          kind: "milestone",
          level: lv,
          ts: item.ts,
        });
        prevLevel = lv;
      }
    }
  }

  const totalXp = running;
  const todayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const todayXp = timeline
    .filter((it) => it.ts >= todayStart)
    .reduce((sum, it) => sum + (XP_BY_TYPE[it.type] ?? 1), 0);

  // Determine current + next level
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1] || null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].threshold) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }

  const xpIntoLevel = totalXp - currentLevel.threshold;
  const xpNeeded = nextLevel ? nextLevel.threshold - currentLevel.threshold : 0;
  const progress = nextLevel && xpNeeded > 0 ? Math.min(1, xpIntoLevel / xpNeeded) : 1;

  // Render order: newest first
  const path = withMilestones.slice().reverse().map((it) => {
    if (it.kind === "milestone") return it;
    return {
      ...it,
      token: TYPE_TO_TOKEN[it.type] || "resource",
      subType: typeLabel(it.type, lang),
      subTime: formatTime(it.ts, locale),
      subDate: formatDate(it.ts, locale),
    };
  });

  return {
    totalXp,
    todayXp,
    // nur gezählte (nicht-seed bzw. abgeschlossene Default-)Einträge
    entryCount: timeline.filter((it) => it.kind === "entry").length,
    currentLevel,
    nextLevel,
    progress,
    progressLabel: nextLevel
      ? `${totalXp} / ${nextLevel.threshold} XP`
      : `${totalXp} XP`,
    nextTargetLabel: nextLevel ? nextLevel.name : currentLevel.name,
    path,
  };
}
