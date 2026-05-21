import { useEffect, useMemo } from "react";

const CONFETTI_PIECE_COUNT = 40;
const CONFETTI_TYPES = ["circle", "rect", "star"];

const TASK_DONE_AUTO_DISMISS_MS = 10_000;
const BIRTHDAY_AUTO_DISMISS_MS = 12_000;

const TASK_DONE_PALETTE = ["#7C83F7", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"];
const BIRTHDAY_PALETTE = ["#F472B6", "#F59E0B", "#10B981", "#7C83F7", "#3B82F6"];

function generateConfetti(palette) {
  return Array.from({ length: CONFETTI_PIECE_COUNT }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + "%",
    delay: Math.random() * 2 + "s",
    duration: Math.random() * 2 + 2 + "s",
    color: palette[Math.floor(Math.random() * palette.length)],
    type: CONFETTI_TYPES[Math.floor(Math.random() * CONFETTI_TYPES.length)],
    size: Math.random() * 10 + 5 + "px",
  }));
}

function ConfettiBurst({ palette }) {
  const pieces = useMemo(() => generateConfetti(palette), [palette]);
  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={`confetti-piece confetti-piece--${p.type}`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            color: p.color,
            background: p.type !== "star" ? p.color : "transparent",
            width: p.size,
            height: p.type === "rect" ? parseFloat(p.size) * 1.5 + "px" : p.size,
          }}
        />
      ))}
    </div>
  );
}

function useAutoDismiss(callback, delay) {
  useEffect(() => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  }, [callback, delay]);
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 11 3 11 7C11 8 11.5 9 12 9C12.5 9 13 8 13 7C13 3 12 2 12 2Z"
        fill="#F59E0B"
      />
      <path
        d="M12 22C12 22 13 21 13 17C13 16 12.5 15 12 15C11.5 15 11 16 11 17C11 21 12 22 12 22Z"
        fill="#EF4444"
      />
      <path
        d="M17 12C17 12 16 11 12 11C8 11 7 12 7 12C7 12 6 13 6 17C6 21 12 22 12 22C12 22 18 21 18 17C18 13 17 12 17 12Z"
        fill="#7C83F7"
      />
      <path
        d="M12 15C13.1046 15 14 14.1046 14 13C14 11.8954 13.1046 11 12 11C10.8954 11 10 11.8954 10 13C10 14.1046 10.8954 15 12 15Z"
        fill="white"
        fillOpacity="0.3"
      />
      <circle cx="12" cy="13" r="1.5" fill="white" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20H20V12H4V20Z" fill="#F472B6" />
      <path
        d="M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12V14H4V12Z"
        fill="#FBCFE8"
      />
      <path
        d="M6 10V8C6 6.89543 6.89543 6 8 6H16C17.1046 6 18 6.89543 18 8V10"
        stroke="#F472B6"
        strokeWidth="2"
      />
      <path d="M12 6V3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="2" r="1" fill="#EF4444" />
      <rect x="2" y="20" width="20" height="2" fill="#E5E7EB" />
    </svg>
  );
}

export function TaskDoneCelebration({ t, count, onClose }) {
  useAutoDismiss(onClose, TASK_DONE_AUTO_DISMISS_MS);

  return (
    <div className="task-done-overlay" onClick={onClose}>
      <ConfettiBurst palette={TASK_DONE_PALETTE} />
      <div className="task-done-card" onClick={(e) => e.stopPropagation()}>
        <div className="task-done-card__rocket">
          <RocketIcon />
        </div>
        <h2 className="task-done-card__title">{t.taskDone}</h2>
        <p className="task-done-card__message">{t.taskDoneMessage}</p>
        <div className="task-done-card__counter">
          <span>{t.taskDoneCount(count)}</span>
        </div>
        <button className="task-done-card__close-btn" onClick={onClose}>
          {t.taskDoneClose}
        </button>
      </div>
    </div>
  );
}

export function BirthdayCelebration({ t, entry, userName, onClose }) {
  useAutoDismiss(onClose, BIRTHDAY_AUTO_DISMISS_MS);

  return (
    <div className="task-done-overlay" onClick={onClose}>
      <ConfettiBurst palette={BIRTHDAY_PALETTE} />
      <div className="task-done-card" onClick={(e) => e.stopPropagation()}>
        <div className="task-done-card__rocket">
          <CakeIcon />
        </div>
        <h2 className="task-done-card__title">{t.birthdayCreated(entry.title, userName)}</h2>
        <p className="task-done-card__message" style={{ whiteSpace: "pre-line" }}>
          {t.birthdayMessage}
        </p>
        <button className="task-done-card__close-btn" onClick={onClose}>
          {t.birthdayGotIt}
        </button>
      </div>
    </div>
  );
}
