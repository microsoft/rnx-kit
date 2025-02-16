export function getHermesVersion(): string | undefined {
  return (
    "HermesInternal" in global &&
    HermesInternal &&
    "getRuntimeProperties" in HermesInternal &&
    typeof HermesInternal.getRuntimeProperties === "function" &&
    HermesInternal.getRuntimeProperties()["OSS Release Version"]
  );
}
