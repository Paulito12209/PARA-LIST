import { useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { clear } from "idb-keyval";

const VIEW_MAIN = "main";
const VIEW_PROFILE = "profile";
const VIEW_FEEDBACK = "feedback";

// Notion-Seite, auf der Feedback (inkl. Screenshot-Upload) gesammelt wird.
// /ebd/ ist Notions Embed-Pfad fürs Einbetten per iframe; die normale Seiten-
// URL dient als Fallback zum Öffnen in einem neuen Tab.
const FEEDBACK_FORM_URL =
  "https://married-agustinia-98f.notion.site/34430c14dde780779112c1653e7746df?pvs=105";
const FEEDBACK_FORM_EMBED_URL =
  "https://married-agustinia-98f.notion.site/ebd/34430c14dde780779112c1653e7746df";

const LANGUAGES = [
  { code: "de", flag: "🇩🇪" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
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
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdateUser({ avatar: reader.result });
    reader.readAsDataURL(file);
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
          <div className="modal__header-left" />
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
          <FeedbackView t={t} onBack={() => setView(VIEW_MAIN)} onClose={onClose} />
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
            <button className="feedback-submit-btn" onClick={onOpenFeedback}>
              {t.submitFeedback}
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
          <ChevronLeft size={20} color="currentColor" />
        </button>
        <button className="settings-modal__footer-close" onClick={onClose}>
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}

function FeedbackView({ t, onBack, onClose }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="settings-modal__content settings-modal__content--sub">
      <div className="settings-modal__body">
        <div className="feedback-form">
          <div className="feedback-callout">{t.feedbackScreenshotHint}</div>

          {!formOpen ? (
            <button
              className="modal__submit"
              onClick={() => setFormOpen(true)}
              style={{ background: "#7C83F7" }}
            >
              {t.openFeedbackForm}
            </button>
          ) : (
            <>
              <iframe
                className="feedback-embed"
                src={FEEDBACK_FORM_EMBED_URL}
                width="100%"
                height="600"
                frameBorder="0"
                allowFullScreen
                title="Feedback"
              />
              <a
                className="feedback-board-link"
                href={FEEDBACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                {t.feedbackOpenNewTab}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="settings-modal__footer">
        <button className="settings-modal__footer-back" onClick={onBack}>
          <ChevronLeft size={20} color="currentColor" />
        </button>
        <button className="settings-modal__footer-close" onClick={onClose}>
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}
