import { useState, useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "touchstart", "scroll", "wheel", "keydown"];

/**
 * Returns `true` while there has been recent user activity (mouse, touch,
 * scroll, keyboard) and flips to `false` after `timeout` ms of silence.
 */
export function useInactivity(timeout = 5000) {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const scheduleHide = () => {
      timerRef.current = setTimeout(() => setIsVisible(false), timeout);
    };

    const handleActivity = () => {
      setIsVisible(true);
      clearTimeout(timerRef.current);
      scheduleHide();
    };

    scheduleHide();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [timeout]);

  return isVisible;
}
