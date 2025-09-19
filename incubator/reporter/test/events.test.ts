import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import {
  createEventHandler,
  errorEvent,
  finishEvent,
  startEvent,
  subscribeToError,
  subscribeToFinish,
  subscribeToStart,
} from "../src/events.ts";
import type { ErrorEvent, SessionData } from "../src/types.ts";

describe("events", () => {
  describe("createEventHandler", () => {
    it("should create event handler with subscribe function", () => {
      const handler = createEventHandler<string>("test-event");

      assert(typeof handler.subscribe === "function");
      assert(typeof handler.hasSubscribers === "function");
      assert(typeof handler.publish === "function");
    });

    it("should handle event subscription and publishing", () => {
      const handler = createEventHandler<string>("test-event");
      const receivedEvents: string[] = [];

      const unsubscribe = handler.subscribe((event) => {
        receivedEvents.push(event);
      });

      handler.publish("test message 1");
      handler.publish("test message 2");

      assert.deepStrictEqual(receivedEvents, [
        "test message 1",
        "test message 2",
      ]);

      unsubscribe();
    });

    it("should allow multiple subscribers", () => {
      const handler = createEventHandler<number>("multi-subscriber");
      const events1: number[] = [];
      const events2: number[] = [];

      const unsub1 = handler.subscribe((event) => events1.push(event));
      const unsub2 = handler.subscribe((event) => events2.push(event * 2));

      handler.publish(5);
      handler.publish(10);

      assert.deepStrictEqual(events1, [5, 10]);
      assert.deepStrictEqual(events2, [10, 20]);

      unsub1();
      unsub2();
    });

    it("should handle unsubscription", () => {
      const handler = createEventHandler<string>("unsubscribe-test");
      const receivedEvents: string[] = [];

      const unsubscribe = handler.subscribe((event) => {
        receivedEvents.push(event);
      });

      handler.publish("before unsubscribe");
      unsubscribe();
      handler.publish("after unsubscribe");

      assert.deepStrictEqual(receivedEvents, ["before unsubscribe"]);
    });

    it("should report hasSubscribers correctly", () => {
      const handler = createEventHandler<string>("subscriber-check");

      assert.strictEqual(handler.hasSubscribers(), false);

      const unsubscribe = handler.subscribe(() => {});
      assert.strictEqual(handler.hasSubscribers(), true);

      unsubscribe();
      assert.strictEqual(handler.hasSubscribers(), false);
    });

    it("should handle events with complex data types", () => {
      interface TestEvent {
        id: number;
        message: string;
        data?: Record<string, unknown>;
      }

      const handler = createEventHandler<TestEvent>("complex-event");
      const receivedEvents: TestEvent[] = [];

      const unsubscribe = handler.subscribe((event) => {
        receivedEvents.push(event);
      });

      const testEvent: TestEvent = {
        id: 1,
        message: "test message",
        data: { key: "value", nested: { prop: 123 } },
      };

      handler.publish(testEvent);

      assert.strictEqual(receivedEvents.length, 1);
      assert.deepStrictEqual(receivedEvents[0], testEvent);

      unsubscribe();
    });
  });

  describe("built-in event handlers", () => {
    describe("startEvent", () => {
      it("should handle start events", () => {
        const receivedEvents: SessionData[] = [];

        const unsubscribe = startEvent().subscribe((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "test-session",
          role: "reporter",
          elapsed: 0,
          depth: 0,
          data: {},
          errors: [],
          operations: {},
        };

        startEvent().publish(sessionData);

        assert.strictEqual(receivedEvents.length, 1);
        assert.deepStrictEqual(receivedEvents[0], sessionData);

        unsubscribe();
      });
    });

    describe("finishEvent", () => {
      it("should handle finish events", () => {
        const receivedEvents: SessionData[] = [];

        const unsubscribe = finishEvent().subscribe((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "test-session",
          role: "task",
          elapsed: 100,
          depth: 1,
          data: { result: "success" },
          errors: [],
          operations: {},
        };

        finishEvent().publish(sessionData);

        assert.strictEqual(receivedEvents.length, 1);
        assert.deepStrictEqual(receivedEvents[0], sessionData);

        unsubscribe();
      });
    });

    describe("errorEvent", () => {
      it("should handle error events", () => {
        const receivedEvents: ErrorEvent[] = [];

        const unsubscribe = errorEvent().subscribe((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "error-session",
          role: "reporter",
          elapsed: 0,
          depth: 0,
          data: {},
          errors: [],
          operations: {},
        };

        const errorEvent_data: ErrorEvent = {
          session: sessionData,
          args: ["Error message", { errorCode: 500 }],
        };

        errorEvent().publish(errorEvent_data);

        assert.strictEqual(receivedEvents.length, 1);
        assert.deepStrictEqual(receivedEvents[0], errorEvent_data);

        unsubscribe();
      });
    });
  });

  describe("subscription functions", () => {
    afterEach(() => {
      // Clean up any subscriptions to avoid interference between tests
    });

    describe("subscribeToStart", () => {
      it("should subscribe to start events", () => {
        const receivedEvents: SessionData[] = [];

        const unsubscribe = subscribeToStart((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "start-test",
          role: "reporter",
          elapsed: 0,
          depth: 0,
          data: {},
          errors: [],
          operations: {},
        };

        startEvent().publish(sessionData);

        assert.strictEqual(receivedEvents.length, 1);
        assert.strictEqual(receivedEvents[0].name, "start-test");

        unsubscribe();
      });
    });

    describe("subscribeToFinish", () => {
      it("should subscribe to finish events", () => {
        const receivedEvents: SessionData[] = [];

        const unsubscribe = subscribeToFinish((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "finish-test",
          role: "task",
          elapsed: 250,
          depth: 0,
          data: {},
          errors: [],
          operations: {},
        };

        finishEvent().publish(sessionData);

        assert.strictEqual(receivedEvents.length, 1);
        assert.strictEqual(receivedEvents[0].name, "finish-test");
        assert.strictEqual(receivedEvents[0].elapsed, 250);

        unsubscribe();
      });
    });

    describe("subscribeToError", () => {
      it("should subscribe to error events", () => {
        const receivedEvents: ErrorEvent[] = [];

        const unsubscribe = subscribeToError((event) => {
          receivedEvents.push(event);
        });

        const sessionData: SessionData = {
          name: "error-test",
          role: "reporter",
          elapsed: 0,
          depth: 0,
          data: {},
          errors: [],
          operations: {},
        };

        const errorEvent_data: ErrorEvent = {
          session: sessionData,
          args: ["Test error", { code: "TEST_ERROR" }],
        };

        errorEvent().publish(errorEvent_data);

        assert.strictEqual(receivedEvents.length, 1);
        assert.strictEqual(receivedEvents[0].session.name, "error-test");
        assert.deepStrictEqual(receivedEvents[0].args, [
          "Test error",
          { code: "TEST_ERROR" },
        ]);

        unsubscribe();
      });
    });
  });

  describe("event isolation", () => {
    it("should handle events from different handlers independently", () => {
      const handler1 = createEventHandler<string>("handler-1");
      const handler2 = createEventHandler<string>("handler-2");

      const events1: string[] = [];
      const events2: string[] = [];

      const unsub1 = handler1.subscribe((event) => events1.push(event));
      const unsub2 = handler2.subscribe((event) => events2.push(event));

      handler1.publish("message for handler 1");
      handler2.publish("message for handler 2");

      assert.deepStrictEqual(events1, ["message for handler 1"]);
      assert.deepStrictEqual(events2, ["message for handler 2"]);

      unsub1();
      unsub2();
    });

    it("should not interfere with built-in event handlers", () => {
      const customHandler = createEventHandler<string>("custom");
      const customEvents: string[] = [];
      const startEvents: SessionData[] = [];

      const unsubCustom = customHandler.subscribe((event) =>
        customEvents.push(event)
      );
      const unsubStart = subscribeToStart((event) => startEvents.push(event));

      customHandler.publish("custom message");

      const sessionData: SessionData = {
        name: "isolation-test",
        role: "reporter",
        elapsed: 0,
        depth: 0,
        data: {},
        errors: [],
        operations: {},
      };

      startEvent().publish(sessionData);

      assert.deepStrictEqual(customEvents, ["custom message"]);
      assert.strictEqual(startEvents.length, 1);
      assert.strictEqual(startEvents[0].name, "isolation-test");

      unsubCustom();
      unsubStart();
    });
  });
});
