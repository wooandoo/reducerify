# Reducerify

Reducerify is a lightweight TypeScript library that simplifies the creation of reducers with full type inference and provides advanced state modeling with tagged unions. It helps you build type-safe reducers, automatically generates action creators, and enables pattern matching for discriminated unions.

## Features

### Reducer Creation
- **Fully typed reducers**: Get complete TypeScript type inference for your state and actions
- **Automatic action creators**: Generated action creators with proper payload typing
- **Immutable by design**: Encourages functional and declarative programming patterns
- **Support for actions with and without payload**: Flexible action handling
- **Immer integration**: Optional support for mutable-style updates with Immer

### Tagged Unions (New!)
- **Type-safe discriminated unions**: Create tagged enums with full TypeScript inference
- **Pattern matching**: Exhaustive and partial pattern matching with `matchAll` and `matchSome`
- **Runtime validation**: Built-in Zod schema validation
- **Type guards**: Factory for creating type-safe narrowing functions
- **Zero boilerplate**: Automatic constructor generation

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

### Optional Dependencies

- **Immer** (optional): For mutable-style reducer updates
  ```bash
  pnpm install immer
  ```

- **Zod** (optional): Required for tagged unions with runtime validation
  ```bash
  pnpm install zod
  ```

## Table of Contents

- [Reducers](#reducers)
  - [Pure Functional Way](#pure-functional-way)
  - [Immer Way](#immer-way)
- [Tagged Unions](#tagged-unions)
  - [Basic Usage](#basic-usage)
  - [Pattern Matching](#pattern-matching)
  - [Type Guards](#type-guards)
  - [Runtime Validation](#runtime-validation)
- [API Reference](#api-reference)

---

## Reducers

### Pure Functional Way

#### 1. Define your state type

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

#### 2. Create a reducer with handlers

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

#### 3. Use the reducer and actions

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

### Immer Way

The Immer integration allows you to write mutable-style updates that are automatically converted to immutable operations.

```typescript
import { forState, type ActionWithPayload } from "reducerify/reducer/immer";

const { reducer, actions } = forState<TodoState>().createImmerReducer({
  updateName: (state, action: ActionWithPayload<{ name: string }>) => {
    state.newTodo.name = action.payload.name;
  },

  save: (state) => {
    state.todos.push(state.newTodo);
    state.newTodo = { name: '', isClosed: false };
  },

  close: (state, action: ActionWithPayload<{ todoIndex: number }>) => {
    state.todos[action.payload.todoIndex].isClosed = true;
  },
});
```

---

## Tagged Unions

Tagged unions (also known as discriminated unions or sum types) provide a type-safe way to model data that can be one of several variants. Reducerify's `taggedEnum` function creates fully typed discriminated unions with built-in pattern matching and validation.

### Basic Usage

#### 1. Define a tagged enum

```typescript
import { taggedEnum } from "reducerify";
import { z } from "zod";

const RemoteData = taggedEnum({
  Loading: {},
  Success: { data: z.number() },
  Failure: { reason: z.string() }
});
```

#### 2. Create instances

```typescript
const loading = RemoteData.Loading();
const success = RemoteData.Success({ data: 42 });
const failure = RemoteData.Failure({ reason: "Network error" });
```

#### 3. Extract types

```typescript
type RemoteDataTypes = typeof RemoteData.Types;

type LoadingType = RemoteDataTypes["Loading"];
// { _tag: "Loading" }

type SuccessType = RemoteDataTypes["Success"];
// { _tag: "Success", data: number }

type FailureType = RemoteDataTypes["Failure"];
// { _tag: "Failure", reason: string }

type RemoteDataAll = RemoteDataTypes["All"];
// LoadingType | SuccessType | FailureType
```

### Pattern Matching

#### Exhaustive matching with `matchAll`

Handle all possible cases with compile-time exhaustiveness checking:

```typescript
function handleRemoteData(data: RemoteDataTypes["All"]): string {
  return RemoteData.matchAll(data, {
    Loading: () => "Loading...",
    Success: ({ data }) => `Got: ${data}`,
    Failure: ({ reason }) => `Error: ${reason}`
  });
}

console.log(handleRemoteData(loading));  // "Loading..."
console.log(handleRemoteData(success));  // "Got: 42"
console.log(handleRemoteData(failure));  // "Error: Network error"
```

#### Partial matching with `matchSome`

Handle only specific cases with an optional default handler:

```typescript
// With _default handler
const result1 = RemoteData.matchSome(success, {
  Success: ({ data }) => `Got: ${data}`,
  _default: () => "Other case"
});

// Without _default handler - returns undefined for unhandled cases
const result2 = RemoteData.matchSome(success, {
  Success: ({ data }) => `Got: ${data}`
}); // "Got: 42"

const result3 = RemoteData.matchSome(loading, {
  Success: ({ data }) => `Got: ${data}`
}); // undefined
```

### Type Guards

Use the `is()` factory to create type guards for safe type narrowing:

```typescript
const value: RemoteDataTypes["All"] = getRemoteData();

if (RemoteData.is("Success")(value)) {
  // TypeScript knows value is SuccessType
  console.log(value.data); // Type-safe access
}
```

### Runtime Validation

The generated Zod schema enables runtime validation of external data:

```typescript
// Validate external data
const external = { _tag: "Success", data: 42 };
const validated = RemoteData.schema.parse(external);

// Safe parsing without throwing
const result = RemoteData.schema.safeParse(external);
if (result.success) {
  console.log(result.data);
}
```

### Real-World Example: API Response

```typescript
import { taggedEnum } from "reducerify";
import { z } from "zod";

const ApiResponse = taggedEnum({
  Idle: {},
  Loading: {},
  Success: {
    data: z.object({
      id: z.number(),
      username: z.string(),
      email: z.string().email()
    }),
    fetchedAt: z.date()
  },
  Error: {
    code: z.enum(["NETWORK_ERROR", "NOT_FOUND", "UNAUTHORIZED"]),
    message: z.string()
  }
});

type ApiState = typeof ApiResponse.Types.All;

// Usage in a component or function
function renderApiState(state: ApiState): string {
  return ApiResponse.matchAll(state, {
    Idle: () => "Ready to fetch",
    Loading: () => "Fetching data...",
    Success: ({ data, fetchedAt }) =>
      `User ${data.username} loaded at ${fetchedAt.toISOString()}`,
    Error: ({ code, message }) => `[${code}] ${message}`
  });
}

// Type-safe filtering
const successStates = states.filter(ApiResponse.is("Success"));

// Handle only errors
const errorMessage = ApiResponse.matchSome(state, {
  Error: ({ code, message }) => `${code}: ${message}`
});
```

---

## Advanced Usage

### Combining Reducers with Tagged Unions

You can combine reducers with tagged unions to create powerful state management patterns:

```typescript
import { forState, taggedEnum, type ActionWithPayload } from "reducerify";
import { z } from "zod";

// Define a tagged union for your state
const LoadingState = taggedEnum({
  Idle: {},
  Loading: {},
  Success: { data: z.array(z.string()) },
  Error: { message: z.string() }
});

type AppState = {
  items: typeof LoadingState.Types.All;
  selectedIndex: number | null;
};

// Create a reducer that works with the tagged union
const { reducer, actions } = forState<AppState>().createReducer({
  startLoading: (state) => ({
    ...state,
    items: LoadingState.Loading()
  }),

  loadSuccess: (state, action: ActionWithPayload<{ data: string[] }>) => ({
    ...state,
    items: LoadingState.Success({ data: action.payload.data })
  }),

  loadError: (state, action: ActionWithPayload<{ message: string }>) => ({
    ...state,
    items: LoadingState.Error({ message: action.payload.message })
  }),

  selectItem: (state, action: ActionWithPayload<{ index: number }>) => ({
    ...state,
    selectedIndex: action.payload.index
  })
});

// Usage
let state: AppState = {
  items: LoadingState.Idle(),
  selectedIndex: null
};

state = reducer(state, actions.startLoading());
state = reducer(state, actions.loadSuccess({ data: ["item1", "item2"] }));

// Pattern match on the state
const itemsDisplay = LoadingState.matchAll(state.items, {
  Idle: () => "Not loaded yet",
  Loading: () => "Loading...",
  Success: ({ data }) => `Loaded ${data.length} items`,
  Error: ({ message }) => `Error: ${message}`
});
```

### Type-Safe State Machines

Tagged unions are perfect for implementing type-safe state machines:

```typescript
const TrafficLight = taggedEnum({
  Red: { duration: z.number() },
  Yellow: { duration: z.number() },
  Green: { duration: z.number() }
});

type TrafficLightState = typeof TrafficLight.Types.All;

function transition(state: TrafficLightState): TrafficLightState {
  return TrafficLight.matchAll(state, {
    Red: () => TrafficLight.Green({ duration: 30 }),
    Yellow: () => TrafficLight.Red({ duration: 45 }),
    Green: () => TrafficLight.Yellow({ duration: 5 })
  });
}

let light = TrafficLight.Red({ duration: 45 });
light = transition(light); // Green
light = transition(light); // Yellow
light = transition(light); // Red
```

### Nested Tagged Unions

You can nest tagged unions for complex hierarchical state:

```typescript
const ServerError = taggedEnum({
  NetworkError: { url: z.string() },
  TimeoutError: { duration: z.number() },
  ValidationError: { fields: z.array(z.string()) }
});

const ApiResult = taggedEnum({
  Pending: {},
  Success: { data: z.any() },
  Failure: { error: z.any() } // Can contain ServerError instances
});

// Usage
const networkError = ServerError.NetworkError({ url: "/api/users" });
const result = ApiResult.Failure({ error: networkError });

// Nested pattern matching
const message = ApiResult.matchAll(result, {
  Pending: () => "Waiting...",
  Success: ({ data }) => `Got data: ${JSON.stringify(data)}`,
  Failure: ({ error }) => {
    if (error._tag) {
      return ServerError.matchAll(error, {
        NetworkError: ({ url }) => `Network error at ${url}`,
        TimeoutError: ({ duration }) => `Timeout after ${duration}ms`,
        ValidationError: ({ fields }) => `Validation error: ${fields.join(", ")}`
      });
    }
    return "Unknown error";
  }
});
```

---

## Project Structure

The library is organized into two main modules:

```
src/
├── reducer/
│   ├── pure.ts          # Pure functional reducer creation
│   ├── immer.ts         # Immer-based reducer creation
│   ├── types.ts         # Type definitions for reducers
│   ├── pure.test.ts     # Tests for pure reducers
│   └── immer.test.ts    # Tests for Immer reducers
├── state/
│   ├── tagged-types.ts      # Tagged union implementation
│   └── tagged-types.test.ts # Tests for tagged unions
└── index.ts             # Main entry point
```

### Module Exports

- **Main export** (`reducerify`):
  - Reducer utilities: `forState`, `ActionWithPayload`, `ActionWithoutPayload`, etc.
  - Tagged unions: `taggedEnum`, type utilities, etc.

- **Immer export** (`reducerify/reducer/immer`):
  - Immer-specific: `forState` with `createImmerReducer`

---

## API Reference

### Reducer API

#### `forState<TState>()`

Creates a reducer factory for a specific state type.

**Returns:** An object with `createReducer` method.

#### `createReducer(handlers)`

Creates a reducer and action creators from handler functions.

**Parameters:**
- `handlers`: Map of action types to handler functions

**Returns:**
- `reducer`: The reducer function that handles state updates
- `actions`: Automatically generated action creators

#### `createImmerReducer(handlers)`

Creates a reducer using Immer for mutable-style updates (available from `reducerify/reducer/immer`).

**Parameters:**
- `handlers`: Map of action types to handler functions (can mutate state directly)

**Returns:**
- `reducer`: The reducer function that handles state updates
- `actions`: Automatically generated action creators

#### Types

- `ActionWithoutPayload`: Action without additional data
- `ActionWithPayload<TPayload>`: Action with typed payload data
- `ReducerHandlers<TState>`: Map of action types to handler functions

### Tagged Union API

#### `taggedEnum<TDefinition>(definition)`

Creates a tagged enum (discriminated union) with constructors and pattern matching.

**Parameters:**
- `definition`: Object mapping tag names to their field definitions
  - Empty object `{}` for tags without payload
  - Object of Zod schemas for tags with fields
  - Direct Zod schema for single-field tags

**Returns:** An object containing:
- Constructor functions for each tag (same name as the tag)
- `schema`: Zod discriminated union schema for validation
- `matchAll`: Exhaustive pattern matching function
- `matchSome`: Partial pattern matching function
- `is`: Type guard factory
- `Types`: Type utility for extracting variant types

#### `matchAll<TReturnType>(value, cases)`

Performs exhaustive pattern matching on a tagged enum value.

**Parameters:**
- `value`: The tagged enum instance to match
- `cases`: Object with handlers for all possible tags

**Returns:** The result of the matching handler

#### `matchSome<TReturnType>(value, cases)`

Performs partial pattern matching on a tagged enum value.

**Parameters:**
- `value`: The tagged enum instance to match
- `cases`: Object with handlers for specific tags, plus optional `_default`

**Returns:** The result of the matching handler, or `undefined` if no handler matches

#### `is<TTag>(tag)`

Creates a type guard for a specific tag.

**Parameters:**
- `tag`: The tag name to check for

**Returns:** A type guard function `(value) => boolean`

#### Types

- `TaggedEnumDefinition`: Type for the definition object
- `InferTaggedEnum<TDefinition>`: Infers the union type from a definition
- `InferTaggedTypes<TSchema>`: Infers individual variant types from a schema
- `Constructors<TDefinition>`: Type for the constructor functions
- `MatchAllCases<TDefinition, TReturnType>`: Type for exhaustive match cases
- `MatchSomeCases<TDefinition, TReturnType>`: Type for partial match cases

## License

MIT © Frédéric Mascaro

See [LICENSE](LICENSE) for more information.
