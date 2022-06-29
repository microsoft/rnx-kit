import { XMLParser } from "fast-xml-parser";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Ora } from "ora";
import { retry } from "../async";
import { makeCommand } from "../command";
import type { BuildParams } from "../types";

type PackageInfo = {
  packageName: string;
  appId: string;
};

function makePowerShell(
  cwd: string,
  elevated = false
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

async function getPackageInfo(app: string): Promise<PackageInfo | null> {
  const filename = path.join(app, "AppxManifest.xml");
  const content = await fs.readFile(filename, { encoding: "utf-8" });

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
  if (!process.env.SHELL) {
    return p;
  }

  const { root } = path.parse(p);
  const m = root.toLowerCase().match(/([a-z]+)/);
  return m ? `/${m[1]}/${p.substring(root.length)}`.replace(/\\/g, "/") : p;
}

async function install(
  app: string,
  tryUninstall = true
): Promise<string | Error> {
  const packageInfo = await getPackageInfo(app);
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

export async function deploy(
  app: string,
  _: BuildParams,
  spinner: Ora
): Promise<void> {
  if (os.platform() !== "win32") {
    return;
  }

  spinner.start(`Installing ${app}`);
  const result = await install(app);
  if (result instanceof Error) {
    spinner.warn(result.message);
    spinner.fail();
    return;
  }

  spinner.text = `Launching ${result}`;
  await makeCommand("explorer")("shell:AppsFolder\\" + result);

  spinner.succeed(`Launched ${result}`);
}
