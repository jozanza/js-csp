(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("csp", [], factory);
	else if(typeof exports === 'object')
		exports["csp"] = factory();
	else
		root["csp"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 26);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__buffers__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__boxes__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__utils__ = __webpack_require__(12);
/* harmony export (immutable) */ __webpack_exports__["b"] = chan;







const MAX_DIRTY = 64;
/* unused harmony export MAX_DIRTY */

const MAX_QUEUE_SIZE = 1024;
/* unused harmony export MAX_QUEUE_SIZE */

const CLOSED = null;
/* harmony export (immutable) */ __webpack_exports__["a"] = CLOSED;


class Channel {

  constructor(takes, puts, buf, xform) {
    this.buf = buf;
    this.xform = xform;
    this.takes = takes;
    this.puts = puts;
    this.dirtyTakes = 0;
    this.dirtyPuts = 0;
    this.closed = false;
  }

  put(value, handler) {
    if (value === CLOSED) {
      throw new Error('Cannot put CLOSED on a channel.');
    }

    // TODO: I'm not sure how this can happen, because the operations
    // are registered in 1 tick, and the only way for this to be inactive
    // is for a previous operation in the same alt to have returned
    // immediately, which would have short-circuited to prevent this to
    // be ever register anyway. The same thing goes for the active check
    // in "take".
    if (!handler.isActive()) {
      return null;
    }

    if (this.closed) {
      handler.commit();
      return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](false);
    }

    // Soak the value through the buffer first, even if there is a
    // pending taker. This way the step function has a chance to act on the
    // value.
    if (this.buf && !this.buf.isFull()) {
      handler.commit();
      const done = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["a" /* isReduced */])(this.xform['@@transducer/step'](this.buf, value));

      // flow-ignore
      while (this.buf.count() > 0 && this.takes.length > 0) {
        const taker = this.takes.pop();

        // flow-ignore
        if (taker.isActive()) {
          // flow-ignore
          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(taker.commit(), this.buf.remove());
        }
      }

      if (done) {
        this.close();
      }
      return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](true);
    }

    // Either the buffer is full, in which case there won't be any
    // pending takes, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (this.takes.length > 0) {
      const taker = this.takes.pop();

      // flow-ignore
      if (taker.isActive()) {
        handler.commit();
        // flow-ignore
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(taker.commit(), value);
        return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](true);
      }
    }

    // No buffer, full buffer, no pending takes. Queue this put now if blockable.
    if (this.dirtyPuts > MAX_DIRTY) {
      this.puts.cleanup(putter => putter.handler.isActive());
      this.dirtyPuts = 0;
    } else {
      this.dirtyPuts += 1;
    }

    if (handler.isBlockable()) {
      if (this.puts.length >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending puts are allowed on a single channel.`);
      }
      this.puts.unboundedUnshift(new __WEBPACK_IMPORTED_MODULE_1__boxes__["b" /* PutBox */](handler, value));
    }

    return null;
  }

  take(handler) {
    if (!handler.isActive()) {
      return null;
    }

    if (this.buf && this.buf.count() > 0) {
      handler.commit();
      // flow-ignore
      const value = this.buf.remove();

      // We need to check pending puts here, other wise they won't
      // be able to proceed until their number reaches MAX_DIRTY

      // flow-ignore
      while (this.puts.length > 0 && !this.buf.isFull()) {
        const putter = this.puts.pop();

        // flow-ignore
        if (putter.handler.isActive()) {
          // flow-ignore
          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(putter.handler.commit(), true);

          // flow-ignore
          if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["a" /* isReduced */])(this.xform['@@transducer/step'](this.buf, putter.value))) {
            this.close();
          }
        }
      }
      return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](value);
    }

    // Either the buffer is empty, in which case there won't be any
    // pending puts, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (this.puts.length > 0) {
      const putter = this.puts.pop();

      // flow-ignore
      if (putter.handler.isActive()) {
        handler.commit();
        // flow-ignore
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(putter.handler.commit(), true);

        // flow-ignore
        return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](putter.value);
      }
    }

    if (this.closed) {
      handler.commit();
      return new __WEBPACK_IMPORTED_MODULE_1__boxes__["a" /* Box */](CLOSED);
    }

    // No buffer, empty buffer, no pending puts. Queue this take now if blockable.
    if (this.dirtyTakes > MAX_DIRTY) {
      this.takes.cleanup(_handler => _handler.isActive());
      this.dirtyTakes = 0;
    } else {
      this.dirtyTakes += 1;
    }

    if (handler.isBlockable()) {
      if (this.takes.length >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending takes are allowed on a single channel.`);
      }

      this.takes.unboundedUnshift(handler);
    }

    return null;
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.buf) {
      this.xform['@@transducer/result'](this.buf);

      while (this.buf.count() > 0 && this.takes.length > 0) {
        const taker = this.takes.pop();

        // flow-ignore
        if (taker.isActive()) {
          // flow-ignore
          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(taker.commit(), this.buf.remove());
        }
      }
    }

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["c" /* flush */])(this.takes, taker => {
      if (taker.isActive()) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(taker.commit(), CLOSED);
      }
    });

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["c" /* flush */])(this.puts, putter => {
      if (putter.handler.isActive()) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils__["b" /* taskScheduler */])(putter.handler.commit(), false);
      }
    });
  }

  isClosed() {
    return this.closed;
  }
}
/* harmony export (immutable) */ __webpack_exports__["c"] = Channel;


// The base transformer object to use with transducers
const AddTransformer = {
  '@@transducer/init': () => {
    throw new Error('init not available');
  },

  '@@transducer/result': v => v,

  '@@transducer/step': (buffer, input) => {
    buffer.add(input);
    return buffer;
  }
};

function defaultExceptionHandler(err) {
  console.log('error in channel transformer', err.stack); // eslint-disable-line
  return CLOSED;
}

function handleEx(buf, exHandler, e) {
  const def = (exHandler || defaultExceptionHandler)(e);

  if (def !== CLOSED) {
    buf.add(def);
  }

  return buf;
}

function handleException(exHandler) {
  return xform => ({
    '@@transducer/step': (buffer, input) => {
      try {
        return xform['@@transducer/step'](buffer, input);
      } catch (e) {
        return handleEx(buffer, exHandler, e);
      }
    },
    '@@transducer/result': buffer => {
      try {
        return xform['@@transducer/result'](buffer);
      } catch (e) {
        return handleEx(buffer, exHandler, e);
      }
    }
  });
}

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducers xform, not both
function chan(buf, xform, exHandler) {
  let newXForm;

  if (xform) {
    if (!buf) {
      throw new Error('Only buffered channels can use transducers');
    }

    newXForm = xform(AddTransformer);
  } else {
    newXForm = AddTransformer;
  }

  return new Channel(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__buffers__["e" /* ring */])(32), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__buffers__["e" /* ring */])(32), buf, handleException(exHandler)(newXForm));
}

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


class Box {

  constructor(value) {
    this.value = value;
  }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = Box;



class PutBox {

  constructor(handler, value) {
    this.handler = handler;
    this.value = value;
  }
}
/* harmony export (immutable) */ __webpack_exports__["b"] = PutBox;


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["e"] = ring;
/* harmony export (immutable) */ __webpack_exports__["a"] = fixed;
/* harmony export (immutable) */ __webpack_exports__["b"] = dropping;
/* harmony export (immutable) */ __webpack_exports__["c"] = sliding;
/* harmony export (immutable) */ __webpack_exports__["d"] = promise;
function acopy(src, srcStart, dest, destStart, len) {
  for (let count = 0; count < len; count += 1) {
    dest[destStart + count] = src[srcStart + count];
  }
}

class RingBuffer {

  constructor(head, tail, length, arr) {
    this.head = head;
    this.tail = tail;
    this.length = length;
    this.arr = arr;
  }

  pop() {
    if (this.length !== 0) {
      const elem = this.arr[this.tail];

      this.arr[this.tail] = undefined;
      this.tail = (this.tail + 1) % this.arr.length;
      this.length -= 1;

      return elem;
    }

    return undefined;
  }

  unshift(element) {
    this.arr[this.head] = element;
    this.head = (this.head + 1) % this.arr.length;
    this.length += 1;
  }

  unboundedUnshift(element) {
    if (this.length + 1 === this.arr.length) {
      this.resize();
    }
    this.unshift(element);
  }

  resize() {
    const newArrSize = this.arr.length * 2;
    const newArr = new Array(newArrSize);

    if (this.tail < this.head) {
      acopy(this.arr, this.tail, newArr, 0, this.length);
      this.tail = 0;
      this.head = this.length;
      this.arr = newArr;
    } else if (this.tail > this.head) {
      acopy(this.arr, this.tail, newArr, 0, this.arr.length - this.tail);
      acopy(this.arr, 0, newArr, this.arr.length - this.tail, this.head);
      this.tail = 0;
      this.head = this.length;
      this.arr = newArr;
    } else if (this.tail === this.head) {
      this.tail = 0;
      this.head = 0;
      this.arr = newArr;
    }
  }

  cleanup(predicate) {
    for (let i = this.length; i > 0; i -= 1) {
      const value = this.pop();

      if (predicate(value)) {
        this.unshift(value);
      }
    }
  }
}
/* unused harmony export RingBuffer */


function ring(n) {
  if (n <= 0) {
    throw new Error("Can't create a ring buffer of size 0");
  }

  return new RingBuffer(0, 0, 0, new Array(n));
}

/**
 * Returns a buffer that is considered "full" when it reaches size n,
 * but still accepts additional items, effectively allow overflowing.
 * The overflowing behavior is useful for supporting "expanding"
 * transducers, where we want to check if a buffer is full before
 * running the transduced step function, while still allowing a
 * transduced step to expand into multiple "essence" steps.
 */
class FixedBuffer {

  constructor(buffer, n) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull() {
    return this.buffer.length === this.n;
  }

  remove() {
    return this.buffer.pop();
  }

  add(item) {
    this.buffer.unboundedUnshift(item);
  }

  closeBuffer() {} // eslint-disable-line

  count() {
    return this.buffer.length;
  }
}
/* unused harmony export FixedBuffer */


function fixed(n) {
  return new FixedBuffer(ring(n), n);
}

class DroppingBuffer {

  constructor(buffer, n) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull() {
    // eslint-disable-line
    return false;
  }

  remove() {
    return this.buffer.pop();
  }

  add(item) {
    if (this.buffer.length !== this.n) {
      this.buffer.unshift(item);
    }
  }

  closeBuffer() {} // eslint-disable-line

  count() {
    return this.buffer.length;
  }
}
/* unused harmony export DroppingBuffer */


function dropping(n) {
  return new DroppingBuffer(ring(n), n);
}

class SlidingBuffer {

  constructor(buffer, n) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull() {
    // eslint-disable-line
    return false;
  }

  remove() {
    return this.buffer.pop();
  }

  add(item) {
    if (this.buffer.length === this.n) {
      this.remove();
    }

    this.buffer.unshift(item);
  }

  closeBuffer() {} // eslint-disable-line

  count() {
    return this.buffer.length;
  }
}
/* unused harmony export SlidingBuffer */


function sliding(n) {
  return new SlidingBuffer(ring(n), n);
}

class PromiseBuffer {

  constructor(value) {
    this.value = value;
  }

  isFull() {
    // eslint-disable-line
    return false;
  }

  remove() {
    return this.value;
  }

  add(item) {
    if (PromiseBuffer.isUndelivered(this.value)) {
      this.value = item;
    }
  }

  closeBuffer() {
    if (PromiseBuffer.isUndelivered(this.value)) {
      this.value = null;
    }
  }

  count() {
    return PromiseBuffer.isUndelivered(this.value) ? 0 : 1;
  }
}
/* unused harmony export PromiseBuffer */


PromiseBuffer.NO_VALUE = '@@PromiseBuffer/NO_VALUE';

PromiseBuffer.isUndelivered = value => PromiseBuffer.NO_VALUE === value;

function promise() {
  return new PromiseBuffer(PromiseBuffer.NO_VALUE);
}

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__select__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__handlers__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__instruction__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__boxes__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__channels__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__dispatch__ = __webpack_require__(4);
/* harmony export (immutable) */ __webpack_exports__["g"] = putThenCallback;
/* harmony export (immutable) */ __webpack_exports__["h"] = takeThenCallback;
/* harmony export (immutable) */ __webpack_exports__["b"] = take;
/* harmony export (immutable) */ __webpack_exports__["a"] = put;
/* harmony export (immutable) */ __webpack_exports__["e"] = sleep;
/* harmony export (immutable) */ __webpack_exports__["f"] = alts;
/* harmony export (immutable) */ __webpack_exports__["d"] = poll;
/* harmony export (immutable) */ __webpack_exports__["c"] = offer;







const NO_VALUE = '@@process/NO_VALUE';
/* harmony export (immutable) */ __webpack_exports__["i"] = NO_VALUE;


function putThenCallback(channel, value, callback) {
  const result = channel.put(value, new __WEBPACK_IMPORTED_MODULE_1__handlers__["a" /* FnHandler */](true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

function takeThenCallback(channel, callback) {
  const result = channel.take(new __WEBPACK_IMPORTED_MODULE_1__handlers__["a" /* FnHandler */](true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

function take(channel) {
  return new __WEBPACK_IMPORTED_MODULE_2__instruction__["a" /* TakeInstruction */](channel);
}

function put(channel, value) {
  return new __WEBPACK_IMPORTED_MODULE_2__instruction__["b" /* PutInstruction */](channel, value);
}

function sleep(msecs) {
  return new __WEBPACK_IMPORTED_MODULE_2__instruction__["c" /* SleepInstruction */](msecs);
}

function alts(operations, options) {
  return new __WEBPACK_IMPORTED_MODULE_2__instruction__["d" /* AltsInstruction */](operations, options);
}

function poll(channel) {
  if (channel.closed) {
    return NO_VALUE;
  }

  const result = channel.take(new __WEBPACK_IMPORTED_MODULE_1__handlers__["a" /* FnHandler */](false));

  return result ? result.value : NO_VALUE;
}

function offer(channel, value) {
  if (channel.closed) {
    return false;
  }

  const result = channel.put(value, new __WEBPACK_IMPORTED_MODULE_1__handlers__["a" /* FnHandler */](false));

  return result instanceof __WEBPACK_IMPORTED_MODULE_3__boxes__["a" /* Box */];
}

class Process {

  constructor(gen, onFinishFunc) {
    this.schedule = nextState => {
      this.run(nextState);
    };

    this.gen = gen;
    this.finished = false;
    this.onFinishFunc = onFinishFunc;
  }

  run(state) {
    if (!this.finished) {
      // TODO: Shouldn't we (optionally) stop error propagation here (and
      // signal the error through a channel or something)? Otherwise the
      // uncaught exception will crash some runtimes (e.g. Node)
      const { done, value } = this.gen.next(state);

      if (done) {
        this.finished = true;
        this.onFinishFunc(value);
      } else if (value instanceof __WEBPACK_IMPORTED_MODULE_2__instruction__["a" /* TakeInstruction */]) {
        takeThenCallback(value.channel, this.schedule);
      } else if (value instanceof __WEBPACK_IMPORTED_MODULE_2__instruction__["b" /* PutInstruction */]) {
        putThenCallback(value.channel, value.value, this.schedule);
      } else if (value instanceof __WEBPACK_IMPORTED_MODULE_2__instruction__["c" /* SleepInstruction */]) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5__dispatch__["a" /* queueDelay */])(this.schedule, value.msec);
      } else if (value instanceof __WEBPACK_IMPORTED_MODULE_2__instruction__["d" /* AltsInstruction */]) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__select__["a" /* doAlts */])(value.operations, this.schedule, value.options);
      } else if (value instanceof __WEBPACK_IMPORTED_MODULE_4__channels__["c" /* Channel */]) {
        takeThenCallback(value, this.schedule);
      } else {
        this.schedule(value);
      }
    }
  }
}
/* harmony export (immutable) */ __webpack_exports__["j"] = Process;


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__buffers__ = __webpack_require__(2);
/* unused harmony export queueDispatcher */
/* harmony export (immutable) */ __webpack_exports__["b"] = run;
/* harmony export (immutable) */ __webpack_exports__["a"] = queueDelay;


const TASK_BATCH_SIZE = 1024;
const tasks = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__buffers__["e" /* ring */])(32);
let running = false;
let queued = false;

function queueDispatcher() {
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

function run(func) {
  tasks.unboundedUnshift(func);
  queueDispatcher();
}

function queueDelay(func, delay) {
  setTimeout(func, delay);
}

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__impl_buffers__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__impl_process__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__impl_channels__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["a"] = spawn;
/* harmony export (immutable) */ __webpack_exports__["b"] = go;
/* harmony export (immutable) */ __webpack_exports__["c"] = chan;
/* harmony export (immutable) */ __webpack_exports__["d"] = promiseChan;






function spawn(gen) {
  const ch = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__impl_channels__["b" /* chan */])(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__impl_buffers__["a" /* fixed */])(1));
  const process = new __WEBPACK_IMPORTED_MODULE_1__impl_process__["j" /* Process */](gen, value => {
    if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
      ch.close();
    } else {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__impl_process__["g" /* putThenCallback */])(ch, value, () => ch.close());
    }
  });

  process.run();
  return ch;
}

function go(f, args = []) {
  return spawn(f(...args));
}

function chan(bufferOrNumber, xform, exHandler) {
  if (typeof bufferOrNumber === 'number') {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__impl_channels__["b" /* chan */])(bufferOrNumber === 0 ? null : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__impl_buffers__["a" /* fixed */])(bufferOrNumber), xform, exHandler);
  }

  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__impl_channels__["b" /* chan */])(bufferOrNumber, xform, exHandler);
}

function promiseChan(xform, exHandler) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__impl_channels__["b" /* chan */])(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__impl_buffers__["d" /* promise */])(), xform, exHandler);
}

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channels__ = __webpack_require__(0);


const DEFAULT = {
  toString() {
    return '[object DEFAULT]';
  }
};
/* harmony export (immutable) */ __webpack_exports__["a"] = DEFAULT;


class AltResult {

  constructor(value, channel) {
    this.value = value;
    this.channel = channel;
  }
}
/* harmony export (immutable) */ __webpack_exports__["b"] = AltResult;


/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_noop__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_noop___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash_noop__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__boxes__ = __webpack_require__(1);



class FnHandler {

  constructor(blockable, func) {
    this.blockable = blockable;
    this.func = func || __WEBPACK_IMPORTED_MODULE_0_lodash_noop___default.a;
  }

  isActive() {
    // eslint-disable-line
    return true;
  }

  isBlockable() {
    return this.blockable;
  }

  commit() {
    return this.func;
  }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = FnHandler;


class AltHandler {

  constructor(flag, func) {
    this.flag = flag;
    this.func = func;
  }

  isActive() {
    return this.flag.value;
  }

  isBlockable() {
    // eslint-disable-line
    return true;
  }

  commit() {
    this.flag.value = false;
    return this.func;
  }
}
/* harmony export (immutable) */ __webpack_exports__["b"] = AltHandler;


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_times__ = __webpack_require__(24);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_times___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash_times__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__impl_boxes__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__impl_channels__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__impl_process__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__csp_core__ = __webpack_require__(5);
/* harmony export (immutable) */ __webpack_exports__["a"] = mapFrom;
/* harmony export (immutable) */ __webpack_exports__["b"] = mapInto;
/* harmony export (immutable) */ __webpack_exports__["c"] = filterFrom;
/* harmony export (immutable) */ __webpack_exports__["d"] = filterInto;
/* harmony export (immutable) */ __webpack_exports__["e"] = removeFrom;
/* harmony export (immutable) */ __webpack_exports__["f"] = removeInto;
/* harmony export (immutable) */ __webpack_exports__["g"] = mapcatFrom;
/* harmony export (immutable) */ __webpack_exports__["h"] = mapcatInto;
/* harmony export (immutable) */ __webpack_exports__["i"] = pipe;
/* harmony export (immutable) */ __webpack_exports__["j"] = split;
/* harmony export (immutable) */ __webpack_exports__["k"] = reduce;
/* harmony export (immutable) */ __webpack_exports__["l"] = onto;
/* harmony export (immutable) */ __webpack_exports__["m"] = fromColl;
/* harmony export (immutable) */ __webpack_exports__["n"] = map;
/* harmony export (immutable) */ __webpack_exports__["o"] = merge;
/* harmony export (immutable) */ __webpack_exports__["p"] = into;
/* harmony export (immutable) */ __webpack_exports__["y"] = take;
/* harmony export (immutable) */ __webpack_exports__["q"] = unique;
/* harmony export (immutable) */ __webpack_exports__["r"] = partitionBy;
/* harmony export (immutable) */ __webpack_exports__["s"] = partition;
/* harmony export (immutable) */ __webpack_exports__["t"] = mult;
/* harmony export (immutable) */ __webpack_exports__["u"] = mix;
/* harmony export (immutable) */ __webpack_exports__["v"] = pub;
/* harmony export (immutable) */ __webpack_exports__["w"] = pipeline;
/* harmony export (immutable) */ __webpack_exports__["x"] = pipelineAsync;






function mapFrom(f, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      return ch.put(value, handler);
    },
    take(handler) {
      const result = ch.take({
        isActive() {
          return handler.isActive();
        },
        commit() {
          const takeCallback = handler.commit();
          return value => takeCallback(value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */] ? __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */] : f(value));
        }
      });

      if (result) {
        const value = result.value;
        return new __WEBPACK_IMPORTED_MODULE_1__impl_boxes__["a" /* Box */](value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */] ? __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */] : f(value));
      }

      return null;
    }
  };
}

function mapInto(f, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      return ch.put(f(value), handler);
    },
    take(handler) {
      return ch.take(handler);
    }
  };
}

function filterFrom(p, ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        out.close();
        break;
      }

      if (p(value)) {
        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, value);
      }
    }
  });
  return out;
}

function filterInto(p, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      if (p(value)) {
        return ch.put(value, handler);
      }

      return new __WEBPACK_IMPORTED_MODULE_1__impl_boxes__["a" /* Box */](!ch.isClosed());
    },
    take(handler) {
      return ch.take(handler);
    }
  };
}

function removeFrom(p, ch) {
  return filterFrom(value => !p(value), ch);
}

function removeInto(p, ch) {
  return filterInto(value => !p(value), ch);
}

function* mapcat(f, src, dst) {
  for (;;) {
    const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(src);
    if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
      dst.close();
      break;
    } else {
      const seq = f(value);
      const length = seq.length;
      for (let i = 0; i < length; i += 1) {
        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(dst, seq[i]);
      }
      if (dst.isClosed()) {
        break;
      }
    }
  }
}

function mapcatFrom(f, ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(mapcat, [f, ch, out]);
  return out;
}

function mapcatInto(f, ch, bufferOrN) {
  const src = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(mapcat, [f, src, ch]);
  return src;
}

function pipe(src, dst, keepOpen) {
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(src);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        if (!keepOpen) {
          dst.close();
        }
        break;
      }
      if (!(yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(dst, value))) {
        break;
      }
    }
  });
  return dst;
}

function split(p, ch, trueBufferOrN, falseBufferOrN) {
  const tch = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(trueBufferOrN);
  const fch = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(falseBufferOrN);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        tch.close();
        fch.close();
        break;
      }
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(p(value) ? tch : fch, value);
    }
  });
  return [tch, fch];
}

function reduce(f, init, ch) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    let result = init;
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);

      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        return result;
      }

      result = f(result, value);
    }
  }, [], true);
}

function onto(ch, coll, keepOpen) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    const length = coll.length;
    // FIX: Should be a generic looping interface (for...in?)
    for (let i = 0; i < length; i += 1) {
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(ch, coll[i]);
    }
    if (!keepOpen) {
      ch.close();
    }
  });
}

// TODO: Bounded?
function fromColl(coll) {
  const ch = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(coll.length);
  onto(ch, coll);
  return ch;
}

function map(f, chs, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  const length = chs.length;
  // Array holding 1 round of values
  const values = new Array(length);
  // TODO: Not sure why we need a size-1 buffer here
  const dchan = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(1);
  // How many more items this round
  let dcount;
  // put callbacks for each channel
  const dcallbacks = new Array(length);
  const callback = i => value => {
    values[i] = value;
    dcount -= 1;
    if (dcount === 0) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(dchan, values.slice(0));
    }
  };

  for (let i = 0; i < length; i += 1) {
    dcallbacks[i] = callback(i);
  }

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      dcount = length;
      // We could just launch n goroutines here, but for effciency we
      // don't
      for (let i = 0; i < length; i += 1) {
        try {
          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["h" /* takeThenCallback */])(chs[i], dcallbacks[i]);
        } catch (e) {
          // FIX: Hmm why catching here?
          dcount -= 1;
        }
      }

      const _values = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(dchan);
      for (let i = 0; i < length; i += 1) {
        if (_values[i] === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
          out.close();
          return;
        }
      }
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, f(..._values));
    }
  });
  return out;
}

function merge(chs, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  const actives = chs.slice(0);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      if (actives.length === 0) {
        break;
      }
      const r = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["f" /* alts */])(actives);
      const value = r.value;
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        // Remove closed channel
        const i = actives.indexOf(r.channel);
        actives.splice(i, 1);
      } else {
        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, value);
      }
    }
    out.close();
  });
  return out;
}

function into(coll, ch) {
  const result = coll.slice(0);
  return reduce((_result, item) => {
    _result.push(item);
    return _result;
  }, result, ch);
}

function take(n, ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (let i = 0; i < n; i += 1) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        break;
      }
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, value);
    }
    out.close();
  });
  return out;
}

const NOTHING = {};

function unique(ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  let last = NOTHING;
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        break;
      }
      if (value !== last) {
        last = value;
        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, value);
      }
    }
    out.close();
  });
  return out;
}

function partitionBy(f, ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  let part = [];
  let last = NOTHING;
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        if (part.length > 0) {
          yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, part);
        }
        out.close();
        break;
      } else {
        const newItem = f(value);
        if (newItem === last || last === NOTHING) {
          part.push(value);
        } else {
          yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, part);
          part = [value];
        }
        last = newItem;
      }
    }
  });
  return out;
}

function partition(n, ch, bufferOrN) {
  const out = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferOrN);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const part = new Array(n);
      for (let i = 0; i < n; i += 1) {
        const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
        if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
          if (i > 0) {
            yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, part.slice(0, i));
          }
          out.close();
          return;
        }
        part[i] = value;
      }
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, part);
    }
  });
  return out;
}

// For channel identification
const genId = (() => {
  let i = 0;

  return () => {
    i += 1;
    return `${i}`;
  };
})();

const ID_ATTR = '__csp_channel_id';

function chanId(ch) {
  let id = ch[ID_ATTR];

  if (!id) {
    const generatedId = genId();

    id = generatedId;
    ch[ID_ATTR] = generatedId;
  }

  return id;
}

class Tap {
  constructor(channel, keepOpen) {
    this.channel = channel;
    this.keepOpen = keepOpen;
  }
}

class Mult {
  constructor(ch) {
    this.taps = {};
    this.ch = ch;
  }

  muxch() {
    return this.ch;
  }

  tap(ch, keepOpen) {
    this.taps[chanId(ch)] = new Tap(ch, keepOpen);
  }

  untap(ch) {
    delete this.taps[chanId(ch)];
  }

  untapAll() {
    this.taps = {};
  }
}

function mult(ch) {
  const m = new Mult(ch);
  const dchan = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(1);
  let dcount;

  function makeDoneCallback(tap) {
    return stillOpen => {
      dcount -= 1;
      if (dcount === 0) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(dchan, true);
      }
      if (!stillOpen) {
        m.untap(tap.channel);
      }
    };
  }

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      const taps = m.taps;
      let t;

      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        Object.keys(taps).forEach(id => {
          t = taps[id];
          if (!t.keepOpen) {
            t.channel.close();
          }
        });

        // TODO: Is this necessary?
        m.untapAll();
        break;
      }
      dcount = Object.keys(taps).length;
      // XXX: This is because putAsync can actually call back
      // immediately. Fix that
      const initDcount = dcount;
      // Put value on tapping channels...
      Object.keys(taps).forEach(id => {
        t = taps[id];
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(t.channel, value, makeDoneCallback(t));
      });
      // ... waiting for all puts to complete
      if (initDcount > 0) {
        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(dchan);
      }
    }
  });
  return m;
}

mult.tap = (m, ch, keepOpen) => {
  m.tap(ch, keepOpen);
  return ch;
};

mult.untap = (m, ch) => {
  m.untap(ch);
};

mult.untapAll = m => {
  m.untapAll();
};

const MIX_MUTE = 'mute';
const MIX_PAUSE = 'pause';
const MIX_SOLO = 'solo';
const VALID_SOLO_MODES = [MIX_MUTE, MIX_PAUSE];

class Mix {
  constructor(ch) {
    this.ch = ch;
    this.stateMap = {};
    this.change = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])();
    this.soloMode = MIX_MUTE;
  }

  _changed() {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(this.change, true);
  }

  _getAllState() {
    const stateMap = this.stateMap;
    const solos = [];
    const mutes = [];
    const pauses = [];
    let reads;

    Object.keys(stateMap).forEach(id => {
      const chanData = stateMap[id];
      const state = chanData.state;
      const channel = chanData.channel;
      if (state[MIX_SOLO]) {
        solos.push(channel);
      }
      // TODO
      if (state[MIX_MUTE]) {
        mutes.push(channel);
      }
      if (state[MIX_PAUSE]) {
        pauses.push(channel);
      }
    });

    let i;
    let n;
    if (this.soloMode === MIX_PAUSE && solos.length > 0) {
      n = solos.length;
      reads = new Array(n + 1);
      for (i = 0; i < n; i += 1) {
        reads[i] = solos[i];
      }
      reads[n] = this.change;
    } else {
      reads = [];
      Object.keys(stateMap).forEach(id => {
        const chanData = stateMap[id];
        const channel = chanData.channel;
        if (pauses.indexOf(channel) < 0) {
          reads.push(channel);
        }
      });
      reads.push(this.change);
    }

    return { solos, mutes, reads };
  }

  admix(ch) {
    this.stateMap[chanId(ch)] = {
      channel: ch,
      state: {}
    };
    this._changed();
  }

  unmix(ch) {
    delete this.stateMap[chanId(ch)];
    this._changed();
  }

  unmixAll() {
    this.stateMap = {};
    this._changed();
  }

  toggle(updateStateList) {
    // [[ch1, {}], [ch2, {solo: true}]];
    const length = updateStateList.length;
    for (let i = 0; i < length; i += 1) {
      const ch = updateStateList[i][0];
      const id = chanId(ch);
      const updateState = updateStateList[i][1];
      let chanData = this.stateMap[id];

      if (!chanData) {
        const defaultVal = {
          channel: ch,
          state: {}
        };

        chanData = defaultVal;
        this.stateMap[id] = defaultVal;
      }
      Object.keys(updateState).forEach(mode => {
        chanData.state[mode] = updateState[mode];
      });
    }
    this._changed();
  }

  setSoloMode(mode) {
    if (VALID_SOLO_MODES.indexOf(mode) < 0) {
      throw new Error('Mode must be one of: ', VALID_SOLO_MODES.join(', '));
    }
    this.soloMode = mode;
    this._changed();
  }
}

function mix(out) {
  const m = new Mix(out);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    let state = m._getAllState();

    for (;;) {
      const result = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["f" /* alts */])(state.reads);
      const value = result.value;
      const channel = result.channel;

      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        delete m.stateMap[chanId(channel)];
        state = m._getAllState();
      } else if (channel === m.change) {
        state = m._getAllState();
      } else {
        const solos = state.solos;

        if (solos.indexOf(channel) > -1 || solos.length === 0 && !(state.mutes.indexOf(channel) > -1)) {
          const stillOpen = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(out, value);
          if (!stillOpen) {
            break;
          }
        }
      }
    }
  });
  return m;
}

mix.add = function admix(m, ch) {
  m.admix(ch);
};

mix.remove = function unmix(m, ch) {
  m.unmix(ch);
};

mix.removeAll = function unmixAll(m) {
  m.unmixAll();
};

mix.toggle = function toggle(m, updateStateList) {
  m.toggle(updateStateList);
};

mix.setSoloMode = function setSoloMode(m, mode) {
  m.setSoloMode(mode);
};

function constantlyNull() {
  return null;
}

class Pub {
  constructor(ch, topicFn, bufferFn) {
    this.ch = ch;
    this.topicFn = topicFn;
    this.bufferFn = bufferFn;
    this.mults = {};
  }

  _ensureMult(topic) {
    let m = this.mults[topic];
    const bufferFn = this.bufferFn;

    if (!m) {
      const defaultVal = mult(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(bufferFn(topic)));

      m = defaultVal;
      this.mults[topic] = defaultVal;
    }
    return m;
  }

  sub(topic, ch, keepOpen) {
    const m = this._ensureMult(topic);
    return mult.tap(m, ch, keepOpen);
  }

  unsub(topic, ch) {
    const m = this.mults[topic];
    if (m) {
      mult.untap(m, ch);
    }
  }

  unsubAll(topic) {
    if (topic === undefined) {
      this.mults = {};
    } else {
      delete this.mults[topic];
    }
  }
}

function pub(ch, topicFn, bufferFn = constantlyNull) {
  const p = new Pub(ch, topicFn, bufferFn);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* () {
    for (;;) {
      const value = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(ch);
      const mults = p.mults;
      if (value === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        Object.keys(mults).forEach(topic => {
          mults[topic].muxch().close();
        });
        break;
      }
      // TODO: Somehow ensure/document that this must return a string
      // (otherwise use proper (hash)maps)
      const topic = topicFn(value);
      const m = mults[topic];
      if (m) {
        const stillOpen = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(m.muxch(), value);
        if (!stillOpen) {
          delete mults[topic];
        }
      }
    }
  });
  return p;
}

pub.sub = (p, topic, ch, keepOpen) => p.sub(topic, ch, keepOpen);

pub.unsub = (p, topic, ch) => {
  p.unsub(topic, ch);
};

pub.unsubAll = (p, topic) => {
  p.unsubAll(topic);
};

function pipelineInternal(n, to, from, close, taskFn) {
  if (n <= 0) {
    throw new Error('n must be positive');
  }

  const jobs = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(n);
  const results = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(n);

  __WEBPACK_IMPORTED_MODULE_0_lodash_times___default()(n, () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* (_taskFn, _jobs, _results) {
      for (;;) {
        const job = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(_jobs);

        if (!_taskFn(job)) {
          _results.close();
          break;
        }
      }
    }, [taskFn, jobs, results]);
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* (_jobs, _from, _results) {
    for (;;) {
      const v = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(_from);

      if (v === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        _jobs.close();
        break;
      }

      const p = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(1);

      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(_jobs, [v, p]);
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(_results, p);
    }
  }, [jobs, from, results]);

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* (_results, _close, _to) {
    for (;;) {
      const p = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(_results);

      if (p === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
        if (_close) {
          _to.close();
        }
        break;
      }

      const res = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(p);

      for (;;) {
        const v = yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["b" /* take */])(res);

        if (v === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
          break;
        }

        yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(_to, v);
      }
    }
  }, [results, close, to]);

  return to;
}

function pipeline(to, xf, from, keepOpen, exHandler) {
  function taskFn(job) {
    if (job === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
      return null;
    }

    const [v, p] = job;
    const res = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(1, xf, exHandler);

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["b" /* go */])(function* (ch, value) {
      yield __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["a" /* put */])(ch, value);
      res.close();
    }, [res, v]);

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(p, res);

    return true;
  }

  return pipelineInternal(1, to, from, !keepOpen, taskFn);
}

function pipelineAsync(n, to, af, from, keepOpen) {
  function taskFn(job) {
    if (job === __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a" /* CLOSED */]) {
      return null;
    }

    const [v, p] = job;
    const res = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__csp_core__["c" /* chan */])(1);
    af(v, res);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__impl_process__["g" /* putThenCallback */])(p, res);

    return true;
  }

  return pipelineInternal(n, to, from, !keepOpen, taskFn);
}
// Possible "fluid" interfaces:

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc],
//   [into, []]
// )

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc, _],
//   [into, [], _]
// )

// wrap()
//   .fromColl([1, 2, 3, 4])
//   .mapFrom(inc)
//   .into([])
//   .unwrap();

/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dispatch__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__channels__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["a"] = timeout;



function timeout(msecs) {
  // eslint-disable-line
  const ch = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__channels__["b" /* chan */])();

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__dispatch__["a" /* queueDelay */])(() => ch.close(), msecs);

  return ch;
}

/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channels__ = __webpack_require__(0);


class TakeInstruction {

  constructor(channel) {
    this.channel = channel;
  }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = TakeInstruction;


class PutInstruction {

  constructor(channel, value) {
    this.channel = channel;
    this.value = value;
  }
}
/* harmony export (immutable) */ __webpack_exports__["b"] = PutInstruction;


class SleepInstruction {

  constructor(msec) {
    this.msec = msec;
  }
}
/* harmony export (immutable) */ __webpack_exports__["c"] = SleepInstruction;


class AltsInstruction {

  constructor(operations, options) {
    this.operations = operations;
    this.options = options;
  }
}
/* harmony export (immutable) */ __webpack_exports__["d"] = AltsInstruction;


/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_get__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash_get___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash_get__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash_range__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash_range___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash_range__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash_arrayShuffle__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash_arrayShuffle___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash_arrayShuffle__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__boxes__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__channels__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__handlers__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__results__ = __webpack_require__(6);
/* harmony export (immutable) */ __webpack_exports__["a"] = doAlts;








// TODO: Accept a priority function or something
function doAlts( // eslint-disable-line
operations, callback, options) {
  if (operations.length === 0) {
    throw new Error('Empty alt list');
  }

  const flag = new __WEBPACK_IMPORTED_MODULE_3__boxes__["a" /* Box */](true);
  const indexes = __WEBPACK_IMPORTED_MODULE_2_lodash_arrayShuffle___default()(__WEBPACK_IMPORTED_MODULE_1_lodash_range___default()(operations.length));
  const hasPriority = !!(options && options.priority);
  let result;

  for (let i = 0; i < operations.length; i += 1) {
    const operation = operations[hasPriority ? i : indexes[i]];
    let ch;

    if (operation instanceof __WEBPACK_IMPORTED_MODULE_4__channels__["c" /* Channel */]) {
      ch = operation;
      result = ch.take(new __WEBPACK_IMPORTED_MODULE_5__handlers__["b" /* AltHandler */](flag, value => callback(new __WEBPACK_IMPORTED_MODULE_6__results__["b" /* AltResult */](value, ch))));
    } else {
      ch = operation[0];
      result = ch.put(operation[1], new __WEBPACK_IMPORTED_MODULE_5__handlers__["b" /* AltHandler */](flag, value => callback(new __WEBPACK_IMPORTED_MODULE_6__results__["b" /* AltResult */](value, ch))));
    }

    if (result) {
      callback(new __WEBPACK_IMPORTED_MODULE_6__results__["b" /* AltResult */](result.value, ch));
      break;
    }
  }

  if (!result && __WEBPACK_IMPORTED_MODULE_0_lodash_get___default()(options, 'default') && flag.value) {
    flag.value = false;
    callback(new __WEBPACK_IMPORTED_MODULE_6__results__["b" /* AltResult */](options.default, __WEBPACK_IMPORTED_MODULE_6__results__["a" /* DEFAULT */]));
  }
}

/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dispatch__ = __webpack_require__(4);
/* harmony export (immutable) */ __webpack_exports__["c"] = flush;



const taskScheduler = (func, value) => {
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__dispatch__["b" /* run */])(() => func(value));
};
/* harmony export (immutable) */ __webpack_exports__["b"] = taskScheduler;


const isReduced = v => v && v['@@transducer/reduced'];
/* harmony export (immutable) */ __webpack_exports__["a"] = isReduced;


function flush(channelBuffer, callback) {
  while (channelBuffer.length > 0) {
    callback(channelBuffer.pop());
  }
}

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

var copyArray = __webpack_require__(17),
    shuffleSelf = __webpack_require__(20);

/**
 * A specialized version of `_.shuffle` for arrays.
 *
 * @private
 * @param {Array} array The array to shuffle.
 * @returns {Array} Returns the new shuffled array.
 */
function arrayShuffle(array) {
  return shuffleSelf(copyArray(array));
}

module.exports = arrayShuffle;


/***/ }),
/* 14 */
/***/ (function(module, exports) {

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeFloor = Math.floor,
    nativeRandom = Math.random;

/**
 * The base implementation of `_.random` without support for returning
 * floating-point numbers.
 *
 * @private
 * @param {number} lower The lower bound.
 * @param {number} upper The upper bound.
 * @returns {number} Returns the random number.
 */
function baseRandom(lower, upper) {
  return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
}

module.exports = baseRandom;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeCeil = Math.ceil,
    nativeMax = Math.max;

/**
 * The base implementation of `_.range` and `_.rangeRight` which doesn't
 * coerce arguments.
 *
 * @private
 * @param {number} start The start of the range.
 * @param {number} end The end of the range.
 * @param {number} step The value to increment or decrement by.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Array} Returns the range of numbers.
 */
function baseRange(start, end, step, fromRight) {
  var index = -1,
      length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
      result = Array(length);

  while (length--) {
    result[fromRight ? length : ++index] = start;
    start += step;
  }
  return result;
}

module.exports = baseRange;


/***/ }),
/* 17 */
/***/ (function(module, exports) {

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = copyArray;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

var baseRange = __webpack_require__(16),
    isIterateeCall = __webpack_require__(19),
    toFinite = __webpack_require__(25);

/**
 * Creates a `_.range` or `_.rangeRight` function.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new range function.
 */
function createRange(fromRight) {
  return function(start, end, step) {
    if (step && typeof step != 'number' && isIterateeCall(start, end, step)) {
      end = step = undefined;
    }
    // Ensure the sign of `-0` is preserved.
    start = toFinite(start);
    if (end === undefined) {
      end = start;
      start = 0;
    } else {
      end = toFinite(end);
    }
    step = step === undefined ? (start < end ? 1 : -1) : toFinite(step);
    return baseRange(start, end, step, fromRight);
  };
}

module.exports = createRange;


/***/ }),
/* 19 */
/***/ (function(module, exports) {

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

var baseRandom = __webpack_require__(15);

/**
 * A specialized version of `_.shuffle` which mutates and sets the size of `array`.
 *
 * @private
 * @param {Array} array The array to shuffle.
 * @param {number} [size=array.length] The size of `array`.
 * @returns {Array} Returns `array`.
 */
function shuffleSelf(array, size) {
  var index = -1,
      length = array.length,
      lastIndex = length - 1;

  size = size === undefined ? length : size;
  while (++index < size) {
    var rand = baseRandom(index, lastIndex),
        value = array[rand];

    array[rand] = array[index];
    array[index] = value;
  }
  array.length = size;
  return array;
}

module.exports = shuffleSelf;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

var baseGet = __webpack_require__(14);

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;


/***/ }),
/* 22 */
/***/ (function(module, exports) {

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

module.exports = noop;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

var createRange = __webpack_require__(18);

/**
 * Creates an array of numbers (positive and/or negative) progressing from
 * `start` up to, but not including, `end`. A step of `-1` is used if a negative
 * `start` is specified without an `end` or `step`. If `end` is not specified,
 * it's set to `start` with `start` then set to `0`.
 *
 * **Note:** JavaScript follows the IEEE-754 standard for resolving
 * floating-point values which can produce unexpected results.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {number} [start=0] The start of the range.
 * @param {number} end The end of the range.
 * @param {number} [step=1] The value to increment or decrement by.
 * @returns {Array} Returns the range of numbers.
 * @see _.inRange, _.rangeRight
 * @example
 *
 * _.range(4);
 * // => [0, 1, 2, 3]
 *
 * _.range(-4);
 * // => [0, -1, -2, -3]
 *
 * _.range(1, 5);
 * // => [1, 2, 3, 4]
 *
 * _.range(0, 20, 5);
 * // => [0, 5, 10, 15]
 *
 * _.range(0, -4, -1);
 * // => [0, -1, -2, -3]
 *
 * _.range(1, 4, 0);
 * // => [1, 1, 1]
 *
 * _.range(0);
 * // => []
 */
var range = createRange();

module.exports = range;


/***/ }),
/* 24 */
/***/ (function(module, exports) {

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;


/***/ }),
/* 25 */
/***/ (function(module, exports) {

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;


/***/ }),
/* 26 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__impl_buffers__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__csp_operations__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__impl_channels__ = __webpack_require__(0);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "CLOSED", function() { return __WEBPACK_IMPORTED_MODULE_2__impl_channels__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__impl_timers__ = __webpack_require__(9);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "timeout", function() { return __WEBPACK_IMPORTED_MODULE_3__impl_timers__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__impl_results__ = __webpack_require__(6);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "DEFAULT", function() { return __WEBPACK_IMPORTED_MODULE_4__impl_results__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__impl_process__ = __webpack_require__(3);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "put", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "take", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "offer", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["c"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "poll", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["d"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "sleep", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["e"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "alts", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["f"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "putAsync", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["g"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "takeAsync", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["h"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "NO_VALUE", function() { return __WEBPACK_IMPORTED_MODULE_5__impl_process__["i"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__csp_core__ = __webpack_require__(5);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "spawn", function() { return __WEBPACK_IMPORTED_MODULE_6__csp_core__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "go", function() { return __WEBPACK_IMPORTED_MODULE_6__csp_core__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "chan", function() { return __WEBPACK_IMPORTED_MODULE_6__csp_core__["c"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "promiseChan", function() { return __WEBPACK_IMPORTED_MODULE_6__csp_core__["d"]; });



const operations = {
  mapFrom: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["a" /* mapFrom */],
  mapInto: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["b" /* mapInto */],
  filterFrom: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["c" /* filterFrom */],
  filterInto: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["d" /* filterInto */],
  removeFrom: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["e" /* removeFrom */],
  removeInto: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["f" /* removeInto */],
  mapcatFrom: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["g" /* mapcatFrom */],
  mapcatInto: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["h" /* mapcatInto */],
  pipe: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["i" /* pipe */],
  split: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["j" /* split */],
  reduce: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["k" /* reduce */],
  onto: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["l" /* onto */],
  fromColl: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["m" /* fromColl */],
  map: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["n" /* map */],
  merge: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["o" /* merge */],
  into: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["p" /* into */],
  unique: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["q" /* unique */],
  partitionBy: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["r" /* partitionBy */],
  partition: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["s" /* partition */],
  mult: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["t" /* mult */],
  mix: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["u" /* mix */],
  pub: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["v" /* pub */],
  pipeline: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["w" /* pipeline */],
  pipelineAsync: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["x" /* pipelineAsync */],
  take: __WEBPACK_IMPORTED_MODULE_1__csp_operations__["y" /* take */]
};
/* harmony export (immutable) */ __webpack_exports__["operations"] = operations;

const buffers = { fixed: __WEBPACK_IMPORTED_MODULE_0__impl_buffers__["a" /* fixed */], dropping: __WEBPACK_IMPORTED_MODULE_0__impl_buffers__["b" /* dropping */], sliding: __WEBPACK_IMPORTED_MODULE_0__impl_buffers__["c" /* sliding */], promise: __WEBPACK_IMPORTED_MODULE_0__impl_buffers__["d" /* promise */] };
/* harmony export (immutable) */ __webpack_exports__["buffers"] = buffers;







/***/ })
/******/ ]);
});