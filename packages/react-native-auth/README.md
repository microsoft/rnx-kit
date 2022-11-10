<!--remove-block start-->

# @rnx-kit/react-native-auth

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-auth)](https://www.npmjs.com/package/@rnx-kit/react-native-auth)

<!--remove-block end-->

`@rnx-kit/react-native-auth` provides a cross-app uniform API for user
authentication.

## Install

Add the dependency to your project:

```
npm add @rnx-kit/react-native-auth
```

If you're using a different manager, swap out `npm` with your package manager of
choice.

## Usage

```typescript
import {
  acquireTokenWithScopes,
  isAvailable,
} from "@rnx-kit/react-native-auth";

if (isAvailable()) {
  const scopes = ["user.read"];
  const userPrincipalName = "arnold@contoso.com";

  const result = await acquireTokenWithScopes(
    scopes,
    userPrincipalName,
    "MicrosoftAccount"
  );
} else {
  // Use an alternate authentication method
}
```

## Motivation

Many features we build require authentication. The tricky thing about
authentication in brownfield apps (i.e. a native app hosting a React Native
instance) is that we want to reuse the auth code that the hosting app already
has to access the keychain and enable single sign-on. This excludes the use of
most React Native auth libraries out there since they are more geared towards
standalone use. Additionally, all apps implement this in different ways, so most
feature teams implement their own solution for providing access tokens to their
features during the development loop, or they rely on their hosting app to
provide such a solution. Solutions are often custom-made for the current app and
cannot be shared with others without significant effort. They will also have to
duplicate this effort when integrating into other apps.

This module aims to define a standard way to acquire access tokens so that React
Native feature authors no longer have to care about the underlying
implementations. The idea is that by abstracting away the implementation
details, React Native features can more easily be integrated into any app that
provides an implementation of this module, without having to duplicate the
effort of others.
