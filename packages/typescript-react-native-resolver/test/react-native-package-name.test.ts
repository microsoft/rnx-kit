import { ResolverLog, ResolverLogMode } from "../src/log";
import {
  getReactNativePlatformPackageName,
  createReactNativePackageNameReplacer,
} from "../src/react-native-package-name";

describe("React-Native Package Name > getReactNativePlatformPackageName", () => {
  test("returns Windows out-of-tree package", () => {
    expect(getReactNativePlatformPackageName("windows")).toEqual(
      "react-native-windows"
    );
  });

  test("returns Win32 out-of-tree package", () => {
    expect(getReactNativePlatformPackageName("win32")).toEqual(
      "@office-iss/react-native-win32"
    );
  });

  test("returns MacOS out-of-tree package", () => {
    expect(getReactNativePlatformPackageName("macos")).toEqual(
      "react-native-macos"
    );
  });
});

describe("React-Native Package Name > createReactNativePackageNameReplacer > Disabled", () => {
  test("returns the input module without substitution", () => {
    const replacer = createReactNativePackageNameReplacer(
      "windows",
      true,
      new ResolverLog(ResolverLogMode.Never)
    );
    expect(replacer("react-native")).toEqual("react-native");
    expect(replacer("react-native/foo")).toEqual("react-native/foo");
  });
});

describe("React-Native Package Name > createReactNativePackageNameReplacer > In-tree Platform", () => {
  test("returns the input module without substitution", () => {
    const replacer = createReactNativePackageNameReplacer(
      "ios",
      false,
      new ResolverLog(ResolverLogMode.Never)
    );
    expect(replacer("react-native")).toEqual("react-native");
    expect(replacer("react-native/foo")).toEqual("react-native/foo");
  });
});

describe("React-Native Package Name > createReactNativePackageNameReplacer > Out-of-tree Platform", () => {
  const mockLog = jest.fn();
  const resolverLog: unknown = {
    log: mockLog,
  };

  const replacer = createReactNativePackageNameReplacer(
    "windows",
    false,
    resolverLog as ResolverLog
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

  test("logs a message when substituting a react-native module reference", () => {
    replacer("react-native");
    expect(mockLog).toBeCalled();
  });
});
