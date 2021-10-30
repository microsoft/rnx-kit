import ts from "typescript";

export const Extensions = [
  ts.Extension.Dts,
  ts.Extension.Tsx,
  ts.Extension.Ts,
  ts.Extension.Json,
  ts.Extension.Jsx,
  ts.Extension.Js,
];

export const ExtensionsTypeScript = [
  ts.Extension.Ts,
  ts.Extension.Tsx,
  ts.Extension.Dts,
];

export function hasExtension(p: string, ext: ts.Extension): boolean {
  return p.length > ext.length && p.endsWith(ext);
}

export function getExtensionFromPath(p: string): ts.Extension | undefined {
  return Extensions.find((e) => hasExtension(p, e));
}
