import { useState } from "react";

// EDITMODE-BEGIN
export const TWEAK_DEFAULTS = {
  theme: "dark",        // "dark" | "light"
  sidebarOpen: false,   // expanded sidebar default
  railVisible: true,    // expanded rail default
  userName: "Paul",     // greeting fallback when no user name set
};
// EDITMODE-END

export function useTweaks(initial = TWEAK_DEFAULTS) {
  const [tweaks, setTweaks] = useState(initial);
  const update = (patch) => setTweaks((s) => ({ ...s, ...patch }));
  return [tweaks, update];
}
