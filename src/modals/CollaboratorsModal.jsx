import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2, Plus, Camera } from "lucide-react";
import { uid } from "../utils";

const VIEW_LIST = "list";
const VIEW_ADD = "add";

export function CollaboratorsModal({ t, cat, onUpdateCat, onClose, initialView }) {
  const [view, setView] = useState(initialView || VIEW_LIST);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);

  const collaborators = cat?.collaborators || [];

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const newCollab = { id: uid(), name: name.trim(), avatar: avatar || null };
    onUpdateCat(cat.id, {
      collaborators: [...collaborators, newCollab],
    });
    setName("");
    setAvatar(null);
    setView(VIEW_LIST);
  };

  const handleRemove = (collab) => {
    if (!window.confirm(t.confirmRemoveCollaborator(collab.name))) return;
    onUpdateCat(cat.id, {
      collaborators: collaborators.filter((c) => c.id !== collab.id),
    });
  };

  // Render through a portal to <body> so the overlay escapes the desktop
  // main column (which is a `container-type` containing block that would
  // otherwise trap even position:fixed) and covers the whole window. The
  // wrapper carries the theme classes — `display: contents` (see CSS) means
  // it adds no box of its own, but it stays an ancestor in the selector tree
  // so the existing `.app.light-theme .modal/.collab-modal` styles still apply
  // and the dark-mode CSS variables continue to inherit.
  const isLight =
    typeof document !== "undefined" &&
    !!document.querySelector(".dsk-app--light, .app.light-theme");

  return createPortal(
    <div className={`modal-portal app${isLight ? " light-theme" : ""}`}>
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet collab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__handle" />

        <div className="modal__header">
          <h2 className="modal__title">{t.collaborators}</h2>
        </div>

        {view === VIEW_LIST && (
          <div className="collab-modal__body">
            {collaborators.length === 0 ? (
              <p className="collab-modal__empty">{t.noCollaborators}</p>
            ) : (
              <div className="collab-modal__list">
                {collaborators.map((collab) => (
                  <div key={collab.id} className="collab-modal__item">
                    <div className="collab-modal__item-avatar">
                      {collab.avatar ? (
                        <img src={collab.avatar} alt={collab.name} />
                      ) : (
                        <span>{collab.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="collab-modal__item-name">{collab.name}</span>
                    <button
                      className="collab-modal__item-remove"
                      onClick={() => handleRemove(collab)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="collab-modal__add-btn"
              onClick={() => setView(VIEW_ADD)}
            >
              <Plus size={16} />
              {t.addCollaborator}
            </button>
            <button className="collab-modal__bottom-close-btn" onClick={onClose}>
              {t.closeBtn}
            </button>
          </div>
        )}

        {view === VIEW_ADD && (
          <div className="collab-modal__body">
            <button
              className="collab-modal__avatar-picker"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt="Preview" />
              ) : (
                <Camera size={24} />
              )}
            </button>
            <span className="collab-modal__avatar-label">{t.choosePhoto}</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
            <input
              className="collab-modal__name-input"
              type="text"
              placeholder={t.collaboratorNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="collab-modal__actions">
              <button
                className="collab-modal__cancel-btn"
                onClick={() => {
                  setName("");
                  setAvatar(null);
                  setView(VIEW_LIST);
                }}
              >
                {t.closeBtn}
              </button>
              <button
                className="collab-modal__submit-btn"
                onClick={handleAdd}
                disabled={!name.trim()}
              >
                {t.createBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>,
    document.body
  );
}
