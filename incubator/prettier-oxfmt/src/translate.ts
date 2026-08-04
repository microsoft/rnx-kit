import {
  FLAG_MAP,
  REJECTED_STYLE_FLAGS,
  type FlagSpec,
} from "./flags.ts";

/**
 * The outcome of translating a Prettier-style argv into an oxfmt-style argv.
 */
export type Translation =
  | {
      /** Forward these arguments to the real `oxfmt` binary. */
      type: "forward";
      args: string[];
    }
  | {
      /**
       * Handle a Prettier-only flag (e.g. `--file-info`) inside the shim rather
       * than delegating to oxfmt.
       */
      type: "shim";
      flag: string;
      value?: string;
      /** Any remaining passthrough args, in case the caller needs them. */
      rest: string[];
    }
  | {
      /** Report an error and exit non-zero. */
      type: "error";
      message: string;
    };

function findSpecByShort(short: string): [string, FlagSpec] | undefined {
  for (const [name, spec] of Object.entries(FLAG_MAP)) {
    if (spec.short === short) {
      return [name, spec];
    }
  }
  return undefined;
}

/**
 * Normalize a single token into a canonical long flag name and its inline
 * value, handling `--flag=value`, `--flag`, and short `-x` forms.
 *
 * Returns `undefined` for non-flag tokens (file paths, globs, `-`).
 */
function parseFlagToken(
  token: string
): { name: string; inlineValue?: string; spec?: FlagSpec } | undefined {
  if (token === "-" || !token.startsWith("-")) {
    return undefined;
  }

  if (token.startsWith("--")) {
    const body = token.slice(2);
    const eq = body.indexOf("=");
    const name = eq === -1 ? body : body.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : body.slice(eq + 1);
    return { name, inlineValue, spec: FLAG_MAP[name] };
  }

  // Short flag, e.g. `-c`, `-l`, `-V`.
  const short = token.slice(1);
  const found = findSpecByShort(short);
  if (found) {
    return { name: found[0], spec: found[1] };
  }
  return { name: short };
}

/**
 * The heart of the shim. Translate a Prettier-style argument vector into the
 * arguments the real `oxfmt` binary should receive, or into an instruction for
 * the shim to handle a Prettier-only concern itself.
 *
 * Formatting/style flags are rejected because, by design, all configuration is
 * expected to live in JSON config files.
 */
export function translate(argv: string[]): Translation {
  const forwarded: string[] = [];
  const positionals: string[] = [];
  let sawExplicitMode = false;
  let sawFilePath = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const parsed = parseFlagToken(token);

    if (!parsed) {
      positionals.push(token);
      if (token !== "-") {
        sawFilePath = true;
      }
      continue;
    }

    const { name, inlineValue, spec } = parsed;

    if (REJECTED_STYLE_FLAGS.has(name)) {
      return {
        type: "error",
        message:
          `The flag \`--${name}\` is not supported. All formatting ` +
          `configuration must be set in a JSON config file ` +
          `(.oxfmtrc.json or .prettierrc).`,
      };
    }

    if (!spec) {
      return {
        type: "error",
        message: `Unknown or unsupported flag: \`${token}\`.`,
      };
    }

    if (name === "check" || name === "write" || name === "list-different") {
      sawExplicitMode = true;
    }

    // Pull the flag's value from either `--flag=value` or the next token.
    let value = inlineValue;
    if (spec.takesValue && value === undefined) {
      value = argv[++i];
      if (value === undefined) {
        return {
          type: "error",
          message: `Missing value for \`--${name}\`.`,
        };
      }
    }

    switch (spec.kind) {
      case "shim":
        return { type: "shim", flag: name, value, rest: positionals };

      case "ignore":
        // Accept but drop.
        break;

      case "rename":
        forwarded.push(`--${spec.oxfmtName}`);
        if (spec.takesValue && value !== undefined) {
          forwarded.push(value);
        }
        break;

      case "passthrough":
      default:
        forwarded.push(`--${name}`);
        if (spec.takesValue && value !== undefined) {
          forwarded.push(value);
        }
        break;
    }
  }

  // Default-mode difference: Prettier is a no-op that prints to stdout when
  // neither --check nor --write is given, whereas oxfmt defaults to writing in
  // place. To avoid surprising in-place edits, require an explicit mode once
  // real file paths are involved. Stdin (`-`, or `--stdin-filepath`) always
  // prints to stdout, so it needs no mode flag.
  if (sawFilePath && !sawExplicitMode) {
    return {
      type: "error",
      message:
        "Refusing to run without an explicit mode. Pass `--check`, " +
        "`--write`, or `--list-different` (oxfmt writes in place by default; " +
        "the shim requires you to opt in).",
    };
  }

  return { type: "forward", args: [...forwarded, ...positionals] };
}
