import { useEffect, useState } from "react";
import { I18N } from "../i18n";
import { blurActiveInput } from "../utils";

const STEP_SPLASH = 0;
const STEP_LANGUAGE = 1;
const STEP_NAME = 2;
const STEP_THEME = 3;
const STEP_SETTINGS = 4;
// Splash zählt nicht als Fortschritts-Schritt
const PROGRESS_STEPS = [STEP_LANGUAGE, STEP_NAME, STEP_THEME, STEP_SETTINGS];

const SPLASH_DURATION_MS = 2200;

const LANGUAGES = [
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

// ── Icons (Sonos-Stil: Icon-Kachel im oberen Bereich jedes Screens) ──
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a13.5 13.5 0 0 1 3.5 9 13.5 13.5 0 0 1-3.5 9 13.5 13.5 0 0 1-3.5-9A13.5 13.5 0 0 1 12 3z" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
  </svg>
);

const ThemeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
    <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none" opacity="0.35" />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 3V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export function OnboardingModal({ theme = "dark", onPreviewTheme, onComplete }) {
  const [step, setStep] = useState(STEP_SPLASH);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");
  const [pickedTheme, setPickedTheme] = useState(theme === "light" ? "light" : "dark");

  const t = I18N[lang];

  // Splash blendet nach kurzer Zeit automatisch zum ersten Schritt über
  useEffect(() => {
    if (step !== STEP_SPLASH) return;
    const timer = setTimeout(() => setStep(STEP_LANGUAGE), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const pickTheme = (th) => {
    setPickedTheme(th);
    // Live-Vorschau: Theme sofort auf die ganze App anwenden
    onPreviewTheme?.(th);
  };

  const finish = () => {
    if (!name.trim()) return;
    // Namensfeld VOR dem Unmount explizit deaktivieren – sonst bleibt auf
    // iOS die Tastatur samt Assistent-Leiste am nicht mehr existierenden
    // Feld "hängen".
    blurActiveInput();
    onComplete(lang, name.trim(), pickedTheme);
  };

  const goNameNext = () => {
    if (!name.trim()) return;
    blurActiveInput();
    setStep(STEP_THEME);
  };

  if (step === STEP_SPLASH) {
    return (
      <div className="onboarding onboarding--splash" onClick={() => setStep(STEP_LANGUAGE)}>
        <div className="onboarding__splash-inner">
          <img className="onboarding__splash-logo" src="/paralist_logo.png" alt="" />
          <div className="onboarding__splash-wordmark">PARA·LIST</div>
          <div className="onboarding__splash-tagline">{t.onboardingTagline}</div>
        </div>
      </div>
    );
  }

  const renderHeader = (IconCmp, showBack, onBack) => (
    <>
      <div className="onboarding__topbar">
        {showBack ? (
          <button className="onboarding__back" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        ) : (
          <span className="onboarding__back onboarding__back--ghost" />
        )}
        <div className="onboarding__dots">
          {PROGRESS_STEPS.map((s) => (
            <span
              key={s}
              className={`onboarding__dot ${s === step ? "onboarding__dot--active" : ""} ${
                s < step ? "onboarding__dot--done" : ""
              }`}
            />
          ))}
        </div>
        <span className="onboarding__back onboarding__back--ghost" />
      </div>
      <div className="onboarding__icon-tile">
        <IconCmp />
      </div>
    </>
  );

  return (
    <div className="onboarding">
      <div className="onboarding__card" key={step}>
        {step === STEP_LANGUAGE && (
          <>
            {renderHeader(GlobeIcon, false)}
            <h2 className="onboarding__title">{t.welcome}</h2>
            <p className="onboarding__text">{t.onboardingLang}</p>
            <div className="onboarding__list">
              {LANGUAGES.map(({ code, flag, label }) => (
                <button
                  key={code}
                  className={`onboarding__row ${lang === code ? "onboarding__row--active" : ""}`}
                  onClick={() => setLang(code)}
                >
                  <span className="onboarding__row-flag">{flag}</span>
                  <span className="onboarding__row-label">{label}</span>
                  <span className="onboarding__row-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
            <div className="onboarding__footer">
              <button className="onboarding__next" onClick={() => setStep(STEP_NAME)}>
                {t.onboardingContinue}
              </button>
            </div>
          </>
        )}

        {step === STEP_NAME && (
          <>
            {renderHeader(UserIcon, true, () => setStep(STEP_LANGUAGE))}
            <h2 className="onboarding__title">{t.onboardingName}</h2>
            <p className="onboarding__text">{t.onboardingNameText}</p>
            <input
              autoFocus
              className="onboarding__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name..."
              onKeyDown={(e) => e.key === "Enter" && goNameNext()}
              // Spitzname, kein Kontaktfeld: unterdrückt Kontakt-/Adress-
              // Autofill-Leisten (iOS "Kontakt ausfüllen", Android-Chips).
              autoComplete="off"
            />
            <div className="onboarding__footer">
              <button
                className={`onboarding__next ${!name.trim() ? "onboarding__next--disabled" : ""}`}
                onClick={goNameNext}
              >
                {t.onboardingContinue}
              </button>
            </div>
          </>
        )}

        {step === STEP_THEME && (
          <>
            {renderHeader(ThemeIcon, true, () => setStep(STEP_NAME))}
            <h2 className="onboarding__title">{t.onboardingThemeTitle}</h2>
            <p className="onboarding__text">{t.onboardingThemeText}</p>
            <div className="onboarding__themes">
              {["dark", "light"].map((th) => (
                <button
                  key={th}
                  className={`onboarding__theme-card ${
                    pickedTheme === th ? "onboarding__theme-card--active" : ""
                  }`}
                  onClick={() => pickTheme(th)}
                >
                  <span className={`onboarding__theme-preview onboarding__theme-preview--${th}`}>
                    <span className="onboarding__preview-dot" />
                    <span className="onboarding__preview-bar onboarding__preview-bar--accent" />
                    <span className="onboarding__preview-bar" />
                    <span className="onboarding__preview-bar onboarding__preview-bar--short" />
                  </span>
                  <span className="onboarding__theme-label">{th === "dark" ? t.dark : t.light}</span>
                </button>
              ))}
            </div>
            <div className="onboarding__footer">
              <button className="onboarding__next" onClick={() => setStep(STEP_SETTINGS)}>
                {t.onboardingContinue}
              </button>
            </div>
          </>
        )}

        {step === STEP_SETTINGS && (
          <>
            {renderHeader(GearIcon, true, () => setStep(STEP_THEME))}
            <h2 className="onboarding__title">{t.onboardingSettingsTitle}</h2>
            <p className="onboarding__text">{t.onboardingSettingsText}</p>
            <div className="onboarding__hint">
              <span className="onboarding__hint-icon">
                <GearIcon />
              </span>
              <span className="onboarding__hint-text">
                {t.settings} → {t.appearance}
              </span>
            </div>
            <div className="onboarding__footer">
              <button className="onboarding__next" onClick={finish}>
                {t.getStarted}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
