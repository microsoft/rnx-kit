import {
  fail,
  isTestFile,
  pass,
  writtenFiles,
  type TestCase,
} from "../index.ts";

const TEMP_DIR = /\b(?:mkdtemp(?:Sync)?|tmpdir)\s*\(/;

export default {
  description:
    "Uses `@rnx-kit/tools-filesystem/mocks` in tests that touch files",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const tests = writtenFiles(providerResponse).filter((file) =>
          isTestFile(file.path)
        );
        if (tests.length === 0) {
          return fail("No tests were written");
        }

        const tempDirs = tests.filter(({ content }) => TEMP_DIR.test(content));
        if (tempDirs.length > 0) {
          return fail(
            `Uses temporary directories: ${tempDirs.map((f) => f.path).join(", ")}`
          );
        }

        return tests.some(({ content }) =>
          content.includes("@rnx-kit/tools-filesystem/mocks")
        )
          ? pass("Uses `@rnx-kit/tools-filesystem/mocks`")
          : fail("Does not use `@rnx-kit/tools-filesystem/mocks`");
      },
    },
  ],
} satisfies TestCase;
