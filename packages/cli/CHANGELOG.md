# Change Log - @rnx-kit/cli

This log was last generated on Fri, 09 Apr 2021 08:27:05 GMT and should not be manually modified.

<!-- Start content -->

## 0.2.1

Fri, 09 Apr 2021 08:27:05 GMT

### Patches

- Exit with code if an error was encountered (4123478+tido64@users.noreply.github.com)

## 0.2.0

Thu, 11 Mar 2021 22:58:41 GMT

### Minor changes

- Add pass-through params to rnx-bundle, giving the caller control over all aspects of metro bundling. (afoxman@microsoft.com)

### Patches

- Bump @rnx-kit/config to v0.2.1 (afoxman@microsoft.com)

## 0.1.0

Wed, 10 Mar 2021 18:05:17 GMT

### Minor changes

- Change CLI args from camelCase to kebab-case. Add win32 as a platform. (afoxman@microsoft.com)

### Patches

- Bump @rnx-kit/config to v0.2.0 (afoxman@microsoft.com)

## 0.0.5

Mon, 08 Mar 2021 10:59:59 GMT

### Patches

- Manually bump version number to unblock publishing (4123478+tido64@users.noreply.github.com)

## 0.0.3

Mon, 22 Feb 2021 10:50:46 GMT

### Patches

- Add strictNullChecks and noImplicitAny to the shared tsconfig. Remove from metro-config. Fix code to meet more strict type checks. (afoxman@microsoft.com)

## 0.0.2

Fri, 19 Feb 2021 19:58:00 GMT

### Patches

- Create a CLI package which self-registers with @react-native-community/cli. Add bundling commands 'rnx-bundle' and 'rnx-start' which invoke metro. Move bundle code from build system to CLI package. (afoxman@microsoft.com)
