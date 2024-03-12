---
"@rnx-kit/eslint-plugin": minor
---

Bumped `@typescript-eslint/eslint-plugin` to v7. This brings the following breaking changes:

- Update Node.js engine requirement to ^18.18.0 || >=20.0.0. This means we are dropping support for Node 16, 19, and Node 18 versions prior to 18.18.0. Note that this is the same requirement that ESLint v9 will impose.
- Update the ESLint peer dependency requirement to ^8.56.0.

For more details, check their blog post: https://typescript-eslint.io/blog/announcing-typescript-eslint-v7/
