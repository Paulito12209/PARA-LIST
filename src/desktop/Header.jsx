import { useEffect, useRef } from "react";
import { Search, Settings } from "lucide-react";

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
  searchValue,
  onSearchChange,
  onOpenSettings,
  searchInputRef: searchInputRefProp,
}) {
  const internalRef = useRef(null);
  const searchRef = searchInputRefProp || internalRef;

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);

  return (
    <header className="dsk-header">
      <div className="dsk-header__greeting">
        <div className="dsk-header__greeting-line">
          {getGreeting(lang)},{" "}
          <strong>{userName || "Paul"}</strong>
        </div>
        <div className="dsk-header__date">{formatToday(lang)}</div>
      </div>

      <div className="dsk-header__search">
        <Search size={18} strokeWidth={2} className="dsk-header__search-icon" aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          className="dsk-header__search-input"
          placeholder={lang === "en"
            ? "Search or say \"I'm looking for…\""
            : lang === "es"
              ? "Buscar o di \"Estoy buscando…\""
              : "Suchen oder „Ich suche…\" sagen"}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="dsk-header__search-kbd" aria-hidden="true">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </div>

      {!railOpen && (
        <button
          type="button"
          className="dsk-header__settings"
          onClick={onOpenSettings}
          title={lang === "en" ? "Settings" : "Einstellungen"}
          aria-label={lang === "en" ? "Settings" : "Einstellungen"}
        >
          <Settings size={20} strokeWidth={2} />
        </button>
      )}
    </header>
  );
}
