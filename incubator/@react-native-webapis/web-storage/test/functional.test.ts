/**
 * Returns the number of key/value pairs in specified storage.
 *
 * This is a workaround for TypeScript narrowing bug:
 *
 *     error TS2367: This comparison appears to be unintentional because the types '0' and '1' have no overlap.
 *     39   if (storage.getItem(testKey) !== testKey || storage.length !== 1) {
 *                                                      ~~~~~~~~~~~~~~~~~~~~
 */
function length(storage: Storage): number {
  return storage.length;
}

function test(storage: Storage): "Failed" | "Passed" {
  const prerequisites = [
    () => storage,
    () => "length" in storage,
    () => "key" in storage,
    () => "getItem" in storage,
    () => "setItem" in storage,
    () => "removeItem" in storage,
    () => "clear" in storage,
  ];

  if (prerequisites.some((test) => !test())) {
    return "Failed";
  }

  const iterations = 4;
  const testKey = "@react-native-webapis/web-storage/test";

  storage.clear();
  if (storage.getItem(testKey) !== null || length(storage) !== 0) {
    return "Failed";
  }

  storage.setItem(testKey, testKey);
  if (storage.getItem(testKey) !== testKey || length(storage) !== 1) {
    return "Failed";
  }

  const now = Date.now().toString();
  storage.setItem(testKey, now);
  if (storage.getItem(testKey) !== now || length(storage) !== 1) {
    return "Failed";
  }

  storage.removeItem(testKey);
  if (storage.getItem(testKey) !== null || length(storage) !== 0) {
    return "Failed";
  }

  for (let i = 0; i < iterations; ++i) {
    storage.setItem(`${testKey}/${i}`, i.toString());
  }

  if (length(storage) !== iterations) {
    return "Failed";
  }

  for (let i = 0; i < iterations; ++i) {
    if (storage.getItem(`${testKey}/${i}`) !== i.toString()) {
      return "Failed";
    }
  }

  storage.clear();
  if (length(storage) !== 0) {
    return "Failed";
  }

  for (let i = 0; i < 4; ++i) {
    if (storage.getItem(`${testKey}/${i}`) !== null) {
      return "Failed";
    }
  }

  storage.setItem(testKey, now);
  if (storage.getItem(testKey) !== now) {
    return "Failed";
  }

  storage.removeItem(testKey);

  return "Passed";
}

export function test_localStorage() {
  return test(window.localStorage);
}

export function test_sessionStorage() {
  return test(window.sessionStorage);
}
