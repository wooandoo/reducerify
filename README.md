# Reducerify

Reducerify is a lightweight TypeScript library that simplifies the creation of reducers with full type inference. It helps you build type-safe reducers and automatically generates action creators, making state management more predictable and maintainable.

## Features

- **Fully typed reducers**: Get complete TypeScript type inference for your state and actions
- **Automatic action creators**: Generated action creators with proper payload typing
- **Immutable by design**: Encourages functional and declarative programming patterns
- **Zero dependencies**: Lightweight with no external dependencies
- **Support for actions with and without payload**: Flexible action handling

## Installation

```bash
# Using pnpm
pnpm install reducerify

# Using bun
bun add reducerify

# Using npm
npm install reducerify

# Using yarn
yarn add reducerify
```

## Quick Start

### 1. Define your state type

```typescript
type TodoState = { 
  todos: Todo[]; 
  newTodo: Todo 
};

type Todo = { 
  name: string; 
  isClosed: boolean 
};
```

### 2. Create a reducer with handlers

```typescript
import { forState, type ActionWithPayload } from "reducerify";

const { reducer, actions } = forState<TodoState>().createReducer({
  // Action with payload
  updateName: (state, action: ActionWithPayload<{ name: string }>) => {
    return {
      ...state,
      newTodo: {
        ...state.newTodo,
        name: action.payload.name,
      },
    };
  },
  
  // Action without payload
  save: (state) => {
    return {
      todos: [...state.todos, state.newTodo],
      newTodo: { name: '', isClosed: false },
    };
  },
  
  // Another action with payload
  close: (state, action: ActionWithPayload<{ todoIndex: number }>) => {
    return {
      ...state,
      todos: state.todos.map((todo, index) => 
        index === action.payload.todoIndex 
          ? { ...todo, isClosed: true }
          : todo
      ),
    };
  },
});
```

### 3. Use the reducer and actions

```typescript
// Initial state
let state: TodoState = { 
  todos: [], 
  newTodo: { name: '', isClosed: false } 
};

// Dispatch actions
state = reducer(state, actions.updateName({ name: 'Learn Reducerify' }));
state = reducer(state, actions.save());
state = reducer(state, actions.close({ todoIndex: 0 }));
```

## API Reference

### `forState<TState>()`

Creates a reducer factory for a specific state type.

### `createReducer(handlers)`

Creates a reducer and action creators from handler functions.

Returns an object with:
- `reducer`: The reducer function that handles state updates
- `actions`: Automatically generated action creators

### Types

- `ActionWithoutPayload`: Action without additional data
- `ActionWithPayload<TPayload>`: Action with typed payload data
- `ReducerHandlers<TState>`: Map of action types to handler functions

## License

MIT © Frédéric Mascaro

See [LICENSE](LICENSE) for more information.
