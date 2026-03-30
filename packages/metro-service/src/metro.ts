import { findMetroPath } from "@rnx-kit/tools-react-native/metro";

export function requireMetroPath(projectRoot: string): string {
  const p = findMetroPath(projectRoot);
  if (!p) {
    throw new Error("Cannot find module 'metro'");
  }
  return p;
}

export function importMetroForProject(
  projectRoot: string
): Promise<typeof import("metro")> {
  // Note that we need to `import()` because a different module is returned with
  // `require()`.
  const options = { paths: [projectRoot] };
  const metroPath = require.resolve(requireMetroPath(projectRoot), options);
  return import(`file://${metroPath.replaceAll("\\", "/")}`);
}
