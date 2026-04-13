// Plain JavaScript with modern syntax
const DEFAULT_TIMEOUT = 5000;

function fetchData(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, retries = 3 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { signal: controller.signal })
    .then((response) => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      if (retries > 0) {
        return fetchData(url, { ...options, retries: retries - 1 });
      }
      throw error;
    });
}

const createLogger = (prefix) => ({
  log: (...args) => console.log(`[${prefix}]`, ...args),
  error: (...args) => console.error(`[${prefix}]`, ...args),
});

export { fetchData, createLogger, DEFAULT_TIMEOUT };
