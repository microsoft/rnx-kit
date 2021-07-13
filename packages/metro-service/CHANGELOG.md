# Change Log - @rnx-kit/metro-service

This log was last generated on Tue, 13 Jul 2021 17:31:45 GMT and should not be manually modified.

<!-- Start content -->

## 1.0.3

Tue, 13 Jul 2021 17:31:45 GMT

### Patches

- Remove dependency on mkdirp, and use nodejs "fs" instead. Add a tolerance when finding a matching scale factor for android. Move "throw" statement into scale search routine, so that it always returns a real value (or throws). Add tests. (afoxman@microsoft.com)

## 1.0.2

Tue, 29 Jun 2021 06:01:48 GMT

### Patches

- Add a metro-service package for interacting with metro at an API level, rather than through its command-line interface. (afoxman@microsoft.com)

## 1.0.1

Mon, 28 Jun 2021 08:19:07 GMT

### Patches

- Add a metro-service package for interacting with metro at an API level, rather than through its command-line interface. (afoxman@microsoft.com)
