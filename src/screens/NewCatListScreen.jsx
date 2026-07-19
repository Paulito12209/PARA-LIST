import { useMemo, useState } from "react";
import { Archive, Calendar, ChevronLeft, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { fmtDate, fmtRelative, CAT_ICONS, COVER_COLORS } from "../utils";
import { AutoScrollText } from "../components/AutoScrollText";
import { CustomSettingsIcon, GitMergeBranchIcon, ActiveDotIcon } from "../components/AppIcons";
import { NewDesignNav } from "../components/NewDesignNav";
import { CatOptionsSheet } from "../components/CatOptionsSheet";
import { ConnSheet } from "../components/PillSheets";
import { DatePickerSheet } from "../components/PickerSheets";
import { VoiceOverlay } from "../modals/VoiceOverlay";
import { DetailMetaRow } from "../components/TaskSubtabControls";

// Akzent (RGB) des Kontext-Verlaufs im Hero – Typfarbe der Liste.
const TYPE_ACCENT_RGB = {
  project: "224, 62, 62",
  area: "208, 144, 32",
  resource: "48, 160, 96",
};

// Eine Zeile der Spotify-Liste: Cover-Kachel · Titel + Meta-Zeile (Datums-Tag
// mit Kalender-Icon, Verknüpfen-Icon) · Kebab-Menü. Tap auf die Zeile öffnet
// die Seite; Verknüpfen/Kebab stoppen die Propagation.
function NewListRow({ t, CC, cat, related, onOpen, onOpenConn, onOpenMenu, onPickDate }) {
  const cfg = CC[cat.type] || CC.resource;
  const CatIcon = CAT_ICONS[cat.type] || CAT_ICONS.resource;
  const RelatedIcon = related ? CAT_ICONS[related.type] || CAT_ICONS.resource : null;
  // Cover-Kachel: eigenes Bild > gewählte Cover-Farbe > getönte Typfarbe.
  const tileColor = cat.coverColor || cfg.color;
  // Datums-Tag: das Kalender-Icon ist IMMER sichtbar. Projekte zeigen ihr
  // terminiertes Datum – ohne Terminierung bleibt nur das Icon stehen (Tap
  // öffnet den Datums-Picker, KEIN Rückfall aufs Erstellungsdatum). Bereiche/
  // Ressourcen zeigen ihr Erstellungsdatum.
  const isProject = cat.type === "project";
  const dateStr = isProject
    ? cat.date || null
    : cat.createdAt
      ? cat.createdAt.split("T")[0]
      : null;
  const relatedCfg = related && CC[related.type] ? CC[related.type] : null;

  return (
    <div
      className="new-list__row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(cat)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(cat);
        }
      }}
    >
      {cat.coverImage ? (
        <img className="new-list__row-cover" src={cat.coverImage} alt="" />
      ) : (
        <span
          className="new-list__row-cover new-list__row-cover--tile"
          style={{ background: tileColor + "26", color: tileColor }}
        >
          <CatIcon size={20} color={tileColor} />
        </span>
      )}

      <div className="new-list__row-info">
        <div className="new-list__row-title">
          <AutoScrollText>{cat.name}</AutoScrollText>
        </div>
        <div className="new-list__row-meta">
          {isProject ? (
            <button
              className="new-list__row-date new-list__row-date--btn"
              onClick={(e) => {
                e.stopPropagation();
                onPickDate?.(cat);
              }}
              aria-label={t.scheduledLabel || "Terminiert"}
            >
              <Calendar size={12} strokeWidth={2.4} />
              {dateStr && fmtDate(dateStr, t.locale)}
            </button>
          ) : (
            <span className="new-list__row-date">
              <Calendar size={12} strokeWidth={2.4} />
              {dateStr && fmtDate(dateStr, t.locale)}
            </span>
          )}
          {related && relatedCfg && RelatedIcon && (
            <span className="new-list__row-linked" style={{ color: relatedCfg.color }}>
              <RelatedIcon size={12} strokeWidth={2.4} />
            </span>
          )}
          <button
            className="new-list__row-link"
            onClick={(e) => { e.stopPropagation(); onOpenConn(cat); }}
            aria-label={t.connectSelection || "Verknüpfen"}
          >
            <GitMergeBranchIcon size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <button
        className="new-list__row-kebab"
        onClick={(e) => { e.stopPropagation(); onOpenMenu(cat); }}
        aria-label={t.settingsBtn || "Optionen"}
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}

// Spotify-artige Listenansicht einer Kategorie (Projekte/Bereiche/Ressourcen)
// im NEUEN Design: Kontext-Verlauf oben mit Glas-Buttons (Zurück links,
// Einstellungen rechts) und großem Titel, darunter die Filter-Pillen
// (Aktiv · Archiviert · Papierkorb) und die Zeilenliste. Unten bleibt die
// NewDesignNav sichtbar – deren Plus erstellt eine neue Seite in der Liste.
export function NewCatListScreen({
  t,
  CC,
  lang,
  type,
  allCats,
  trash = [],
  onOpen,
  onAdd,
  onBack,
  onHome,
  onOpenSettings,
  onOpenSearch,
  onOpenCatType,
  onUpdateCat,
  onTogglePin,
  onDeleteCat,
  onRestoreFromTrash,
  onPurgeTrashItem,
  onQuickCreate,
}) {
  const cfg = CC[type] || CC.resource;
  const accentRgb =
    TYPE_ACCENT_RGB[type] || COVER_COLORS.find((c) => c.label === type)?.rgb || "88, 88, 160";

  const [filter, setFilter] = useState("active");
  const [menuCatId, setMenuCatId] = useState(null);
  const [connCatId, setConnCatId] = useState(null);
  // Zeile, deren Terminierung gerade im Datums-Sheet bearbeitet wird
  const [dateCatId, setDateCatId] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sort, setSort] = useState({ by: "date", desc: true });
  const [pinnedFilter, setPinnedFilter] = useState("all");

  // Sheets zeigen immer den frischen Cat aus dem State (nicht den Stand beim
  // Öffnen), damit z.B. der Favoriten-Stern direkt umschaltet.
  const menuCat = allCats.find((c) => c.id === menuCatId) || null;
  const connCat = allCats.find((c) => c.id === connCatId) || null;
  const dateCat = allCats.find((c) => c.id === dateCatId) || null;

  const getTs = (c) =>
    typeof c?.createdAt === "number" ? c.createdAt : c?.createdAt ? Date.parse(c.createdAt) || 0 : 0;

  const cats = useMemo(
    () =>
      allCats
        .filter(
          (c) =>
            c.type === type &&
            (filter === "archived" ? c.archived : !c.archived) &&
            (pinnedFilter === "pinned" ? c.pinned : true)
        )
        .sort((a, b) => {
          if (sort.by === "date") return sort.desc ? getTs(b) - getTs(a) : getTs(a) - getTs(b);
          const cmp = (a.name || "").localeCompare(b.name || "");
          return sort.desc ? -cmp : cmp;
        }),
    [allCats, type, filter, pinnedFilter, sort]
  );

  // Papierkorb: gelöschte Kategorien dieses Typs, neueste zuerst.
  const trashItems = useMemo(
    () =>
      trash
        .filter((it) => it.kind === "cat" && it.data.type === type)
        .sort((a, b) => b.deletedAt - a.deletedAt),
    [trash, type]
  );

  // Verknüpfungs-Optionen wie auf der Detailseite: Projekt ↔ Bereich,
  // Ressourcen an beides.
  const connOptions = connCat
    ? allCats.filter((c) => {
        if (c.id === connCat.id) return false;
        if (connCat.type === "project") return c.type === "area";
        if (connCat.type === "area") return c.type === "project";
        return c.type === "project" || c.type === "area";
      })
    : [];

  return (
    <div className="new-list" style={{ "--nl-accent-rgb": accentRgb }}>
      {/* Hero: Kontext-Verlauf, Glas-Buttons oben, großer Titel unten */}
      <div className="new-list__hero">
        <div className="new-list__topbar">
          <button className="new-list__glass-btn" onClick={onBack} aria-label={t.back || "Zurück"}>
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
          <button
            className="new-list__glass-btn"
            onClick={onOpenSettings}
            aria-label={t.settingsBtn || "Einstellungen"}
          >
            <CustomSettingsIcon size={20} color="currentColor" />
          </button>
        </div>
        <h1 className="new-list__title">{cfg.label}</h1>
        {/* Zähler immer universal als "N Einträge" – unabhängig vom Listentyp. */}
        <div className="new-list__subtitle">
          {t.entriesCount ? t.entriesCount(cats.length) : `${cats.length}`}
        </div>
      </div>

      {/* Filter-Pillen: Aktiv · Archiviert · Papierkorb (gruppiert, kein
          Space-between dazwischen) · rechts davon getrennt: Sortieren + Filter
          als reine Icons ohne Pillen-Gehäuse. */}
      <div className="new-list__pills">
        <div className="new-list__pills-group">
          <button
            className={`new-list__pill${filter === "active" ? " new-list__pill--active" : ""}`}
            onClick={() => setFilter("active")}
          >
            <ActiveDotIcon size={13} strokeWidth={2.4} />
            {t.activeFilter || "Aktiv"}
          </button>
          <button
            className={`new-list__pill${filter === "archived" ? " new-list__pill--active" : ""}`}
            onClick={() => setFilter("archived")}
          >
            <Archive size={13} strokeWidth={2.2} />
            {t.archivedLabel || "Archiviert"}
          </button>
          <button
            className={`new-list__pill new-list__pill--trash${filter === "trash" ? " new-list__pill--active" : ""}`}
            onClick={() => setFilter("trash")}
            aria-label={t.trash}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        </div>

        <DetailMetaRow
          t={t}
          hideCount
          sort={sort}
          onChangeSort={setSort}
          filterValue={pinnedFilter}
          filterOptions={[
            { id: "all", label: t.filterAll || "Alle" },
            { id: "pinned", label: t.pinned || "Angeheftet" },
          ]}
          onChangeFilter={setPinnedFilter}
        />
      </div>

      <div className="new-list__body">
        {filter === "trash" ? (
          trashItems.length === 0 ? (
            <div className="new-list__empty">{t.trashEmpty}</div>
          ) : (
            trashItems.map((it) => (
              <div key={it.data.id} className="home-trash-item">
                <div className="home-trash-item__icon">
                  <Trash2 size={18} />
                </div>
                <div className="home-trash-item__text">
                  <div className="home-trash-item__title">{it.data.name}</div>
                  <div className="home-trash-item__meta">{fmtRelative(it.deletedAt, t.locale)}</div>
                </div>
                <button
                  className="home-trash-item__restore"
                  onClick={() => onRestoreFromTrash?.(it.data.id)}
                  aria-label={t.restore}
                  title={t.restore}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="home-trash-item__restore home-trash-item__purge"
                  onClick={() => onPurgeTrashItem?.(it.data.id)}
                  aria-label={t.deleteForever}
                  title={t.deleteForever}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )
        ) : cats.length === 0 ? (
          <div className="new-list__empty">
            {filter === "archived" ? t.noneArchived : t.noCats(cfg.label)}
          </div>
        ) : (
          cats.map((cat) => (
            <NewListRow
              key={cat.id}
              t={t}
              CC={CC}
              cat={cat}
              related={allCats.find((c) => c.id === cat.relatedId) || null}
              onOpen={onOpen}
              onOpenConn={(c) => setConnCatId(c.id)}
              onOpenMenu={(c) => setMenuCatId(c.id)}
              onPickDate={(c) => setDateCatId(c.id)}
            />
          ))
        )}
      </div>

      {/* Untere Navigationsleiste des neuen Designs bleibt sichtbar; das Plus
          erstellt eine neue Seite in dieser Liste, das Mikro nimmt den Titel
          per Sprache auf. */}
      <NewDesignNav
        t={t}
        active={type}
        onHome={onHome}
        onOpenSearch={onOpenSearch}
        onOpenCatType={onOpenCatType}
        onAdd={onAdd}
        onOpenVoice={() => setVoiceOpen(true)}
      />

      {/* Datums-Sheet des Datum-Tags in der Meta-Zeile (nur Projekte) */}
      {dateCat && (
        <DatePickerSheet
          t={t}
          value={dateCat.date || null}
          accent={cfg.color}
          onSelect={(d) => onUpdateCat(dateCat.id, { date: d })}
          onClose={() => setDateCatId(null)}
        />
      )}

      {/* Kebab-Sheet der Zeile: Cover-Design (Farben/Foto/Kamera + URL) und
          Favorit/Anpinnen/Archivieren/Löschen – geteilt mit der Detailseite. */}
      {menuCat && (
        <CatOptionsSheet
          t={t}
          cat={menuCat}
          onUpdate={(patch) => onUpdateCat(menuCat.id, patch)}
          onTogglePin={() => onTogglePin(menuCat.id)}
          onDelete={() => onDeleteCat(menuCat.id)}
          onClose={() => setMenuCatId(null)}
        />
      )}

      {/* Verknüpfen-Sheet des Link-Icons in der Meta-Zeile */}
      {connCat && (
        <ConnSheet
          t={t}
          CC={CC}
          options={connOptions}
          currentId={connCat.relatedId || null}
          onSelect={(id) => {
            onUpdateCat(connCat.id, { relatedId: id });
            setConnCatId(null);
          }}
          onClose={() => setConnCatId(null)}
        />
      )}

      {voiceOpen && (
        <VoiceOverlay
          t={t}
          tab={type}
          tabColor={cfg.color}
          accentRgb={accentRgb}
          supportsDate={type === "project"}
          lang={lang}
          onTranscribed={(title, date) => {
            onQuickCreate?.(type, title, date);
            setVoiceOpen(false);
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}
