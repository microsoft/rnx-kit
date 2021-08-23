export function parseBoolean(val: string): boolean {
  if (val === "false") {
    return false;
  }
  if (val === "true") {
    return true;
  }
  throw new Error(
    "Invalid boolean value '" + val + "' -- must be true or false"
  );
}
