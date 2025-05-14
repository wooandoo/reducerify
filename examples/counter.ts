import { type ActionWithPayload, forState } from '../dist/index.js';

const { reducer: counterReducer, actions } = forState<{ count: number }>().createReducer({
  increment: (state) => ({ count: state.count + 1 }),
  add: (state, action: ActionWithPayload<number>) => ({ count: state.count + action.payload }),
  complex_op: (state, action: ActionWithPayload<{ a: number; b: string }>) => state,
});

export const { increment, add, complex_op } = actions;

// Usage example:
// - initial state when state is undefined
// - provide the correct action object
const nextState = counterReducer({ count: 0 }, add(1));
console.log(nextState); // { count: 1 }

counterReducer({ count: 2 }, add(1));
