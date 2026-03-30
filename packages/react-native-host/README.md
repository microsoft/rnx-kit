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

> [!NOTE]
>
> For a working example how to use this library for iOS/macOS, see
> [react-native-test-app](https://github.com/microsoft/react-native-test-app/commit/241ddaf83e74f5d53a9144bcfd52f8f948425fcb#diff-8c45578b4f5841935bf037692cf65041333e9415552dcde4ac6c77bac00cd1b5).

To avoid accidental autolinking, `@rnx-kit/react-native-host` must be manually
linked. In your `Podfile`, add the following line:

```rb
pod 'ReactNativeHost', :path => '../node_modules/@rnx-kit/react-native-host'
```

Adjust the path accordingly to your project setup. If you prefer a more dynamic
approach, you can also try using this script:

```rb
proj_dir = Pathname.new(__dir__)
proj_dir = proj_dir.parent until
  File.exist?("#{proj_dir}/node_modules/@rnx-kit/react-native-host/ReactNativeHost.podspec") ||
  proj_dir.expand_path.to_s == '/'

pod 'ReactNativeHost', :path => "#{proj_dir}/node_modules/@rnx-kit/react-native-host"
```

Run `pod install` at least once to make sure it gets added to your project. Then
make the following changes:

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
@implementation AppDelegate {
    RCTBridge *_bridge;
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    ...

    _bridge = [[RCTBridge alloc] initWithDelegate:self
                                    launchOptions:launchOptions];
    RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:_bridge
                                                     moduleName:moduleName
                                              initialProperties:initialProperties];

    ...
}

@end
```

You should instead have:

```objc
// AppDelegate.h
@import ReactNativeHost;
@import UIKit;

@interface AppDelegate : UIResponder <UIApplicationDelegate, RNXHostConfig>
@end

// AppDelegate.m
@implementation AppDelegate {
    ReactNativeHost *_host;
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    ...

    _host = [[ReactNativeHost alloc] initWithConfig:self];
    UIView *rootView = [_host viewWithModuleName:moduleName
                               initialProperties:initialProperties];

    ...
}

@end
```

## API

### ReactNativeHost

Instantiates the appropriate modules required for the setup. It handles New
Architecture if necessary.

#### `initWithConfig:`

**Swift name:** `init(_:)`

Creates an instance of `ReactNativeHost` using the designated initializer.

Objective-C:

```objc
ReactNativeHost *host = [[ReactNativeHost alloc] initWithConfig:self];
```

Swift:

```swift
let host = ReactNativeHost(config: self)
```

#### `shutdown`

Shuts down the React Native instance

#### `usingModule:block:`

**Swift name:** `using(module:block:)`

Retrieves or initializes a desired native module. Parameters:

- `moduleClass` - class of the native module to initialize or retrieve
- `block` - block that gets called when the native module is retrieved

Objective-C:

```objc
[host usingModule:[MyNativeModuleClass class] block:^(id<RCTBridgeModule> module) {
    if (![module isKindOfClass:[MyNativeModuleClass class]]) {
        return;
    }
    MyNativeModuleClass *myNativeModule = (MyNativeModuleClass *)module;
    // Use the native module here
}];
```

Swift:

```swift
host.using(module: MyNativeModuleClass.self) {
  guard let myNativeModule = module as? MyNativeModuleClass else {
    return
  }
  // Use the native module here
}
```

#### `hostFromRootView:`

**Swift name:** `host(from:)`

Retrieves the `ReactNativeHost` instance that view belongs to.

#### `viewWithModuleName:initialProperties:`

**Swift name:** `view(moduleName:initialProperties:)`

Creates a React root view with the specified module and initial properties.
Parameters:

- `moduleName` - name of the module to create root view of
- `initialProperties` - properties passed to the module

Objective-C:

```objc
ReactNativeHost *host = [[ReactNativeHost alloc] initWithConfig:self];
UIView *rootView = [host viewWithModuleName:moduleName
                          initialProperties:initialProperties];
```

Swift:

```swift
let view = host.view(
    moduleName: moduleName,
    initialProperties: initialProperties
)
```

### RNXConfig

`RNXHostConfig` is a superset of `RCTBridgeDelegate` and it's backwards
compatible.

#### `isDevLoadingViewEnabled`

Returns whether the loading view should be visible while loading JavaScript

#### `shouldReleaseBridgeWhenBackgrounded`

Returns whether the bridge should be released when the app is in the background

#### `onFatalError`

Handles a fatal error
