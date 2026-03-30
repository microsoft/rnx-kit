//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check
import parseDiff from "parse-diff";
import { trimQuotes } from "./helpers.js";

/**
 * @typedef {import("parse-diff").Change} Change
 * @typedef {import("parse-diff").Chunk} Chunk
 * @typedef {import("parse-diff").File} File
 * @typedef {{
     path: string;
     position: number;
     line: number;
     line_length: number;
     side: "LEFT" | "RIGHT";
     start_line?: number;
     start_side?: "LEFT" | "RIGHT";
     body: string;
   }} Comment
 */

/**
 * @template T
 * @param {T[]} array
 * @param {(item: T) => boolean} callback
 * @returns {number}
 */
function findLastIndex(array, callback) {
  return array.reduce(
    (previous, c, index) => (callback(c) ? index : previous),
    -1
  );
}

/**
 * Trims context from specified changes.
 * @param {Change[]} changes
 * @returns {[Change[], number, number]}
 */
function trimContext(changes) {
  if (changes.length === 0) {
    return [changes, 0, 0];
  }

  const start = Math.max(
    changes.findIndex((c) => c.type !== "normal"),
    0
  );
  const end = findLastIndex(changes, (c) => c.type !== "normal") + 1;
  return [changes.slice(start, end), start, changes.length - end];
}

/**
 * Creates a comment that can be submitted to GitHub.
 * @param {string} file
 * @param {Chunk} chunk
 * @returns {Comment}
 */
export function makeComment(file, { changes, oldStart, oldLines }) {
  const path = file.split("\\").join("/");

  const [trimmedChanges, startContext, endContext] = trimContext(changes);
  const line = oldStart + oldLines - endContext - 1;

  if (changes.every((c) => c.type !== "del")) {
    // Additions only
    const start = changes.findIndex((c) => c.type === "add");
    const context = start === 0 ? "bottom" : "top";

    const contextChange =
      context === "bottom"
        ? changes.find((c) => c.type === "normal")
        : changes[start - 1];
    if (!contextChange) {
      throw new Error("Cannot add lines without context");
    }

    const contextLine = contextChange.content.slice(1);
    return {
      path,
      line,
      line_length: contextLine.length,
      side: "RIGHT",
      body: [
        "```suggestion",
        ...(context === "top" ? [contextLine] : []),
        trimmedChanges
          .filter((line) => line.type === "add")
          .map((line) => line.content.slice(1))
          .join("\n"),
        ...(context === "bottom" ? [contextLine] : []),
        "```",
        "",
      ].join("\n"),
      // @ts-ignore `position` is not required if using `comfort-fade`
      position: undefined,
    };
  } else if (changes.every((c) => c.type !== "add")) {
    // Deletions only
    const startLine = oldStart + changes.findIndex((c) => c.type === "del");
    const end = findLastIndex(changes, (c) => c.type === "del");
    const line = oldStart + end;
    return {
      path,
      line,
      line_length: changes[end].content.length - 1,
      side: "RIGHT",
      ...(startLine !== line
        ? {
            start_line: startLine,
            start_side: "RIGHT",
          }
        : undefined),
      body: ["```suggestion", "```", ""].join("\n"),
      // @ts-ignore `position` is not required if using `comfort-fade`
      position: undefined,
    };
  }

  const noNewlineMarker = /^\\ No newline at end of file$/m;

  const startLine = oldStart + startContext;
  const lastMarkedLine = findLastIndex(
    trimmedChanges,
    (c) => c.type !== "add" && !noNewlineMarker.test(c.content)
  );
  return {
    path,
    line,
    line_length:
      lastMarkedLine >= 0 ? trimmedChanges[lastMarkedLine].content.length : 0,
    side: "RIGHT",
    ...(startLine !== line
      ? {
          start_line: startLine,
          start_side: "RIGHT",
        }
      : undefined),
    body: [
      "```suggestion",
      trimmedChanges
        .filter(
          (line) => line.type !== "del" && !noNewlineMarker.test(line.content)
        )
        .map((line) => line.content.slice(1))
        .join("\n"),
      "```",
      "",
    ].join("\n"),
    // @ts-ignore `position` is not required if using `comfort-fade`
    position: undefined,
  };
}

/**
 * Creates suggestions with specified diff.
 * @param {string} diff
 * @returns {Comment[]}
 */
export function makeComments(diff) {
  const files = parseDiff(diff);
  if (files.length <= 0) {
    return [];
  }

  return files.reduce(
    /** @type {(comments: Comment[], file: File) => Comment[]} */
    (comments, file) => {
      const { chunks, from, to } = file;
      if (chunks.length === 0 || !to || !from) {
        return comments;
      }
      return chunks.reduce((comments, chunk) => {
        comments.push(makeComment(to === "-" ? trimQuotes(from) : to, chunk));
        return comments;
      }, comments);
    },
    []
  );
}
