import { NativeWebStorage } from "./NativeWebStorage";
import type { StoragePolyfill } from "./types";

export function makeLocalStorage() {
  const localStorage: StoragePolyfill = {
    _isPolyfilledBy: {
      value: "@react-native-webapis/web-storage",
      writable: false,
    },
    length: {
      get: NativeWebStorage.length,
    },
    key: {
      value: NativeWebStorage.key,
      writable: false,
    },
    getItem: {
      value: NativeWebStorage.getItem,
      writable: false,
    },
    setItem: {
      value: NativeWebStorage.setItem,
      writable: false,
    },
    removeItem: {
      value: NativeWebStorage.removeItem,
      writable: false,
    },
    clear: {
      value: NativeWebStorage.clear,
      writable: false,
    },
  };
  return Object.defineProperties({}, localStorage);
}
