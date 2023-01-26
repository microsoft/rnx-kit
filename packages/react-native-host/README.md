# @rnx-kit/react-native-host

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-host)](https://www.npmjs.com/package/@rnx-kit/react-native-host)

`@rnx-kit/react-native-host` simplifies React Native initialization.

The aim of this package is to provide a backwards (and forwards) compatible way
of initializing React Native, regardless of whether you're on New Architecture
or have gone fully bridgeless.`@rnx-kit/react-native-host` will also a provide a
simple way to enable split bundles and service delivery.

## Installation

```sh
yarn add @rnx-kit/react-native-host --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/react-native-host
```

## Usage

### iOS/macOS

[Autolinking](https://github.com/react-native-community/cli/blob/10.x/docs/autolinking.md)
should make this module available to your app project.

- Replace instances of `RCTBridgeDelegate` with `RNXHostConfig`. The latter is a
  superset and is backwards compatible.
- Replace instantiation of `RCTBridge` with `ReactNativeHost`. `ReactNativeHost`
  will instantiate the appropriate modules required for your setup. It will also
  handle New Architecture configuration as necessary.
- Instead of instantiating `RCTRootView` directly, use
  `-[ReactNativeHost viewWithModuleName:initialProperties:]` to create your root
  views.

For example, if you previously had something like this:

```objc
// AppDelegate.h
@import React;
@import UIKit;

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>
@end

// AppDelegate.m
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    ...

    RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self
                                              launchOptions:launchOptions];
    RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                     moduleName:moduleName
                                              initialProperties:initialProperties];

    ...
}

@end
```

You should instead have:

```objc
// AppDelegate.m
@import ReactNativeHost;
@import UIKit;

@interface AppDelegate : UIResponder <UIApplicationDelegate, RNXHostConfig>
@end

// AppDelegate.m
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    ...

    ReactNativeHost *host = [[ReactNativeHost alloc] initWithConfig:self];
    UIView *rootView = [host viewWithModuleName:moduleName
                              initialProperties:initialProperties];

    ...
}

@end
```
