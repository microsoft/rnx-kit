import { makeLocalStorage } from "./localStorage.ts";
import { makeSessionStorage } from "./sessionStorage.ts";

const window = global.window || {};

Object.defineProperty(window, "localStorage", {
  value: makeLocalStorage(),
  writable: false,
});

Object.defineProperty(window, "sessionStorage", {
  value: makeSessionStorage(),
  writable: false,
});

if (window !== global.window) {
  global.window = window;
}
