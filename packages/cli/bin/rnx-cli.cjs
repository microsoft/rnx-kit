#!/usr/bin/env node
// Enable the V8 compile cache (on Node >=22.8.0) before loading the CLI so that
// the (large) module graph is compiled from cached bytecode on subsequent runs.
require("node:module").enableCompileCache?.();
require("../lib/bin/rnx-cli.js").main();
