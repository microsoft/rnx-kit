import {
  getExternalWorkspaces,
  type ExternalDeps,
  type ExternalWorkspaces,
} from "@rnx-kit/tools-workspaces/external";
import {
  structUtils,
  type Descriptor,
  type Locator,
  type Project,
} from "@yarnpkg/core";
import path from "node:path";

const externalProtocol = "external:";
const fallbackProtocol = "fallback:";
const npmProtocol = "npm:";

export function getProtocol() {
  return externalProtocol;
}

export function getFallbackProtocol() {
  return fallbackProtocol;
}

export function supportedProtocol(protocol: string) {
  return protocol === externalProtocol || protocol === fallbackProtocol;
}

const stringIdent = (s: string) => s;

export function toPortablePath(p: string): string {
  return path.posix.normalize(p);
}

export const toNativePath =
  process.platform === "win32"
    ? (p: string) => path.win32.normalize(p)
    : stringIdent;

export function toPortableRelativePath(from: string, to: string): string {
  return toPortablePath(path.relative(from, to));
}

export function getSettingsForProject(project: Project) {
  return getExternalWorkspaces(toNativePath(project.cwd));
}

export function versionFromDescriptorRange(range: string): string {
  const protocolEnd = range.indexOf(":");
  return protocolEnd === -1 ? range : range.slice(protocolEnd + 1);
}

export type DescriptorRangeParts = {
  // the protocol, e.g. 'external:', empty string if no protocol
  protocol: string;

  // the version, e.g. '^1.2.3' or '*', should exist
  version: string;
};

/**
 * @param range the range to decode, either "protocol:version" or "version"
 * @returns the version and protocol or an empty string for protocol if it isn't present
 */
export function decodeDescriptorRange(range: string): DescriptorRangeParts {
  const protocolEnd = range.indexOf(":");
  if (protocolEnd !== -1) {
    return {
      protocol: range.slice(0, protocolEnd + 1),
      version: range.slice(protocolEnd + 1),
    };
  }
  return { protocol: "", version: range };
}

/**
 * @param range the range to decode, in the form of 'external:workspace-name@version'
 * @returns the decoded range, in the form of { name: 'workspace-name', version: 'version' }
 */
export function decodeRange(range: string): { version: string } {
  if (range.startsWith(externalProtocol)) {
    range = range.slice(externalProtocol.length);
  }
  return { version: range };
}

/**
 * @param name the name of the package
 * @param resolutionRange the range from resolutions, in the format of 'external:version'
 * @returns a new range with the package name injected as 'external:package-name@version'
 */
export function encodeRange(_name: string, resolutionRange: string): string {
  if (resolutionRange.startsWith(externalProtocol)) {
    resolutionRange = resolutionRange.slice(externalProtocol.length);
  }
  return `${externalProtocol}${resolutionRange}`;
}

export function coerceDescriptorTo(
  descriptor: Descriptor,
  newProtocol: string
): Descriptor {
  const { protocol, version } = decodeDescriptorRange(descriptor.range);
  if (protocol === newProtocol) {
    return descriptor;
  }
  return structUtils.makeDescriptor(descriptor, `${newProtocol}${version}`);
}

export function coerceLocatorTo(
  locator: Locator,
  newProtocol: string
): Locator {
  const { protocol, version } = decodeDescriptorRange(locator.reference);
  if (protocol === newProtocol) {
    return locator;
  }
  return structUtils.makeLocator(locator, `${newProtocol}${version}`);
}

export function toExternalDescriptor(descriptor: Descriptor): Descriptor {
  return coerceDescriptorTo(descriptor, externalProtocol);
}

export function toExternalLocator(locator: Locator): Locator {
  return coerceLocatorTo(locator, externalProtocol);
}

export function toNpmDescriptor(descriptor: Descriptor): Descriptor {
  return coerceDescriptorTo(descriptor, npmProtocol);
}

export function toNpmLocator(locator: Locator): Locator {
  return coerceLocatorTo(locator, npmProtocol);
}

export function toFallbackDescriptor(descriptor: Descriptor): Descriptor {
  return coerceDescriptorTo(descriptor, fallbackProtocol);
}

export function toFallbackLocator(locator: Locator): Locator {
  return coerceLocatorTo(locator, fallbackProtocol);
}

/**
 * @param project yarn Project for this repo
 * @param target target path to write out workspace information to
 * @param includePrivate whether to include private packages
 * @param checkOnly only test to see whether there are unwritten changes
 * @param trace output logging information for the operation
 */
export function outputWorkspaces(
  project: Project,
  settings: ExternalWorkspaces,
  target?: string,
  checkOnly?: boolean
): void {
  const deps: ExternalDeps = {};
  // iterate the workspaces and add them to the deps object
  project.workspacesByIdent.forEach((workspace) => {
    const { name: ident, version, private: isPrivate } = workspace.manifest;
    if (ident && version && !isPrivate) {
      const name = structUtils.stringifyIdent(ident);
      deps[name] = {
        version,
        path: toPortableRelativePath(project.cwd, workspace.cwd),
      };
    }
  });

  // output the deps object
  settings.outputWorkspaces(deps, target, checkOnly);
}
