// istanbul ignore file

import type { Dependency, Graph, Module } from "@rnx-kit/metro-serializer";
import { findPackageDir } from "@rnx-kit/tools-node/package";

export const repoRoot = findPackageDir("../../");
export const entryPoint = `${repoRoot}/packages/test-app/lib/src/index.js`;

export function graphWithCycles(): Graph {
  return {
    dependencies: new Map<string, Module>([
      [
        entryPoint,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
            [
              "./App",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/src/App.js`,
                data: { name: "./App" },
              },
            ],
            [
              "../app.json",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/app.json`,
                data: { name: "../app.json" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/index.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "./Libraries/ReactNative/AppRegistry",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/ReactNative/AppRegistry.js`,
                data: { name: "./Libraries/ReactNative/AppRegistry" },
              },
            ],
            [
              "../LogBox/LogBoxInspectorContainer",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
                data: { name: "../LogBox/LogBoxInspectorContainer" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/Libraries/ReactNative/AppRegistry.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "../LogBox/LogBoxInspectorContainer",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
                data: { name: "../LogBox/LogBoxInspectorContainer" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/src/App.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
            [
              "./cyclicExample",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/src/cyclicExample.js`,
                data: { name: "./cyclicExample" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/src/cyclicExample.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "./App",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/src/App.js`,
                data: { name: "./App" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/app.json`,
        {
          dependencies: new Map<string, Dependency>(),
        } as Module,
      ],
    ]),
    entryPoints: [`${repoRoot}/packages/test-app/lib/src/index.js"`],
    importBundleNames: new Set<string>(),
  };
}

export function graphWithNoCycles(): Graph {
  return {
    dependencies: new Map<string, Module>([
      [
        entryPoint,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
            [
              "./App",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/src/App.js`,
                data: { name: "./App" },
              },
            ],
            [
              "../app.json",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/app.json`,
                data: { name: "../app.json" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/index.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "./Libraries/ReactNative/AppRegistry",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/ReactNative/AppRegistry.js`,
                data: { name: "./Libraries/ReactNative/AppRegistry" },
              },
            ],
            [
              "../LogBox/LogBoxInspectorContainer",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
                data: { name: "../LogBox/LogBoxInspectorContainer" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/Libraries/ReactNative/AppRegistry.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "../LogBox/LogBoxInspectorContainer",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
                data: { name: "../LogBox/LogBoxInspectorContainer" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/src/App.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "react-native",
              {
                absolutePath: `${repoRoot}/node_modules/react-native/index.js`,
                data: { name: "react-native" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/src/cyclicExample.js`,
        {
          dependencies: new Map<string, Dependency>([
            [
              "./App",
              {
                absolutePath: `${repoRoot}/packages/test-app/lib/src/App.js`,
                data: { name: "./App" },
              },
            ],
          ]),
        } as Module,
      ],
      [
        `${repoRoot}/packages/test-app/lib/app.json`,
        {
          dependencies: new Map<string, Dependency>(),
        } as Module,
      ],
    ]),
    entryPoints: [`${repoRoot}/packages/test-app/lib/src/index.js"`],
    importBundleNames: new Set<string>(),
  };
}
