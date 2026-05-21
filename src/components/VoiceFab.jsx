import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const TAB_TITLES = {
  notes: {
    de: "Notiz per Spracheingabe hinzufügen",
    en: "Add note via voice",
    es: "Añadir nota por voz",
  },
  calendar: {
    de: "Termin per Spracheingabe hinzufügen",
    en: "Add event via voice",
    es: "Añadir evento por voz",
  },
  tasks: {
    de: "Aufgabe per Spracheingabe hinzufügen",
    en: "Add task via voice",
    es: "Añadir tarea por voz",
  },
};

export function VoiceFab({ tab, tabColor, lang, onTranscribed }) {
  const { isListening, start } = useSpeechRecognition(lang, onTranscribed);
  const title = (TAB_TITLES[tab] || TAB_TITLES.tasks)[lang] || TAB_TITLES.tasks.en;

  return (
    <div className="voice-fab-container">
      <button
        className={`voice-fab ${isListening ? "voice-fab--listening" : ""}`}
        onClick={start}
        style={{
          border: `1.5px solid ${tabColor}73`,
          boxShadow: isListening
            ? "0 0 30px rgba(239, 68, 68, 0.6)"
            : `inset 0 0 22px ${tabColor}38, 0 8px 32px rgba(15, 15, 30, 0.55)`,
        }}
        title={title}
      >
        {isListening && <div className="voice-fab__pulse-ring" />}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tabColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="24"
          height="24"
          className="voice-fab__icon"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>
    </div>
  );
}
