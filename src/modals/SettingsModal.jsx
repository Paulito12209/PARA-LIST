import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Pencil,
  Palette,
  Camera,
} from "lucide-react";
import { clear } from "idb-keyval";

// Farbpalette für den Avatar-Platzhalter (neutral + PARA-Akzente, kein Lila-Theme)
const AVATAR_COLORS = [
  "#E03E3E",
  "#D09020",
  "#F59E0B",
  "#30A060",
  "#0B8CE9",
  "#0078D4",
  "#818CF8",
  "#8A8A96",
];

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

/**
 * Einstellungen als vollwertige App-Seite (im Navigations-Stack). Der große
 * Titel + das Datum kommen aus dem gemeinsamen App-Header (CommandPanel, mit
 * Logo oben links – wie die Startseite). Diese Komponente rendert nur den
 * Seiteninhalt (gruppierte Listen) plus eine untere Leiste mit rundem Zurück-
 * Button + Schließen.
 */
export function SettingsScreen({
  user,
  theme,
  setTheme,
  lang,
  setLang,
  t,
  onClose,
  onUpdateUser,
  onHeaderTitleChange,
}) {
  const [view, setView] = useState(VIEW_MAIN);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const titleByView = {
    [VIEW_MAIN]: t.settings,
    [VIEW_PROFILE]: t.personalData,
    [VIEW_FEEDBACK]: t.feedback,
  };

  // Aktuellen (Unter-)Titel an den App-Header melden; beim Verlassen zurücksetzen.
  useEffect(() => {
    onHeaderTitleChange?.(titleByView[view]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, t]);
  useEffect(() => () => onHeaderTitleChange?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Runder Zurück-Button: aus Unteransicht zur Hauptansicht, sonst Seite verlassen.
  const goBack = () => (view !== VIEW_MAIN ? setView(VIEW_MAIN) : onClose());

  return (
    <div className="settings-screen">
      <div className="settings-screen__body">
        {view === VIEW_MAIN && (
          <MainSettingsView
            user={user}
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
            t={t}
            onOpenProfile={() => setView(VIEW_PROFILE)}
            onOpenFeedback={() => setView(VIEW_FEEDBACK)}
            onEditAvatar={() => setPhotoSheetOpen(true)}
          />
        )}
        {view === VIEW_PROFILE && (
          <ProfileSettingsView
            t={t}
            user={user}
            onUpdateUser={onUpdateUser}
            onDeleteApp={handleDeleteApp}
          />
        )}
        {view === VIEW_FEEDBACK && <FeedbackView t={t} />}
      </div>

      {/* Untere Leiste: runder Zurück-Button + Schließen */}
      <div className="settings-screen__footer">
        <button
          className="settings-screen__back-fab"
          onClick={goBack}
          aria-label={t.back || "Zurück"}
        >
          <ChevronLeft size={22} />
        </button>
        <button className="settings-screen__close" onClick={onClose}>
          {t.closeBtn}
        </button>
      </div>

      {photoSheetOpen && (
        <AvatarPhotoSheet
          t={t}
          user={user}
          onAvatarChange={handleAvatarChange}
          onPickColor={(hex) => onUpdateUser({ avatarColor: hex, avatar: null })}
          onResetColor={() => onUpdateUser({ avatarColor: null })}
          onClose={() => setPhotoSheetOpen(false)}
        />
      )}
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
  onOpenProfile,
  onOpenFeedback,
  onEditAvatar,
}) {
  return (
    <>
      {/* Profil-Karte */}
      <div className="profile-row" onClick={onOpenProfile}>
        <div
          className={`profile-row__avatar ${
            user.avatarColor && !user.avatar ? "profile-row__avatar--colored" : ""
          }`}
          style={user.avatarColor && !user.avatar ? { background: user.avatarColor } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onEditAvatar();
          }}
        >
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="profile-row__avatar-img" />
          ) : user.name ? (
            user.name.charAt(0).toUpperCase()
          ) : (
            "P"
          )}
          {/* Stift-Badge signalisiert die Bearbeitbarkeit (v.a. mobil ohne Hover) */}
          <div className="profile-row__avatar-badge">
            <Pencil size={12} />
          </div>
        </div>
        <div className="profile-row__info">
          <div className="profile-row__name">{user.name || "User"}</div>
          <div className="profile-row__sub">{t.personalData}</div>
        </div>
        <ChevronRight size={20} className="profile-row__chevron" />
      </div>

      {/* Darstellung: Erscheinungsbild + Sprache */}
      <div className="settings-screen__group">
        <div className="settings-screen__row">
          <span className="settings-screen__row-label">{t.appearance}</span>
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
        <div className="settings-screen__row">
          <span className="settings-screen__row-label">{t.language}</span>
          <div className="theme-toggle theme-toggle--flags">
            {LANGUAGES.map(({ code, flag }) => (
              <button
                key={code}
                className={`theme-toggle__btn ${lang === code ? "theme-toggle__btn--active" : ""}`}
                onClick={() => setLang(code)}
              >
                <span className="theme-toggle__flag">{flag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div className="settings-screen__group">
        <button
          className="settings-screen__row settings-screen__row--tap"
          onClick={onOpenFeedback}
        >
          <span className="settings-screen__row-label">{t.feedback}</span>
          <ChevronRight size={20} className="settings-screen__row-chevron" />
        </button>
      </div>
    </>
  );
}

/**
 * Bottom-Sheet zum Setzen des Avatar-Bildes – Layout wie das Cover-Sheet
 * (Farben / Fotos / Kamera). Per Portal an <body>, damit es über der
 * Einstellungen-Seite liegt.
 */
function AvatarPhotoSheet({ t, user, onAvatarChange, onPickColor, onResetColor, onClose }) {
  const [colorMode, setColorMode] = useState(false);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleInput = (e) => {
    onAvatarChange(e);
    onClose();
  };

  return createPortal(
    <div className="settings-sheet-overlay" onClick={onClose}>
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sheet__handle" />

        <div className="settings-sheet__bubbles">
          <button
            className={`settings-sheet__bubble ${colorMode ? "settings-sheet__bubble--active" : ""}`}
            onClick={() => setColorMode((v) => !v)}
          >
            <Palette size={20} />
            <span>{t.coverColors}</span>
          </button>
          <button className="settings-sheet__bubble" onClick={() => photoInputRef.current?.click()}>
            <ImageIcon size={20} />
            <span>{t.coverPhoto}</span>
          </button>
          <button className="settings-sheet__bubble" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={20} />
            <span>{t.coverCamera}</span>
          </button>
        </div>

        {colorMode && (
          <div className="settings-sheet__color-grid">
            {AVATAR_COLORS.map((hex) => (
              <button
                key={hex}
                className={`settings-sheet__color-swatch ${
                  user.avatarColor === hex ? "settings-sheet__color-swatch--active" : ""
                }`}
                style={{ background: hex, color: hex }}
                onClick={() => {
                  onPickColor(hex);
                  onClose();
                }}
              />
            ))}
            <button
              className={`settings-sheet__color-swatch settings-sheet__color-swatch--default ${
                !user.avatarColor ? "settings-sheet__color-swatch--active" : ""
              }`}
              onClick={() => {
                onResetColor();
                onClose();
              }}
              title={t.coverDefault}
            />
          </div>
        )}

        <input
          type="file"
          ref={photoInputRef}
          onChange={handleInput}
          accept="image/*"
          style={{ display: "none" }}
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleInput}
          accept="image/*"
          capture="user"
          style={{ display: "none" }}
        />
      </div>
    </div>,
    document.body
  );
}

function ProfileSettingsView({ t, user, onUpdateUser, onDeleteApp }) {
  return (
    <>
      {/* Namensfeld mit langgezogenem Unterstrich (Material-Stil) */}
      <div className="settings-screen__group">
        <label className="settings-field">
          <span className="settings-field__label">{t.userName}</span>
          <input
            className="settings-field__input"
            value={user.name}
            onChange={(e) => onUpdateUser({ name: e.target.value })}
            placeholder="Name..."
          />
        </label>
      </div>

      <div className="settings-screen__group">
        <button
          className="settings-screen__row settings-screen__row--tap settings-screen__row--danger"
          onClick={onDeleteApp}
        >
          <span className="settings-screen__row-label">{t.deleteApp}</span>
          <Trash2 size={18} />
        </button>
      </div>
    </>
  );
}

function FeedbackView({ t }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="feedback-form">
      <div className="feedback-callout">{t.feedbackScreenshotHint}</div>

      {!formOpen ? (
        <button
          className="modal__submit"
          onClick={() => setFormOpen(true)}
          style={{ background: "#0B8CE9" }}
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
  );
}
