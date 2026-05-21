import { useState, useCallback } from "react";

const LOCALE_BY_LANG = { de: "de-DE", en: "en-US", es: "es-ES" };

const ERROR_MESSAGES = {
  de: {
    unsupported:
      "Spracherkennung wird in diesem Browser leider nicht unterstützt. Bitte nutze Chrome oder Safari.",
    notAllowed:
      "Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen.",
    network:
      "Netzwerkfehler bei der Spracherkennung. Bitte überprüfe deine Internetverbindung.",
  },
  en: {
    unsupported:
      "Speech recognition is not supported in this browser. Please use Chrome or Safari.",
    notAllowed:
      "Microphone access was denied. Please allow microphone access in your browser settings.",
    network: "Network error during speech recognition. Please check your internet connection.",
  },
  es: {
    unsupported:
      "El reconocimiento de voz no es compatible con este navegador. Utiliza Chrome o Safari.",
    notAllowed:
      "Se denegó el acceso al micrófono. Permite el acceso al micrófono en la configuración del navegador.",
    network: "Error de red durante el reconocimiento de voz. Verifica tu conexión a Internet.",
  },
};

/**
 * Wrapps the Web Speech API. Returns { isListening, start } where `start`
 * begins a one-shot transcription and calls `onResult` with the final text.
 */
export function useSpeechRecognition(lang, onResult) {
  const [isListening, setIsListening] = useState(false);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const msgs = ERROR_MESSAGES[lang] || ERROR_MESSAGES.en;

    if (!SpeechRecognition) {
      alert(msgs.unsupported);
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
        alert(msgs.notAllowed);
      } else if (err.error === "network") {
        alert(msgs.network);
      }
    };

    rec.onend = () => setIsListening(false);

    rec.start();
  }, [lang, onResult, isListening]);

  return { isListening, start };
}
