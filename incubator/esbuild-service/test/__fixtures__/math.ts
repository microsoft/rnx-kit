export function add(a: number, b: number): number {
  return a + b;
}

export function unused(): string {
  return "this should be removed by tree-shaking";
}
