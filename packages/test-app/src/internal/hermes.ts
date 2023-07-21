export function getHermesVersion() {
  return (
    // @ts-expect-error `HermesInternal` is set when on Hermes
    global.HermesInternal?.getRuntimeProperties?.()["OSS Release Version"] ??
    false
  );
}
