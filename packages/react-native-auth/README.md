# @rnx-kit/react-native-auth

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-auth)](https://www.npmjs.com/package/@rnx-kit/react-native-auth)

@rnx-kit/react-native-auth provides a cross-app uniform API for user
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
import { acquireToken } from "@rnx-kit/react-native-auth";

const scopes = ["user.read"];
const userPrincipalName = "arnold@contoso.com";

const result = await acquireToken(
  scopes,
  userPrincipalName,
  "MicrosoftAccount"
);
```

## Motivation

Many features built at Microsoft require authentication. Most teams have their
own solution for providing access tokens to their features during the
development loop, or they rely on their hosting app to provide such a solution.
Solutions are often custom-made for their apps and cannot be shared with others
without significant effort. They will also have to duplicate this effort when
integrating into other apps.

This module aims to define a standard way to acquire access tokens so that React
Native feature authors no longer have to care about the underlying
implementations. The idea is that by abstracting away the implementation
details, React Native features can more easily be integrated into any app that
provides an implementation of this module, without having to duplicate the
effort of others.
