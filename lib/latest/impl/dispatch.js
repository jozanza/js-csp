import { RingBuffer, ring } from './buffers';

const TASK_BATCH_SIZE = 1024;
const tasks = ring(32);
let running = false;
let queued = false;

export function queueDispatcher() {
  // don't wait until the next tick
  if (!(queued && running)) {
    let count = 0;
    while (count < TASK_BATCH_SIZE) {
      const task = tasks.pop();
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

export function run(func) {
  tasks.unboundedUnshift(func);
  queueDispatcher();
}

export function queueDelay(func, delay) {
  setTimeout(func, delay);
}