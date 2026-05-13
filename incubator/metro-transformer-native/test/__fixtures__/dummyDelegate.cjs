"use strict";
let callCount = 0;
module.exports = {
  transform(args) {
    callCount += 1;
    return {
      ast: {
        type: "File",
        program: { type: "Program", body: [], sourceType: "module" },
      },
      metadata: { fromDummy: true, callCount },
    };
  },
  __getCallCount() {
    return callCount;
  },
  __reset() {
    callCount = 0;
  },
};
