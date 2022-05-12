/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * browserify-licenses v1.4.7-1 - License BSD-3-Clause
 * downloaded from <https://github.com/wanadev/browserify-licenses>
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Copyright (c) 2016, Wanadev
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright notice,
 *       this list of conditions and the following disclaimer in the documentation
 *       and/or other materials provided with the distribution.
 *     * Neither the name of browserify-licenses nor the names of its contributors
 *       may be used to endorse or promote products derived from this software
 *       without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use strict";

const path = require("path");
const fs = require("fs");
const { readPackage } = require("@rnx-kit/tools-node/package");
const spdxParse = require("spdx-expression-parse");

function _getPackageJsonInformations(modules) {
  for (let i = 0; i < modules.length; i++) {
    let module = modules[i];
    let pkg = readPackage(module.path);

    module.version = pkg.version;
    if (
      module.version.match(
        /^https?:\/\/.+-([0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9._-]+)?)\.tgz$/i
      )
    ) {
      module.version = module.version.replace(
        /^https?:\/\/.+-([0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9._-]+)?)\.tgz$/i,
        "$1"
      );
    }

    module.licenseURLs = [];
    if (pkg.license && typeof pkg.license == "string") {
      module.license = pkg.license;
      _getSpdxLicenseInformation(module.license, module.name).forEach(
        (license) => {
          module.licenseURLs.push(
            "https://spdx.org/licenses/" + license + ".html"
          );
        }
      );
    } else if (
      (pkg.license && Array.isArray(pkg.license)) ||
      (pkg.licenses && Array.isArray(pkg.licenses))
    ) {
      let licenses = pkg.license ? pkg.license : pkg.licenses;
      let licenseList = [];
      for (var j = 0; j < licenses.length; j++) {
        licenseList.push(licenses[j].type || licenses[j].name);
        module.license = licenseList.join(" / ");
        if (licenses[j].url) {
          module.licenseURLs.push(licenses[j].url);
        }
      }
    } else if (pkg.license && typeof pkg.license == "object") {
      module.license = pkg.license.type || pkg.license.name;
      if (pkg.license.url) {
        module.licenseURLs.push(pkg.license.url);
      }
    }
  }
  return modules;
}

function _findLicenseFiles(modules) {
  for (let i = 0; i < modules.length; i++) {
    let module = modules[i];
    var files = fs.readdirSync(module.path);

    for (var j = 0; j < files.length; j++) {
      if (files[j].match(/(LICENSE|LICENCE|COPYING)/i)) {
        module.licenseFile = files[j];
        if (module.noticeFile) break;
      } else if (files[j].match(/NOTICE/i)) {
        module.noticeFile = files[j];
        if (module.licenseFile) break;
      }
    }
  }
  return modules;
}

function _getSpdxLicenseInformation(license, moduleName) {
  var licenses = [];
  try {
    var tree;
    if (typeof license === "string") {
      tree = spdxParse(license);
    } else {
      tree = license;
    }
    if (tree.license) {
      licenses.push(tree.license);
    }
    if (tree.left) {
      licenses = licenses.concat(_getSpdxLicenseInformation(tree.left));
    }
    if (tree.right) {
      licenses = licenses.concat(_getSpdxLicenseInformation(tree.right));
    }
  } catch (e) {
    if (license.toUpperCase() !== "UNLICENSED") {
      console.warn(
        `WARNING: Unable to parse license "${license}" in ${moduleName}`
      );
    }
  }
  return licenses;
}

function _readLicenseText(modules) {
  for (let i = 0; i < modules.length; i++) {
    let module = modules[i];
    if (module.licenseFile) {
      module.licenseText = fs
        .readFileSync(path.join(module.path, module.licenseFile))
        .toString()
        .replace(/\r?\n/g, "\n");
    }
    if (module.noticeFile) {
      module.noticeText = fs
        .readFileSync(path.join(module.path, module.noticeFile))
        .toString()
        .replace(/\r?\n/g, "\n");
    }
  }
  return modules;
}

function extractorNodeModule(modules) {
  _getPackageJsonInformations(modules);
  _findLicenseFiles(modules);
  _readLicenseText(modules);
  return modules;
}

module.exports = {
  nodeModule: extractorNodeModule,
};
