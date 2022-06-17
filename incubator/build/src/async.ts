export function idle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetries<R>(
  func: () => Promise<R>,
  retries: number,
  counter = 0
): Promise<R> {
  try {
    return await func();
  } catch (e) {
    if (retries === 1) {
      throw e;
    }
  }

  await idle(Math.pow(2, counter) * 1000);
  return withRetries(func, retries - 1, counter + 1);
}
