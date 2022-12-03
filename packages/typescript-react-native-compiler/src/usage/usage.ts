import { findPackage, PackageManifest, readPackage } from "@rnx-kit/tools-node";
import os from "os";
import path from "path";
import util from "util";
import { UsageColors, createUsageColors } from "./colors";
import { wrapAndIndent } from "./text";

export class Usage {
  private colors: UsageColors;
  private columns: number;
  private eol: string;

  private scriptName: string;
  private scriptNameNoExt: string;

  private pkg: PackageManifest | undefined;

  constructor(
    scriptPath: string,
    columns: number,
    eol: string,
    colors: UsageColors
  ) {
    this.colors = colors;
    this.columns = columns;
    this.eol = eol;

    const { base, name } = path.parse(scriptPath);
    this.scriptName = base;
    this.scriptNameNoExt = name;

    const pkgFile = findPackage(__dirname);
    this.pkg = pkgFile ? readPackage(pkgFile) : undefined;
  }

  private print(spacesToIndent: number, message: string): void {
    console.log(wrapAndIndent(spacesToIndent, this.columns, message));
  }

  show(): void {
    this.preamble();

    this.section("USAGE");

    this.commandLine(
      this.scriptName,
      `[${this.scriptNameNoExt} options] [tsc options]`
    );

    this.section(`${this.scriptNameNoExt.toUpperCase()} OPTIONS`);

    this.option(
      "--platform <p>",
      "Target react-native platform. This must refer to a platform which has a react-native implementation, such as ios, android, windows or macos. When given, react-native module resolution is used. Otherwise, modules are resolved using the configured TypeScript strategy."
    );
    this.option(
      "--platformExtensions <ext-1>[,<ext-2>[...<ext-N>]]",
      "List of platform file extensions to use when resolving react-native modules. Resolution always starts with the --platform name, followed by these extensions, ordered from highest precedence (ext-1) to lowest (ext-N)."
    );
    this.exampleHeader();
    this.example(
      `${this.scriptName} --platform ios --platformExtensions mobile,native`,
      "Resolution of module 'm' searchs for m.ios.* first, then m.mobile.*, m.native.*, and finally m.* (no extension)."
    );
    this.option(
      "--disableReactNativePackageSubstitution",
      "The react-native resolver maps module references from 'react-native' to the target platform's implementation, such as 'react-native-windows' for Windows, and 'react-native-macos' MacOS. This option disables that behavior."
    );

    if (this.pkg?.homepage) {
      console.log(
        this.colors.brightWhite(`Full documentation: ${this.pkg.homepage}`) +
          this.eol +
          this.eol
      );
    }
  }

  preamble(): void {
    const message = util.format(
      "%s: TypeScript with react-native - Version %s",
      this.scriptNameNoExt,
      this.pkg ? this.pkg.version : "Unknown"
    );

    console.log(
      this.colors.brightWhite(message) +
        " ".repeat(this.columns - message.length - 5) +
        this.colors.blueBackground(this.colors.brightWhite(" RN  "))
    );
    console.log(
      " ".repeat(this.columns - 5) +
        this.colors.blueBackground(this.colors.brightWhite("  TS "))
    );
  }

  section(header: string): void {
    this.print(0, this.colors.bold(this.colors.brightWhite(header)) + this.eol);
  }

  commandLine(script: string, params: string): void {
    this.print(2, this.colors.blue(script + " " + params) + this.eol);
  }

  option(text: string, description: string): void {
    this.print(2, this.colors.blue(text));
    this.print(2, this.colors.brightWhite(description) + this.eol);
  }

  exampleHeader(): void {
    this.print(4, this.colors.brightWhite("Example:"));
  }

  example(text: string, description: string): void {
    this.print(6, this.colors.blue(text));
    this.print(6, this.colors.brightWhite(description) + this.eol);
  }
}

export function usage(): void {
  const columns = Math.min(process.stdout.columns, 120);
  const usage = new Usage(
    process.argv[1],
    columns,
    os.EOL,
    createUsageColors()
  );
  usage.show();
}
