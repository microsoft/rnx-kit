import {
  trackPerformance,
  getTrace,
  reportPerfData,
  getRecorder,
} from "../lib/index.js";

trackPerformance(true);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const trace = getTrace("cat1");
const trace2 = getTrace("category2");

async function main() {
  console.log("Starting performance test...");
  const throwError = false;
  const synthetic = getRecorder("cat1");
  synthetic("synthetic");
  synthetic("synthetic", 12);
  await trace("sleep well", sleep, 15);
  await trace2("sleep well too", sleep, 20);
  await trace("sleep well again", sleep, 10);
  await trace2("sleep well too", sleep, 5);
  try {
    trace("maybe throw error", () => {
      if (throwError) {
        throw new Error("oops");
      }
    });
  } catch {
    // do nothing
  }
  reportPerfData();
}

await main();
