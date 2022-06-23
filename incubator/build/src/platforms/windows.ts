import { XMLParser } from "fast-xml-parser";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Ora } from "ora";
import { retry } from "../async";
import { makeCommand } from "../command";

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

async function install(app: string): Promise<string | Error> {
  const packageInfo = await getPackageInfo(app);
  if (!packageInfo) {
    return new Error(
      "Failed to get package name and/or app id from build artifact"
    );
  }

  const files = await fs.readdir(app);
  const msixbundle = files.find((file) => file.endsWith(".msixbundle"));
  if (!msixbundle) {
    return new Error("Missing MSIX package from build artifact");
  }

  const pwsh = makePowerShell(app);
  const pwshElevated = makePowerShell(app, true);

  const { stderr, status } = await pwshElevated(
    "Add-AppxPackage",
    "-AllowUnsigned",
    path.join(app, msixbundle)
  );
  if (status !== 0) {
    if (stderr?.includes("Install failed")) {
      const { stdout: packageFullName } = await pwsh(
        `(Get-AppxPackage ${packageInfo.packageName}).PackageFullName`
      );
      if (packageFullName) {
        await pwsh("Remove-AppxPackage", packageFullName);
        return install(app);
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

export async function launch(app: string, spinner: Ora): Promise<void> {
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
