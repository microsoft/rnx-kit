// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for job-ui module.
 *
 * Run with: node --test scripts/tests/job-ui.test.ts
 */

import assert from "node:assert";
import { beforeEach, test } from "node:test";

import {
  _resetForTesting,
  addJob,
  getTopLevelJobs,
} from "../src/modules/job-ui.ts";
import * as progressUI from "../src/modules/tty-ui.ts";
import { error, info, warn, withTTY } from "../src/modules/tty-ui.ts";

// =============================================================================
// Helpers
// =============================================================================

/** Check if any active job has the given ID */
function hasJobWithId(id: string): boolean {
  for (const job of getTopLevelJobs()) {
    if (job.id === id) return true;
  }
  return false;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  _resetForTesting();
});

// =============================================================================
// Tests: Job Creation
// =============================================================================

test("addJobreturns a job with correct id and message", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Test Message");

  assert.strictEqual(job.id, "test-job");
  assert.strictEqual(job.message, "Test Message");
});

test("addJobadds job to active jobs", () => {
  using _tty = withTTY(false);

  using _job = addJob("test-job", "Test Message");

  assert.strictEqual(getTopLevelJobs().length, 1);
  assert.ok(hasJobWithId("test-job"));
});

test("addJobwith progressBar option", () => {
  using _tty = withTTY(false);

  using _job = addJob("test-job", "Test Message", { progressBar: 0 });

  // Job is created successfully with progress bar
  assert.strictEqual(getTopLevelJobs().length, 1);
});

// =============================================================================
// Tests: Job Updates
// =============================================================================

test("job.update changes message", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Initial");
  job.update({ message: "Updated" });

  assert.strictEqual(job.message, "Updated");
});

test("job.update with progressBar", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Test Message", { progressBar: 0 });

  // Should not throw
  assert.doesNotThrow(() => {
    job.update({ progressBar: 0.5 });
    job.update({ progressBar: 1.0, message: "Done" });
  });
});

test("job.update with message and progressBar", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Initial", { progressBar: 0 });
  job.update({ message: "Working", progressBar: 0.5 });

  assert.strictEqual(job.message, "Working");
});

// =============================================================================
// Tests: Job Logging
// =============================================================================

test("job.info does not throw", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Test Message");

  assert.doesNotThrow(() => {
    job.info("info message");
  });
});

test("job.warn does not throw", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Test Message");

  assert.doesNotThrow(() => {
    job.warn("warning message");
  });
});

test("job.error does not throw", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Test Message");

  assert.doesNotThrow(() => {
    job.error("error message");
  });
});

// =============================================================================
// Tests: Job Completion
// =============================================================================

test("job.done removes job from active jobs", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Test Message");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.done();
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("job.done with message updates before removing", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Test Message");
  job.done("completed successfully");

  // Job should be removed from active
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("calling done multiple times is safe", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Test Message");
  job.done();
  assert.doesNotThrow(() => job.done());
});

// =============================================================================
// Tests: Disposable Pattern
// =============================================================================

test("job is disposed when using block exits", () => {
  using _tty = withTTY(false);

  {
    using _job = addJob("test-job", "Test Message");
    assert.strictEqual(getTopLevelJobs().length, 1);
  }

  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("multiple jobs can be created and disposed", () => {
  using _tty = withTTY(false);

  {
    using _job1 = addJob("job-1", "Job 1");
    using _job2 = addJob("job-2", "Job 2");
    assert.strictEqual(getTopLevelJobs().length, 2);
  }

  assert.strictEqual(getTopLevelJobs().length, 0);
});

// =============================================================================
// Tests: Static Output Methods
// =============================================================================

test("info does not throw", () => {
  using _tty = withTTY(false);

  assert.doesNotThrow(() => {
    info("info message");
  });
});

test("warn does not throw", () => {
  using _tty = withTTY(false);

  assert.doesNotThrow(() => {
    warn("warning message");
  });
});

test("error does not throw", () => {
  using _tty = withTTY(false);

  assert.doesNotThrow(() => {
    error("error message");
  });
});

// =============================================================================
// Tests: Reset
// =============================================================================

test("_resetForTesting clears all state", () => {
  using _tty = withTTY(false);

  addJob("job1", "Job 1");
  addJob("job2", "Job 2");
  assert.strictEqual(getTopLevelJobs().length, 2);

  _resetForTesting();
  assert.strictEqual(getTopLevelJobs().length, 0);
});

// =============================================================================
// Tests: Operations after done
// =============================================================================

test("update after done is ignored", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Initial");
  job.done();

  // Should not throw, but also should not update
  assert.doesNotThrow(() => {
    job.update({ message: "Should be ignored" });
  });
});

test("info/warn/error after done are ignored", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Test Message");
  job.done();

  // Should not throw
  assert.doesNotThrow(() => {
    job.info("ignored");
    job.warn("ignored");
    job.error("ignored");
  });
});

// =============================================================================
// Tests: Child Jobs
// =============================================================================

test("addChildJob creates a child job", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using child = parent.addChildJob("child", "Child Job");

  assert.strictEqual(child.id, "child");
  assert.strictEqual(child.message, "Child Job");
  assert.strictEqual(child.parent, parent);
});

test("getTopLevelJobs returns only top-level jobs", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using _child = parent.addChildJob("child", "Child Job");

  // Only parent is in top-level jobs (children tracked via parent.children)
  assert.strictEqual(getTopLevelJobs().length, 1);
  assert.ok(hasJobWithId("parent"));
});

test("parent.done auto-completes active children", () => {
  using _tty = withTTY(false);

  const parent = addJob("parent", "Parent Job");
  parent.addChildJob("child", "Child Job");

  assert.strictEqual(getTopLevelJobs().length, 1);
  parent.done();
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("child can be completed before parent", () => {
  using _tty = withTTY(false);

  const parent = addJob("parent", "Parent Job");
  const child = parent.addChildJob("child", "Child Job");

  assert.strictEqual(getTopLevelJobs().length, 1);
  child.done();
  // Parent still active after child completes
  assert.strictEqual(getTopLevelJobs().length, 1);
  assert.ok(hasJobWithId("parent"));
  parent.done();
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("multiple children can be created", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using _child1 = parent.addChildJob("child-1", "Child 1");
  using _child2 = parent.addChildJob("child-2", "Child 2");
  using _child3 = parent.addChildJob("child-3", "Child 3");

  // Only 1 top-level job (children tracked via parent)
  assert.strictEqual(getTopLevelJobs().length, 1);
});

test("nested children (grandchildren)", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using child = parent.addChildJob("child", "Child Job");
  using grandchild = child.addChildJob("grandchild", "Grandchild Job");

  // Only 1 top-level job
  assert.strictEqual(getTopLevelJobs().length, 1);
  assert.strictEqual(grandchild.parent, child);
  assert.strictEqual(child.parent, parent);
});

test("addChildJob inserts after grandchildren (correct ordering)", () => {
  using _tty = withTTY(false);

  // Create: Parent > Child1 > Grandchild1
  using parent = addJob("parent", "Parent Job");
  const child1 = parent.addChildJob("child1", "Child 1");
  const grandchild1 = child1.addChildJob("grandchild1", "Grandchild 1");

  // Now add Child2 - it should appear AFTER Grandchild1
  const child2 = parent.addChildJob("child2", "Child 2");

  // Verify display order: Parent(0), Child1(1), Grandchild1(2), Child2(3)
  // Access the underlying lines through the Job's internal structure
  // We can verify by checking the UI line indices
  const parentLine = (parent as unknown as { line: progressUI.ProgressLine })
    .line;
  const child1Line = (child1 as unknown as { line: progressUI.ProgressLine })
    .line;
  const grandchild1Line = (
    grandchild1 as unknown as { line: progressUI.ProgressLine }
  ).line;
  const child2Line = (child2 as unknown as { line: progressUI.ProgressLine })
    .line;

  const lines = progressUI.progress.getAll();
  assert.strictEqual(lines.indexOf(parentLine), 0);
  assert.strictEqual(lines.indexOf(child1Line), 1);
  assert.strictEqual(lines.indexOf(grandchild1Line), 2);
  assert.strictEqual(lines.indexOf(child2Line), 3);
});

test("parent.done auto-completes nested children", () => {
  using _tty = withTTY(false);

  const parent = addJob("parent", "Parent Job");
  const child = parent.addChildJob("child", "Child Job");
  child.addChildJob("grandchild", "Grandchild Job");

  assert.strictEqual(getTopLevelJobs().length, 1);
  parent.done();
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("child job with progressBar option", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using child = parent.addChildJob("child", "Child Job", { progressBar: 0 });

  // Should not throw when updating progress
  assert.doesNotThrow(() => {
    child.update({ progressBar: 0.5 });
  });
});

test("getChildJobs returns empty array for job with no children", () => {
  using _tty = withTTY(false);

  using job = addJob("parent", "Parent Job");
  const children = job.getChildJobs();

  assert.strictEqual(children.length, 0);
});

test("getChildJobs returns readonly array with children", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  using child1 = parent.addChildJob("child-1", "Child 1");
  using child2 = parent.addChildJob("child-2", "Child 2");

  const children = parent.getChildJobs();
  assert.strictEqual(children.length, 2);
  assert.strictEqual(children[0], child1);
  assert.strictEqual(children[1], child2);
});

test("getChildJobs returns same array reference (readonly)", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent Job");
  parent.addChildJob("child-1", "Child 1");

  const children1 = parent.getChildJobs();
  parent.addChildJob("child-2", "Child 2");
  const children2 = parent.getChildJobs();

  // Same array reference, so both see the update
  assert.strictEqual(children1, children2);
  assert.strictEqual(children1.length, 2);
});

// =============================================================================
// Tests: done() with UpdateOptions
// =============================================================================

test("done with state=done completes job", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Working");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.done({ state: "done", message: "Completed" });
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("done with state=warn completes job", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Working");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.done({ state: "warn", message: "Warning occurred" });
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("done with state=failed completes job", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Working");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.done({ state: "failed", message: "Failed!" });
  assert.strictEqual(getTopLevelJobs().length, 0);
});

test("update with state=processing does not auto-complete", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Working");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.update({ state: "processing", message: "Still working" });
  // Job should still be active
  assert.strictEqual(getTopLevelJobs().length, 1);
});

test("update with state=pending does not auto-complete", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Working");
  assert.strictEqual(getTopLevelJobs().length, 1);

  job.update({ state: "pending", message: "Waiting" });
  // Job should still be active
  assert.strictEqual(getTopLevelJobs().length, 1);
});

// =============================================================================
// Tests: CreateOptions with state
// =============================================================================

test("addJob with state option", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Pending", { state: "pending" });

  // Job created with pending state
  assert.strictEqual(getTopLevelJobs().length, 1);
  // The underlying line should have pending state
  const line = (job as unknown as { line: progressUI.ProgressLine }).line;
  assert.strictEqual(line.state, "pending");
});

test("addChildJob with state option", () => {
  using _tty = withTTY(false);

  using parent = addJob("parent", "Parent");
  using child = parent.addChildJob("child", "Pending child", {
    state: "pending",
  });

  // The underlying line should have pending state
  const line = (child as unknown as { line: progressUI.ProgressLine }).line;
  assert.strictEqual(line.state, "pending");
});

// =============================================================================
// Tests: update(string) overload
// =============================================================================

test("job.update(string) changes message", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Initial");
  job.update("Updated via string");

  assert.strictEqual(job.message, "Updated via string");
});

test("job.update(string) after done is ignored", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Initial");
  job.done();

  assert.doesNotThrow(() => {
    job.update("Should be ignored");
  });
});

// =============================================================================
// Tests: progress(value) shorthand
// =============================================================================

test("job.progress updates progressBar", () => {
  using _tty = withTTY(false);

  using job = addJob("test-job", "Working", { progressBar: 0 });
  job.progress(0.5);

  const line = (job as unknown as { line: progressUI.ProgressLine }).line;
  assert.strictEqual(line.progressBar, 0.5);
});

test("job.progress after done is ignored", () => {
  using _tty = withTTY(false);

  const job = addJob("test-job", "Working", { progressBar: 0 });
  job.done();

  assert.doesNotThrow(() => {
    job.progress(0.75);
  });
});

// =============================================================================
// Tests: step() convenience method
// =============================================================================

test("step creates a child job with auto-generated ID", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  using step = parent.step("Compiling");

  assert.strictEqual(step.id, "build:step-1");
  assert.strictEqual(step.message, "Compiling");
  assert.strictEqual(step.parent, parent);
});

test("step auto-generates sequential IDs", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  const step1 = parent.step("Step 1");
  const step2 = parent.step("Step 2");
  using step3 = parent.step("Step 3");

  assert.strictEqual(step1.id, "build:step-1");
  assert.strictEqual(step2.id, "build:step-2");
  assert.strictEqual(step3.id, "build:step-3");
});

test("step auto-completes previous step", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  const step1 = parent.step("Step 1");

  // Step 1 is active, not completed
  const step1Internal = step1 as unknown as { completed: boolean };
  assert.strictEqual(step1Internal.completed, false);

  // Creating Step 2 auto-completes Step 1
  using _step2 = parent.step("Step 2");
  assert.strictEqual(step1Internal.completed, true);
});

test("step does not auto-complete addChildJob children", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  const manualChild = parent.addChildJob("manual", "Manual child");
  const manualInternal = manualChild as unknown as { completed: boolean };

  // Creating a step should NOT complete the manual child
  using _step = parent.step("Step 1");
  assert.strictEqual(manualInternal.completed, false);
});

test("parent.done auto-completes active step as done", () => {
  using _tty = withTTY(false);

  const parent = addJob("build", "Building");
  const step = parent.step("Last step");
  const stepInternal = step as unknown as {
    completed: boolean;
    line: progressUI.ProgressLine;
  };

  parent.done("Build complete");

  assert.strictEqual(stepInternal.completed, true);
  // The step's state should be 'done' (not interrupted)
  assert.strictEqual(stepInternal.line.state, "done");
});

test("step with CreateOptions (progressBar)", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  using step = parent.step("Copying files", { progressBar: 0 });

  const line = (step as unknown as { line: progressUI.ProgressLine }).line;
  assert.strictEqual(line.progressBar, 0);

  // Can use progress() on the returned step
  step.progress(0.5);
  assert.strictEqual(line.progressBar, 0.5);
});

test("step is included in getChildJobs", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  using step = parent.step("Step 1");

  const children = parent.getChildJobs();
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0], step);
});

test("completed steps are removed from getChildJobs", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  parent.step("Step 1"); // will be auto-completed
  using _s2 = parent.step("Step 2"); // auto-completes Step 1

  // Only Step 2 should remain (Step 1 was auto-completed and removed)
  const children = parent.getChildJobs();
  assert.strictEqual(children.length, 1);
  assert.strictEqual(children[0].id, "build:step-2");
});

test("step works after previous step is manually done", () => {
  using _tty = withTTY(false);

  using parent = addJob("build", "Building");
  const step1 = parent.step("Step 1");
  step1.done("Done");

  // activeStep is already completed, step() should still work
  using step2 = parent.step("Step 2");
  assert.strictEqual(step2.id, "build:step-2");
  assert.strictEqual(step2.message, "Step 2");
});
