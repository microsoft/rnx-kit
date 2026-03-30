<!-- PROMPT: {"section": "hunk-resolution-prompt"} -->

# Resolve Merge Conflict Hunk

You are resolving a single conflict hunk from a merge operation.

## File Information

- **File**: $FILE_PATH
- **Location**: lines $LINE_START-$LINE_END
- **Hunk**: $HUNK_INDEX of $TOTAL_HUNKS
- **File type**: $FILE_TYPE_GUIDANCE

## Conflict Hunk (with context)

```
$HUNK_CONTENT
```

$FILE_TYPE_RULES

## Resolution Rules

1. **Understand both sides**:
   - LOCAL (between `<<<<<<<` and `|||||||` or `=======`) = our fork's version
   - BASE (between `|||||||` and `=======`) = common ancestor (may be absent)
   - REMOTE (between `=======` and `>>>>>>>`) = upstream version

2. **Decide how to merge** (IMPORTANT - read carefully):
   - **REMOTE adds something new** (LOCAL unchanged from BASE) -> **MUST keep
     REMOTE addition**
   - **LOCAL adds something new** (REMOTE unchanged from BASE) -> **MUST keep
     LOCAL addition**
   - **BOTH sides add DIFFERENT lines** -> **MUST keep BOTH lines** (they are
     independent additions, not conflicts)
   - **True conflict** (both sides modify the EXACT SAME line differently) ->
     apply merge judgment

   **CRITICAL DISTINCTION**:
   - If LOCAL adds "line_A" and REMOTE adds "line_B" -> These are INDEPENDENT
     additions. Keep BOTH lines.
   - A "true conflict" is ONLY when both sides change the SAME ORIGINAL line to
     different values.

   **KEY PRINCIPLE**: New additions from either side should NEVER be dropped. If
   in doubt, KEEP BOTH.

3. **Write the resolution**:
   - Remove ALL conflict markers (`<<<<<<<`, `|||||||`, `=======`, `>>>>>>>`)
   - Keep the merged content
   - Preserve EXACT formatting (indentation, quotes, whitespace)
   - Keep context lines unchanged

$SYNC_INSTRUCTIONS

## Response Format

Wrap your resolved code in RESOLVED tags:

<RESOLVED>
[resolved code here, including context lines]
</RESOLVED>

Rules:

- Include context lines before and after the conflict exactly as shown
- No markdown code blocks inside the tags
- No explanations inside the tags
- Preserve exact formatting (indentation, whitespace)

---

<!-- PROMPT: {"section": "hunk-validation-prompt"} -->

# Validate Merge Resolution

You are validating an AI-generated merge resolution.

## File Information

- **File**: $FILE_PATH
- **Location**: lines $LINE_START-$LINE_END
- **Hunk**: $HUNK_INDEX of $TOTAL_HUNKS
- **File type**: $FILE_TYPE_GUIDANCE

## Original Conflict Hunk

```
$ORIGINAL_HUNK
```

## Proposed Resolution

```
$RESOLVED_CONTENT
```

## Verification Checklist

For the original conflict, identify:

1. What LOCAL adds/changes (if anything)
2. What REMOTE adds/changes (if anything)

Then verify the resolution: 3. Are REMOTE additions present in the
resolution? 4. Are LOCAL additions present in the resolution? 5. Are all
conflict markers removed? 6. Are context lines preserved unchanged?

**KEY PRINCIPLE**: New additions from either side should NEVER be dropped. Both
LOCAL and REMOTE changes must be preserved unless they are true conflicts (same
line modified differently).

## Your Assessment (respond in EXACTLY this format)

CONFIDENCE: [HIGH or MEDIUM or LOW]

- HIGH: Resolution properly preserves both LOCAL and REMOTE additions
- MEDIUM: Resolution seems reasonable but may have minor issues
- LOW: Resolution dropped changes from LOCAL or REMOTE ISSUES: [List any
  concerns separated by semicolons, or "None"] NOTES: [Brief explanation of what
  was checked]

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["bat", "cmd"],
  "guidance": "Windows batch script"
} -->

## File Type: Windows Batch Script (.bat/.cmd)

This is a Windows batch script. Apply Windows batch scripting knowledge:

- Double quotes are CRITICAL - preserve exact quoting around variables and paths
- Keep caret (^) line continuation escapes intact
- Preserve `set` command formatting (no spaces around =)
- Keep `goto` labels and `if/else` structure intact
- Maintain existing indentation and spacing

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["gyp", "gypi"],
  "guidance": "GYP build configuration file"
} -->

## File Type: GYP Build Configuration (.gyp/.gypi)

This is a GYP (Generate Your Projects) build file used by projects like Node.js
and Chromium. Apply GYP syntax knowledge:

- JSON-like Python syntax - preserve indentation exactly
- Keep trailing commas where they exist
- Maintain consistent quote style (single vs double)
- Preserve condition blocks and target definitions

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["cpp", "c", "h", "cc", "cxx", "hpp"],
  "guidance": "C/C++ source file"
} -->

## File Type: C/C++ Source Code

This is a C/C++ source file. Apply C/C++ language knowledge:

- Follow existing code style for indentation
- Preserve include order conventions
- Keep preprocessor directive formatting
- Maintain header guard patterns

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["js", "ts", "jsx", "tsx", "mjs", "mts"],
  "guidance": "JavaScript/TypeScript source file"
} -->

## File Type: JavaScript/TypeScript

This is a JavaScript or TypeScript file. Apply JS/TS language knowledge:

- Maintain consistent quote style
- Preserve semicolon conventions
- Keep import order if there's a pattern
- Preserve type annotations (TypeScript)

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["json"],
  "guidance": "JSON file"
} -->

## File Type: JSON

This is a JSON data file. Apply strict JSON syntax rules:

- Must produce valid JSON (no trailing commas, no comments)
- Preserve indentation style (spaces vs tabs, indent size)
- Keys must be double-quoted strings

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["py"],
  "guidance": "Python source file"
} -->

## File Type: Python Source Code

This is a Python source file. Apply Python language knowledge:

- Preserve indentation exactly (spaces, not tabs typically) - indentation is
  syntactically significant
- Maintain import organization
- Keep docstring formatting
- Preserve decorator patterns

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["cmake"],
  "baseNames": ["cmakelists.txt"],
  "guidance": "CMake build file"
} -->

## File Type: CMake Build Configuration

This is a CMake build file. Apply CMake syntax knowledge:

- Preserve indentation style (usually 2 spaces)
- Keep command case conventions (usually lowercase)
- Maintain variable naming patterns
- Preserve comments and structure

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["yml", "yaml"],
  "guidance": "YAML configuration file"
} -->

## File Type: YAML Configuration

This is a YAML file. Apply strict YAML syntax rules:

- Indentation is CRITICAL and syntactically significant - preserve exact spacing
  (usually 2 spaces)
- No tabs allowed in YAML
- Keep consistent quote style for strings
- Preserve comment alignment

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["sh", "bash"],
  "guidance": "Shell script"
} -->

## File Type: Shell Script (Bash/sh)

This is a Unix shell script. Apply shell scripting knowledge:

- Preserve shebang line exactly
- Keep quote style consistent (single vs double quotes have different behavior)
- Maintain indentation patterns
- Preserve here-doc formatting

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["mk"],
  "baseNames": ["makefile", "gnumakefile"],
  "guidance": "Makefile"
} -->

## File Type: Makefile

This is a Makefile. Apply Make syntax knowledge:

- TABS are required for recipe lines - NEVER convert to spaces (this breaks the
  build)
- Preserve variable assignment style
- Keep target/dependency formatting

---

<!-- PROMPT: {
  "section": "file-type",
  "extensions": ["default"],
  "guidance": "Unknown file type"
} -->

## File Type: Unknown

File type not recognized. Apply general text file rules:

- Preserve exact indentation and whitespace
- Keep consistent quoting style
- Maintain existing formatting patterns
