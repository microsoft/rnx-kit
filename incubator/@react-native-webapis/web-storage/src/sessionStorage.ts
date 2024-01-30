import type { StoragePolyfill } from "./types";

export function makeSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage: StoragePolyfill = {
    _isPolyfilledBy: {
      value: "@react-native-webapis/web-storage",
      writable: false,
    },
    length: {
      get: () => store.size,
    },
    key: {
      value: (index: number) => {
        if (index >= store.size) {
          return null;
        }

        const iter = store.keys();
        let res = iter.next();
        for (let k = 0; k < index; ++k) {
          res = iter.next();
        }
        return res.value;
      },
      writable: false,
    },
    getItem: {
      value: (key: string) => {
        const value = store.get(key);
        return typeof value !== "string" ? null : value;
      },
      writable: false,
    },
    setItem: {
      value: (key: string, value: string) => {
        store.set(key, value);
        return false;
      },
      writable: false,
    },
    removeItem: {
      value: (key: string) => store.delete(key),
      writable: false,
    },
    clear: {
      value: () => {
        store.clear();
        return false;
      },
      writable: false,
    },
  };
  return Object.defineProperties({}, sessionStorage);
}
