/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

module.exports = () => {
  return {
    presets: [
      ["@babel/preset-env", { targets: { node: "current" } }],
      "@babel/preset-typescript",
    ],
  };
};
