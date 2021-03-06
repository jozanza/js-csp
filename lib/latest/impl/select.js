import has from 'lodash/get';
import range from 'lodash/range';
import shuffle from 'lodash/_arrayShuffle';
import { Box } from './boxes';
import { Channel } from './channels';
import { AltHandler } from './handlers';
import { AltResult, DEFAULT } from './results';

// TODO: Accept a priority function or something
export function doAlts( // eslint-disable-line
operations, callback, options) {
  if (operations.length === 0) {
    throw new Error('Empty alt list');
  }

  const flag = new Box(true);
  const indexes = shuffle(range(operations.length));
  const hasPriority = !!(options && options.priority);
  let result;

  for (let i = 0; i < operations.length; i += 1) {
    const operation = operations[hasPriority ? i : indexes[i]];
    let ch;

    if (operation instanceof Channel) {
      ch = operation;
      result = ch.take(new AltHandler(flag, value => callback(new AltResult(value, ch))));
    } else {
      ch = operation[0];
      result = ch.put(operation[1], new AltHandler(flag, value => callback(new AltResult(value, ch))));
    }

    if (result) {
      callback(new AltResult(result.value, ch));
      break;
    }
  }

  if (!result && has(options, 'default') && flag.value) {
    flag.value = false;
    callback(new AltResult(options.default, DEFAULT));
  }
}