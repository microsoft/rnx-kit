import * as path from "node:path";

const cwd = process.cwd();

export function setFixture(name: string): string {
  const p = path.join(__dirname, "__fixtures__", name);
  process.chdir(p);
  return p;
}

export function unsetFixture(): void {
  process.chdir(cwd);
}
