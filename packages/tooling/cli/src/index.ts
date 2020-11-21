export type Foo = {
  a: number;
  b: number;
  sum?: number;
};

export function doNothingReally(target: Foo): Foo {
  return { ...target, sum: target.a + target.b };
}
