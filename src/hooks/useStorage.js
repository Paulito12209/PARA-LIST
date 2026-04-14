// ============================================================
// PARA·LIST – IndexedDB Persistence via idb-keyval
// ============================================================
import { get, set } from 'idb-keyval';
import { useState, useEffect, useRef, useCallback } from 'react';

const DB_KEY = 'paralist-state';

/**
 * Custom hook that persists state in IndexedDB using idb-keyval.
 * On mount it loads the saved state; on every state change it saves back.
 *
 * @param {object} defaultState - The initial/seed state used on first load.
 * @returns {[object, Function, boolean]} - [state, setState, isLoaded]
 */
export function usePersistedState(defaultState) {
  const [state, setState] = useState(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitial = useRef(true);

  // Load from IndexedDB on mount
  useEffect(() => {
    get(DB_KEY).then((saved) => {
      if (saved) {
        setState(saved);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  // Save to IndexedDB on every state change (except initial load)
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (isLoaded) {
      set(DB_KEY, state).catch(console.error);
    }
  }, [state, isLoaded]);

  const update = useCallback((fn) => {
    setState(prev => typeof fn === 'function' ? fn(prev) : fn);
  }, []);

  return [state, update, isLoaded];
}
