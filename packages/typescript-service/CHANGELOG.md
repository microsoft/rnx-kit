# Change Log - @rnx-kit/typescript-service

This log was last generated on Fri, 03 Sep 2021 12:18:30 GMT and should not be manually modified.

<!-- Start content -->

## 1.3.5

Fri, 03 Sep 2021 12:18:30 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.3.5 (4123478+tido64@users.noreply.github.com)

## 1.3.4

Tue, 31 Aug 2021 06:43:13 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.3.4 (4123478+tido64@users.noreply.github.com)

## 1.3.3

Fri, 27 Aug 2021 18:41:43 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.3.3 (4123478+tido64@users.noreply.github.com)

## 1.3.2

Wed, 25 Aug 2021 08:52:48 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.3.2 (afoxman@microsoft.com)

## 1.3.1

Wed, 25 Aug 2021 07:32:57 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.3.1 (afoxman@microsoft.com)

## 1.3.0

Mon, 23 Aug 2021 17:40:48 GMT

### Minor changes

- Update Service, Project and Resolver APIs in support of TypeScript validation for Metro. (afoxman@microsoft.com)

## 1.2.0

Fri, 06 Aug 2021 17:50:49 GMT

### Minor changes

- Add a custom write function for redirecting diagnostic output. (afoxman@microsoft.com)

## 1.1.2

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.1.2 (4123478+tido64@users.noreply.github.com)

## 1.1.1

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/typescript-service to v1.1.1 (4123478+tido64@users.noreply.github.com)

## 1.1.0

Tue, 13 Jul 2021 17:03:23 GMT

### Minor changes

- Separate Project methods into "find" and "open", allowing caller to decide on the appropriate error-handling logic. Add filtering when validating Project files -- 0nly include ts[x] unless checkJs is enabled. Make cache methods return a true/false result, moving error-handling up and out to the caller (Project). Stop converting to lowercase during path normalization, as this confuses typescript. (afoxman@microsoft.com)

## 1.0.2

Thu, 08 Jul 2021 09:26:30 GMT

### Patches

- Add missing exports in typescript-service (afoxman@microsoft.com)

## 1.0.1

Wed, 23 Jun 2021 07:30:22 GMT

### Patches

- Add a new package for using TypeScript language services (afoxman@microsoft.com)
