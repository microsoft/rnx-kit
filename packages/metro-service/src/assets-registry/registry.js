// THIS FILE IS A COPY OF https://github.com/facebook/react-native/blob/v0.76.9/packages/assets/registry.js
// As of 0.77, we should be using `@react-native/community-cli-plugin` instead.

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict
 * @format
 */

'use strict';



const assets = [];

function registerAsset(asset) {
  // `push` returns new array length, so the first asset will
  // get id 1 (not 0) to make the value truthy
  return assets.push(asset);
}

function getAssetByID(assetId) {
  return assets[assetId - 1];
}

module.exports = {registerAsset, getAssetByID};
