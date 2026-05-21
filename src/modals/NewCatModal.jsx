import { useState } from "react";
import { CAT_ICONS } from "../utils";

export function NewCatModal({ type, onSave, onClose, t, CC }) {
  const [name, setName] = useState("");
  const cfg = CC[type];
  const CatIcon = CAT_ICONS[type];

  const trySave = () => {
    if (name.trim()) onSave(name.trim());
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />
        <div className="modal__icon-row">
          <CatIcon size={20} color={cfg.color} />
          <h3 className="modal__title">{t.newSing(cfg.sing)}</h3>
        </div>
        <input
          className="modal__input modal__input--title"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder(cfg.sing)}
          onKeyDown={(e) => e.key === "Enter" && trySave()}
          style={{ borderColor: cfg.color + "45" }}
        />
        <button
          className={`modal__submit ${!name.trim() ? "modal__submit--disabled" : ""}`}
          onClick={trySave}
          style={{ background: cfg.color }}
        >
          {t.create || "Erstellen"}
        </button>
      </div>
    </div>
  );
}
