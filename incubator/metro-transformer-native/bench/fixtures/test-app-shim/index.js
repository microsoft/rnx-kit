// Minimal entry that imports App.tsx and exercises the used export. The
// `treeShakeMe` export on App.tsx is imported by name but never invoked —
// the esbuild serializer should drop it from the bundle.
import App, { useApp } from "./App";

useApp();
// eslint-disable-next-line import/no-default-export -- bench fixture mimics a real RN entry
export default App;
