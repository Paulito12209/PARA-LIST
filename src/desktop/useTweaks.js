import { useState } from "react";

// EDITMODE-BEGIN
export const TWEAK_DEFAULTS = {
  theme: "dark",                // "dark" | "light"
  sidebarMode: "locked",        // "locked" | "hidden" — hidden = auto-hide overlay on hover
  sidebarTreeOpen: {            // per-section expand state in the tree sidebar
    project:  true,
    area:     true,
    resource: true,
    archive:  false,
  },
  sidebarCatOpen: {},           // per-cat expand state ({ [catId]: true }) — default collapsed

  railVisible: false,           // collapsed a-bar (right rail) by default
  userName: "Paul",             // greeting fallback when no user name set
};
// EDITMODE-END

export function useTweaks(initial = TWEAK_DEFAULTS) {
  const [tweaks, setTweaks] = useState(initial);
  const update = (patch) => setTweaks((s) => ({ ...s, ...patch }));
  return [tweaks, update];
}
