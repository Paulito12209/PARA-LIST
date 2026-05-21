import { useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { clear } from "idb-keyval";

const VIEW_MAIN = "main";
const VIEW_PROFILE = "profile";
const VIEW_FEEDBACK = "feedback";

const FEEDBACK_EMAIL = "kontakt@paulangeles.com";

const LANGUAGES = [
  { code: "de", flag: "🇩🇪" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
];

const FEEDBACK_TYPES = (t) => [
  { id: "bug", label: t.bug, desc: t.bugDesc, subject: "Bug" },
  { id: "improvement", label: t.improvement, desc: t.improvementDesc, subject: "Verbesserung" },
  { id: "feature", label: t.feature, desc: t.featureDesc, subject: "Feature" },
];

export function SettingsModal({
  user,
  theme,
  setTheme,
  lang,
  setLang,
  t,
  onClose,
  onUpdateUser,
}) {
  const [view, setView] = useState(VIEW_MAIN);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdateUser({ avatar: reader.result });
    reader.readAsDataURL(file);
  };

  const sendFeedback = () => {
    const typeConfig = FEEDBACK_TYPES(t).find((ft) => ft.id === feedbackType);
    const subject = `Feedback: ${typeConfig?.subject || "Feedback"}`;
    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(feedbackText)}`;
    window.location.href = mailto;
  };

  const handleDeleteApp = async () => {
    if (!window.confirm(t.deleteConfirm)) return;
    localStorage.clear();
    try {
      await clear();
    } catch (err) {
      console.error("Failed to clear idb", err);
    }
    window.location.reload();
  };

  const titleByView = {
    [VIEW_MAIN]: t.settings,
    [VIEW_PROFILE]: t.personalData,
    [VIEW_FEEDBACK]: t.feedback,
  };

  return (
    <div className="modal" onClick={onClose}>
      <div
        className={`modal__sheet settings-modal ${view !== VIEW_MAIN ? "settings-modal--sub" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__handle" />
        <div className="modal__header">
          <div className="modal__header-left">
            {view === VIEW_FEEDBACK && (
              <button className="settings-modal__back-inline" onClick={() => setView(VIEW_MAIN)}>
                <ChevronLeft size={20} color="#5858A0" />
              </button>
            )}
          </div>
          <h3 className="modal__title">{titleByView[view]}</h3>
          <div className="modal__header-right" />
        </div>

        {view === VIEW_MAIN && (
          <MainSettingsView
            user={user}
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
            t={t}
            fileInputRef={fileInputRef}
            onAvatarChange={handleAvatarChange}
            onUpdateUser={onUpdateUser}
            onOpenProfile={() => setView(VIEW_PROFILE)}
            onOpenFeedback={() => setView(VIEW_FEEDBACK)}
            onClose={onClose}
          />
        )}
        {view === VIEW_PROFILE && (
          <ProfileSettingsView
            t={t}
            onBack={() => setView(VIEW_MAIN)}
            onClose={onClose}
            onDeleteApp={handleDeleteApp}
          />
        )}
        {view === VIEW_FEEDBACK && (
          <FeedbackView
            t={t}
            feedbackType={feedbackType}
            setFeedbackType={setFeedbackType}
            feedbackText={feedbackText}
            setFeedbackText={setFeedbackText}
            onSend={sendFeedback}
          />
        )}
      </div>
    </div>
  );
}

function MainSettingsView({
  user,
  theme,
  setTheme,
  lang,
  setLang,
  t,
  fileInputRef,
  onAvatarChange,
  onUpdateUser,
  onOpenProfile,
  onOpenFeedback,
  onClose,
}) {
  return (
    <div className="settings-modal__content">
      <div className="settings-modal__body">
        <div className="profile-row" onClick={onOpenProfile}>
          <div
            className="profile-row__avatar"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onAvatarChange}
              accept="image/*"
              style={{ display: "none" }}
            />
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="profile-row__avatar-img" />
            ) : user.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              "P"
            )}
            <div className="profile-row__avatar-overlay">
              <ImageIcon size={14} color="white" />
            </div>
          </div>
          <div className="profile-row__info">
            <div className="profile-row__name">{user.name || "User"}</div>
            <div className="profile-row__sub">{t.personalData}</div>
          </div>
          <ChevronRight size={18} color="#5858A0" className="profile-row__chevron" />
        </div>

        <div className="settings-section">
          <div className="settings-label">{t.userName}</div>
          <input
            className="modal__input"
            value={user.name}
            onChange={(e) => onUpdateUser({ name: e.target.value })}
            placeholder="Name..."
          />
        </div>

        <div className="settings-section">
          <div className="settings-label">
            {lang === "de" ? "Cover-Bild URL" : "Cover Image URL"}
          </div>
          <input
            className="modal__input"
            type="url"
            value={user.bgImage || ""}
            onChange={(e) => onUpdateUser({ bgImage: e.target.value })}
            placeholder="https://..."
          />
          {user.bgImage && (
            <img
              src={user.bgImage}
              alt="Cover-Vorschau"
              style={{
                width: "100%",
                height: "80px",
                objectFit: "cover",
                borderRadius: "8px",
                marginTop: "8px",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <span className="settings-label">{t.appearance}</span>
            <div className="theme-toggle">
              <button
                className={`theme-toggle__btn ${theme === "dark" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setTheme("dark")}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Moon size={14} />
                {t.dark}
              </button>
              <button
                className={`theme-toggle__btn ${theme === "light" ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setTheme("light")}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Sun size={14} />
                {t.light}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <span className="settings-label">{t.language}</span>
            <div className="theme-toggle">
              {LANGUAGES.map(({ code, flag }) => (
                <button
                  key={code}
                  className={`theme-toggle__btn ${
                    lang === code ? "theme-toggle__btn--active" : ""
                  }`}
                  onClick={() => setLang(code)}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <span className="settings-label">{t.feedback}</span>
            <button className="feedback-trigger-btn" onClick={onOpenFeedback}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                style={{ width: 18, height: 18 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-modal__footer">
        <button className="settings-modal__footer-close" onClick={onClose}>
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}

function ProfileSettingsView({ t, onBack, onClose, onDeleteApp }) {
  return (
    <div className="settings-modal__content settings-modal__content--sub">
      <div className="settings-modal__body">
        <div className="settings-group">
          <div className="settings-group__title">{t.dataSection}</div>
          <button className="settings-item settings-item--danger" onClick={onDeleteApp}>
            <div className="settings-item__label">{t.deleteApp}</div>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="settings-modal__footer">
        <button className="settings-modal__footer-back" onClick={onBack}>
          <ChevronLeft size={20} color="#EDEEFF" />
        </button>
        <button className="settings-modal__footer-close" onClick={onClose}>
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}

function FeedbackView({ t, feedbackType, setFeedbackType, feedbackText, setFeedbackText, onSend }) {
  const types = FEEDBACK_TYPES(t);
  const activeDesc = types.find((ft) => ft.id === feedbackType)?.desc;

  return (
    <div className="settings-modal__content settings-modal__content--sub">
      <div className="feedback-form">
        <div className="feedback-types">
          {types.map((ft) => (
            <button
              key={ft.id}
              className={`feedback-type-btn ${
                feedbackType === ft.id ? "feedback-type-btn--active" : ""
              }`}
              onClick={() => setFeedbackType(ft.id)}
            >
              {ft.label}
            </button>
          ))}
        </div>

        <div className="feedback-callout">{activeDesc}</div>

        <div className="feedback-textarea-group">
          <label className="feedback-label">{t.feedbackQuestion}</label>
          <textarea
            className="modal__textarea"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="..."
            rows={6}
          />
        </div>

        <button
          className={`modal__submit ${!feedbackText.trim() ? "modal__submit--disabled" : ""}`}
          onClick={onSend}
          style={{ background: "#7C83F7" }}
        >
          {t.send}
        </button>
      </div>
    </div>
  );
}
