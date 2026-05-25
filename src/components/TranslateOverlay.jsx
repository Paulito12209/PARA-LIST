import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeftRight, Loader2 } from "lucide-react";
import { translateWord, LANG_CODES } from "../lib/translate";
import { SaveBookmarkIcon, FlashcardsIcon } from "./AppIcons";

const LANGS = Object.keys(LANG_CODES);
const DEBOUNCE_MS = 500;

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
 */
export function TranslateOverlay({ t, onSave, onClose, onOpenFlashcards, defaultFrom = "Deutsch", defaultTo = "Spanisch" }) {
  const fc = t.fc || {};
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [savedCount, setSavedCount] = useState(0);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          <button className="fc-icon-btn" onClick={handleClose} aria-label="Close">
            <X size={22} />
          </button>
          <span className="tl-header__title">{fc.translator}</span>
          <span className="tl-header__saved">
            {savedCount > 0 ? fc.saved?.(savedCount) : ""}
          </span>
        </header>

        <div className="tl-input-wrap">
          <textarea
            ref={inputRef}
            className="tl-input"
            placeholder={fc.translatePlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />

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
              {status === "done" && <span className="tl-result__text">{result}</span>}
            </div>
          )}
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
              className="tl-fc-link"
              onClick={() => { handleClose(); onOpenFlashcards?.(); }}
              aria-label={fc.tool}
            >
              <FlashcardsIcon size={24} color="#fff" />
            </button>

            <button
              className="tl-save"
              disabled={status !== "done" || !result}
              onClick={save}
            >
              <SaveBookmarkIcon size={20} color="#fff" /> {fc.save}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
