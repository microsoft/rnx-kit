# Change Log - @rnx-kit/config

This log was last generated on Fri, 19 Feb 2021 19:58:00 GMT and should not be manually modified.

<!-- Start content -->

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
