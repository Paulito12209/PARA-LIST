import { useState } from "react";
import { I18N } from "../i18n";

const STEP_LANGUAGE = 0;
const STEP_NAME = 1;
const LANGUAGES = [
  { code: "de", flag: "🇩🇪" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
];

export function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(STEP_LANGUAGE);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");

  const finish = () => {
    if (name.trim()) onComplete(lang, name.trim());
  };

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <div className="onboarding__logo">PARA·LIST</div>

        {step === STEP_LANGUAGE ? (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{I18N[lang].welcome}</h2>
            <p className="onboarding__text">{I18N[lang].onboardingLang}</p>
            <div className="onboarding__langs">
              {LANGUAGES.map(({ code, flag }) => (
                <button
                  key={code}
                  className={`onboarding__lang-btn ${
                    lang === code ? "onboarding__lang-btn--active" : ""
                  }`}
                  onClick={() => setLang(code)}
                >
                  {flag}
                </button>
              ))}
            </div>
            <button className="onboarding__next" onClick={() => setStep(STEP_NAME)}>
              {I18N[lang].getStarted}
            </button>
          </div>
        ) : (
          <div className="onboarding__step">
            <h2 className="onboarding__title">{I18N[lang].onboardingName}</h2>
            <input
              autoFocus
              className="onboarding__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name..."
              onKeyDown={(e) => e.key === "Enter" && finish()}
            />
            <button
              className={`onboarding__next ${!name.trim() ? "onboarding__next--disabled" : ""}`}
              onClick={finish}
            >
              {I18N[lang].getStarted}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
