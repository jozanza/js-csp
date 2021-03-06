// @flow
import { RingBuffer, ring } from './buffers';

const TASK_BATCH_SIZE: number = 1024;
const tasks: RingBuffer<Function> = ring(32);
let running: boolean = false;
let queued: boolean = false;

export function queueDispatcher(): void {
  // don't wait until the next tick
  if (!(queued && running)) {
    let count: number = 0;
    while (count < TASK_BATCH_SIZE) {
      const task: ?Function = tasks.pop();
      if (task) {
        task();
        count += 1;
      } else {
        break;
      }
    }
    if (tasks.length > 0) {
      queueDispatcher();
    }
  }
}

export function run(func: Function): void {
  tasks.unboundedUnshift(func);
  queueDispatcher();
}

export function queueDelay(func: Function, delay: number): void {
  setTimeout(func, delay);
}
