import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

// Persists state to async-storage. `loaded` flips true once the initial
// value has been read, so we don't immediately overwrite storage on mount.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then(s => {
        if (active && s != null) {
          try { setValue(JSON.parse(s)); } catch {}
        }
        if (active) setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value, loaded]);

  return [value, setValue];
}
