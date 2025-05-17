import type { ActionWithPayload } from '../src';
import { forState } from '../src/immer';

type CounterState = { count: number };

const { reducer: counterReducer, actions } = forState<{ count: number }>().createImmerReducer({
  increment: (state) => {
    state.count += 1;
  },

  add: (state, action: ActionWithPayload<number>) => {
    state.count += action.payload;
  },

  complex_op: (state, action: ActionWithPayload<{ a: number; b: string }>) => {
    state.count += action.payload.a + action.payload.b.length;
  },
});

export const { increment, add, complex_op } = actions;

console.log('=== --------------------------------------------');
console.log('=== COUNTER WITH IMMER EXAMPLE');

let state: CounterState = { count: 0 };

state = counterReducer(state, increment());
console.log('-----------------');
console.log(state);

state = counterReducer(state, add(3));
console.log('-----------------');
console.log(state);

state = counterReducer(state, complex_op({ a: 3, b: 'hello world' }));
console.log('-----------------');
console.log(state);
