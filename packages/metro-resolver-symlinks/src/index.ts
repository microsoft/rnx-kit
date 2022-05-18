import { makeResolver } from "./symlinkResolver";

// `export =` is not supported by @babel/plugin-transform-typescript.
// For anything that needs to be tested, please put them elsewhere.
export = makeResolver;
