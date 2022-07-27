import { BaseMods } from "@expo/config-plugins";
import findUp from "find-up";
import * as path from "path";

type BaseModProviderMethods<ModType, Props> = ReturnType<
  typeof BaseMods.provider<ModType, Props>
>;

export function makeNullProvider(defaultRead = {}) {
  return BaseMods.provider({
    getFilePath: () => "",
    read: () => Promise.resolve(defaultRead),
    write: () => Promise.resolve(),
  });
}

export function makeFilePathModifier(actualProjectDir: string) {
  return function <ModType, Props>(
    original: BaseModProviderMethods<ModType, Props>,
    file: string
  ): BaseModProviderMethods<ModType, Props> {
    return BaseMods.provider({
      ...original,
      getFilePath: async ({ modRequest: { projectRoot } }) => {
        const name = path.posix.join(actualProjectDir, file);
        const result = await findUp(name, { cwd: projectRoot });
        return result || name;
      },
    });
  };
}
