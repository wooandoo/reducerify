import { type ActionWithPayload, forState } from '../src/index';

type CounterState = { count: number };

const { reducer: counterReducer, actions } = forState<{ count: number }>().createReducer({
  increment: (state) => ({ count: state.count + 1 }),

  add: (state, action: ActionWithPayload<number>) => ({ count: state.count + action.payload }),

  complex_op: (state, action: ActionWithPayload<{ a: number; b: string }>) => ({ count: state.count + action.payload.a + action.payload.b.length }),
});

export const { increment, add, complex_op } = actions;

console.log('=== --------------------------------------------');
console.log('=== COUNTER EXAMPLE');

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
