import type { BasicSourceMap, SourceDiff } from "./types";

export function isValidSourceMap(
  obj: Partial<BasicSourceMap>
): obj is BasicSourceMap {
  const { sources, sourcesContent } = obj;
  return Array.isArray(sources) && Array.isArray(sourcesContent);
}

export function makeMap({
  sources,
  sourcesContent,
}: BasicSourceMap): Record<string, number> {
  return sources.reduce<Record<string, number>>((map, file, index) => {
    const content = sourcesContent[index];
    map[file] = content?.length ?? NaN;
    return map;
  }, {});
}

export function diff(
  a: Partial<BasicSourceMap>,
  b: Partial<BasicSourceMap>
): SourceDiff[] {
  if (!isValidSourceMap(a) || !isValidSourceMap(b)) {
    return [];
  }

  const aMap = makeMap(a);
  const bMap = makeMap(b);
  return Array.from(
    [Object.keys(aMap), Object.keys(bMap)].reduce((set, sources) => {
      return sources.reduce((set, sourceFile) => {
        set.add(sourceFile);
        return set;
      }, set);
    }, new Set<string>())
  ).reduce<SourceDiff[]>((files, sourceFile) => {
    const aFileSize = aMap[sourceFile];
    const bFileSize = bMap[sourceFile];

    // NaN !== NaN, so we must use `Object.is` to compare them. We still need
    // to use `===` because `Object.is(0, -0)` is `false`.
    if (aFileSize === bFileSize || Object.is(aFileSize, bFileSize)) {
      return files;
    }

    const delta = (bFileSize ?? 0) - (aFileSize ?? 0);
    files.push({
      state: !aFileSize ? "added" : !bFileSize ? "removed" : "changed",
      path: sourceFile,
      diff: delta,
    });

    return files;
  }, []);
}
