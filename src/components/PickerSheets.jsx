import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSheetSwipeClose } from "./useSheetSwipeClose";

const pad = (n) => String(n).padStart(2, "0");

// Gemeinsamer Rahmen der Picker: Frosted-Glass-Bottom-Sheet im Look der
// übrigen Sheets (`.link-sheet`-Overlay/Animationen) mit eigenem Glas-Panel.
function PickerShell({ title, onClose, children }) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipe = useSheetSwipeClose(handleClose);

  return createPortal(
    <div
      className={`link-sheet ${closing ? "link-sheet--closing" : ""}`}
      onClick={handleClose}
      {...swipe}
    >
      <div
        className={`link-sheet__panel link-sheet__panel--compact picker-sheet__panel ${closing ? "link-sheet__panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="link-sheet__handle" />
        <div className="link-sheet__title">{title}</div>
        {/* children bekommen die Close-Funktion, damit Auswahl-Aktionen mit
            derselben Slide-down-Animation schließen können. */}
        {children(handleClose)}
      </div>
    </div>,
    document.body,
  );
}

// ── Kalender (Monatsansicht) – wird von Einzel- und Kombi-Sheet genutzt ──
// Exportiert, weil das Erstellen-Sheet (CreateModal) dieselben Panes in
// seinen eigenen Subtabs rendert statt ein zweites Sheet zu öffnen.
export function CalendarPane({ t, value, accent, onPick }) {
  const init = value ? new Date(value + "T12:00") : new Date();
  const [viewY, setViewY] = useState(init.getFullYear());
  const [viewM, setViewM] = useState(init.getMonth());

  // Wochentags-Kopfzeile, montags beginnend (2024-01-01 war ein Montag).
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(t.locale, { weekday: "short" });
    return [...Array(7)].map((_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [t.locale]);

  const monthLabel = new Intl.DateTimeFormat(t.locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewY, viewM, 1));

  // Führende Leerzellen (Mo=0 … So=6) + Tage des Monats.
  const leading = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const shiftMonth = (delta) => {
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };

  return (
    <>
      <div className="picker-sheet__weekdays">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="picker-sheet__grid">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const str = `${viewY}-${pad(viewM + 1)}-${pad(day)}`;
          const isSel = str === value;
          const isToday = str === todayStr;
          return (
            <button
              key={day}
              className={`picker-sheet__day${isSel ? " picker-sheet__day--selected" : ""}${isToday && !isSel ? " picker-sheet__day--today" : ""}`}
              style={isSel ? { background: accent } : isToday ? { color: accent, borderColor: accent } : undefined}
              onClick={() => onPick(str)}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Monatswechsel unten */}
      <div className="picker-sheet__monthnav">
        <button className="picker-sheet__nav-btn" onClick={() => shiftMonth(-1)} aria-label="‹">
          <ChevronLeft size={18} />
        </button>
        <span className="picker-sheet__month-label">{monthLabel}</span>
        <button className="picker-sheet__nav-btn" onClick={() => shiftMonth(1)} aria-label="›">
          <ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}

// ── Ziffernblatt (Google-Stil) – äußerer Ring 12–23, innerer 0–11 ──
export function ClockPane({ value, accent, onDraft }) {
  const hour = value ? parseInt(value.split(":")[0], 10) : 12;
  const minute = value ? parseInt(value.split(":")[1], 10) : 0;
  const [mode, setMode] = useState("hour");
  const svgRef = useRef(null);
  const dragging = useRef(false);

  // Geometrie des Ziffernblatts (viewBox 260×260).
  const C = 130;
  const R_OUTER = 100;
  const R_INNER = 62;

  const posFor = (angleDeg, r) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
  };

  const hand =
    mode === "hour"
      ? posFor((hour % 12) * 30, hour < 12 ? R_INNER : R_OUTER)
      : posFor(minute * 6, R_OUTER);

  // Fingerposition → Wert (Winkel + Ringabstand)
  const applyPointer = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = 260 / rect.width;
    const dx = (clientX - rect.left) * scale - C;
    const dy = (clientY - rect.top) * scale - C;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    if (mode === "hour") {
      const idx = Math.round(angle / 30) % 12;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inner = dist < (R_INNER + R_OUTER) / 2;
      onDraft(`${pad(inner ? idx : idx + 12)}:${pad(minute)}`);
    } else {
      onDraft(`${pad(hour)}:${pad(Math.round(angle / 6) % 60)}`);
    }
  };

  const onDown = (e) => {
    dragging.current = true;
    // Kann bei synthetischen/abgelaufenen Pointern werfen – Auswahl darf
    // davon nicht abbrechen.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* egal */ }
    applyPointer(e.clientX, e.clientY);
  };
  const onMove = (e) => {
    if (dragging.current) applyPointer(e.clientX, e.clientY);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // Nach der Stundenwahl automatisch zu den Minuten weiter (Google-Stil).
    if (mode === "hour") setMode("minute");
  };

  return (
    <>
      {/* Digitalanzeige: Segmente wechseln zwischen Stunden-/Minutenwahl */}
      <div className="picker-sheet__digital">
        <button
          className={`picker-sheet__digit${mode === "hour" ? " picker-sheet__digit--active" : ""}`}
          style={mode === "hour" ? { color: accent } : undefined}
          onClick={() => setMode("hour")}
        >
          {pad(hour)}
        </button>
        <span className="picker-sheet__digit-sep">:</span>
        <button
          className={`picker-sheet__digit${mode === "minute" ? " picker-sheet__digit--active" : ""}`}
          style={mode === "minute" ? { color: accent } : undefined}
          onClick={() => setMode("minute")}
        >
          {pad(minute)}
        </button>
      </div>

      <svg
        ref={svgRef}
        className="picker-sheet__clock"
        viewBox="0 0 260 260"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <circle className="picker-sheet__clock-bg" cx={C} cy={C} r={124} />
        {/* Zeiger */}
        <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke={accent} strokeWidth="2" />
        <circle cx={C} cy={C} r="3.5" fill={accent} />
        <circle cx={hand.x} cy={hand.y} r="16" fill={accent} opacity="0.92" />

        {mode === "hour" ? (
          <>
            {/* Äußerer Ring: 12–23 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const h = i + 12;
              const p = posFor(i * 30, R_OUTER);
              return (
                <text
                  key={`o${h}`}
                  x={p.x}
                  y={p.y}
                  className={`picker-sheet__clock-num${hour === h ? " picker-sheet__clock-num--selected" : ""}`}
                >
                  {h}
                </text>
              );
            })}
            {/* Innerer Ring: 0–11 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const p = posFor(i * 30, R_INNER);
              return (
                <text
                  key={`i${i}`}
                  x={p.x}
                  y={p.y}
                  className={`picker-sheet__clock-num picker-sheet__clock-num--inner${hour === i ? " picker-sheet__clock-num--selected" : ""}`}
                >
                  {pad(i)}
                </text>
              );
            })}
          </>
        ) : (
          // Minuten: Beschriftung alle 5 Minuten
          Array.from({ length: 12 }).map((_, i) => {
            const m = i * 5;
            const p = posFor(m * 6, R_OUTER);
            return (
              <text
                key={`m${m}`}
                x={p.x}
                y={p.y}
                className={`picker-sheet__clock-num${minute === m ? " picker-sheet__clock-num--selected" : ""}`}
              >
                {pad(m)}
              </text>
            );
          })
        )}
      </svg>
    </>
  );
}

/**
 * Reiner Datums-Picker (z.B. Datum-Tag in der Projektliste): Kalender +
 * Fußzeile mit Entfernen/Schließen. Tap auf einen Tag wählt und schließt.
 */
export function DatePickerSheet({ t, value, accent = "#0B8CE9", title, onSelect, onClose }) {
  return (
    <PickerShell title={title || t.scheduledLabel || "Terminiert"} onClose={onClose}>
      {(close) => (
        <div className="picker-sheet">
          <CalendarPane
            t={t}
            value={value}
            accent={accent}
            onPick={(str) => {
              close();
              setTimeout(() => onSelect?.(str), 180);
            }}
          />
          <div className="picker-sheet__footer">
            <button
              className="picker-sheet__action"
              onClick={() => {
                close();
                if (value) setTimeout(() => onSelect?.(null), 180);
              }}
            >
              {value ? t.pickerRemove || "Entfernen" : t.closeBtn || "Schließen"}
            </button>
          </div>
        </div>
      )}
    </PickerShell>
  );
}

/**
 * Kombinierter Terminierungs-Picker: EIN Sheet mit den Subtabs "Datum" und
 * "Uhrzeit" – genutzt von den Cover-Icons UND der Miniatur-Terminierung im
 * gepinnten Header. Datumswahl schreibt sofort; die Uhrzeit wird beim Tab-
 * Wechsel bzw. mit "Fertig" übernommen.
 *
 * Props: t · date ("YYYY-MM-DD"|null) · time ("HH:MM"|null) · accent ·
 *        initialTab ("date"|"time") · onChangeDate(d|null) ·
 *        onChangeTime(v|null) · onClose()
 */
export function SchedulePickerSheet({
  t,
  date,
  time,
  accent = "#0B8CE9",
  initialTab = "date",
  onChangeDate,
  onChangeTime,
  onClose,
}) {
  const [tab, setTab] = useState(initialTab);
  // Uhrzeit-Entwurf: live vom Ziffernblatt, committet bei Fertig/Tab-Wechsel.
  const [draftTime, setDraftTime] = useState(time || null);

  const commitTime = () => {
    const next = draftTime || null;
    if (next !== (time || null)) onChangeTime?.(next);
  };

  const switchTab = (next) => {
    if (next === tab) return;
    if (tab === "time") commitTime();
    setTab(next);
  };

  const tabBtn = (id, label) => (
    <button
      className={`picker-sheet__tab${tab === id ? " picker-sheet__tab--active" : ""}`}
      style={tab === id ? { color: accent, borderColor: accent } : undefined}
      onClick={() => switchTab(id)}
    >
      {label}
    </button>
  );

  return (
    <PickerShell title={t.scheduledLabel || "Terminiert"} onClose={onClose}>
      {(close) => (
        <div className="picker-sheet">
          {/* Subtabs: Datum · Uhrzeit */}
          <div className="picker-sheet__tabs">
            {tabBtn("date", t.dateLabel || "Datum")}
            {tabBtn("time", t.timeLabel || "Uhrzeit")}
          </div>

          {tab === "date" ? (
            <CalendarPane
              t={t}
              value={date}
              accent={accent}
              onPick={(str) => onChangeDate?.(str)}
            />
          ) : (
            <ClockPane value={draftTime || "12:00"} accent={accent} onDraft={setDraftTime} />
          )}

          <div className="picker-sheet__footer">
            <button
              className="picker-sheet__action"
              onClick={() => {
                if (tab === "date") {
                  onChangeDate?.(null);
                } else {
                  setDraftTime(null);
                  onChangeTime?.(null);
                }
              }}
            >
              {t.pickerRemove || "Entfernen"}
            </button>
            <button
              className="picker-sheet__confirm"
              style={{ background: accent }}
              onClick={() => {
                commitTime();
                close();
              }}
            >
              {t.pickerDone || "Fertig"}
            </button>
          </div>
        </div>
      )}
    </PickerShell>
  );
}
