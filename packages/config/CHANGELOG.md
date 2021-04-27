# Change Log - @rnx-kit/config

This log was last generated on Tue, 27 Apr 2021 09:54:28 GMT and should not be manually modified.

<!-- Start content -->

## 0.2.3

Tue, 27 Apr 2021 09:54:28 GMT

### Patches

- Bump workspace-tools to 0.15.0 (4123478+tido64@users.noreply.github.com)

## 0.2.2

Fri, 09 Apr 2021 21:41:43 GMT

### Patches

- Fix return type of getBundleDefinition() and getBundlePlatformDefinition() (4123478+tido64@users.noreply.github.com)

## 0.2.1

Thu, 11 Mar 2021 22:58:41 GMT

### Patches

- Add pass-through params to rnx-bundle, giving the caller control over all aspects of metro bundling. (afoxman@microsoft.com)

## 0.2.0

Wed, 10 Mar 2021 18:05:17 GMT

### Minor changes

- Change CLI args from camelCase to kebab-case. Add win32 as a platform. (afoxman@microsoft.com)

## 0.1.2

Mon, 22 Feb 2021 10:50:46 GMT

### Patches

- Add strictNullChecks and noImplicitAny to the shared tsconfig. Remove from metro-config. Fix code to meet more strict type checks. (afoxman@microsoft.com)

## 0.1.1

Fri, 19 Feb 2021 19:58:00 GMT

### Patches

- Create a CLI package which self-registers with @react-native-community/cli. Add bundling commands 'rnx-bundle' and 'rnx-start' which invoke metro. Move bundle code from build system to CLI package. (afoxman@microsoft.com)

## 0.1.0

Tue, 16 Feb 2021 19:15:57 GMT

### Minor changes

- Add bundle config to the kit config. (afoxman@microsoft.com)

## 0.0.3

Tue, 16 Feb 2021 19:03:38 GMT

### Patches

- Move typescript settings from tscTask to tsconfig.json. Remove the use of baseUrl and paths, which we don't need. Fix path in fast-install script. Update test-app-mobile dependencies and move all source files into an 'src' directory. (afoxman@microsoft.com)

## 0.0.2

Thu, 28 Jan 2021 17:02:45 GMT

### Patches

- add start of config package (jasonmo@microsoft.com)
