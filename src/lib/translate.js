// ============================================================
// PARA·LIST – Übersetzungs-Service (key-frei, CORS-fähig)
// Strategie: zuerst Lingva (Google-Qualität), bei Fehler/Timeout
// Fallback auf MyMemory. Die App bleibt offline-first – nur dieser
// Lookup geht ins Netz; gespeicherte Karten sind danach offline nutzbar.
// ============================================================

// Anzeigename (Deutsch) → ISO-639-1 Code.
export const LANG_CODES = {
  Deutsch: "de",
  Englisch: "en",
  Spanisch: "es",
  Französisch: "fr",
  Italienisch: "it",
  Portugiesisch: "pt",
  Mandarin: "zh",
  Hindi: "hi",
  Russisch: "ru",
  Arabisch: "ar",
  Japanisch: "ja",
};

// Für die Sprachauswahl in der UI (Code → Anzeigename).
export const LANG_NAMES = Object.fromEntries(
  Object.entries(LANG_CODES).map(([name, code]) => [code, name])
);

const KNOWN_CODES = new Set(Object.values(LANG_CODES));

// Adjektivform für den Ressourcen-Titel "{Sprache} Wörter".
const WORDS_ADJ = {
  Englisch: "Englische",
  Spanisch: "Spanische",
  Französisch: "Französische",
  Italienisch: "Italienische",
  Portugiesisch: "Portugiesische",
  Mandarin: "Mandarin-",
  Hindi: "Hindi-",
  Russisch: "Russische",
  Arabisch: "Arabische",
  Japanisch: "Japanische",
};

/** Titel der verknüpften Ressource, z.B. "Spanisch" → "Spanische Wörter". */
export function wordsResourceName(langName) {
  const adj = WORDS_ADJ[langName];
  if (!adj) return `${langName} Wörter`;
  return adj.endsWith("-") ? `${adj}Wörter` : `${adj} Wörter`;
}

/**
 * Akzeptiert Anzeigenamen ("Spanisch") oder ISO-Codes ("es").
 * Unbekannte Eingaben liefern "" (fail-closed): so landet niemals
 * ungeprüfter Text im API-Request, der Aufruf scheitert sauber.
 */
export function toLangCode(lang) {
  if (!lang) return "";
  if (LANG_CODES[lang]) return LANG_CODES[lang];
  const lower = String(lang).toLowerCase();
  return KNOWN_CODES.has(lower) ? lower : "";
}

const DEFAULT_TIMEOUT_MS = 5000;

// Nur die kanonische Lingva-Instanz – fremde Community-Mirrors würden jede
// Anfrage mitloggen, ohne dass wir die Betreiber kennen (Audit M1).
// Die echte Ausfallsicherheit liefert der MyMemory-Fallback.
const LINGVA_HOSTS = ["https://lingva.ml"];

function fetchWithTimeout(url, ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function tryLingva(text, from, to) {
  const path = `/api/v1/${from}/${to}/${encodeURIComponent(text)}`;
  for (const host of LINGVA_HOSTS) {
    try {
      const res = await fetchWithTimeout(host + path);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data.translation === "string" && data.translation.trim()) {
        return data.translation.trim();
      }
    } catch {
      // nächste Instanz versuchen
    }
  }
  return null;
}

async function tryMyMemory(text, from, to) {
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    // MyMemory liefert bei Quota-/Fehlerfällen HTTP 200 mit responseStatus !== 200
    // bzw. einem "MYMEMORY WARNING"-Text im Feld – diese nicht als Treffer werten.
    if (data?.responseStatus !== 200 && data?.responseStatus !== "200") return null;
    const translated = data?.responseData?.translatedText;
    if (
      typeof translated === "string" &&
      translated.trim() &&
      !/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(translated)
    ) {
      return translated.trim();
    }
  } catch {
    // ignorieren – Aufrufer behandelt null
  }
  return null;
}

/**
 * Übersetzt ein Wort/eine Phrase. Wirft bei komplettem Fehlschlag.
 *
 * @param {string} text  Eingabetext
 * @param {string} from  Quellsprache (Name "Deutsch" oder Code "de")
 * @param {string} to    Zielsprache (Name oder Code)
 * @returns {Promise<{ translation: string, provider: "lingva" | "mymemory" }>}
 */
export async function translateWord(text, from, to) {
  const q = (text || "").trim();
  if (!q) throw new Error("empty");

  const fromCode = toLangCode(from);
  const toCode = toLangCode(to);
  if (!fromCode || !toCode) throw new Error("unknown-language");
  if (fromCode === toCode) return { translation: q, provider: "lingva" };

  const lingva = await tryLingva(q, fromCode, toCode);
  if (lingva) return { translation: lingva, provider: "lingva" };

  const mymemory = await tryMyMemory(q, fromCode, toCode);
  if (mymemory) return { translation: mymemory, provider: "mymemory" };

  throw new Error("translation-failed");
}
