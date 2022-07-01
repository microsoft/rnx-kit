export function idle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function once<R>(func: () => R): () => R {
  let result: R | undefined;
  return () => {
    if (!result) {
      result = func();
    }
    return result;
  };
}

export async function retry<R>(
  func: () => Promise<R | null>,
  retries: number,
  counter = 0
): Promise<R | null> {
  const result = await func();
  if (result === null && retries > 1) {
    await idle(Math.pow(2, counter) * 1000);
    return retry(func, retries - 1, counter + 1);
  }
  return result;
}

export async function withRetry<R>(
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
  return withRetry(func, retries - 1, counter + 1);
}
