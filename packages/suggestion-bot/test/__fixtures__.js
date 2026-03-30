//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check
/* node:coverage disable */

import { concatStrings } from "../src/helpers.js";

export const FIXTURE_PIPED = concatStrings(
  `--- "src/GitHubClient.js"      2020-07-26 20:24:35.497737700 +0200`,
  "+++ -   2020-07-26 20:25:43.893994400 +0200",
  "@@ -92,7 +92,7 @@",
  "       return comments;",
  "     }",
  "     return chunks.reduce((comments, chunk) => {",
  "-      comments.push(makeComment(to === '-' ? from : to, chunk));",
  `+      comments.push(makeComment(to === "-" ? from : to, chunk));`,
  "       return comments;",
  "     }, comments);",
  "   }, []);"
);

export const FIXTURE_PIPED_WINDOWS = concatStrings(
  `--- "src\\GitHubClient.js"      2020-07-26 20:24:35.497737700 +0200`,
  "+++ -   2020-07-26 20:25:43.893994400 +0200",
  "@@ -92,7 +92,7 @@",
  "       return comments;",
  "     }",
  "     return chunks.reduce((comments, chunk) => {",
  "-      comments.push(makeComment(to === '-' ? from : to, chunk));",
  `+      comments.push(makeComment(to === "-" ? from : to, chunk));`,
  "       return comments;",
  "     }, comments);",
  "   }, []);"
);

export const FIXTURE_PIPED_ADO_ITERATION_CHANGES = {
  changeEntries: [
    {
      changeTrackingId: 1,
      item: { path: "/src/GitHubClient.js" },
    },
  ],
};

export const FIXTURE_PIPED_ADO_PAYLOAD = [
  {
    comments: [
      {
        content:
          '```suggestion\n      comments.push(makeComment(to === "-" ? from : to, chunk));\n```\n',
        commentType: 1,
      },
    ],
    status: 1,
    threadContext: {
      filePath: "src/GitHubClient.js",
      rightFileEnd: { line: 95, offset: 65 },
      rightFileStart: { line: 95, offset: 1 },
    },
    pullRequestThreadContext: {
      changeTrackingId: 1,
      iterationContext: {
        firstComparingIteration: 1,
        secondComparingIteration: 1,
      },
    },
  },
];

export const FIXTURE_PIPED_GH_PAYLOAD = {
  accept: "application/vnd.github.comfort-fade-preview+json",
  owner: "tido64",
  repo: "suggestion-bot",
  pull_number: 0,
  event: "COMMENT",
  comments: [
    {
      path: "src/GitHubClient.js",
      position: undefined,
      line: 95,
      side: "RIGHT",
      body: concatStrings(
        "```suggestion",
        `      comments.push(makeComment(to === "-" ? from : to, chunk));`,
        "```"
      ),
    },
  ],
};

export const FIXTURE_UNIDIFF = concatStrings(
  "diff --git a/src/Graphics/TextureAllocator.gl.h b/src/Graphics/TextureAllocator.gl.h",
  "index 366b30f7..f17e3c88 100644",
  "--- a/src/Graphics/TextureAllocator.gl.h",
  "+++ b/src/Graphics/TextureAllocator.gl.h",
  "@@ -18,8 +18,8 @@ namespace rainbow::graphics::gl",
  " ",
  "         void destroy(TextureHandle&) override;",
  " ",
  "-        [[maybe_unused, nodiscard]]",
  "-        auto max_size() const noexcept -> size_t override;",
  "+        [[maybe_unused, nodiscard]] auto max_size() const noexcept",
  "+            -> size_t override;",
  " ",
  "         void update(const TextureHandle&,",
  "                     const Image&,",
  "diff --git a/src/Graphics/VertexArray.h b/src/Graphics/VertexArray.h",
  "index 31e66c01..8bc6fc35 100644",
  "--- a/src/Graphics/VertexArray.h",
  "+++ b/src/Graphics/VertexArray.h",
  "@@ -50,10 +50,7 @@ namespace rainbow::graphics",
  "         /// <summary>",
  "         ///   Returns whether this vertex array object is valid.",
  "         /// </summary>",
  "-        explicit operator bool() const",
  "-        {",
  "-            return static_cast<bool>(array_);",
  "-        }",
  "+        explicit operator bool() const { return static_cast<bool>(array_); }",
  " ",
  "     private:",
  " #ifdef USE_VERTEX_ARRAY_OBJECT"
);

export const FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES = {
  changeEntries: [
    {
      changeTrackingId: 1,
      item: { path: "/src/Graphics/TextureAllocator.gl.h" },
    },
    {
      changeTrackingId: 2,
      item: { path: "/src/Graphics/VertexArray.h" },
    },
  ],
};

export const FIXTURE_UNIDIFF_ADO_PAYLOAD = [
  {
    comments: [
      {
        content:
          "```suggestion\n        [[maybe_unused, nodiscard]] auto max_size() const noexcept\n            -> size_t override;\n```\n",
        commentType: 1,
      },
    ],
    status: 1,
    threadContext: {
      filePath: "src/Graphics/TextureAllocator.gl.h",
      rightFileEnd: { line: 22, offset: 59 },
      rightFileStart: { line: 21, offset: 1 },
    },
    pullRequestThreadContext: {
      changeTrackingId: 1,
      iterationContext: {
        firstComparingIteration: 1,
        secondComparingIteration: 1,
      },
    },
  },
  {
    comments: [
      {
        content:
          "```suggestion\n        explicit operator bool() const { return static_cast<bool>(array_); }\n```\n",
        commentType: 1,
      },
    ],
    status: 1,
    threadContext: {
      filePath: "src/Graphics/VertexArray.h",
      rightFileEnd: { line: 56, offset: 10 },
      rightFileStart: { line: 53, offset: 1 },
    },
    pullRequestThreadContext: {
      changeTrackingId: 2,
      iterationContext: {
        firstComparingIteration: 1,
        secondComparingIteration: 1,
      },
    },
  },
];

export const FIXTURE_UNIDIFF_GH_PAYLOAD = {
  accept: "application/vnd.github.comfort-fade-preview+json",
  owner: "tido64",
  repo: "suggestion-bot",
  pull_number: 0,
  event: "COMMENT",
  comments: [
    {
      path: "src/Graphics/TextureAllocator.gl.h",
      position: undefined,
      line: 22,
      side: "RIGHT",
      start_line: 21,
      start_side: "RIGHT",
      body: concatStrings(
        "```suggestion",
        "        [[maybe_unused, nodiscard]] auto max_size() const noexcept",
        "            -> size_t override;",
        "```"
      ),
    },
    {
      path: "src/Graphics/VertexArray.h",
      position: undefined,
      line: 56,
      side: "RIGHT",
      start_line: 53,
      start_side: "RIGHT",
      body: concatStrings(
        "```suggestion",
        "        explicit operator bool() const { return static_cast<bool>(array_); }",
        "```"
      ),
    },
  ],
};
