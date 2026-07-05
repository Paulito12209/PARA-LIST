import { useRef, useLayoutEffect } from "react";
import { Check } from "lucide-react";

// Canvas-Editor mit Notion-artigen Checklisten.
//
// Der Inhalt bleibt ein einfacher String (`cat.body`), damit Vorschauen
// (Cover, Startseite, Sidebar) weiter funktionieren. Zeilen-Marker:
//   [ ] / [x] Text   → eckige Checkbox (Häkchen)
//   ( ) / (x) Text   → runde Checkbox (blau gefüllter Innenkreis)
// Aufeinanderfolgende „normale" Zeilen werden zu EINEM Text-Block
// zusammengefasst, damit sich Fließtext wie gewohnt in einem Textfeld
// bearbeiten lässt.

const CHECK_RE = /^\[([ xX])\] ?(.*)$/;
const RADIO_RE = /^\(([ xX])\) ?(.*)$/;

function parseBlocks(value) {
  const lines = (value ?? "").split("\n");
  const blocks = [];
  let textBuf = null;
  const flush = () => {
    if (textBuf !== null) {
      blocks.push({ kind: "text", text: textBuf.join("\n") });
      textBuf = null;
    }
  };
  for (const line of lines) {
    let m;
    if ((m = CHECK_RE.exec(line))) {
      flush();
      blocks.push({ kind: "check", checked: m[1].toLowerCase() === "x", text: m[2] });
    } else if ((m = RADIO_RE.exec(line))) {
      flush();
      blocks.push({ kind: "radio", checked: m[1].toLowerCase() === "x", text: m[2] });
    } else {
      if (textBuf === null) textBuf = [];
      textBuf.push(line);
    }
  }
  flush();
  if (blocks.length === 0) blocks.push({ kind: "text", text: "" });
  return blocks;
}

function serializeBlock(b) {
  if (b.kind === "check") return `[${b.checked ? "x" : " "}] ${b.text}`;
  if (b.kind === "radio") return `(${b.checked ? "x" : " "}) ${b.text}`;
  return b.text;
}
const serialize = (blocks) => blocks.map(serializeBlock).join("\n");

function autoGrow(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function CanvasEditor({ value, onChange, placeholder }) {
  const blocks = parseBlocks(value);
  const refs = useRef([]);
  // Nach einer Mutation gewünschter Fokus: { index, caret }.
  const pending = useRef(null);

  // Alle Textfelder auf ihre Inhaltshöhe bringen + evtl. Fokus setzen.
  useLayoutEffect(() => {
    refs.current.forEach((el) => autoGrow(el));
    if (pending.current) {
      const { index, caret } = pending.current;
      pending.current = null;
      const el = refs.current[index];
      if (el) {
        el.focus();
        const pos = caret == null ? el.value.length : Math.min(caret, el.value.length);
        try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
      }
    }
  });

  const commit = (newBlocks, focus) => {
    if (focus) pending.current = focus;
    onChange(serialize(newBlocks));
  };

  const toggle = (i) => {
    const b = blocks[i];
    const next = [...blocks];
    next[i] = { ...b, checked: !b.checked };
    commit(next);
  };

  const handleChange = (i, text) => {
    const b = blocks[i];
    if (b.kind !== "text") {
      const next = [...blocks];
      next[i] = { ...b, text };
      commit(next);
      return;
    }
    // Text-Block: auf „[] " bzw. „() " am Zeilenanfang prüfen → Checkbox.
    const lines = text.split("\n");
    let idx = -1, kind = null, rest = "";
    for (let li = 0; li < lines.length; li++) {
      let m;
      if ((m = /^\[\] (.*)$/.exec(lines[li]))) { idx = li; kind = "check"; rest = m[1]; break; }
      if ((m = /^\(\) (.*)$/.exec(lines[li]))) { idx = li; kind = "radio"; rest = m[1]; break; }
    }
    const next = [...blocks];
    if (idx === -1) {
      next[i] = { kind: "text", text };
      commit(next);
      return;
    }
    const before = lines.slice(0, idx).join("\n");
    const after = lines.slice(idx + 1).join("\n");
    const replacement = [];
    if (idx > 0) replacement.push({ kind: "text", text: before });
    const checkPos = replacement.length;
    replacement.push({ kind, checked: false, text: rest });
    if (idx < lines.length - 1) replacement.push({ kind: "text", text: after });
    next.splice(i, 1, ...replacement);
    commit(next, { index: i + checkPos, caret: rest.length });
  };

  const handleKeyDown = (i, e) => {
    const b = blocks[i];
    if (b.kind === "text") return; // Fließtext: Enter = normaler Zeilenumbruch.
    const el = e.target;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const next = [...blocks];
      if (b.text.trim() === "") {
        // Leere Checkbox + Enter → Liste verlassen (in Fließtext umwandeln).
        next[i] = { kind: "text", text: "" };
        commit(next, { index: i, caret: 0 });
        return;
      }
      const caret = el.selectionStart;
      next[i] = { ...b, text: b.text.slice(0, caret) };
      next.splice(i + 1, 0, { kind: b.kind, checked: false, text: b.text.slice(caret) });
      commit(next, { index: i + 1, caret: 0 });
      return;
    }

    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      const prev = blocks[i - 1];
      const next = [...blocks];
      if (prev && prev.kind === "text") {
        // Text an das Ende des vorherigen Text-Blocks anhängen.
        const caret = prev.text.length;
        next[i - 1] = { kind: "text", text: prev.text + b.text };
        next.splice(i, 1);
        commit(next, { index: i - 1, caret });
      } else {
        // Marker entfernen, Text behalten.
        next[i] = { kind: "text", text: b.text };
        commit(next, { index: i, caret: 0 });
      }
    }
  };

  return (
    <div className="canvas-editor">
      {blocks.map((b, i) => {
        const isBox = b.kind === "check" || b.kind === "radio";
        return (
          <div key={i} className={`canvas-block canvas-block--${b.kind}`}>
            {isBox && (
              <button
                type="button"
                className={`canvas-check canvas-check--${b.kind}${b.checked ? " is-checked" : ""}`}
                onClick={() => toggle(i)}
                aria-pressed={b.checked}
                tabIndex={-1}
              >
                {b.kind === "check" && b.checked && <Check size={12} strokeWidth={3} />}
              </button>
            )}
            <textarea
              ref={(el) => (refs.current[i] = el)}
              className={`canvas-block__input${b.checked ? " is-checked" : ""}`}
              rows={1}
              value={b.text}
              placeholder={i === 0 && blocks.length === 1 && b.kind === "text" ? placeholder : ""}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          </div>
        );
      })}
    </div>
  );
}
