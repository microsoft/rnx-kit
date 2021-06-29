const ALLOWED_SCALES: { [key: string]: number[] } = {
  ios: [1, 2, 3],
};

export function filterPlatformAssetScales(
  platform: string,
  scales: readonly number[]
): readonly number[] {
  const allowlist: number[] = ALLOWED_SCALES[platform];
  if (!allowlist) {
    return scales;
  }
  const result = scales.filter((scale) => allowlist.indexOf(scale) > -1);
  if (result.length === 0 && scales.length > 0) {
    // No matching scale found, but there are some available. Ideally we don't
    // want to be in this situation and should throw, but for now as a fallback
    // let's just use the closest larger image
    const maxScale = allowlist[allowlist.length - 1];
    for (const scale of scales) {
      if (scale > maxScale) {
        result.push(scale);
        break;
      }
    }

    // There is no larger scales available, use the largest we have
    if (result.length === 0) {
      result.push(scales[scales.length - 1]);
    }
  }
  return result;
}
