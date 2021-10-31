export function extractParameterValue(
  args: string[],
  name: string
): string | undefined {
  const index = args.indexOf(name);
  if (index !== -1) {
    if (index === args.length - 1) {
      throw new Error(`${name} must be followed by a value`);
    }
    const value = args[index + 1];
    args.splice(index, 2);
    return value;
  }
  return undefined;
}

export function extractParameterFlag(args: string[], name: string): boolean {
  const index = args.indexOf(name);
  if (index !== -1) {
    args.splice(index, 1);
    return true;
  }
  return false;
}
