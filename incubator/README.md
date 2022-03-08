# Incubator

In this folder we are keeping all the tools that we deem not ready to be
consumed or used outside known use cases.

Proceed at your own risk.

Main differences from a package in the main folder - logistically:

- package.json
  - extra field `"experimental": true,`
  - description field starts with `EXPERIMENTAL - USE WITH CAUTION - `
  - has script method
    `"prepare": "echo '⚠️ <name> is EXPERIMENTAL - USE WITH CAUTION ⚠️'",`
- README.md

  - starts with:

    ```
    🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

    ### This tool is EXPERIMENTAL - USE WITH CAUTION

    🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

    ```
