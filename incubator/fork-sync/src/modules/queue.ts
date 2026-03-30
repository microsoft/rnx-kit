// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * A generic FIFO queue with O(1) amortized enqueue and dequeue operations.
 *
 * This module provides:
 * - **enqueue(item)**: Add an item to the back of the queue
 * - **dequeue()**: Remove and return the front item (or `undefined` if empty)
 * - **peek()**: View the front item without removing it
 * - **length**: Number of items in the queue
 * - **isEmpty()**: Check if the queue has no items
 * - **clear()**: Remove all items
 *
 * Uses a two-array strategy to avoid O(n) array shifts:
 * - Write array: receives new items via `push()`
 * - Read array: items are read by index, not shifted
 * - When read array is exhausted, arrays are swapped
 *
 * This gives O(1) amortized time for both enqueue and dequeue, compared to
 * the standard `Array.shift()` which is O(n) due to re-indexing.
 *
 * @example
 * ```typescript
 * import { Queue } from './modules/queue.ts';
 *
 * const queue = new Queue<string>();
 *
 * queue.enqueue('first');
 * queue.enqueue('second');
 * queue.enqueue('third');
 *
 * console.log(queue.length);    // 3
 * console.log(queue.peek());    // 'first'
 * console.log(queue.dequeue()); // 'first'
 * console.log(queue.dequeue()); // 'second'
 * console.log(queue.isEmpty()); // false
 * console.log(queue.dequeue()); // 'third'
 * console.log(queue.isEmpty()); // true
 * console.log(queue.dequeue()); // undefined
 * ```
 *
 * @module queue
 */
export class Queue<T> {
  private readArray: T[] = [];
  private writeArray: T[] = [];
  private readIndex = 0;
  private count = 0;

  /** Number of items in the queue. */
  get length(): number {
    return this.count;
  }

  /** Returns true if the queue has no items. */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /** Adds an item to the back of the queue. */
  enqueue(item: T): void {
    this.writeArray.push(item);
    this.count++;
  }

  /**
   * Removes and returns the item at the front of the queue.
   * Returns undefined if the queue is empty.
   */
  dequeue(): T | undefined {
    if (this.count === 0) return undefined;

    // If read array is exhausted, swap arrays
    if (this.readIndex >= this.readArray.length) {
      const temp = this.readArray;
      this.readArray = this.writeArray;
      this.writeArray = temp;
      this.writeArray.length = 0; // Clear without allocation
      this.readIndex = 0;
    }

    const item = this.readArray[this.readIndex];
    this.readArray[this.readIndex] = undefined as T; // Help GC
    this.readIndex++;
    this.count--;
    return item;
  }

  /**
   * Returns the item at the front of the queue without removing it.
   * Returns undefined if the queue is empty.
   */
  peek(): T | undefined {
    if (this.count === 0) return undefined;

    // If read array is exhausted, need to look at write array
    if (this.readIndex >= this.readArray.length) {
      return this.writeArray[0];
    }

    return this.readArray[this.readIndex];
  }

  /** Removes all items from the queue. */
  clear(): void {
    this.readArray.length = 0;
    this.writeArray.length = 0;
    this.readIndex = 0;
    this.count = 0;
  }
}
