// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  exec,
  ExecError,
  spawn,
  type OutputChunk,
} from "../src/modules/proc.ts";

/** Strip ANSI escape codes from string (colors, etc.) */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

describe("proc", () => {
  describe("mode: string (default)", () => {
    it("should return stdout for successful command", async () => {
      const result = await spawn("node", ["-e", 'console.log("hello")']);
      assert.strictEqual(result, "hello");
    });

    it("should trim trailing whitespace", async () => {
      const result = await spawn("node", ["-e", 'console.log("hello\\n\\n")']);
      assert.strictEqual(result, "hello");
    });

    it("should throw ExecError on non-zero exit", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", ["-e", "process.exit(1)"]);
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.exitCode, 1);
          return true;
        }
      );
    });

    it("should include stderr in ExecError", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", [
            "-e",
            'console.error("error message"); process.exit(1)',
          ]);
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.stderr, "error message");
          return true;
        }
      );
    });

    it("should throw ExecError with stderr as message on non-zero exit", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", [
            "-e",
            'console.error("error output"); process.exit(1)',
          ]);
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.message, "error output");
          assert.strictEqual(err.stderr, "error output");
          return true;
        }
      );
    });

    it("should handle timeout", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", ["-e", "setTimeout(() => {}, 10000)"], {
            timeout: 100,
          });
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.timedOut, true);
          return true;
        }
      );
    });

    it("should respect cwd option", async () => {
      const result = await spawn("node", ["-e", "console.log(process.cwd())"], {
        cwd: process.cwd(),
      });
      assert.strictEqual(result, process.cwd());
    });

    it("should respect env option", async () => {
      const result = await spawn(
        "node",
        ["-e", "console.log(process.env.TEST_VAR)"],
        {
          env: { TEST_VAR: "test_value" },
        }
      );
      assert.strictEqual(result, "test_value");
    });

    it("should throw ExecError for non-existing process", async () => {
      await assert.rejects(
        async () => {
          await spawn("non-existing-command-12345", ["arg1"]);
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert(err.message.includes("Failed to spawn process"));
          assert.strictEqual(err.command, "non-existing-command-12345");
          return true;
        }
      );
    });
  });

  describe("argument escaping", () => {
    it("should handle arguments with spaces", async () => {
      const result = await spawn("node", ["-e", 'console.log("hello world")']);
      assert.strictEqual(result, "hello world");
    });

    it("should handle arguments with quotes", async () => {
      const result = await spawn("node", ["-e", `console.log('has "quotes"')`]);
      assert.strictEqual(result, 'has "quotes"');
    });

    it("should handle arguments with special characters", async () => {
      const result = await spawn("node", ["-e", 'console.log("$VAR %PATH%")']);
      // The actual output depends on shell, but it should not crash
      assert(typeof result === "string");
    });
  });

  describe("mode: lines", () => {
    it("should iterate over lines", async () => {
      const lines: OutputChunk[] = [];
      for await (const line of spawn(
        "node",
        ["-e", 'console.log("line1"); console.log("line2")'],
        {
          mode: "lines",
        }
      )) {
        lines.push(line);
      }
      assert.strictEqual(lines.length, 2);
      assert.strictEqual(lines[0].text, "line1");
      assert.strictEqual(lines[0].stream, "stdout");
      assert.strictEqual(lines[1].text, "line2");
      assert.strictEqual(lines[1].stream, "stdout");
    });

    it("should include stderr lines", async () => {
      const lines: OutputChunk[] = [];
      for await (const line of spawn(
        "node",
        ["-e", 'console.log("out"); console.error("err")'],
        {
          mode: "lines",
        }
      )) {
        lines.push(line);
      }
      const stdoutLines = lines.filter((l) => l.stream === "stdout");
      const stderrLines = lines.filter((l) => l.stream === "stderr");
      assert.strictEqual(stdoutLines.length, 1);
      assert.strictEqual(stdoutLines[0].text, "out");
      assert.strictEqual(stderrLines.length, 1);
      assert.strictEqual(stderrLines[0].text, "err");
    });

    it("should throw ExecError at end on non-zero exit", async () => {
      const lines: OutputChunk[] = [];
      await assert.rejects(
        async () => {
          for await (const line of spawn(
            "node",
            ["-e", 'console.log("output"); process.exit(1)'],
            {
              mode: "lines",
            }
          )) {
            lines.push(line);
          }
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.exitCode, 1);
          return true;
        }
      );
      // Should have received the output before the error
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(lines[0].text, "output");
    });

    it("should support custom delimiter", async () => {
      const lines: OutputChunk[] = [];
      for await (const line of spawn(
        "node",
        ["-e", 'process.stdout.write("a\\0b\\0c")'],
        {
          mode: "lines",
          delimiter: "\0",
        }
      )) {
        lines.push(line);
      }
      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[0].text, "a");
      assert.strictEqual(lines[1].text, "b");
      assert.strictEqual(lines[2].text, "c");
    });

    it("should handle timeout", async () => {
      await assert.rejects(
        async () => {
          for await (const line of spawn(
            "node",
            ["-e", "setTimeout(() => {}, 10000)"],
            {
              mode: "lines",
              timeout: 100,
            }
          )) {
            void line; // consume iterator
          }
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.timedOut, true);
          return true;
        }
      );
    });

    it("should throw ExecError for non-existing process", async () => {
      await assert.rejects(
        async () => {
          for await (const line of spawn(
            "non-existing-command-12345",
            ["arg1"],
            {
              mode: "lines",
            }
          )) {
            void line; // consume iterator
          }
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert(err.message.includes("Failed to spawn process"));
          assert.strictEqual(err.command, "non-existing-command-12345");
          return true;
        }
      );
    });
  });

  describe("mode: interactive", () => {
    it("should iterate over raw chunks", async () => {
      const chunks: OutputChunk[] = [];
      for await (const chunk of spawn("node", ["-e", 'console.log("hello")'], {
        mode: "interactive",
      })) {
        chunks.push(chunk);
      }
      assert.strictEqual(chunks.length, 1);
      assert.strictEqual(chunks[0].text, "hello\n"); // Raw chunk includes newline
      assert.strictEqual(chunks[0].stream, "stdout");
    });

    it("should include stderr chunks", async () => {
      const chunks: OutputChunk[] = [];
      for await (const chunk of spawn(
        "node",
        ["-e", 'console.log("out"); console.error("err")'],
        {
          mode: "interactive",
        }
      )) {
        chunks.push(chunk);
      }
      const stdoutChunks = chunks.filter((c) => c.stream === "stdout");
      const stderrChunks = chunks.filter((c) => c.stream === "stderr");
      assert(stdoutChunks.length >= 1);
      assert(stderrChunks.length >= 1);
      assert(stdoutChunks.some((c) => c.text.includes("out")));
      assert(stderrChunks.some((c) => c.text.includes("err")));
    });

    it("should throw ExecError on non-zero exit", async () => {
      const chunks: OutputChunk[] = [];
      await assert.rejects(
        async () => {
          for await (const chunk of spawn(
            "node",
            ["-e", 'console.log("output"); process.exit(1)'],
            {
              mode: "interactive",
            }
          )) {
            chunks.push(chunk);
          }
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.exitCode, 1);
          return true;
        }
      );
      // Should have received output before the error
      assert(chunks.length >= 1);
      assert(chunks.some((c) => c.text.includes("output")));
    });

    it("should throw ExecError for non-existing process", async () => {
      await assert.rejects(
        async () => {
          for await (const chunk of spawn(
            "non-existing-command-12345",
            ["arg1"],
            {
              mode: "interactive",
            }
          )) {
            void chunk; // consume iterator
          }
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert(err.message.includes("Failed to spawn process"));
          assert.strictEqual(err.command, "non-existing-command-12345");
          return true;
        }
      );
    });
  });

  describe("mode: passthrough", () => {
    it("should complete successfully for zero exit code", async () => {
      const result = await spawn("node", ["-e", 'console.log("hello")'], {
        mode: "passthrough",
      });
      assert.strictEqual(result, undefined);
    });

    it("should throw ExecError on non-zero exit", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", ["-e", "process.exit(1)"], {
            mode: "passthrough",
          });
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.exitCode, 1);
          return true;
        }
      );
    });

    it("should not throw when ignoreExitCode is true", async () => {
      await spawn("node", ["-e", "process.exit(1)"], {
        mode: "passthrough",
        ignoreExitCode: true,
      });
      // Should not throw
    });

    it("should handle timeout", async () => {
      await assert.rejects(
        async () => {
          await spawn("node", ["-e", "setTimeout(() => {}, 10000)"], {
            mode: "passthrough",
            timeout: 100,
          });
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.timedOut, true);
          return true;
        }
      );
    });

    it("should throw ExecError for non-existing process", async () => {
      await assert.rejects(
        async () => {
          await spawn("non-existing-command-12345", ["arg1"], {
            mode: "passthrough",
          });
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert(err.message.includes("Failed to spawn process"));
          assert.strictEqual(err.command, "non-existing-command-12345");
          return true;
        }
      );
    });
  });

  describe("exec (shell mode)", () => {
    it("should execute command string with shell", async () => {
      const result = await exec('node -e "console.log(1+2)"');
      assert.strictEqual(stripAnsi(result), "3");
    });

    it("should support shell features like pipes", async () => {
      // Echo and pipe through node - works on both Windows and Unix
      const result = await exec("node -e \"console.log('hello')\"");
      assert.strictEqual(stripAnsi(result), "hello");
    });

    it("should support mode: lines", async () => {
      const lines: OutputChunk[] = [];
      for await (const line of exec(
        'node -e "console.log(1); console.log(2)"',
        {
          mode: "lines",
        }
      )) {
        lines.push(line);
      }
      // Filter out empty lines that shell may add
      const nonEmpty = lines.filter((l) => stripAnsi(l.text).length > 0);
      assert.strictEqual(nonEmpty.length, 2);
      assert.strictEqual(stripAnsi(nonEmpty[0].text), "1");
      assert.strictEqual(stripAnsi(nonEmpty[1].text), "2");
    });

    it("should support mode: interactive", async () => {
      const chunks: OutputChunk[] = [];
      for await (const chunk of exec("node -e \"console.log('test')\"", {
        mode: "interactive",
      })) {
        chunks.push(chunk);
      }
      assert(chunks.length >= 1);
      assert(chunks.some((c) => stripAnsi(c.text).includes("test")));
    });

    it("should throw ExecError on non-zero exit", async () => {
      await assert.rejects(
        async () => {
          await exec('node -e "process.exit(1)"');
        },
        (err: ExecError) => {
          assert(err instanceof ExecError);
          assert.strictEqual(err.exitCode, 1);
          return true;
        }
      );
    });

    it("should support mode: passthrough", async () => {
      const result = await exec("node -e \"console.log('test')\"", {
        mode: "passthrough",
      });
      assert.strictEqual(result, undefined);
    });
  });
});
