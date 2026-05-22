import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const ACCENT_RGB = {
  tasks: "124, 131, 247",
  notes: "245, 158, 11",
  calendar: "29, 78, 216",
};

const CHIP_CONFIG = {
  tasks: { key: "voiceCreateTask", type: "task" },
  notes: { key: "voiceCreateNote", type: "note" },
  calendar: { key: "voiceCreateEvent", type: "calendar" },
};

/* Rounded 4-pointed sparkle path */
const SPARKLE_PATH = "M20,4 Q22,17 36,20 Q22,23 20,36 Q18,23 4,20 Q18,17 20,4Z";

/* Visualizer bar heights for WhisperFlow-style animation */
const BAR_HEIGHTS = [8,18,28,14,34,22,10,30,16,26,12,36,20,32,8,24,18,34,14,28,10,22,30,16];

export function VoiceOverlay({ t, tab, tabColor, userName, lang, onTranscribed, onClose, onCreateEntry }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const didAutoStart = useRef(false);

  const handleSpeechResult = useCallback((transcript) => setText(transcript), []);
  const { isListening, start } = useSpeechRecognition(lang, handleSpeechResult);

  // Auto-focus input + auto-start mic on mount
  useEffect(() => {
    inputRef.current?.focus();
    if (!didAutoStart.current) {
      didAutoStart.current = true;
      // Small delay to ensure we're within user-gesture context
      const timer = setTimeout(() => start(), 80);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onTranscribed(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const accentRgb = ACCENT_RGB[tab] || ACCENT_RGB.tasks;
  const chipCfg = CHIP_CONFIG[tab] || CHIP_CONFIG.tasks;
  const hasText = text.trim().length > 0;

  return (
    <div
      className="voice-overlay"
      style={{ "--vo-accent-rgb": accentRgb, "--vo-accent-solid": tabColor }}
    >
      <div className="voice-overlay__body">
        {/* ── Center content ───────────────────────────── */}
        <div className="voice-overlay__content">
          {/* Multiple sparkles (twinkling cluster) */}
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

          <div className="voice-overlay__greeting">
            {t.voiceCommandPrefix}{" "}
            <strong>{t.voiceCommandKeyword}</strong>
          </div>

          <div className="voice-overlay__hint">
            {t.voiceHint}
          </div>

          <div className="voice-overlay__chips">
            <button className="voice-overlay__chip" onClick={() => onCreateEntry(chipCfg.type)}>
              {t[chipCfg.key]}
            </button>
          </div>

          {/* Invisible input – cursor floats 16px below chip */}
          <input
            ref={inputRef}
            className="voice-overlay__input"
            type="text"
            placeholder=""
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="voice-overlay__gradient" />

        {/* ── Bottom bar: close / visualizer / mic ──────── */}
        <div className={`voice-overlay__bottom-bar ${isListening ? "voice-overlay__bottom-bar--listening" : ""}`}>
          <button className="voice-overlay__close-btn" onClick={onClose}>
            <X size={22} />
          </button>

          <div className="voice-overlay__visualizer">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="voice-overlay__vis-bar"
                style={{ "--bar-h": `${h}px`, "--bar-delay": `${i * 0.04}s` }}
              />
            ))}
          </div>

          {hasText ? (
            <button className="voice-overlay__mic-btn voice-overlay__mic-btn--send" onClick={handleSubmit} style={{ background: tabColor }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          ) : (
            <button
              className={`voice-overlay__mic-btn ${isListening ? "voice-overlay__mic-btn--listening" : ""}`}
              onClick={start}
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
