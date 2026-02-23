/**
 * Produce a synthetic ENOENT error for a given file path and syscall.
 * @param filePath file path to create the error for
 * @param syscall syscall that produced the error
 * @returns a simulated ENOENT error
 */
export function createEnoentError(
  filePath: string,
  syscall: string
): NodeJS.ErrnoException {
  const err = new Error(
    `ENOENT: no such file or directory, ${syscall} '${filePath}'`
  ) as NodeJS.ErrnoException;
  err.code = "ENOENT";
  err.errno = -2;
  err.syscall = syscall;
  err.path = filePath;
  return err;
}
