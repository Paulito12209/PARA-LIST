import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeftRight, Loader2, ChevronDown, Check, AudioLines, TriangleAlert } from "lucide-react";
import { translateWord, LANG_CODES, toLangCode } from "../lib/translate";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { SaveBookmarkIcon, FlashcardsBadge } from "./AppIcons";

const LANGS = Object.keys(LANG_CODES);
const DEBOUNCE_MS = 500;

/** Copy-Icon (zwei überlappende, abgerundete Quadrate). */
function CopyIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="13" height="13" rx="3" />
      <path d="M8 8V6a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-2" />
    </svg>
  );
}

/**
 * Übersetzer-Overlay im Google-Übersetzer-Stil (Vollbild via Portal).
 * Live-Übersetzung (Lingva → MyMemory), Sprachwahl mit Tausch-Button,
 * Privacy-Hinweis und "Speichern" → legt Wortpaar als Ressourcen-Inhalt ab.
 *
 * Props:
 *  - t: Übersetzungen
 *  - onSave({ source, translation, fromLang, toLang })
 *  - onClose
 *  - defaultFrom / defaultTo: Anzeigenamen (z.B. "Deutsch")
 *  - autoVoice: startet direkt die Spracheingabe statt die Tastatur zu öffnen
 *  - lang: UI-Sprache (für Fehlermeldungen der Spracherkennung)
 */
export function TranslateOverlay({ t, lang = "de", onSave, onClose, onOpenFlashcards, initialText = "", defaultFrom = "Deutsch", defaultTo = "Spanisch", autoVoice = false }) {
  const fc = t.fc || {};
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [savedCount, setSavedCount] = useState(0);
  const [closing, setClosing] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Spracheingabe: gesprochener Text landet direkt im Eingabefeld und
  // stößt damit die Live-Übersetzung an. Erkannt wird in der Quellsprache.
  // Fehler (z.B. kein Speech-Backend im Browser) erscheinen als Dialog mit
  // Backdrop statt als blockierender alert.
  const [voiceError, setVoiceError] = useState("");
  const { isListening, start: startVoice } = useSpeechRecognition(
    toLangCode(from) || "de",
    (spoken) => setText(spoken),
    { uiLang: lang, onError: setVoiceError }
  );

  // Hinweis nach ein paar Sekunden automatisch ausblenden
  useEffect(() => {
    if (!voiceError) return;
    const id = setTimeout(() => setVoiceError(""), 6000);
    return () => clearTimeout(id);
  }, [voiceError]);

  useEffect(() => {
    // Voice-Modus: Tastatur zulassen wäre störend – stattdessen sofort zuhören.
    if (autoVoice) startVoice();
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tastaturhöhe via visualViewport ermitteln, damit der Floating-Balken
  // immer direkt über der geöffneten Tastatur sitzt.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(kb > 80 ? kb : 0);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  const collapseKeyboard = () => inputRef.current?.blur();

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard?.writeText(result);
      setCopied(true);
      navigator.vibrate?.(8);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* Clipboard nicht verfügbar – still ignorieren */
    }
  };

  // Debounced Live-Übersetzung
  useEffect(() => {
    const q = text.trim();
    if (!q) {
      setResult("");
      setStatus("idle");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const { translation } = await translateWord(q, from, to);
        if (cancelled) return;
        setResult(translation);
        setStatus("done");
      } catch {
        if (cancelled) return;
        setResult("");
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [text, from, to]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 180);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swap = () => {
    const prevResult = result;
    setFrom(to);
    setTo(from);
    setText(prevResult || text);
    setResult("");
    setStatus("idle");
  };

  const save = () => {
    if (status !== "done" || !result) return;
    onSave?.({ source: text.trim(), translation: result, fromLang: from, toLang: to });
    setSavedCount((c) => c + 1);
    setText("");
    setResult("");
    setStatus("idle");
    navigator.vibrate?.(10);
    inputRef.current?.focus();
  };

  return createPortal(
    <div className={`tl-overlay ${closing ? "tl-overlay--closing" : ""}`}>
      <div className={`tl-panel ${closing ? "tl-panel--closing" : ""}`} role="dialog" aria-modal="true">
        <header className="tl-header">
          <span className="tl-header__spacer" />
          <span className="tl-header__title">{fc.translator}</span>
          <span className="tl-header__saved">
            {savedCount > 0 ? fc.saved?.(savedCount) : ""}
          </span>
        </header>

        <div className="tl-input-wrap">
          {text.trim() && (
            <div className="tl-result">
              {status === "loading" && (
                <span className="tl-result__loading">
                  <Loader2 size={18} className="tl-spin" /> {fc.translating}
                </span>
              )}
              {status === "error" && (
                <span className="tl-result__error">{fc.translateError}</span>
              )}
              {status === "done" && (
                <div className="tl-result__row">
                  <span className="tl-result__text">{result}</span>
                  <button
                    className={`tl-copy ${copied ? "tl-copy--done" : ""}`}
                    onClick={copyResult}
                    aria-label={copied ? fc.copied : fc.copy}
                  >
                    {copied ? <Check size={18} /> : <CopyIcon size={18} />}
                  </button>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={inputRef}
            className="tl-input"
            placeholder={isListening ? fc.listening : fc.translatePlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />

          {/* Audio-Button: pulsiert, solange die Spracherkennung zuhört */}
          <button
            className={`tl-voice ${isListening ? "tl-voice--listening" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setVoiceError("");
              startVoice();
            }}
            aria-label={fc.voiceInput}
            aria-pressed={isListening}
          >
            <AudioLines size={22} />
          </button>
        </div>

        <div className="tl-bottom">
          <div className="tl-langbar">
            <select
              className="tl-lang"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="from"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <button className="tl-swap" onClick={swap} aria-label={fc.swapLang}>
              <ArrowLeftRight size={18} />
            </button>

            <select
              className="tl-lang"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="to"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="tl-note">{fc.privacyNote}</div>

          <div className="tl-actions">
            <button
              className="tl-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>

            <button
              className="tl-save"
              disabled={status !== "done" || !result}
              onClick={save}
            >
              <SaveBookmarkIcon size={20} color="#fff" /> {fc.save}
            </button>

            <button
              className="tl-fc-link"
              onClick={() => { handleClose(); onOpenFlashcards?.(); }}
              aria-label={fc.tool}
            >
              <FlashcardsBadge size={56} />
            </button>
          </div>
        </div>

        {kbHeight > 0 && (
          <div className="tl-kbbar" data-keep-focus="true" style={{ bottom: kbHeight }}>
            {/* Sprachrichtung auch bei offener Tastatur sichtbar/änderbar */}
            <div className="tl-langbar tl-kbbar__langbar">
              <select
                className="tl-lang"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="from"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                className="tl-swap"
                onMouseDown={(e) => e.preventDefault()}
                onClick={swap}
                aria-label={fc.swapLang}
              >
                <ArrowLeftRight size={18} />
              </button>
              <select
                className="tl-lang"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="to"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="tl-kbbar__row">
              {/* Speichern auch bei offener Tastatur: aktiv, sobald eine
                  Übersetzung vorliegt (Live-Übersetzung läuft beim Tippen).
                  save() behält den Fokus → Tastatur bleibt offen. */}
              <button
                className="tl-kbbar__save"
                disabled={status !== "done" || !result}
                onMouseDown={(e) => e.preventDefault()}
                onClick={save}
                aria-label={fc.save}
              >
                <SaveBookmarkIcon size={20} color="currentColor" />
              </button>
              {/* Übersetzt wird live beim Tippen – der Button räumt stattdessen
                  die Eingabe ab (Tastatur bleibt offen). */}
              <button
                className="tl-kbbar__clear"
                disabled={!text.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setText("");
                  setResult("");
                  setStatus("idle");
                }}
              >
                {fc.clearInput}
              </button>
              <button
                className="tl-kbbar__collapse"
                onMouseDown={(e) => e.preventDefault()}
                onClick={collapseKeyboard}
                aria-label={fc.collapseKeyboard}
              >
                <ChevronDown size={22} />
              </button>
            </div>
          </div>
        )}

        {/* Spracheingabe-Fehler als Dialog: dunkelt den Übersetzer ab und
            verschwindet nach 6s von selbst (oder per Tap sofort). */}
        {voiceError && (
          <div
            className="tl-voice-dialog"
            role="alertdialog"
            onClick={() => {
              // Tap schließt sofort – und die Tastatur öffnet sich als
              // Fallback, damit man das Wort tippen kann.
              setVoiceError("");
              inputRef.current?.focus();
            }}
          >
            <div className="tl-voice-dialog__card">
              <span className="tl-voice-dialog__icon">
                <TriangleAlert size={22} />
              </span>
              <p className="tl-voice-dialog__text">{voiceError}</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
