import { useEffect, useState, useSyncExternalStore } from 'react';
import { royalImmoStore } from '../services/royalImmoService';

export function usePlatform() {
  const snapshot = useSyncExternalStore(
    (cb) => royalImmoStore.subscribe(cb),
    () => royalImmoStore.getSnapshot()
  );

  useEffect(() => {
    void royalImmoStore.initialize();
  }, []);

  return {
    ...snapshot,
    store: royalImmoStore,
  };
}

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

  return { dark, toggleTheme: () => setDark((prev) => !prev) };
}
