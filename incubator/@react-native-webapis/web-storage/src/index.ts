import { makeLocalStorage } from "./localStorage";
import { makeSessionStorage } from "./sessionStorage";

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
