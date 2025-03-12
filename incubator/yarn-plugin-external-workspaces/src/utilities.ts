import { structUtils, type Descriptor, type Locator } from "@yarnpkg/core";
import path from "node:path";

export function toPortableRelativePath(from: string, to: string): string {
  return path.posix.normalize(path.relative(from, to));
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

export function coerceDescriptorTo(
  descriptor: Descriptor,
  newProtocol: string
): Descriptor {
  if (descriptor.range.startsWith(newProtocol)) {
    return descriptor;
  }

  const { version } = decodeDescriptorRange(descriptor.range);
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
