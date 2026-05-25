import { Search } from "lucide-react";
import { CustomSettingsIcon } from "../components/AppIcons";

function getGreeting(lang) {
  const h = new Date().getHours();
  if (lang === "en") {
    if (h < 5) return "Good Night";
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  }
  if (lang === "es") {
    if (h < 5) return "Buenas noches";
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  }
  if (h < 5) return "Gute Nacht";
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatToday(lang) {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "de-DE";
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function Header({
  userName,
  lang,
  railOpen,
  onOpenSettings,
}) {
  return (
    <header className="dsk-header">
      <div className="dsk-header__greeting">
        <div className="dsk-header__greeting-line">
          {getGreeting(lang)},{" "}
          <strong>{userName || "Paul"}</strong>
        </div>
        <div className="dsk-header__date">{formatToday(lang)}</div>
      </div>

      {/* Suche ist noch nicht implementiert → deaktiviert dargestellt */}
      <div
        className="dsk-header__search dsk-header__search--disabled"
        role="search"
        aria-disabled="true"
      >
        <Search size={18} strokeWidth={2} className="dsk-header__search-icon" aria-hidden="true" />
        <input
          type="text"
          className="dsk-header__search-input"
          placeholder={lang === "en"
            ? "Search here"
            : lang === "es"
              ? "Busca aquí"
              : "Suche hier"}
          disabled
        />
      </div>

      {!railOpen && (
        <button
          type="button"
          className="dsk-header__settings"
          onClick={onOpenSettings}
          title={lang === "en" ? "Settings" : "Einstellungen"}
          aria-label={lang === "en" ? "Settings" : "Einstellungen"}
        >
          <CustomSettingsIcon size={22} color="currentColor" />
        </button>
      )}
    </header>
  );
}
