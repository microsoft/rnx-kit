import { channel, subscribe, unsubscribe } from "node:diagnostics_channel";
import type { ErrorEvent, SessionData } from "./types";

/** @internal */
export const errorEvent = createEventHandler<ErrorEvent>("rnx-reporter:errors");

/** @internal */
export const startEvent = createEventHandler<SessionData>("rnx-reporter:start");

/** @internal */
export const finishEvent = createEventHandler<SessionData>("rnx-reporter:end");

/**
 * Typed wrapper around managing events sent through node's diagnostics channel
 * @param name friendly name of the event, will be turned into a symbol for containment
 * @returns a set of functions that can be used to listen for and send events
 */
export function createEventHandler<T>(name: string) {
  const eventName = Symbol(name);
  const eventChannel = channel(eventName);

  return {
    subscribe: (callback: (event: T) => void) => {
      const handler = (event: unknown, name: symbol | string) => {
        if (name === eventName) {
          callback(event as T);
        }
      };
      subscribe(eventName, handler);
      return () => unsubscribe(eventName, handler);
    },
    hasSubscribers: () => eventChannel.hasSubscribers,
    publish: (event: T) => eventChannel.publish(event),
  };
}

/**
 * Listen for reporter start events, sent when reporters or tasks are initiated
 * @param callback called when an error event is sent
 * @returns a function to unsubscribe from the event
 */
export function subscribeToStart(callback: (event: SessionData) => void) {
  return startEvent.subscribe(callback);
}

/**
 * Listen for reporter finish events, sent when reporters or tasks are completed
 * @param callback called when an error event is sent
 * @returns a function to unsubscribe from the event
 */
export function subscribeToFinish(callback: (event: SessionData) => void) {
  return finishEvent.subscribe(callback);
}

/**
 * Listen for reporter error events
 * @param callback called when an error event is sent
 * @returns a function to unsubscribe from the event
 */
export function subscribeToError(callback: (event: ErrorEvent) => void) {
  return errorEvent.subscribe(callback);
}
