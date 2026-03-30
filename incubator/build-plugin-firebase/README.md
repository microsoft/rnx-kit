# @rnx-kit/build-plugin-firebase

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/build-plugin-firebase)](https://www.npmjs.com/package/@rnx-kit/build-plugin-firebase)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Firebase plugin for `@rnx-kit/build`.

## Installation

```sh
yarn add @rnx-kit/build @rnx-kit/build-plugin-firebase --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/build @rnx-kit/build-plugin-firebase
```

## Usage

Configure Firebase App Distribution by adding an `rnx-kit.build.distribution`
section in `package.json` like in the following example:

```json
{
  ...
  "rnx-kit": {
    "build": {
      "distribution": [
        "@rnx-kit/build-plugin-firebase",
        {
          "appId": {
            "android": "1:1234567890:android:0a1b2c3d4e5f67890",
            "ios": "1:1234567890:android:0a1b2c3d4e5f67890"
          }
        }
      ]
    },
  }
}
```

Next, you need to create a
[service account](https://firebase.google.com/docs/app-distribution/authenticate-service-account)
with the **Firebase App Distribution Admin** role, and create a private JSON
key. Once a key is created and downloaded, base64 it and store it as a secret,
`GOOGLE_APPLICATION_CREDENTIALS_BASE64`, on your project host.

If you're using GitHub, store it as an encrypted secret:
https://docs.github.com/en/actions/security-guides/encrypted-secrets

## Contributors' Notes

### TODO

- [ ] Figure out a way to generate direct download links
