import type {
  JSONObject,
  JSONValidator,
  JSONValuePath,
  JSONValue,
} from "@rnx-kit/lint-json";
import { getJSONPathSegments } from "@rnx-kit/lint-json";
import type { Yarn } from "@yarnpkg/types";

/**
 * Create a JSON validator for a Yarn.Constraints.Workspace, allowing enforcement of values and reporting of errors
 * within the workspace's manifest. This validator integrates with Yarn's internal mechanisms for
 * managing workspace constraints, enabling validation and optional fixing of the workspace manifest.
 *
 * @param workspace The Yarn.Constraints.Workspace to validate.
 * @returns A JSON validator for the workspace.
 */
export function createYarnWorkspaceValidator(
  workspace: Yarn.Constraints.Workspace
): JSONValidator {
  const fix = isFixMode();
  const raw = workspace.manifest as JSONObject;

  function error(message: string) {
    workspace.error(message);
  }

  function enforce(path: JSONValuePath, value: JSONValue | undefined): void {
    const safePath = getJSONPathSegments(path);
    if (value === undefined) {
      workspace.unset(safePath);
    } else {
      workspace.set(safePath, value);
    }
  }

  return { fix, raw, enforce, error, dirty, finish };
}

/**
 * Whether yarn constraints is running in fix mode is determined by the cli flag.
 */
const isFixMode = (() => {
  let fixMode: boolean | undefined;
  return () => {
    if (fixMode === undefined) {
      fixMode = process.argv.includes("--fix");
    }
    return fixMode;
  };
})();

/** no-op dirty, yarn controls this internally */
function dirty() {
  // no-op
}

/** no-op finish, yarn controls this internally */
function finish() {
  return 0;
}
