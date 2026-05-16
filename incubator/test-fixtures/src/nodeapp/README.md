# nodeapp

A small, self-contained Node application used as a bundler / transformer test
target. Pure compute, deterministic output, no I/O — the same input always
produces the same JSON output, byte-for-byte.

It's deliberately authored as a mix of TypeScript, raw CommonJS, and raw
ES-module files so that bundlers and transformers exercise their handling of
each module system and the interop edges between them.

## What it computes

`runApp({ records, options? })` ingests a list of records and produces a JSON
summary:

```ts
type AppInput = {
  records: {
    id: string;
    group: string;
    value: number;
    tags?: string[];
    ts: number;
  }[];
  options?: {
    windowSize?: number;
    topK?: number;
    stddevMode?: "population" | "sample";
  };
};

type AppOutput = {
  summary: { count; sum; mean; median; min; max; stddev };
  groups: { [group]: { count; sum; mean } }; // sorted by group name
  topTags: { tag; count }[]; // sorted by count desc, tag asc
  windows: { start; end; avg }[]; // sliding window over time
};
```

Output is rounded to 6 decimals and sorted deterministically, so it can be
compared with `deepEqual` across builds, bundlers, and Node versions.

## Usage

### Programmatic

```ts
import { runApp, getSample, samples } from "@rnx-kit/test-fixtures/nodeapp";

const out = await runApp({
  records: [{ id: "a", group: "x", value: 1, ts: 0 }],
});

// Or run a built-in named sample:
const tiny = getSample("tiny");
deepEqual(await runApp(tiny.input), tiny.expected);
```

`runApp` is typed — it assumes a valid `AppInput`. For unknown input (e.g.
straight from JSON) use `runAppFromUnknown(input)`, which routes through
`parse` and throws `ParseError` on bad shapes.

### CLI (built)

```sh
yarn build
node lib/nodeapp/cli.js --sample tiny --pretty
echo '{"records":[{"id":"a","group":"x","value":1,"ts":0}]}' | node lib/nodeapp/cli.js
node lib/nodeapp/cli.js --input data.json
```

| Flag              | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `--input <path>`  | Read JSON input from a file                               |
| `--sample <name>` | Run a built-in sample (`empty`, `tiny`, `small`, `large`) |
| `--pretty`        | Pretty-print JSON output (2-space indent)                 |
| `-h`, `--help`    | Show usage                                                |

Without `--input` or `--sample`, JSON is read from stdin. Exit code is `0`
on success, `1` on pipeline error, `2` on argv parse error.

## Samples

Four named samples are bundled in `data/samples.ts`:

| Name    | Records | Notes                                                    |
| ------- | ------- | -------------------------------------------------------- |
| `empty` | 0       | Edge case: empty pipeline, all summary values zero       |
| `tiny`  | 3       | Hand-crafted; expected output hand-computed              |
| `small` | 10      | Varied tags / groups; expected output hand-verified      |
| `large` | 500     | Deterministically generated via seeded PRNG (Mulberry32) |

Each sample bundles `input` + `expected`. The expected outputs are the
regression baseline — if the pipeline math changes, regenerate them via
`node lib/nodeapp/cli.js --sample <name>` and paste the JSON back into
`data/golden.ts`.

## File layout

```
nodeapp/
├── index.ts           Public API: runApp, runAppFromUnknown, samples, parseStrict
├── cli.ts             Argv parsing, stdin/file input, JSON output
├── config.ts          Option resolution (reads defaults from constants.mjs)
├── pipeline.ts        Orchestrator — composes stages and bridges module styles
├── types.ts           Type-only declarations (enforced by ESLint)
├── errors.cjs         Raw CJS — custom error classes (JSDoc-typed)
├── stages/
│   ├── parse.ts           Validate + normalize input
│   ├── parse-strict.ts    Strict variant (rejects unknown keys)
│   ├── normalize.ts       Canonicalize tags / ids (class + private fields)
│   ├── transform.ts       Transformer class (#private, static block, iterator)
│   ├── stats.ts           Mean / median / stddev / percentile
│   ├── tags.ts            Tag frequency counts
│   ├── topk.ts            Top-K via MinHeap
│   ├── windowing.ts       Sliding-window averages (generators)
│   ├── async.ts           async function*, for await, Promise.allSettled
│   ├── aggregate.cjs      Raw CJS — group summary (CJS→CJS + CJS→ESM dynamic)
│   └── group.cjs          Raw CJS — bucketing helpers
├── util/
│   ├── iter.ts            Generator helpers (chunk, take, zip, range)
│   ├── iter-async.ts      Async generator helpers
│   ├── heap.ts            MinHeap<T> — #private fields, Symbol.iterator
│   ├── sort.ts            Stable sort + comparator builders
│   ├── validate.ts        Type-guards
│   ├── format.cjs         Raw CJS — number formatting (JSDoc-typed)
│   └── constants.mjs      Raw ESM — defaults / epsilon (JSDoc-typed)
└── data/
    ├── inputs.ts          Named raw inputs
    ├── golden.ts          Expected outputs (regression baseline)
    ├── samples.ts         Joins inputs + goldens, exposes API
    └── generators.ts      Seeded PRNG + record generation
```

## Module-system mix

The fixture's whole point is to make bundlers and transformers do real work
on a varied module-system surface:

- **`.ts`** — TypeScript source; compiled to `.js`
- **`.cjs`** — raw CommonJS JavaScript (no TypeScript); copied through verbatim
- **`.mjs`** — raw ES module JavaScript (no TypeScript); copied through verbatim

Deliberate module-loading edges (these are where bundlers diverge):

| Edge                                                        | Where                                      |
| ----------------------------------------------------------- | ------------------------------------------ |
| ESM dynamically imports raw CJS (`await import("…/aggregate.cjs")`) | `pipeline.ts` → `stages/aggregate.cjs`     |
| TS imports raw CJS                                          | `stages/parse.ts` → `errors.cjs`           |
| Raw CJS `require`s raw CJS                                  | `stages/aggregate.cjs` → `stages/group.cjs`|
| Raw CJS dynamically imports ESM (`await import("…/constants.mjs")`) | `stages/aggregate.cjs` → `util/constants.mjs` |
| TS imports raw CJS                                          | `pipeline.ts` → `util/format.cjs`          |
| TS imports raw `.mjs`                                       | `config.ts` → `util/constants.mjs`         |

## Language features exercised

Things bundlers and downlevellers commonly transform — every one of these
appears at least once in source:

- `async` / `await`, `for await…of`, `async function*`
- `function*` generators with `yield*`
- `Promise.all`, `Promise.allSettled`
- classes with `#private` fields, static blocks, getter / setter pairs,
  `Symbol.iterator`
- destructuring (object, array, nested, with defaults, with rest)
- spread in calls, arrays, and objects
- optional chaining (`?.`, `?.()`)
- nullish coalescing (`??`, `??=`)
- template literals
- `Map`, `Set`
- top-level `await` (in `cli.ts`)

## Determinism

`runApp` is pure compute — no `Date.now()`, no PRNG except inside
`data/generators.ts` (which is seeded), no filesystem, no environment reads.
The same input must always produce the same output. The test suite asserts
this explicitly by running each sample twice and `deepEqual`-ing the
results.

## When goldens drift

If you intentionally change pipeline math, the four samples' goldens need
to be refreshed:

```sh
yarn build
node lib/nodeapp/cli.js --sample small > /tmp/small.json
node lib/nodeapp/cli.js --sample large > /tmp/large.json
# Paste the JSON strings back into data/golden.ts (SMALL_JSON / LARGE_JSON)
```

`empty` and `tiny` are hand-computed; refreshing them means updating the
literal objects in `golden.ts` directly.
