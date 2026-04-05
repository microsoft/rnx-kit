export function assertValue<T>(
  value: T | null | undefined,
  message?: string
): T {
  if (value == null) {
    throw new Error(message ?? "Unexpected null or undefined value");
  }
  return value;
}
