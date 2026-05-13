// Test-app shim entry. Designed to exercise the native transformer end-to-
// end through a real `Metro.runBuild`, NOT to be a functional React app.
// The bundle is only inspected for runtime markers + the tree-shake proof.

export type AppProps = {
  title: string;
};

// `treeShakeMe` is imported by name from index.js but never referenced.
// `@rnx-kit/metro-serializer-esbuild` must eliminate it from the bundle.
export const treeShakeMe = "TREE_SHAKE_ME_MARKER";

export function useApp(): AppProps {
  // A tiny bit of real work to keep the optimizer honest.
  const props: AppProps = { title: "shim" };
  return props;
}

const App = (props: AppProps): AppProps => props;

// eslint-disable-next-line import/no-default-export -- bench fixture mimics a real RN entry
export default App;
