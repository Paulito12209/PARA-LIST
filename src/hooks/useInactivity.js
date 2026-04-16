import { useState, useEffect, useRef } from 'react';

/**
 * Hook zur Erfassung von Inaktivität.
 * Setzt den Status 'isVisible' nach einer bestimmten Zeit auf false.
 * @param {number} timeout In Millisekunden (Standard: 5000ms)
 * @returns {boolean} Sichtbarkeitsstatus
 */
export function useInactivity(timeout = 5000) {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef(null);

  const resetTimer = () => {
    setIsVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, timeout);
  };

  useEffect(() => {
    // Ereignisse, die die Inaktivität zurücksetzen
    const events = ['mousedown', 'touchstart', 'scroll', 'wheel', 'keydown'];
    
    // Initialer Start des Timers
    resetTimer();

    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [timeout]);

  return isVisible;
}
