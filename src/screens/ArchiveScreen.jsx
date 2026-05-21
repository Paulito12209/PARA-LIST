import { useState } from "react";
import {
  Circle,
  Triangle,
  Square,
  ChevronLeft,
  CheckCircle2,
  FileText,
  Calendar,
} from "lucide-react";
import { TaskList, NoteList, CalList } from "../components/EntryLists";
import { ArchiveIcon } from "../components/AppIcons";
import { isOld, CAT_ICONS } from "../utils";
import { AutoScrollText } from "../components/AutoScrollText";
import { useInactivity } from "../hooks/useInactivity";

const FAB_INACTIVITY_MS = 5000;

const ARCHIVED_FOLDER_CARDS = [
  {
    id: "project",
    Icon: Circle,
    color: "#E03E3E",
    fillRgba: "rgba(224,62,62,0.15)",
    titles: { de: "Projekte", en: "Projects" },
    descriptions: {
      de: "Hier liegen deine abgeschlossenen Projekte.",
      en: "Your completed project archives.",
    },
    modifier: "project",
  },
  {
    id: "area",
    Icon: Triangle,
    color: "#D09020",
    fillRgba: "rgba(208,144,32,0.15)",
    titles: { de: "Bereiche", en: "Areas" },
    descriptions: {
      de: "Archivierte Lebensbereiche und Rollen.",
      en: "Your archived life areas.",
    },
    modifier: "area",
  },
  {
    id: "resource",
    Icon: Square,
    color: "#30A060",
    fillRgba: "rgba(48,160,96,0.15)",
    titles: { de: "Ressourcen", en: "Resources" },
    descriptions: {
      de: "Abgelegtes Wissen und Nachschlagewerke.",
      en: "Archived collections of knowledge.",
    },
    modifier: "resource",
  },
];

const ARCHIVED_ITEM_CARDS = [
  {
    id: "tasks",
    Icon: CheckCircle2,
    color: "#7C83F7",
    titles: { de: "Aufgaben", en: "Tasks" },
  },
  {
    id: "notes",
    Icon: FileText,
    color: "#FBBF24",
    titles: { de: "Notizen", en: "Notes" },
  },
  {
    id: "calendar",
    Icon: Calendar,
    color: "#1E3A8A",
    titles: { de: "Termine", en: "Events" },
  },
];

const SECTION_TITLES = {
  project: { de: "Archivierte Projekte", en: "Archived Projects" },
  area: { de: "Archivierte Bereiche", en: "Archived Areas" },
  resource: { de: "Archivierte Ressourcen", en: "Archived Resources" },
};

const FOLDER_TAB_IDS = ["project", "area", "resource"];

export function ArchiveScreen({
  t,
  CC,
  lang,
  entries,
  cats,
  onDelete,
  onBack,
  toggleTask,
  onOpenEntry,
  onRestoreNote,
  onOpenCat,
}) {
  const [activeArchiveTab, setActiveArchiveTab] = useState(null);
  const fabVisible = useInactivity(FAB_INACTIVITY_MS);

  const archivedProjects = cats.filter((c) => c.type === "project" && c.archived);
  const archivedAreas = cats.filter((c) => c.type === "area" && c.archived);
  const archivedResources = cats.filter((c) => c.type === "resource" && c.archived);
  const completedTasks = entries.filter((e) => e.type === "task" && e.done);
  const archivedNotes = entries.filter((e) => e.type === "note" && e.archived);
  const archivedEvents = entries.filter(
    (e) => e.type === "calendar" && (isOld(e.date) || e.done)
  );

  const counts = {
    project: archivedProjects.length,
    area: archivedAreas.length,
    resource: archivedResources.length,
    tasks: completedTasks.length,
    notes: archivedNotes.length,
    calendar: archivedEvents.length,
  };

  const getArchiveItems = () => {
    switch (activeArchiveTab) {
      case "project":
        return archivedProjects;
      case "area":
        return archivedAreas;
      case "resource":
        return archivedResources;
      case "tasks":
        return completedTasks;
      case "notes":
        return archivedNotes;
      case "calendar":
        return [...archivedEvents].sort(
          (a, b) => new Date(b.date + "T12:00") - new Date(a.date + "T12:00")
        );
      default:
        return [];
    }
  };

  const archiveItems = getArchiveItems();
  const isCatTab = FOLDER_TAB_IDS.includes(activeArchiveTab);
  const CatIcon = isCatTab ? CAT_ICONS[activeArchiveTab] : null;

  const getSectionTitle = () => {
    if (SECTION_TITLES[activeArchiveTab]) {
      return SECTION_TITLES[activeArchiveTab][lang] || SECTION_TITLES[activeArchiveTab].en;
    }
    if (activeArchiveTab === "tasks")
      return t.completedTasks || (lang === "de" ? "Erledigte Aufgaben" : "Completed Tasks");
    if (activeArchiveTab === "notes")
      return t.archivedNotes || (lang === "de" ? "Archivierte Notizen" : "Archived Notes");
    if (activeArchiveTab === "calendar")
      return t.pastEvents || (lang === "de" ? "Vergangene Termine" : "Past Events");
    return "";
  };

  return (
    <div className="cat-detail archive-dashboard-container">
      <div className="cat-detail__header">
        <div className="cat-detail__title-row">
          <ArchiveIcon size={18} color="#7C83F7" />
          <div className="cat-detail__title-input" style={{ pointerEvents: "none" }}>
            {activeArchiveTab
              ? getSectionTitle()
              : lang === "de"
              ? "Archiv-Dashboard"
              : "Archive Dashboard"}
          </div>
        </div>
      </div>

      <div className="cat-detail__body" style={{ padding: "16px", paddingBottom: "100px" }}>
        {!activeArchiveTab ? (
          <div className="archive-dashboard">
            <div className="archive-dashboard__section-title">
              {lang === "de" ? "Archivierte Ordner" : "Archived Folders"}
            </div>

            <div className="archive-carousel">
              {ARCHIVED_FOLDER_CARDS.map((card) => (
                <div
                  key={card.id}
                  className={`archive-card archive-card--${card.modifier}`}
                  onClick={() => setActiveArchiveTab(card.id)}
                >
                  <div className="archive-card__dots" />
                  <div className="archive-card__header">
                    <div className="archive-card__icon-box">
                      <card.Icon
                        size={22}
                        strokeWidth={2.5}
                        color={card.color}
                        fill={card.fillRgba}
                      />
                    </div>
                    <span className="archive-card__count">{counts[card.id]}</span>
                  </div>
                  <div className="archive-card__title">
                    {card.titles[lang] || card.titles.en}
                  </div>
                  <div className="archive-card__desc">
                    {card.descriptions[lang] || card.descriptions.en}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="archive-dashboard__section-title"
              style={{ marginTop: "28px" }}
            >
              {lang === "de" ? "Archivierte Inhalte" : "Archived Contents"}
            </div>

            <div className="archive-grid">
              {ARCHIVED_ITEM_CARDS.map((card) => (
                <div
                  key={card.id}
                  className={`archive-grid-card archive-grid-card--${card.id}`}
                  onClick={() => setActiveArchiveTab(card.id)}
                >
                  <div className="archive-grid-card__header">
                    <card.Icon size={20} color={card.color} />
                    <span className="archive-grid-card__count">{counts[card.id]}</span>
                  </div>
                  <span className="archive-grid-card__title">
                    {card.titles[lang] || card.titles.en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="archive-detail-list animated fadeIn">
            <button
              className="archive-detail-list__back-btn"
              onClick={() => setActiveArchiveTab(null)}
            >
              ← {lang === "de" ? "Zurück zum Dashboard" : "Back to Dashboard"}
            </button>

            <div className="archive-detail-list__content" style={{ marginTop: "16px" }}>
              {archiveItems.length === 0 ? (
                <div className="cat-detail__section-empty">
                  {t.noneArchived || "Keine archivierten Einträge"}
                </div>
              ) : (
                <>
                  {isCatTab && (
                    <div
                      className="cat-list__archive-items"
                      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                    >
                      {archiveItems.map((cat) => (
                        <button
                          key={cat.id}
                          className="cat-list__item"
                          onClick={() => onOpenCat(cat)}
                        >
                          <div className="cat-list__item-icon">
                            <CatIcon size={18} color={CC[activeArchiveTab].color} />
                          </div>
                          <div className="cat-list__item-info">
                            <div className="cat-list__item-name">
                              <AutoScrollText>{cat.name}</AutoScrollText>
                            </div>
                          </div>
                          <ChevronLeft
                            size={16}
                            color="#5858A0"
                            style={{ transform: "rotate(180deg)" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {activeArchiveTab === "tasks" && (
                    <TaskList
                      t={t}
                      CC={CC}
                      lang={lang}
                      entries={archiveItems}
                      cats={cats}
                      onToggle={toggleTask}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      isArchive={true}
                    />
                  )}
                  {activeArchiveTab === "calendar" && (
                    <CalList
                      t={t}
                      CC={CC}
                      lang={lang}
                      entries={archiveItems}
                      cats={cats}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      isArchive={true}
                    />
                  )}
                  {activeArchiveTab === "notes" && (
                    <NoteList
                      t={t}
                      CC={CC}
                      entries={archiveItems}
                      cats={cats}
                      onDelete={onDelete}
                      onOpenEntry={onOpenEntry}
                      onArchiveEntry={onRestoreNote}
                      isArchive={true}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`nav-bottom ${!fabVisible ? "nav-bottom--inactive" : ""}`}>
        <button
          className="nav-bottom__back"
          onClick={activeArchiveTab ? () => setActiveArchiveTab(null) : onBack}
        >
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
      </div>
    </div>
  );
}
