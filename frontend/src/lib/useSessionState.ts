import { useEffect, useState } from "react";

/**
 * useState persisted in sessionStorage — survives route changes and reloads
 * within the tab (used so the dashboard's filters stay stable when the user
 * visits the training archive and comes back), but resets with a new tab.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full/blocked — state simply won't persist */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
