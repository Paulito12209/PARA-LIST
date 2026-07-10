import { createPortal } from "react-dom";
import { Calendar, Camera, ChevronDown, X, Check } from "lucide-react";
import { GitMergeBranchIcon, TagIcon } from "./AppIcons";
import { fmtDate } from "../utils";

/**
 * Aktionsleiste über der iOS-Tastatur beim manuellen Erstellen von Einträgen
 * über das Dock-Eingabefeld (Apple-Reminders-Stil). Buttons links: Datum ·
 * Verknüpfen (App-Glyphe, schwarz/weiß je Theme) · Tag · Kamera; rechts ein
 * Chevron, das die Tastatur zuklappt.
 *
 * [data-keep-focus]: Taps auf die Leiste dürfen das Dock-Eingabefeld NICHT
 * bluren (der globale Fokus-Listener in App.jsx lässt sie deshalb aus);
 * zusätzlich verhindert onMouseDown-preventDefault den Fokus-Klau durch iOS.
 */
export function DockKeyboardBar({
  t,
  accent,
  kbHeight,
  draft,
  onPatchDraft,
  popover, // null | "date" | "tag"
  onTogglePopover,
  allTags = [],
  show, // { date, link, tag, camera }
  onOpenLink,
  onPickPhoto,
  onCollapse,
  onFieldFocus,
  onFieldBlur,
}) {
  const keep = (e) => e.preventDefault();

  const btnCls = (isSet, isOpen) =>
    `dock-kb-bar__btn${isSet ? " dock-kb-bar__btn--set" : ""}${
      isOpen ? " dock-kb-bar__btn--open" : ""
    }`;

  const toggleTag = (name) => {
    const cur = draft.tags || [];
    onPatchDraft({
      tags: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name],
    });
  };

  return createPortal(
    <div
      className="dock-kb-bar"
      data-keep-focus="true"
      style={{ bottom: kbHeight > 0 ? kbHeight : undefined, "--dock-accent": accent }}
    >
      {/* Popover: Datum + Uhrzeit (native Felder) */}
      {popover === "date" && (
        <div className="dock-kb-bar__popover">
          <input
            type="date"
            className="dock-kb-bar__field"
            value={draft.date || ""}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => onPatchDraft({ date: e.target.value || null })}
            aria-label={t.dueDate || "Datum"}
          />
          <input
            type="time"
            className="dock-kb-bar__field"
            value={draft.time || ""}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => onPatchDraft({ time: e.target.value || null })}
            aria-label={t.oclock || "Uhrzeit"}
          />
          {(draft.date || draft.time) && (
            <button
              type="button"
              className="dock-kb-bar__clear"
              onMouseDown={keep}
              onClick={() => onPatchDraft({ date: null, time: null })}
              aria-label={t.closeBtn || "Entfernen"}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {/* Popover: Tags (Mehrfachauswahl) */}
      {popover === "tag" && (
        <div className="dock-kb-bar__popover dock-kb-bar__popover--tags">
          {allTags.length === 0 ? (
            <span className="dock-kb-bar__tags-empty">
              {t.noTags || "Noch keine Tags"}
            </span>
          ) : (
            allTags.map((tag) => {
              const on = (draft.tags || []).includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`dock-kb-bar__tag-pill${on ? " dock-kb-bar__tag-pill--on" : ""}`}
                  onMouseDown={keep}
                  onClick={() => toggleTag(tag.name)}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                  {tag.name}
                </button>
              );
            })
          )}
        </div>
      )}

      <div className="dock-kb-bar__row">
        {show.date && (
          <button
            type="button"
            className={btnCls(!!(draft.date || draft.time), popover === "date")}
            onMouseDown={keep}
            onClick={() => onTogglePopover("date")}
            aria-label={t.dueDate || "Datum"}
          >
            <Calendar size={20} strokeWidth={2.1} />
            {draft.date && (
              <span className="dock-kb-bar__btn-label">
                {fmtDate(draft.date, t.locale)}
              </span>
            )}
          </button>
        )}

        {show.link && (
          <button
            type="button"
            className={`${btnCls(!!draft.catIds?.length, false)} dock-kb-bar__btn--brand`}
            onMouseDown={keep}
            onClick={onOpenLink}
            aria-label={t.linkSheetTitle || "Verknüpfen"}
          >
            <GitMergeBranchIcon size={20} strokeWidth={2.1} />
            {draft.catIds?.length > 0 && (
              <span className="dock-kb-bar__btn-label">{draft.catIds.length}</span>
            )}
          </button>
        )}

        {show.tag && (
          <button
            type="button"
            className={btnCls(!!draft.tags?.length, popover === "tag")}
            onMouseDown={keep}
            onClick={() => onTogglePopover("tag")}
            aria-label="Tags"
          >
            <TagIcon size={20} strokeWidth={1.8} />
            {draft.tags?.length > 0 && (
              <span className="dock-kb-bar__btn-label">{draft.tags.length}</span>
            )}
          </button>
        )}

        {show.camera && (
          <button
            type="button"
            className={btnCls(!!draft.photo, false)}
            onMouseDown={keep}
            onClick={onPickPhoto}
            aria-label={t.image || "Foto"}
          >
            <Camera size={20} strokeWidth={2.1} />
            {draft.photo && <span className="dock-kb-bar__dot" aria-hidden="true" />}
          </button>
        )}

        <span className="dock-kb-bar__spacer" />

        <button
          type="button"
          className="dock-kb-bar__btn dock-kb-bar__collapse"
          onMouseDown={keep}
          onClick={onCollapse}
          aria-label={t.fc?.collapseKeyboard || t.closeBtn || "Tastatur zuklappen"}
        >
          <ChevronDown size={22} strokeWidth={2.3} />
        </button>
      </div>
    </div>,
    document.body
  );
}
