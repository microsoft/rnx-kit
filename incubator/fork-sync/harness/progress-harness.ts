#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Progress visualization demo using tty-utils and progress-ui modules
 */

import * as ui from "../modules/tty-ui.ts";
import {
  colors,
  icons,
  isTTY,
  progressBar,
  withTTY,
} from "../modules/tty-ui.ts";

// =============================================================================
// Demo 1: Colors
// =============================================================================

function demoColors() {
  console.log(`\n${colors.bold("Demo 1: Colors")}`);
  console.log(`  ${colors.green("Green text")}`);
  console.log(`  ${colors.red("Red text")}`);
  console.log(`  ${colors.yellow("Yellow text")}`);
  console.log(`  ${colors.cyan("Cyan text")}`);
  console.log(`  ${colors.bold("Bold text")}`);
}

// =============================================================================
// Demo 2: Icons
// =============================================================================

function demoIcons() {
  console.log(`\n${colors.bold("Demo 2: Icons")}`);
  console.log(`  ${icons.ok()} Success icon`);
  console.log(`  ${icons.fail()} Failure icon`);
  console.log(`  ${icons.pending()} Pending icon`);
}

// =============================================================================
// Demo 3: Progress Bar Rendering (static)
// =============================================================================

function demoProgressBar() {
  console.log(`\n${colors.bold("Demo 3: Progress Bar Rendering")}`);
  console.log("  10 steps in 5 characters using █, ▌, and _\n");

  // Use withTTY(true) to force visual progress bar rendering
  using _ = withTTY(true);
  for (let i = 0; i <= 10; i++) {
    const value = i / 10;
    const percent = `${(i * 10).toString().padStart(3)}%`;
    console.log(`  ${percent}: ${progressBar(value)}`);
  }
}

// =============================================================================
// Demo 4: Animated Progress Bar (with spinner)
// =============================================================================

async function demoAnimatedProgressBar() {
  console.log(`\n${colors.bold("Demo 4: Animated Progress Bar")}`);
  console.log("  Spinner + progress bar animating together");

  using _session = ui.progress.start();
  const line = ui.progress.add("progress-demo", "Starting...", {
    progressBar: 0,
  });

  // Animate from 0% to 100%
  for (let i = 0; i <= 10; i++) {
    const value = i / 10;
    const percent = Math.round(value * 100);
    ui.progress.update(line, {
      progressBar: value,
      message: `Processing... ${percent}%`,
    });
    await sleep(400);
  }

  // Complete
  ui.progress.update(line, { state: "done", message: "Processing complete!" });
  await sleep(500);
}

// =============================================================================
// Demo 5: Multi-line progress UI
// =============================================================================

async function demoProgressUI() {
  console.log(`\n${colors.bold("Demo 5: Multi-line progress UI")}`);

  using _session = ui.progress.start();

  const hunk1 = ui.progress.add("hunk-1", "Hunk 1: pending", {
    state: "pending",
  });
  const hunk2 = ui.progress.add("hunk-2", "Hunk 2: pending", {
    state: "pending",
  });
  const hunk3 = ui.progress.add("hunk-3", "Hunk 3: pending", {
    state: "pending",
  });

  // Simulate processing each hunk
  await sleep(800);
  ui.progress.update(hunk1, {
    state: "processing",
    message: "Hunk 1: merging...",
  });

  await sleep(1200);
  ui.progress.update(hunk1, { state: "done", message: "Hunk 1: resolved" });
  ui.progress.update(hunk2, {
    state: "processing",
    message: "Hunk 2: merging...",
  });

  await sleep(1000);
  ui.progress.update(hunk2, { state: "failed", message: "Hunk 2: conflict" });
  ui.progress.update(hunk3, {
    state: "processing",
    message: "Hunk 3: merging...",
  });

  await sleep(1200);
  ui.progress.update(hunk3, { state: "done", message: "Hunk 3: resolved" });

  await sleep(500);

  using _suspend = ui.progress.suspend();
  console.log(`${icons.ok()} Demo complete: 2 resolved, 1 conflict`);
}

// =============================================================================
// Helper
// =============================================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log(colors.bold("=== TTY Utils Demo ==="));
  console.log(`TTY mode: ${isTTY() ? "yes" : "no (animations disabled)"}`);

  demoColors();
  demoIcons();
  demoProgressBar();
  await demoAnimatedProgressBar();
  await demoProgressUI();

  console.log(`\n${colors.bold("=== Demo Complete ===")}`);
}

main().catch(console.error);
