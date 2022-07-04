import * as path from "node:path";

const cwd = process.cwd();

export function setFixture(name: string): void {
  process.chdir(path.join(__dirname, "__fixtures__", name));
}

export function unsetFixture(): void {
  process.chdir(cwd);
}
