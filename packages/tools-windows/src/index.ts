import { retry } from "@rnx-kit/tools-shell/async";
import { makeCommand } from "@rnx-kit/tools-shell/command";
import { XMLParser } from "fast-xml-parser";
import * as fs from "node:fs";
import * as path from "node:path";

export type PackageInfo = {
  packageName: string;
  appId: string;
};

const currentShell = process.env.SHELL;

/**
 * Starts the app with specified identifier.
 */
export const start = (() => {
  const explorer = makeCommand("explorer");
  return (packageId: string) => explorer("shell:AppsFolder\\" + packageId);
})();

function makePowerShell(
  cwd: string,
  elevated?: "elevated"
): ReturnType<typeof makeCommand> {
  const withPowerShell = { cwd, shell: "powershell" };
  const prelude = [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
  ];
  if (elevated) {
    const start = makeCommand("Start-Process", withPowerShell);
    const startArgs = prelude.join(" ");
    return (...args: string[]) =>
      start(
        "-FilePath",
        "powershell",
        "-ArgumentList",
        `'${startArgs} "${args.join(" ")}"'`,
        "-PassThru",
        "-Verb",
        "RunAs"
      );
  } else {
    const ps = makeCommand("powershell", withPowerShell);
    return (...args: string[]) => ps(...prelude, `"${args.join(" ")}"`);
  }
}

/**
 * Returns information about the app package at specified path.
 */
export function getPackageInfo(app: string): PackageInfo | null {
  const filename = path.join(app, "AppxManifest.xml");
  const content = fs.readFileSync(filename, { encoding: "utf-8" });

  const xml = new XMLParser({ ignoreAttributes: false });
  const manifest = xml.parse(content);

  const packageName = manifest?.Package?.Identity?.["@_Name"];
  if (!packageName) {
    return null;
  }

  const appId = manifest.Package.Applications?.Application?.["@_Id"];
  if (!appId) {
    return null;
  }

  return { packageName, appId };
}

/**
 * Normalizes specified path depending on the shell currently in use.
 *
 * This is useful for ensuring paths are valid in Command Prompt or Bash. One
 * requires `C:\\some\\path`, while the other requires `/c/some/path`.
 *
 * @param p Path to normalize
 * @returns Path that is valid in the current shell.
 */
function normalizePath(p: string): string {
  if (!currentShell) {
    return p;
  }

  const { root } = path.parse(p);
  const m = root.toLowerCase().match(/([a-z]+)/);
  return m ? `/${m[1]}/${p.substring(root.length)}`.replace(/\\/g, "/") : p;
}

/**
 * Installs the app package at specified path, and returns its identifier.
 */
export async function install(
  app: string,
  tryUninstall = true
): Promise<string | Error> {
  const packageInfo = getPackageInfo(app);
  if (!packageInfo) {
    return new Error(
      "Failed to get package name and/or app id from build artifact"
    );
  }

  const pwsh = makePowerShell(app);

  const { stdout, stderr, status } = await pwsh(
    "./Add-AppDevPackage.ps1",
    "-Force",
    "-SkipLoggingTelemetry"
  );
  if (status !== 0) {
    if (stdout.includes("Install the signing certificate")) {
      const script = normalizePath(path.join(app, "Add-AppDevPackage.ps1"));
      return new Error(
        `The signing certificate needs to be installed before installing the app. Please run:\n\tpowershell ${script}`
      );
    } else if (stderr.includes("Install failed") && tryUninstall) {
      const { stdout: packageFullName } = await pwsh(
        `(Get-AppxPackage ${packageInfo.packageName}).PackageFullName`
      );
      if (packageFullName) {
        await pwsh("Remove-AppxPackage", packageFullName);
        return install(app, false);
      }
    }
    return new Error(stderr);
  }

  // We're just waiting for the app to be "registered"
  const { packageName, appId } = packageInfo;
  const result = await retry(async () => {
    const { stdout: packageFamilyName } = await pwsh(
      `(Get-AppxPackage ${packageName}).PackageFamilyName`
    );
    return packageFamilyName ? packageFamilyName + "!" + appId : null;
  }, 3);

  return result || new Error("App failed to install?");
}
