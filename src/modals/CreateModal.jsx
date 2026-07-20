import { useState, useRef } from "react";
import {
  ChevronLeft,
  Check,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Video as VideoIcon,
  Headphones as AudioIcon,
  File as DocumentIcon,
  Image as ImageIcon,
} from "lucide-react";
import { TODAY, CAT_ICONS, ID_BIRTHDAYS } from "../utils";
import { SheetFooter } from "../components/SheetFooter";
import { SchedulePickerSheet } from "../components/PickerSheets";

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

const MULTI_SELECT_PREVIEW_LIMIT = 2;

export function CreateModal({ type, cats, initialCatId, onSave, onClose, t, CC }) {
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
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);
  // Terminierungs-Picker (Glas-Sheet mit Kalender/Ziffernblatt): "date"|"time"|null
  const [pickerTab, setPickerTab] = useState(null);
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

  const toggleCat = (id) =>
    setCatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Beschriftung der Terminierungs-Pillen (z.B. "19. Juli")
  const fmtDate = (str) =>
    new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long" }).format(
      new Date(str + "T12:00"),
    );

  // Datum-/Uhrzeit-Pillen im Stil des Terminiert-Sheets: öffnen den
  // Glas-Picker (Kalender/Ziffernblatt) statt der nativen Browser-Inputs.
  const scheduleRow = (dateVal, timeVal) => (
    <div className="modal__schedule-row">
      <button
        type="button"
        className={`modal__schedule-btn${dateVal ? " modal__schedule-btn--set" : ""}`}
        onClick={() => setPickerTab("date")}
      >
        <CalendarIcon size={15} />
        <span>{dateVal ? fmtDate(dateVal) : t.dateLabel || "Datum"}</span>
      </button>
      <button
        type="button"
        className={`modal__schedule-btn${timeVal ? " modal__schedule-btn--set" : ""}`}
        onClick={() => setPickerTab("time")}
      >
        <ClockIcon size={15} />
        <span>{timeVal || t.timeLabel || "Uhrzeit"}</span>
      </button>
    </div>
  );

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

    if (type === "task")
      Object.assign(entry, { done: false, note, due: due || TODAY, time: time || null });
    if (type === "note") Object.assign(entry, { body });
    if (type === "calendar") Object.assign(entry, { date, time, isBirthday });
    if (type === "media") Object.assign(entry, { mediaType, mediaData: mediaFile });
    if (type === "link") Object.assign(entry, { url: url.trim() });

    onSave(entry);
  };

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
          <div className="modal__header-left" />
          <h3 className="modal__title">{t.newLabel(label)}</h3>
          <div className="modal__header-right" />
        </div>

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
          <>
            <input
              className="modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.addNotePlaceholder}
            />
            {scheduleRow(due, time)}
          </>
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
          <>
            {scheduleRow(date, time)}
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
          </>
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

        <CategoryMultiSelect
          cats={cats}
          catIds={catIds}
          isOpen={catDropOpen}
          onToggleOpen={() => setCatDropOpen((o) => !o)}
          onToggleCat={toggleCat}
          CC={CC}
          t={t}
        />
        </div>

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

      {/* Terminierungs-Picker (portalt auf document.body, liegt über dem Modal) */}
      {pickerTab && (
        <SchedulePickerSheet
          t={t}
          date={type === "task" ? due || null : date}
          time={time || null}
          accent={accentColor}
          initialTab={pickerTab}
          onChangeDate={(d) => {
            if (type === "task") setDue(d || "");
            else setDate(d || TODAY);
          }}
          onChangeTime={(v) => setTime(v || "")}
          onClose={() => setPickerTab(null)}
        />
      )}
    </div>
  );
}

function CategoryMultiSelect({ cats, catIds, isOpen, onToggleOpen, onToggleCat, CC, t }) {
  const selectedNames = cats.filter((c) => catIds.includes(c.id)).map((c) => c.name);
  const summary =
    selectedNames.length === 0
      ? t.noProject
      : selectedNames.length <= MULTI_SELECT_PREVIEW_LIMIT
      ? selectedNames.join(", ")
      : `${selectedNames.slice(0, MULTI_SELECT_PREVIEW_LIMIT).join(", ")} +${
          selectedNames.length - MULTI_SELECT_PREVIEW_LIMIT
        }`;

  return (
    <div className="modal__multi-select" style={{ position: "relative" }}>
      <button
        className={`modal__multi-select-btn ${
          catIds.length > 0 ? "modal__multi-select-btn--has-selection" : ""
        }`}
        onClick={onToggleOpen}
        type="button"
      >
        <span>{summary}</span>
        <ChevronLeft
          size={14}
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }}
          color="#8a8a96"
        />
      </button>
      {isOpen && (
        <div className="modal__multi-select-list">
          {cats.map((c) => {
            const isSelected = catIds.includes(c.id);
            const chipColor = CC[c.type]?.color || "#8a8a96";
            const CIcon = CAT_ICONS[c.type];
            return (
              <button
                key={c.id}
                className={`modal__multi-select-item ${
                  isSelected ? "modal__multi-select-item--selected" : ""
                }`}
                onClick={() => onToggleCat(c.id)}
                type="button"
              >
                <span
                  className="modal__multi-select-check"
                  style={isSelected ? { background: chipColor, borderColor: chipColor } : {}}
                >
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                </span>
                {CIcon && <CIcon size={14} color={chipColor} strokeWidth={2.5} />}
                <span className="modal__multi-select-name">
                  {CC[c.type].sing}: {c.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
