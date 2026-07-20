import { useState, useRef } from "react";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Video as VideoIcon,
  Headphones as AudioIcon,
  File as DocumentIcon,
  Image as ImageIcon,
} from "lucide-react";
import { TODAY, ID_BIRTHDAYS } from "../utils";
import { SheetFooter } from "../components/SheetFooter";
import { CalendarPane, ClockPane } from "../components/PickerSheets";
import { GitMergeBranchIcon } from "../components/AppIcons";
import { LinkTabs, LinkList } from "../components/LinkPicker";
import { LINK_TABS, useTagNames } from "../components/linkPickerShared";

const TYPE_COLORS = {
  task: "#0B8CE9",
  note: "#F59E0B",
  calendar: "#0078D4",
  media: "#10B981",
  link: "#7C3AED",
};

const MEDIA_TYPES = [
  { id: "image", Icon: ImageIcon, color: "#0D9488", labelKey: "image", accept: "image/*" },
  { id: "video", Icon: VideoIcon, color: "#EF4444", labelKey: "video", accept: "video/*" },
  { id: "audio", Icon: AudioIcon, color: "#F97316", labelKey: "audio", accept: "audio/*" },
  {
    id: "document",
    Icon: DocumentIcon,
    color: "#0078D4",
    labelKey: "document",
    accept: ".pdf,.doc,.docx,.txt,*/*",
  },
];

// Nur diese Typen bringen eine Terminierung mit – bei Notiz/Medien/Link
// besteht das Sheet allein aus dem Inhalt-Tab.
const SCHEDULABLE = new Set(["task", "calendar"]);

/**
 * Erstellen-Sheet eines neuen Eintrags. EIN Sheet mit Subtabs statt
 * gestapelter Felder:
 *
 *   Inhalt · Datum · Uhrzeit
 *
 * Der Inhalt-Tab trägt Titel, optionale Notiz (bzw. das typspezifische Feld)
 * und den Verknüpfen-Button. Ein Tap darauf tauscht die Tab-Leiste gegen die
 * Verknüpfen-Ansicht (Projekte · Arbeitsbereiche · Ressourcen · Tags) im
 * SELBEN Sheet; der Zurück-Pfeil führt in den Inhalt-Tab zurück. Datum und
 * Uhrzeit rendern dieselben Panes wie das Terminiert-Sheet.
 */
export function CreateModal({ type, cats, tags = [], initialCatId, onSave, onClose, t, CC }) {
  // Backdrop schließt nur, wenn der Tap auch AUF dem Backdrop begonnen hat –
  // verhindert versehentliches Schließen durch Ghost-Taps (iOS: Tastatur
  // klappt beim Tippen auf einen Button zu, Layout verschiebt sich, der
  // Klick landet auf dem Backdrop statt auf dem Button).
  const backdropPressRef = useRef(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [catIds, setCatIds] = useState(initialCatId ? [initialCatId] : []);
  const [tagSet, setTagSet] = useState(() => new Set());
  const [mediaFile, setMediaFile] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);
  // Aktiver Subtab: "content" | "date" | "time"
  const [tab, setTab] = useState("content");
  // Verknüpfen-Ansicht (ersetzt die Tab-Leiste); null = aus.
  const [linkTab, setLinkTab] = useState(null);
  const fileInputRef = useRef(null);

  const accentColor = TYPE_COLORS[type] || TYPE_COLORS.link;
  const labelMap = {
    task: t.task,
    note: t.note,
    calendar: t.calSing,
    media: t.mediaSing,
    link: t.link,
  };
  const label = labelMap[type] || t.link;
  const schedulable = SCHEDULABLE.has(type);
  const dateValue = type === "task" ? due || null : date;

  const tagNames = useTagNames(tags, cats, []);

  const toggleCat = (cat) =>
    setCatIds((prev) => (prev.includes(cat.id) ? prev.filter((x) => x !== cat.id) : [...prev, cat.id]));

  const toggleTag = (name) =>
    setTagSet((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const setDateValue = (d) => {
    if (type === "task") setDue(d || "");
    else setDate(d || TODAY);
  };

  const handleMediaGridClick = (mId) => {
    const config = MEDIA_TYPES.find((m) => m.id === mId);
    setMediaType(mId);
    if (fileInputRef.current && config) {
      fileInputRef.current.accept = config.accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!title) setTitle(file.name);
      setMediaFile(file);
    }
    if (e.target) e.target.value = null;
  };

  const save = () => {
    if (!title.trim()) return;

    let finalCatIds = catIds.length > 0 ? catIds : [];
    if (type === "calendar" && isBirthday) {
      finalCatIds = [ID_BIRTHDAYS];
    }

    const entry = {
      type,
      title: title.trim(),
      catIds: finalCatIds,
      catId: finalCatIds[0] || null,
    };

    const nextTags = Array.from(tagSet);
    if (nextTags.length) entry.tags = nextTags;

    if (type === "task")
      Object.assign(entry, { done: false, note, due: due || TODAY, time: time || null });
    if (type === "note") Object.assign(entry, { body });
    if (type === "calendar") Object.assign(entry, { date, time, isBirthday });
    if (type === "media") Object.assign(entry, { mediaType, mediaData: mediaFile });
    if (type === "link") Object.assign(entry, { url: url.trim() });

    onSave(entry);
  };

  // Kurzfassung der Verknüpfungen für den Button im Inhalt-Tab
  // ("Onboarding +2" bzw. "Verknüpfen", wenn nichts gewählt ist).
  const linkedNames = [
    ...cats.filter((c) => catIds.includes(c.id)).map((c) => c.name),
    ...Array.from(tagSet),
  ];
  const linkSummary =
    linkedNames.length === 0
      ? t.linkSheetTitle
      : linkedNames.length === 1
      ? linkedNames[0]
      : `${linkedNames[0]} +${linkedNames.length - 1}`;

  const tabBtn = (id, icon, text) => (
    <button
      type="button"
      className={`picker-sheet__tab${tab === id ? " picker-sheet__tab--active" : ""}`}
      style={tab === id ? { color: accentColor, borderColor: accentColor } : undefined}
      onClick={() => setTab(id)}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <div
      className="modal"
      onPointerDown={(e) => {
        backdropPressRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropPressRef.current && e.target === e.currentTarget) onClose();
        backdropPressRef.current = false;
      }}
    >
      <div className="modal__sheet modal__sheet--minimal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <div className="modal__header-left">
            {linkTab && (
              <button
                type="button"
                className="modal__back-btn"
                onClick={() => setLinkTab(null)}
                aria-label={t.backBtn || "Zurück"}
              >
                <ChevronLeft size={20} />
              </button>
            )}
          </div>
          <h3 className="modal__title">{linkTab ? t.linkSheetTitle : t.newLabel(label)}</h3>
          <div className="modal__header-right" />
        </div>

        {/* Tab-Leiste: im Verknüpfen-Modus die PARA-Typen, sonst Inhalt/Datum/Uhrzeit */}
        {linkTab ? (
          <LinkTabs tab={linkTab} onSelect={setLinkTab} t={t} />
        ) : schedulable ? (
          <div className="picker-sheet__tabs">
            {tabBtn("content", null, t.contentLabel || "Inhalt")}
            {tabBtn("date", <CalendarIcon size={14} />, t.dateLabel || "Datum")}
            {tabBtn("time", <ClockIcon size={14} />, t.timeLabel || "Uhrzeit")}
          </div>
        ) : null}

        {linkTab ? (
          <LinkList
            tab={linkTab}
            cats={cats}
            tagNames={tagNames}
            isCatSelected={(c) => catIds.includes(c.id)}
            isTagSelected={(name) => tagSet.has(name)}
            onToggleCat={toggleCat}
            onToggleTag={toggleTag}
            CC={CC}
            t={t}
            className="link-sheet__list--in-modal"
          />
        ) : tab === "date" ? (
          <div className="picker-sheet picker-sheet--in-modal">
            <CalendarPane t={t} value={dateValue} accent={accentColor} onPick={setDateValue} />
          </div>
        ) : tab === "time" ? (
          <div className="picker-sheet picker-sheet--in-modal">
            <ClockPane value={time || "12:00"} accent={accentColor} onDraft={(v) => setTime(v || "")} />
          </div>
        ) : (
          <div className="modal__fields">
            <input
              className="modal__input modal__input--title"
              autoFocus
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              onKeyDown={(e) => e.key === "Enter" && save()}
              style={{ borderColor: accentColor + "45" }}
            />

            {type === "task" && (
              <input
                className="modal__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.addNotePlaceholder}
              />
            )}

            {type === "note" && (
              <textarea
                className="modal__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.writeNotePlaceholder}
                rows={4}
              />
            )}

            {type === "calendar" && (
              <div className="modal__toggle-row">
                <label htmlFor="isBirthday">{t.birthday || "Geburtstag"}</label>
                <label className="modal__switch">
                  <input
                    type="checkbox"
                    id="isBirthday"
                    checked={isBirthday}
                    onChange={(e) => setIsBirthday(e.target.checked)}
                  />
                  <span className="modal__slider"></span>
                </label>
              </div>
            )}

            {type === "media" && (
              <div className="modal__media-grid">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                {MEDIA_TYPES.map((m) => (
                  <button
                    key={m.id}
                    className={`modal__media-grid-btn ${
                      mediaType === m.id ? "modal__media-grid-btn--active" : ""
                    }`}
                    onClick={() => handleMediaGridClick(m.id)}
                    style={{ color: mediaType === m.id ? m.color : "#8a8a96" }}
                  >
                    <div className="icon-wrapper" style={{ background: m.color }}>
                      <m.Icon size={18} />
                    </div>
                    <span>{t[m.labelKey]}</span>
                  </button>
                ))}
              </div>
            )}

            {type === "link" && (
              <input
                className="modal__input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                style={{ borderColor: accentColor + "45" }}
              />
            )}

            {/* Verknüpfen: öffnet die PARA-/Tag-Auswahl im selben Sheet */}
            <button
              type="button"
              className={`modal__link-btn${linkedNames.length ? " modal__link-btn--has-selection" : ""}`}
              onClick={() => setLinkTab(LINK_TABS[0])}
            >
              <GitMergeBranchIcon size={16} strokeWidth={2} />
              <span>{linkSummary}</span>
              <ChevronLeft size={14} style={{ transform: "rotate(180deg)", marginLeft: "auto" }} />
            </button>
          </div>
        )}

        <SheetFooter onClose={onClose} closeLabel={t.cancel || "Schließen"}>
          <button
            className={`modal__submit ${!title.trim() ? "modal__submit--disabled" : ""}`}
            onClick={save}
            style={{ background: accentColor }}
          >
            {t.create || "Erstellen"}
          </button>
        </SheetFooter>
      </div>
    </div>
  );
}
