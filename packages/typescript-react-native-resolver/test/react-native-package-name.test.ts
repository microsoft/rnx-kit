import * as path from "path";
import { createReactNativePackageNameReplacer } from "../src/react-native-package-name";

const fixture = path.join(
  __dirname,
  "__fixtures__",
  "react-native-package-name-test"
);

describe("React-Native Package Name > createReactNativePackageNameReplacer > Disabled", () => {
  test("returns the input module without substitution", () => {
    const replacer = createReactNativePackageNameReplacer(
      fixture,
      "windows",
      true
    );
    expect(replacer("react-native")).toEqual("react-native");
    expect(replacer("react-native/foo")).toEqual("react-native/foo");
  });
});

describe("React-Native Package Name > createReactNativePackageNameReplacer > In-tree Platform", () => {
  test("returns the input module without substitution", () => {
    const replacer = createReactNativePackageNameReplacer(
      fixture,
      "ios",
      false
    );
    expect(replacer("react-native")).toEqual("react-native");
    expect(replacer("react-native/foo")).toEqual("react-native/foo");
  });
});

describe("React-Native Package Name > createReactNativePackageNameReplacer > Out-of-tree Platform", () => {
  const replacer = createReactNativePackageNameReplacer(
    fixture,
    "windows",
    false
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns the input module without substitution when it is not a reference to react-native", () => {
    expect(replacer("pkg-up")).toEqual("pkg-up");
  });

  test("replaces a react-native module reference with react-native-windows", () => {
    expect(replacer("react-native")).toEqual("react-native-windows");
    expect(replacer("react-native/foo")).toEqual("react-native-windows/foo");
  });
});
