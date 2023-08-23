---
"@rnx-kit/react-native-lazy-index": major
---

Removed elements that made the plugin confusing.

- Scanning capability has been removed in favour of explicit declaration.
- Experiences can now be passed directly to the plugin in `index.js`:
  ```js
  // @codegen
  module.exports = require("@rnx-kit/react-native-lazy-index")({
    // declare experiences here
  });
  ```
  This should makes it more obvious to users that codegen is happening in this
  file. Check the `README` for an example.
- Experiences can still be declared in `package.json`. Just don't pass anything
  to the plugin:
  ```js
  // @codegen
  module.exports = require("@rnx-kit/react-native-lazy-index")();
  ```
