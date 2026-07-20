import { useMemo } from "react";

// ============================================================
// Gemeinsame Konstanten/Helfer der Verknüpfen-Ansicht.
// Liegen bewusst NEBEN `LinkPicker.jsx`: die dortige Datei exportiert nur
// Komponenten (Vite Fast Refresh verträgt keine gemischten Exporte).
// ============================================================

// Reihenfolge der PARA-Typen; die Tags hängen sich als vierter Tab hinten an.
export const LINK_TYPE_ORDER = ["project", "area", "resource"];
export const LINK_TABS = [...LINK_TYPE_ORDER, "tags"];

export const TAG_COLOR = "#EC4899";

/** Beschriftung eines Verknüpfen-Tabs. */
export function linkTabLabel(type, t) {
  if (type === "tags") return t.tagsLabel;
  if (type === "project") return t.projects;
  if (type === "area") return t.areas;
  return t.resources;
}

/**
 * Alle bekannten Tag-Namen: global gepflegte, die an Kategorien hängen und
 * die bereits gesetzten – sortiert und ohne Dubletten.
 */
export function useTagNames(tags = [], cats = [], currentTags = []) {
  return useMemo(
    () =>
      Array.from(
        new Set([
          ...tags.map((tg) => (typeof tg === "string" ? tg : tg.name)),
          ...cats.flatMap((c) => c.tags || []),
          ...currentTags,
        ]),
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [tags, cats, currentTags],
  );
}
