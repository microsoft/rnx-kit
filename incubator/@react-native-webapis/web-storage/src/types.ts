import type { Spec } from "./NativeWebStorage";

export type StoragePolyfill = {
  _isPolyfilledBy: {
    value: "@react-native-webapis/web-storage";
    writable: false;
  };
  length: {
    get: Spec["length"];
  };
  key: {
    value: Spec["key"];
    writable: false;
  };
  getItem: {
    value: Spec["getItem"];
    writable: false;
  };
  setItem: {
    value: Spec["setItem"];
    writable: false;
  };
  removeItem: {
    value: Spec["removeItem"];
    writable: false;
  };
  clear: {
    value: Spec["clear"];
    writable: false;
  };
};
