# Change Log - @rnx-kit/metro-service

This log was last generated on Fri, 06 Aug 2021 17:50:49 GMT and should not be manually modified.

<!-- Start content -->

## 1.1.0

Fri, 06 Aug 2021 17:50:49 GMT

### Minor changes

- Remove props that have no effect from bundle API. Update loadMetroConfig to support more overrides. Export Metro's runServer API as startServer. Export createTerminal API which instantiates a new Metro terminal and terminal reporter. (afoxman@microsoft.com)

## 1.0.6

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/metro-service to v1.0.6 (4123478+tido64@users.noreply.github.com)

## 1.0.5

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/metro-service to v1.0.5 (4123478+tido64@users.noreply.github.com)

## 1.0.4

Thu, 22 Jul 2021 16:59:25 GMT

### Patches

- Support Metro <0.63 (4123478+tido64@users.noreply.github.com)

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
