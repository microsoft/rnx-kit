import {
  createEventHandler,
  subscribeToError,
  subscribeToFinish,
  subscribeToStart,
} from "../src/events";

describe("events", () => {
  it("should create an event handler and allow subscribing, publishing, and unsubscribing", () => {
    const handler = createEventHandler<string>("test-event");
    const callback = jest.fn();
    const unsubscribe = handler.subscribe(callback);
    handler.publish("payload");
    expect(callback).toHaveBeenCalledWith("payload");
    unsubscribe();
    handler.publish("payload2");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should expose subscribeToError, subscribeToFinish, subscribeToStart", () => {
    expect(typeof subscribeToError).toBe("function");
    expect(typeof subscribeToFinish).toBe("function");
    expect(typeof subscribeToStart).toBe("function");
  });
});
