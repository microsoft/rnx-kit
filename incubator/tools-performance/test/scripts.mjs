import {
  trackPerformance,
  getTrace,
  getDomain,
  reportPerfData,
} from "../lib/index.js";

trackPerformance({ enable: true, strategy: "timing" });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const trace = getTrace("cat1");
const trace2 = getTrace("category2");

async function main() {
  console.log("Starting performance test...");
  const throwError = false;

  // Use a domain's trace for direct recording
  const domain = getDomain("cat1");
  const domainTrace = domain.getTrace();
  domainTrace("direct-op", () => 42);

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
