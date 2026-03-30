// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * AI merge prompt template parsing and sync instructions collection.
 *
 * This module provides tools for:
 * - Parsing prompt template files with `<!-- PROMPT: {...} -->` markers
 * - Looking up file type information by filename or extension
 * - Collecting sync-instructions.md files from directory hierarchy
 * - Building prompts with variable substitution
 *
 * ## Template Format
 *
 * Templates use HTML comment markers with embedded JSON metadata:
 *
 * ```
 * <!-- PROMPT: {"section": "hunk-resolution-prompt"} -->
 * # Resolve Merge Conflict
 * ...template content with $VARIABLES...
 * ---
 *
 * <!-- PROMPT: {"section": "file-type", "extensions": ["js", "ts"], "guidance": "JavaScript/TypeScript"} -->
 * ## File Type: JavaScript/TypeScript
 * ...file-specific rules...
 * ---
 * ```
 *
 * ## Workflow
 *
 * 1. Load template: `loadPromptTemplate(path)`
 * 2. Get sections: `getSection(template, 'hunk-resolution-prompt')`
 * 3. Get file type info: `getFileTypeInfo(template, 'src/file.ts')`
 * 4. Collect sync instructions: `collectSyncInstructions(filePath, repoRoot)`
 * 5. Build final prompt: `buildPrompt(section, { VAR1: 'value1', ... })`
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exists } from "./fs.ts";

// =============================================================================
// Types
// =============================================================================

/** File type info extracted from template */
export interface FileTypeInfo {
  /** Short description (e.g., "Windows batch script") */
  guidance: string;
  /** Full rules content for the file type */
  rules: string;
}

/** Parsed prompt template */
export interface PromptTemplate {
  /** Raw section content by section name */
  sections: Map<string, string>;
  /** File type info indexed by extension (lowercase, without dot) */
  fileTypesByExtension: Map<string, FileTypeInfo>;
  /** File type info indexed by basename (lowercase) */
  fileTypesByBasename: Map<string, FileTypeInfo>;
}

/** Parse result - success case */
export interface ParseSuccess {
  success: true;
  template: PromptTemplate;
}

/** Parse result - error case */
export interface ParseError {
  success: false;
  error: string;
}

/** Result of parsing a prompt template */
export type ParseResult = ParseSuccess | ParseError;

/** Individual sync instructions file */
export interface SyncInstructionsFile {
  /** Absolute path to the file */
  path: string;
  /** Content of the file */
  content: string;
}

/** Result of collecting sync instructions */
export interface SyncInstructionsResult {
  /** Combined instructions with source comments */
  combined: string;
  /** Individual file contents per path */
  files: SyncInstructionsFile[];
}

// =============================================================================
// Constants
// =============================================================================

/** Section name for file type definitions */
export const SECTION_FILE_TYPE = "file-type";

/** Section name for hunk resolution prompt */
export const SECTION_HUNK_RESOLUTION = "hunk-resolution-prompt";

/** Section name for hunk validation prompt */
export const SECTION_HUNK_VALIDATION = "hunk-validation-prompt";

/** Default sync instructions filename */
const DEFAULT_SYNC_INSTRUCTIONS_FILE = "sync-instructions.md";

/** Maximum combined size for sync instructions (50KB) */
const MAX_SYNC_INSTRUCTIONS_SIZE = 50 * 1024;

/** Regex to find PROMPT markers in HTML comments */
const SECTION_MARKER_REGEX = /<!--\s*PROMPT:\s*([\s\S]*?)-->/g;

// =============================================================================
// Section Metadata
// =============================================================================

/** Metadata from PROMPT markers */
interface SectionMetadata {
  section: string;
  extensions?: string[];
  baseNames?: string[];
  guidance?: string;
}

// =============================================================================
// Template Parsing
// =============================================================================

/**
 * Parse a prompt template string into structured data.
 *
 * Finds all `<!-- PROMPT: { ... } -->` markers and extracts sections.
 * Each marker's JSON metadata determines how the following content is categorized.
 *
 * @param content - Raw template file content
 * @returns ParseResult with template data or error
 */
export function parsePromptTemplate(content: string): ParseResult {
  const template: PromptTemplate = {
    sections: new Map(),
    fileTypesByExtension: new Map(),
    fileTypesByBasename: new Map(),
  };

  // Find all markers with their positions
  const markers: {
    metadata: SectionMetadata;
    start: number;
    end: number;
  }[] = [];
  let match;

  // Reset regex lastIndex for safety
  SECTION_MARKER_REGEX.lastIndex = 0;

  while ((match = SECTION_MARKER_REGEX.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const metadata = JSON.parse(jsonStr) as SectionMetadata;
      markers.push({
        metadata,
        start: match.index,
        end: match.index + match[0].length,
      });
    } catch {
      // Skip malformed markers - continue parsing others
    }
  }

  if (markers.length === 0) {
    return {
      success: false,
      error: "No valid PROMPT markers found in template",
    };
  }

  // Extract content between markers
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const contentStart = marker.end;
    const contentEnd = markers[i + 1]?.start ?? content.length;

    // Remove leading/trailing whitespace and trailing --- separators
    let sectionContent = content.slice(contentStart, contentEnd).trim();
    if (sectionContent.endsWith("---")) {
      sectionContent = sectionContent.slice(0, -3).trim();
    }

    const sectionName = marker.metadata.section;

    // Store in sections map
    template.sections.set(sectionName, sectionContent);

    // Handle file-type sections specially
    if (sectionName === SECTION_FILE_TYPE) {
      const info: FileTypeInfo = {
        guidance: marker.metadata.guidance ?? "Unknown",
        rules: sectionContent,
      };

      // Index by extensions
      if (marker.metadata.extensions) {
        for (const ext of marker.metadata.extensions) {
          template.fileTypesByExtension.set(ext.toLowerCase(), info);
        }
      }

      // Index by baseNames
      if (marker.metadata.baseNames) {
        for (const baseName of marker.metadata.baseNames) {
          template.fileTypesByBasename.set(baseName.toLowerCase(), info);
        }
      }
    }
  }

  return {
    success: true,
    template,
  };
}

/**
 * Load and parse a prompt template from a file.
 *
 * @param templatePath - Path to the template file
 * @returns ParseResult with template data or error
 */
export async function loadPromptTemplate(
  templatePath: string
): Promise<ParseResult> {
  try {
    const content = await fs.readFile(templatePath, "utf-8");
    return parsePromptTemplate(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to read template file: ${message}`,
    };
  }
}

// =============================================================================
// Section Access
// =============================================================================

/**
 * Get a section by name from a parsed template.
 *
 * @param template - Parsed prompt template
 * @param sectionName - Name of the section to retrieve
 * @returns Section content or undefined if not found
 */
export function getSection(
  template: PromptTemplate,
  sectionName: string
): string | undefined {
  return template.sections.get(sectionName);
}

// =============================================================================
// File Type Lookup
// =============================================================================

/** Default file type info when no match is found */
const DEFAULT_FILE_TYPE_INFO: FileTypeInfo = {
  guidance: "Unknown file type",
  rules:
    "## File Type: Unknown\n\nFile type not recognized. Apply general text file rules.",
};

/**
 * Get file type info from a parsed template.
 *
 * Priority: basename match > extension match > 'default' extension > hardcoded default
 *
 * @param template - Parsed prompt template
 * @param filePath - Path to the file (only basename and extension are used)
 * @returns FileTypeInfo for the file type
 */
export function getFileTypeInfo(
  template: PromptTemplate,
  filePath: string
): FileTypeInfo {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase().slice(1); // Remove leading dot

  return (
    template.fileTypesByBasename.get(basename) ??
    template.fileTypesByExtension.get(ext) ??
    template.fileTypesByExtension.get("default") ??
    DEFAULT_FILE_TYPE_INFO
  );
}

// =============================================================================
// Sync Instructions
// =============================================================================

/**
 * Collect sync instructions from all sync-instructions.md files
 * in the path from root to the file being merged.
 *
 * Returns concatenated content (root-first, then more specific) with source comments,
 * plus individual file contents for each found instruction file.
 *
 * @param filePath - Path to the file being merged (absolute or relative to repoRoot)
 * @param repoRoot - Root directory to stop at
 * @param instructionsFileName - Filename to look for (default: 'sync-instructions.md')
 * @returns SyncInstructionsResult with combined content and individual files
 * @throws Error if combined size exceeds MAX_SYNC_INSTRUCTIONS_SIZE
 */
export async function collectSyncInstructions(
  filePath: string,
  repoRoot: string,
  instructionsFileName: string = DEFAULT_SYNC_INSTRUCTIONS_FILE
): Promise<SyncInstructionsResult> {
  // Get the directory of the file relative to repo root
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(repoRoot, filePath);
  const fileDir = path.dirname(absoluteFilePath);

  // Normalize repo root for comparison
  const normalizedRoot = path.resolve(repoRoot);

  // Walk up from file directory to repo root, collecting instruction file paths
  const candidatePaths: string[] = [];
  let currentDir = fileDir;

  while (currentDir.startsWith(normalizedRoot)) {
    const instructionFile = path.join(currentDir, instructionsFileName);
    candidatePaths.push(instructionFile);

    // Move to parent directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached filesystem root
    }
    currentDir = parentDir;
  }

  // Reverse to get root-first order (general -> specific)
  candidatePaths.reverse();

  // Read all existing instruction files
  const files: SyncInstructionsFile[] = [];
  const combinedParts: string[] = [];
  let totalSize = 0;

  for (const candidatePath of candidatePaths) {
    if (await exists(candidatePath)) {
      const content = (await fs.readFile(candidatePath, "utf-8")).trim();
      if (content.length > 0) {
        totalSize += content.length;
        if (totalSize > MAX_SYNC_INSTRUCTIONS_SIZE) {
          throw new Error(
            `Combined sync instructions exceed ${MAX_SYNC_INSTRUCTIONS_SIZE} bytes. ` +
              `Cannot perform AI merge. Please resolve this conflict manually.`
          );
        }

        // Store individual file
        files.push({
          path: candidatePath,
          content,
        });

        // Add with source path comment for combined output
        const relativePath = path
          .relative(repoRoot, candidatePath)
          .replace(/\\/g, "/");
        combinedParts.push(`<!-- From: ${relativePath} -->\n${content}`);
      }
    }
  }

  return {
    combined: combinedParts.join("\n\n---\n\n"),
    files,
  };
}

// =============================================================================
// Prompt Building
// =============================================================================

/**
 * Build a prompt by substituting variables in a template string.
 *
 * Variables use the format `$VARIABLE_NAME`. Only word characters (a-z, A-Z, 0-9, _)
 * are matched as variable names. Unmatched variables are left as-is (lenient mode).
 *
 * @param template - Template string with $VARIABLE placeholders
 * @param variables - Map of variable names (without $) to values
 * @returns Template with variables substituted
 */
export function buildPrompt(
  template: string,
  variables: Record<string, string>
): string {
  // Match $WORD patterns
  return template.replace(/\$(\w+)/g, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    // Leave unmatched variables as-is (lenient)
    return match;
  });
}
