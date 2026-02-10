// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for modules/prompt-template.ts module.
 *
 * Run with: node --test scripts/tests/prompt-template.test.ts
 */

import assert from "node:assert";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type {
  ParseSuccess,
  PromptTemplate,
} from "../src/modules/ai-prompt-template.ts";
import {
  buildPrompt,
  collectSyncInstructions,
  getFileTypeInfo,
  getSection,
  loadPromptTemplate,
  parsePromptTemplate,
  SECTION_FILE_TYPE,
  SECTION_HUNK_RESOLUTION,
  SECTION_HUNK_VALIDATION,
} from "../src/modules/ai-prompt-template.ts";

// Find a file by walking up from startDir
function findFileUp(fileName: string, startDir: string): string {
  let dir = startDir;
  for (;;) {
    const candidate = path.join(dir, fileName);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`${fileName} not found starting from ${startDir}`);
}

// =============================================================================
// parsePromptTemplate tests
// =============================================================================

test("parsePromptTemplate: parse valid template with multiple sections", () => {
  const content = `
<!-- PROMPT: {"section": "hunk-resolution-prompt"} -->
# Resolve Hunk $HUNK_INDEX
Content for resolution.
---

<!-- PROMPT: {"section": "hunk-validation-prompt"} -->
# Validate Resolution
Validation content here.
---
`;

  const result = parsePromptTemplate(content);
  assert.strictEqual(result.success, true);

  const { template } = result as ParseSuccess;
  assert.strictEqual(template.sections.size, 2);
  assert.ok(
    template.sections.get("hunk-resolution-prompt")?.includes("# Resolve Hunk")
  );
  assert.ok(
    template.sections
      .get("hunk-validation-prompt")
      ?.includes("# Validate Resolution")
  );
});

test("parsePromptTemplate: parse file-type sections with extensions", () => {
  const content = `
<!-- PROMPT: {"section": "file-type", "extensions": ["js", "ts"], "guidance": "JavaScript/TypeScript"} -->
## File Type: JavaScript/TypeScript
Apply JS/TS rules here.
---

<!-- PROMPT: {"section": "file-type", "extensions": ["py"], "guidance": "Python"} -->
## File Type: Python
Apply Python rules here.
---
`;

  const result = parsePromptTemplate(content);
  assert.strictEqual(result.success, true);

  const { template } = result as ParseSuccess;

  // Check file types by extension
  assert.strictEqual(template.fileTypesByExtension.size, 3);

  const jsInfo = template.fileTypesByExtension.get("js");
  assert.ok(jsInfo);
  assert.strictEqual(jsInfo.guidance, "JavaScript/TypeScript");
  assert.ok(jsInfo.rules.includes("Apply JS/TS rules"));

  const tsInfo = template.fileTypesByExtension.get("ts");
  assert.ok(tsInfo);
  assert.strictEqual(tsInfo.guidance, "JavaScript/TypeScript");

  const pyInfo = template.fileTypesByExtension.get("py");
  assert.ok(pyInfo);
  assert.strictEqual(pyInfo.guidance, "Python");
});

test("parsePromptTemplate: parse file-type sections with basenames", () => {
  const content = `
<!-- PROMPT: {"section": "file-type", "baseNames": ["cmakelists.txt", "CMakeLists.txt"], "guidance": "CMake"} -->
## File Type: CMake
CMake rules here.
---
`;

  const result = parsePromptTemplate(content);
  assert.strictEqual(result.success, true);

  const { template } = result as ParseSuccess;

  // Basenames are stored lowercase
  const cmakeInfo = template.fileTypesByBasename.get("cmakelists.txt");
  assert.ok(cmakeInfo);
  assert.strictEqual(cmakeInfo.guidance, "CMake");
});

test("parsePromptTemplate: skip malformed JSON markers", () => {
  const content = `
<!-- PROMPT: {"section": "valid"} -->
Valid content.
---

<!-- PROMPT: this is not JSON -->
Invalid marker content.
---

<!-- PROMPT: {"section": "another-valid"} -->
Another valid section.
---
`;

  const result = parsePromptTemplate(content);
  assert.strictEqual(result.success, true);

  const { template } = result as ParseSuccess;
  // Should have parsed 2 valid sections (the malformed one is skipped)
  assert.strictEqual(template.sections.size, 2);
  assert.ok(template.sections.has("valid"));
  assert.ok(template.sections.has("another-valid"));
});

test("parsePromptTemplate: return error for empty content", () => {
  const result = parsePromptTemplate("");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("No valid PROMPT markers"));
});

test("parsePromptTemplate: return error for content without markers", () => {
  const result = parsePromptTemplate("Just some text without any markers.");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("No valid PROMPT markers"));
});

// =============================================================================
// loadPromptTemplate tests
// =============================================================================

test("loadPromptTemplate: load existing template file", async () => {
  const templatePath = findFileUp("ai-merge-prompt.md", import.meta.dirname);
  const result = await loadPromptTemplate(templatePath);

  assert.strictEqual(result.success, true);
  const { template } = result as ParseSuccess;

  // Should have parsed file types
  assert.ok(template.fileTypesByExtension.size > 0);
  // Should have hunk resolution prompt
  assert.ok(template.sections.has(SECTION_HUNK_RESOLUTION));
});

test("loadPromptTemplate: return error for non-existent file", async () => {
  const result = await loadPromptTemplate("/nonexistent/path/template.md");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Failed to read template file"));
});

// =============================================================================
// getSection tests
// =============================================================================

test("getSection: get existing section", () => {
  const template: PromptTemplate = {
    sections: new Map([
      ["test-section", "Section content here"],
      ["another-section", "Another content"],
    ]),
    fileTypesByExtension: new Map(),
    fileTypesByBasename: new Map(),
  };

  const content = getSection(template, "test-section");
  assert.strictEqual(content, "Section content here");
});

test("getSection: return undefined for missing section", () => {
  const template: PromptTemplate = {
    sections: new Map([["exists", "content"]]),
    fileTypesByExtension: new Map(),
    fileTypesByBasename: new Map(),
  };

  const content = getSection(template, "does-not-exist");
  assert.strictEqual(content, undefined);
});

// =============================================================================
// getFileTypeInfo tests
// =============================================================================

test("getFileTypeInfo: match by basename", () => {
  const cmakeInfo = { guidance: "CMake", rules: "CMake rules" };
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map([
      ["txt", { guidance: "Text", rules: "Text rules" }],
    ]),
    fileTypesByBasename: new Map([["cmakelists.txt", cmakeInfo]]),
  };

  // Basename match should take priority over extension
  const info = getFileTypeInfo(template, "/path/to/CMakeLists.txt");
  assert.strictEqual(info.guidance, "CMake");
});

test("getFileTypeInfo: match by extension", () => {
  const jsInfo = { guidance: "JavaScript", rules: "JS rules" };
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map([["js", jsInfo]]),
    fileTypesByBasename: new Map(),
  };

  const info = getFileTypeInfo(template, "src/file.js");
  assert.strictEqual(info.guidance, "JavaScript");
});

test("getFileTypeInfo: fallback to default extension", () => {
  const defaultInfo = { guidance: "Default", rules: "Default rules" };
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map([["default", defaultInfo]]),
    fileTypesByBasename: new Map(),
  };

  const info = getFileTypeInfo(template, "file.unknown");
  assert.strictEqual(info.guidance, "Default");
});

test("getFileTypeInfo: hardcoded default for unknown types", () => {
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map(),
    fileTypesByBasename: new Map(),
  };

  const info = getFileTypeInfo(template, "file.xyz");
  assert.strictEqual(info.guidance, "Unknown file type");
  assert.ok(info.rules.includes("not recognized"));
});

test("getFileTypeInfo: case-insensitive matching", () => {
  const batInfo = { guidance: "Batch", rules: "Batch rules" };
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map([["bat", batInfo]]),
    fileTypesByBasename: new Map(),
  };

  // Extension matching should be case-insensitive
  const info = getFileTypeInfo(template, "script.BAT");
  assert.strictEqual(info.guidance, "Batch");
});

// =============================================================================
// collectSyncInstructions tests
// =============================================================================

test("collectSyncInstructions: collect from single file", async () => {
  // Create temp directory structure
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-merge-test-"));

  try {
    // Create sync-instructions.md in root
    const instructionsContent = "# Root Instructions\nDo this.";
    await fs.writeFile(
      path.join(tempDir, "sync-instructions.md"),
      instructionsContent
    );

    // Create a nested file path
    const nestedDir = path.join(tempDir, "src");
    await fs.mkdir(nestedDir);
    const filePath = path.join(nestedDir, "file.ts");

    const result = await collectSyncInstructions(filePath, tempDir);

    assert.strictEqual(result.files.length, 1);
    assert.strictEqual(result.files[0].content, instructionsContent);
    assert.ok(result.combined.includes("# Root Instructions"));
    assert.ok(result.combined.includes("<!-- From: sync-instructions.md -->"));
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("collectSyncInstructions: collect from multiple directories (root-first order)", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-merge-test-"));

  try {
    // Create instructions at root
    await fs.writeFile(
      path.join(tempDir, "sync-instructions.md"),
      "Root level instructions."
    );

    // Create nested directory with its own instructions
    const subDir = path.join(tempDir, "sub");
    await fs.mkdir(subDir);
    await fs.writeFile(
      path.join(subDir, "sync-instructions.md"),
      "Sub-directory instructions."
    );

    const filePath = path.join(subDir, "file.ts");
    const result = await collectSyncInstructions(filePath, tempDir);

    // Should have 2 files
    assert.strictEqual(result.files.length, 2);

    // Root-first order
    assert.ok(result.files[0].path.endsWith("sync-instructions.md"));
    assert.strictEqual(result.files[0].content, "Root level instructions.");
    assert.ok(result.files[1].path.includes("sub"));
    assert.strictEqual(result.files[1].content, "Sub-directory instructions.");

    // Combined should have both with separators
    assert.ok(result.combined.includes("Root level instructions"));
    assert.ok(result.combined.includes("Sub-directory instructions"));
    assert.ok(result.combined.includes("---"));
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("collectSyncInstructions: handle missing files gracefully", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-merge-test-"));

  try {
    // No sync-instructions.md files exist
    const filePath = path.join(tempDir, "file.ts");
    const result = await collectSyncInstructions(filePath, tempDir);

    assert.strictEqual(result.files.length, 0);
    assert.strictEqual(result.combined, "");
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("collectSyncInstructions: respect custom instructions filename", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-merge-test-"));

  try {
    // Create custom-named instructions file
    await fs.writeFile(
      path.join(tempDir, "custom-instructions.md"),
      "Custom instructions content."
    );

    // Also create default-named file (should be ignored)
    await fs.writeFile(
      path.join(tempDir, "sync-instructions.md"),
      "Default instructions (ignored)."
    );

    const filePath = path.join(tempDir, "file.ts");
    const result = await collectSyncInstructions(
      filePath,
      tempDir,
      "custom-instructions.md"
    );

    assert.strictEqual(result.files.length, 1);
    assert.strictEqual(result.files[0].content, "Custom instructions content.");
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("collectSyncInstructions: skip empty files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-merge-test-"));

  try {
    // Create empty instructions file
    await fs.writeFile(path.join(tempDir, "sync-instructions.md"), "");

    // Create non-empty file in subdirectory
    const subDir = path.join(tempDir, "sub");
    await fs.mkdir(subDir);
    await fs.writeFile(
      path.join(subDir, "sync-instructions.md"),
      "Has content."
    );

    const filePath = path.join(subDir, "file.ts");
    const result = await collectSyncInstructions(filePath, tempDir);

    // Should only include the non-empty file
    assert.strictEqual(result.files.length, 1);
    assert.strictEqual(result.files[0].content, "Has content.");
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

// =============================================================================
// buildPrompt tests
// =============================================================================

test("buildPrompt: replace single variable", () => {
  const template = "Hello, $NAME!";
  const result = buildPrompt(template, { NAME: "World" });
  assert.strictEqual(result, "Hello, World!");
});

test("buildPrompt: replace multiple variables", () => {
  const template = "$GREETING, $NAME! Today is $DAY.";
  const result = buildPrompt(template, {
    GREETING: "Hi",
    NAME: "Alice",
    DAY: "Monday",
  });
  assert.strictEqual(result, "Hi, Alice! Today is Monday.");
});

test("buildPrompt: replace same variable multiple times", () => {
  const template = "$X + $X = 2 * $X";
  const result = buildPrompt(template, { X: "5" });
  assert.strictEqual(result, "5 + 5 = 2 * 5");
});

test("buildPrompt: leave unknown variables as-is (lenient)", () => {
  const template = "Known: $KNOWN, Unknown: $UNKNOWN";
  const result = buildPrompt(template, { KNOWN: "value" });
  assert.strictEqual(result, "Known: value, Unknown: $UNKNOWN");
});

test("buildPrompt: handle empty variables map", () => {
  const template = "No changes: $VAR1 $VAR2";
  const result = buildPrompt(template, {});
  assert.strictEqual(result, "No changes: $VAR1 $VAR2");
});

test("buildPrompt: only match word characters in variable names", () => {
  const template = "$VAR_NAME is valid, $VAR-NAME is not fully matched";
  const result = buildPrompt(template, { VAR_NAME: "yes", VAR: "partial" });
  // $VAR_NAME matches fully, $VAR-NAME matches $VAR only
  assert.strictEqual(result, "yes is valid, partial-NAME is not fully matched");
});

// =============================================================================
// Section name constants tests
// =============================================================================

test("section name constants have expected values", () => {
  assert.strictEqual(SECTION_FILE_TYPE, "file-type");
  assert.strictEqual(SECTION_HUNK_RESOLUTION, "hunk-resolution-prompt");
  assert.strictEqual(SECTION_HUNK_VALIDATION, "hunk-validation-prompt");
});
