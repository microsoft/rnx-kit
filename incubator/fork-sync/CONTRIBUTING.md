# Contributing to fork-sync

## Build

Compile TypeScript to `lib/`:

```bash
yarn build
```

Run tests:

```bash
yarn test          # Fast tests (skips integration)
yarn test:all      # All tests including integration
```

Lint and format:

```bash
yarn fix           # Typecheck + format + lint fix
```

## Publishing to a Local Verdaccio Server

[Verdaccio](https://verdaccio.org/) is a lightweight private npm registry you
can run locally to test package publishing before going to the public npm
registry.

### 1. Install and Start Verdaccio

```bash
npm install -g verdaccio
verdaccio
```

Verdaccio starts at `http://localhost:4873` by default.

### 2. Create a User (First Time Only)

```bash
npm adduser --registry http://localhost:4873
```

### 3. Build and Publish

```bash
yarn build
npm publish --registry http://localhost:4873
```

This publishes `@rnx-kit/fork-sync` to your local registry.

### 4. Re-publishing After Changes

Verdaccio does not allow publishing the same version twice. Either:

- **Bump the version** in `package.json` before publishing again, or
- **Unpublish the old version** first:
  ```bash
  npm unpublish @rnx-kit/fork-sync@0.1.0 --registry http://localhost:4873 --force
  npm publish --registry http://localhost:4873
  ```

## Consuming from Verdaccio

In the consuming project (e.g., `v8-jsi/scripts/`), create a `package.json`:

```json
{
  "private": true,
  "devDependencies": {
    "@rnx-kit/fork-sync": "^0.1.0"
  }
}
```

Install from Verdaccio:

```bash
npm install --registry http://localhost:4873
```

Verify the CLIs work:

```bash
npx fork-sync --help
npx ai-merge --help
```

### Scoped Registry Configuration (Alternative)

Instead of passing `--registry` on every command, you can configure npm to use
Verdaccio only for the `@rnx-kit` scope:

```bash
npm config set @rnx-kit:registry http://localhost:4873
```

After this, plain `npm install` will fetch `@rnx-kit/*` packages from Verdaccio
and everything else from the public registry.
