#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * JobProgress demo harness.
 *
 * Run with: node scripts/harness/job-harness.ts
 */

import * as JobProgress from "../modules/job-ui.ts";
import { colors, error, info, isTTY, warn } from "../modules/tty-ui.ts";

// =============================================================================
// Helper
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Demo 1: Basic Job with Progress Bar
// =============================================================================

async function demoProgressBar() {
  console.log(`\n${colors.bold("Demo 1: Job with Progress Bar")}`);
  console.log("  Determinate progress from 0% to 100%\n");

  using job = JobProgress.addJob("demo-1", "Processing items", {
    progressBar: 0,
  });

  for (let i = 0; i <= 10; i++) {
    job.update({ progressBar: i / 10, message: `Item ${i} of 10` });
    await sleep(300);
  }

  job.done("complete");
}

// =============================================================================
// Demo 2: Spinner-only Job (no progress bar)
// =============================================================================

async function demoSpinner() {
  console.log(`\n${colors.bold("Demo 2: Spinner-only Job")}`);
  console.log("  Indeterminate progress with status updates\n");

  using job = JobProgress.addJob("demo-2", "Loading data");

  job.update({ message: "connecting..." });
  await sleep(600);

  job.update({ message: "downloading..." });
  await sleep(800);

  job.update({ message: "parsing..." });
  await sleep(500);

  job.done("complete");
}

// =============================================================================
// Demo 3: Parent-Child Jobs
// =============================================================================

async function demoParentChild() {
  console.log(`\n${colors.bold("Demo 3: Parent-Child Jobs")}`);
  console.log("  Parent with 3 child tasks\n");

  using parent = JobProgress.addJob("file-1", "Merge conflicts.txt");
  parent.update({ message: "processing hunks..." });

  for (let i = 1; i <= 3; i++) {
    using child = parent.addChildJob(`hunk-${i}`, `Hunk ${i}`);
    child.update({ message: "merging..." });
    await sleep(400);
    child.done("resolved");
  }

  parent.done("3 hunks merged");
}

// =============================================================================
// Demo 4: Warnings and Errors
// =============================================================================

async function demoWarningsErrors() {
  console.log(`\n${colors.bold("Demo 4: Warnings and Errors")}`);
  console.log("  Job that logs warnings and errors\n");

  // Demo with warnings only
  {
    using job = JobProgress.addJob("validate-1", "Validating data");
    job.update({ message: "checking..." });
    await sleep(300);
    job.warn("Skipped 2 invalid records");
    job.warn('Missing optional field "description"');
    await sleep(300);
    job.done("completed with warnings");
  }

  await sleep(200);

  // Demo with errors
  {
    using job = JobProgress.addJob("validate-2", "Processing batch");
    job.update({ message: "processing..." });
    await sleep(300);
    job.warn("Record 5 has deprecated format");
    job.error("Failed to parse record 10");
    await sleep(300);
    job.done("completed with errors");
  }
}

// =============================================================================
// Demo 5: Disposable Pattern (auto-complete)
// =============================================================================

async function demoDisposable() {
  console.log(`\n${colors.bold("Demo 5: Disposable Pattern")}`);
  console.log("  Job auto-completes when scope exits\n");

  // Simulating early exit - job auto-completes
  {
    using job = JobProgress.addJob("auto-1", "Auto-completing task");
    job.update({ message: "working..." });
    await sleep(500);
    // No explicit done() - auto-completes when scope exits
  }

  await sleep(200);

  // Simulating exception handling
  {
    using job = JobProgress.addJob("auto-2", "Task with potential error");
    job.update({ message: "starting..." });
    await sleep(300);

    try {
      job.update({ message: "doing risky operation..." });
      await sleep(300);
      // Simulate success path
      job.done("finished safely");
    } catch {
      job.error("Operation failed");
      // Job still auto-completes on scope exit
    }
  }
}

// =============================================================================
// Demo 6: Module-level info/warn/error (coordinated output)
// =============================================================================

async function demoCoordinatedOutput() {
  console.log(`\n${colors.bold("Demo 6: Coordinated Console Output")}`);
  console.log("  Using JobProgress.info/warn/error during active progress\n");

  using job = JobProgress.addJob("coordinated-1", "Long running task", {
    progressBar: 0,
  });

  for (let i = 0; i <= 10; i++) {
    job.update({ progressBar: i / 10, message: `Step ${i} of 10` });

    // Demonstrate coordinated output at specific points
    if (i === 3) {
      info("Checkpoint: 30% complete, all systems nominal");
    }
    if (i === 6) {
      warn("Detected slow network, retrying...");
    }
    if (i === 9) {
      info("Almost done, finalizing...");
    }

    await sleep(400);
  }

  job.done("complete");
}

// =============================================================================
// Demo 7: Multiple Concurrent Jobs
// =============================================================================

async function demoConcurrent() {
  console.log(`\n${colors.bold("Demo 7: Multiple Concurrent Jobs")}`);
  console.log("  Several jobs active at once\n");

  // Start multiple jobs
  const job1 = JobProgress.addJob("concurrent-1", "Task A", { progressBar: 0 });
  const job2 = JobProgress.addJob("concurrent-2", "Task B", { progressBar: 0 });
  const job3 = JobProgress.addJob("concurrent-3", "Task C");

  // Update them concurrently
  const promises = [
    (async () => {
      for (let i = 0; i <= 5; i++) {
        job1.update({ progressBar: i / 5, message: `step ${i}/5` });
        await sleep(200);
      }
      job1.done("complete");
    })(),
    (async () => {
      for (let i = 0; i <= 8; i++) {
        job2.update({ progressBar: i / 8, message: `step ${i}/8` });
        await sleep(150);
      }
      job2.done("complete");
    })(),
    (async () => {
      const statuses = ["initializing", "loading", "processing", "finalizing"];
      for (const status of statuses) {
        job3.update({ message: status });
        await sleep(300);
      }
      job3.done("complete");
    })(),
  ];

  await Promise.all(promises);
}

// =============================================================================
// Demo 8: Error and Exit Pattern
// =============================================================================

async function demoErrorExit() {
  console.log(`\n${colors.bold("Demo 8: Error and Exit Pattern")}`);
  console.log("  Demonstrating JobProgress.error() + exit() pattern\n");

  using job = JobProgress.addJob("error-demo", "Task that will fail", {
    progressBar: 0,
  });

  for (let i = 0; i <= 5; i++) {
    job.update({ progressBar: i / 10, message: `Step ${i} of 10` });
    await sleep(200);
  }

  // Simulate an error condition
  error("Something went wrong during processing");

  // In real code, you would call:
  // JobProgress.exit(1);

  // For demo, we just show what would happen and continue
  console.log("  (In real code, JobProgress.exit(1) would be called here)");

  job.done("stopped due to error");
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log(colors.bold("=== JobProgress Demo ==="));
  console.log(`TTY mode: ${isTTY() ? "yes" : "no (animations disabled)"}`);

  await demoProgressBar();
  await demoSpinner();
  await demoParentChild();
  await demoWarningsErrors();
  await demoDisposable();
  await demoCoordinatedOutput();
  await demoConcurrent();
  await demoErrorExit();

  console.log(`\n${colors.bold("=== Demo Complete ===")}`);
}

main().catch(console.error);
