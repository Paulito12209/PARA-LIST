import { useState, useCallback } from "react";

// Deckt neben den UI-Sprachen auch alle Quellsprachen des Übersetzers ab.
const LOCALE_BY_LANG = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
  zh: "zh-CN",
  hi: "hi-IN",
  ru: "ru-RU",
  ar: "ar-SA",
  ja: "ja-JP",
};

const ERROR_MESSAGES = {
  de: {
    unsupported:
      "Spracherkennung wird in diesem Browser leider nicht unterstützt. Bitte nutze Chrome oder Safari.",
    notAllowed:
      "Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen.",
    network:
      "Der Sprachdienst dieses Browsers ist nicht erreichbar. Das passiert häufig in Browsern wie Arc oder Brave – bitte nutze Chrome oder Safari, oder prüfe deine Internetverbindung.",
  },
  en: {
    unsupported:
      "Speech recognition is not supported in this browser. Please use Chrome or Safari.",
    notAllowed:
      "Microphone access was denied. Please allow microphone access in your browser settings.",
    network:
      "The browser's speech service is unreachable. This often happens in browsers like Arc or Brave — please use Chrome or Safari, or check your internet connection.",
  },
  es: {
    unsupported:
      "El reconocimiento de voz no es compatible con este navegador. Utiliza Chrome o Safari.",
    notAllowed:
      "Se denegó el acceso al micrófono. Permite el acceso al micrófono en la configuración del navegador.",
    network:
      "El servicio de voz del navegador no está disponible. Esto suele ocurrir en navegadores como Arc o Brave; usa Chrome o Safari, o verifica tu conexión a Internet.",
  },
};

/**
 * Wrapps the Web Speech API. Returns { isListening, start } where `start`
 * begins a one-shot transcription and calls `onResult` with the final text.
 *
 * Options:
 *  - uiLang: Sprache der Fehlermeldungen (Default: `lang`; relevant, wenn
 *    `lang` die gesprochene Sprache ist und von der UI-Sprache abweicht)
 *  - onError(message): statt eines blockierenden alert() aufgerufen
 */
export function useSpeechRecognition(lang, onResult, { uiLang, onError } = {}) {
  const [isListening, setIsListening] = useState(false);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const msgs = ERROR_MESSAGES[uiLang] || ERROR_MESSAGES[lang] || ERROR_MESSAGES.en;
    const fail = (msg) => (onError ? onError(msg) : alert(msg));

    if (!SpeechRecognition) {
      fail(msgs.unsupported);
      return;
    }
    if (isListening) return;

    const rec = new SpeechRecognition();
    rec.lang = LOCALE_BY_LANG[lang] || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      navigator.vibrate?.(20);
    };

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript?.trim();
      if (text) {
        onResult(text);
        navigator.vibrate?.([15, 40, 15]);
      }
    };

    rec.onerror = (err) => {
      console.error("Speech Recognition error:", err);
      setIsListening(false);
      if (err.error === "not-allowed" || err.error === "permission-denied") {
        fail(msgs.notAllowed);
      } else if (err.error === "network") {
        fail(msgs.network);
      }
    };

    rec.onend = () => setIsListening(false);

    rec.start();
  }, [lang, uiLang, onResult, onError, isListening]);

  return { isListening, start };
}
