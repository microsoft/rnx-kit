const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

fs.readFileSync = (path, options) => {
  if (path === "chopper") {
    return `
export type Alias = { kind: "$Alias" };

export interface IChopper {
  kind: "$helicopter"
};

export class Chopper implements IChopper {};

export const name = "Dutch";
export function escape() {
  console.log("Get to da choppah!");
}

export { escape as escapeRe, name as nameRe };
export type { Alias as AliasRe, IChopper as IChopperRe };
`;
  }

  return actualFs.readFileSync(path, options);
};

fs.writeFile = actualFs.writeFile;

module.exports = fs;
