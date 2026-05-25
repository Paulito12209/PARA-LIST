import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";

const ACCENT_RGB = {
  tasks: "124, 131, 247",
  notes: "245, 158, 11",
  calendar: "29, 78, 216",
};

const SPARKLE_PATH = "M20,4 Q22,17 36,20 Q22,23 20,36 Q18,23 4,20 Q18,17 20,4Z";
const BAR_HEIGHTS = [8,18,28,14,34,22,10,30,16,26,12,36,20,32,8,24,18,34,14,28,10,22,30,16];
const LOCALE_MAP = { de: "de-DE", en: "en-US", es: "es-ES" };

function renderHighlighted(text, color) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="voice-overlay__keyword" style={{ color }}>{part}</span>
      : part
  );
}

const TRIGGER_NEXT = {
  de: ["weiter", "ja", "datum"],
  en: ["next", "continue", "yes", "date"],
  es: ["siguiente", "continuar", "s\u00ed", "si", "fecha"],
};
const TRIGGER_DONE = {
  de: ["fertig", "ja", "okay", "ok"],
  en: ["done", "finish", "yes", "okay", "ok"],
  es: ["listo", "terminar", "s\u00ed", "si", "vale"],
};

const WEEKDAYS = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  es: ["Lu", "Ma", "Mi", "Ju", "Vi", "S\u00e1", "Do"],
};

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr() {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

export function VoiceOverlay({ t, tab, tabColor, accentRgb: accentRgbProp, lang, onTranscribed, onClose }) {
  const [phase, setPhase] = useState("title"); // "title" | "date"
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const inputRef = useRef(null);
  const recRef = useRef(null);
  const activeRef = useRef(true);
  const errorCountRef = useRef(0);

  // Refs to avoid stale closures in SpeechRecognition callbacks
  const stateRef = useRef({ phase: "title", text: "", lang, selectedDate: todayStr() });
  stateRef.current = { phase, text, lang, selectedDate };

  const handleResultRef = useRef(null);
  handleResultRef.current = (transcript) => {
    const lower = transcript.toLowerCase().trim();
    const { phase: p, lang: l, text: currentText, selectedDate: sd } = stateRef.current;
    errorCountRef.current = 0;

    if (p === "title") {
      const nextWords = TRIGGER_NEXT[l] || TRIGGER_NEXT.en;
      if (currentText.trim()) {
        // Title already set → only listen for trigger words to proceed
        if (nextWords.includes(lower)) {
          setPhase("date");
          navigator.vibrate?.([15, 40, 15]);
        }
        // Otherwise ignore – don't overwrite the title
      } else {
        // No title yet → set it
        setText(transcript);
        navigator.vibrate?.([15, 40, 15]);
      }
    } else if (p === "date") {
      const doneWords = TRIGGER_DONE[l] || TRIGGER_DONE.en;
      if (doneWords.includes(lower)) {
        const trimmed = currentText.trim();
        if (trimmed) onTranscribed(trimmed, sd);
      }
    }
  };

  // ── Speech Recognition ──────────────────────────────────────
  const startListeningRef = useRef(null);
  startListeningRef.current = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !activeRef.current) return;

    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
    }

    const rec = new SR();
    rec.lang = LOCALE_MAP[stateRef.current.lang] || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsListening(true);

    rec.onresult = (event) => {
      const txt = event.results[0][0].transcript?.trim();
      if (txt) handleResultRef.current?.(txt);
    };

    rec.onerror = (err) => {
      console.error("SR error:", err.error);
      setIsListening(false);
      errorCountRef.current++;
    };

    rec.onend = () => {
      setIsListening(false);
      if (activeRef.current && errorCountRef.current < 5) {
        setTimeout(() => startListeningRef.current?.(), 350);
      }
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch (e) {
      console.error("Failed to start SR:", e);
    }
  };

  // Start listening on mount
  useEffect(() => {
    const timer = setTimeout(() => startListeningRef.current?.(), 60);
    return () => {
      clearTimeout(timer);
      activeRef.current = false;
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
      }
    };
  }, []);

  // No auto-focus – voice overlay uses speech, not keyboard

  // Escape to close
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onTranscribed(trimmed, phase === "date" ? selectedDate : todayStr());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

  const accentRgb = accentRgbProp || ACCENT_RGB[tab] || ACCENT_RGB.tasks;
  const hasText = text.trim().length > 0;
  const today = todayStr();

  // ── Calendar helpers ────────────────────────────────────────
  const firstDay = new Date(calMonth.year, calMonth.month, 1);
  const lastDay = new Date(calMonth.year, calMonth.month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  const calDays = [];
  for (let i = 0; i < startDow; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString(
    LOCALE_MAP[lang] || "en-US",
    { month: "long", year: "numeric" }
  );
  const weekdays = WEEKDAYS[lang] || WEEKDAYS.en;

  const prevMonth = () =>
    setCalMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const nextMonthFn = () =>
    setCalMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="voice-overlay" style={{ "--vo-accent-rgb": accentRgb, "--vo-accent-solid": tabColor }}>
      <div className="voice-overlay__body">
        {phase === "title" && (
          <div className="voice-overlay__speak-clear">{t.voiceSpeakClear}</div>
        )}

        <div className={`voice-overlay__content voice-overlay__content--${phase}`}>

          {/* ── Phase: title ── */}
          {phase === "title" && (
            <>
              <div className="voice-overlay__sparkles">
                <svg className="voice-overlay__sparkle voice-overlay__sparkle--1" width="22" height="22" viewBox="0 0 40 40" fill="none">
                  <path d={SPARKLE_PATH} fill={tabColor} opacity="0.8" />
                </svg>
                <svg className="voice-overlay__sparkle voice-overlay__sparkle--2" width="12" height="12" viewBox="0 0 40 40" fill="none">
                  <path d={SPARKLE_PATH} fill={tabColor} opacity="0.55" />
                </svg>
                <svg className="voice-overlay__sparkle voice-overlay__sparkle--3" width="8" height="8" viewBox="0 0 40 40" fill="none">
                  <path d={SPARKLE_PATH} fill={tabColor} opacity="0.4" />
                </svg>
              </div>
              <input
                ref={inputRef}
                className="voice-overlay__input"
                type="text"
                placeholder=""
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </>
          )}

          {/* ── Phase: date ── */}
          {phase === "date" && (
            <>
              <div className="voice-overlay__title-display">{text}</div>
              <div className="voice-overlay__calendar">
                <div className="voice-overlay__cal-header">
                  <button className="voice-overlay__cal-nav" onClick={prevMonth}>
                    <ChevronLeft size={18} />
                  </button>
                  <span className="voice-overlay__cal-month">{monthLabel}</span>
                  <button className="voice-overlay__cal-nav" onClick={nextMonthFn}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="voice-overlay__cal-weekdays">
                  {weekdays.map((d) => (
                    <span key={d} className="voice-overlay__cal-wd">{d}</span>
                  ))}
                </div>
                <div className="voice-overlay__cal-grid">
                  {calDays.map((day, i) => {
                    if (day === null) return <span key={`e${i}`} className="voice-overlay__cal-empty" />;
                    const dateStr = toDateStr(calMonth.year, calMonth.month, day);
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button
                        key={dateStr}
                        className={`voice-overlay__cal-day${isToday ? " voice-overlay__cal-day--today" : ""}${isSelected ? " voice-overlay__cal-day--selected" : ""}`}
                        onClick={() => setSelectedDate(dateStr)}
                        style={isSelected ? { background: tabColor, borderColor: tabColor } : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button className="voice-overlay__done-hint" onClick={handleSubmit}>
                {renderHighlighted(t.voiceDone, tabColor)}
              </button>
            </>
          )}
        </div>

        <div className="voice-overlay__gradient" />

        {/* Hinweis nur, sobald ein Titel gesprochen/getippt wurde: dann weiß der
            Nutzer, dass er per „Weiter" zur Datumsauswahl gelangt. */}
        {phase === "title" && hasText && (
          <div className="voice-overlay__search-hint">
            {renderHighlighted(t.voiceContinueDate, tabColor)}
          </div>
        )}

        {/* ── Bottom bar ── */}
        <div className={`voice-overlay__bottom-bar ${isListening ? "voice-overlay__bottom-bar--listening" : ""}`}>
          <button className="voice-overlay__close-btn" onClick={onClose}>
            <X size={22} />
          </button>

          <div className="voice-overlay__visualizer">
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="voice-overlay__vis-bar" style={{ "--bar-h": `${h}px`, "--bar-delay": `${i * 0.04}s` }} />
            ))}
          </div>

          {hasText && phase === "title" ? (
            <button className="voice-overlay__mic-btn voice-overlay__mic-btn--send" onClick={handleSubmit} style={{ background: tabColor }}>
              <ArrowUp size={22} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              className={`voice-overlay__mic-btn ${isListening ? "voice-overlay__mic-btn--listening" : ""}`}
              onClick={() => startListeningRef.current?.()}
              style={{ background: tabColor }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
