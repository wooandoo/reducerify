import { describe, expect, test } from 'vitest';
import { forState } from './index';
import type { ActionWithPayload } from './types';

// Define test types
type CounterState = { count: number };
type TodoState = { todos: Todo[]; new_todo: Todo };
type Todo = { name: string; is_closed: boolean };

describe('createReducer', () => {
  test('should create a reducer and action creators', () => {
    const { reducer, actions } = forState<CounterState>().createReducer({
      increment: (state) => ({ count: state.count + 1 }),
      decrement: (state) => ({ count: state.count - 1 }),
      add: (state, action: ActionWithPayload<number>) => ({ count: state.count + action.payload }),
    });

    // Check that the reducer and actions exist
    expect(reducer).toBeDefined();
    expect(actions).toBeDefined();
    expect(typeof reducer).toBe('function');
    expect(typeof actions.increment).toBe('function');
    expect(typeof actions.decrement).toBe('function');
    expect(typeof actions.add).toBe('function');
  });

  test('should handle actions without payload', () => {
    const { reducer, actions } = forState<CounterState>().createReducer({
      increment: (state) => ({ count: state.count + 1 }),
      decrement: (state) => ({ count: state.count - 1 }),
    });

    // Initial state
    const initialState: CounterState = { count: 0 };

    // Test increment
    const incrementAction = actions.increment();
    expect(incrementAction).toEqual({ type: 'increment' });

    const stateAfterIncrement = reducer(initialState, incrementAction);
    expect(stateAfterIncrement).toEqual({ count: 1 });

    // Test decrement
    const decrementAction = actions.decrement();
    expect(decrementAction).toEqual({ type: 'decrement' });

    const stateAfterDecrement = reducer(stateAfterIncrement, decrementAction);
    expect(stateAfterDecrement).toEqual({ count: 0 });
  });

  test('should handle actions with payload', () => {
    const { reducer, actions } = forState<CounterState>().createReducer({
      add: (state, action: ActionWithPayload<number>) => ({ count: state.count + action.payload }),
      set: (state, action: ActionWithPayload<number>) => ({ count: action.payload }),
    });

    // Initial state
    const initialState: CounterState = { count: 0 };

    // Test add
    const addAction = actions.add(5);
    expect(addAction).toEqual({ type: 'add', payload: 5 });

    const stateAfterAdd = reducer(initialState, addAction);
    expect(stateAfterAdd).toEqual({ count: 5 });

    // Test set
    const setAction = actions.set(10);
    expect(setAction).toEqual({ type: 'set', payload: 10 });

    const stateAfterSet = reducer(stateAfterAdd, setAction);
    expect(stateAfterSet).toEqual({ count: 10 });
  });

  test('should ignore unknown action types', () => {
    const { reducer } = forState<CounterState>().createReducer({
      increment: (state) => ({ count: state.count + 1 }),
    });

    // Initial state
    const initialState: CounterState = { count: 0 };

    // Test with unknown action type
    const unknownAction = { type: 'unknown' };
    const stateAfterUnknown = reducer(initialState, unknownAction);

    // State should remain unchanged
    expect(stateAfterUnknown).toBe(initialState);
  });

  test('should handle complex state and actions', () => {
    const { reducer, actions } = forState<TodoState>().createReducer({
      update_name: (state, action: ActionWithPayload<{ name: string }>) => ({
        todos: state.todos,
        new_todo: {
          ...state.new_todo,
          name: action.payload.name,
        },
      }),
      save: (state) => ({
        todos: [...state.todos, state.new_todo],
        new_todo: { name: '', is_closed: false },
      }),
      close: (state, action: ActionWithPayload<{ todo_index: number }>) => ({
        todos: [
          ...state.todos.slice(0, action.payload.todo_index),
          {
            ...state.todos[action.payload.todo_index],
            is_closed: true,
          } as Todo,
          ...state.todos.slice(action.payload.todo_index + 1),
        ],
        new_todo: state.new_todo,
      }),
    });

    // Initial state
    const initialState: TodoState = {
      todos: [],
      new_todo: { name: '', is_closed: false },
    };

    // Test update_name
    const updateNameAction = actions.update_name({ name: 'Buy groceries' });
    const stateAfterUpdateName = reducer(initialState, updateNameAction);
    expect(stateAfterUpdateName).toEqual({
      todos: [],
      new_todo: { name: 'Buy groceries', is_closed: false },
    });

    // Test save
    const saveAction = actions.save();
    const stateAfterSave = reducer(stateAfterUpdateName, saveAction);
    expect(stateAfterSave).toEqual({
      todos: [{ name: 'Buy groceries', is_closed: false }],
      new_todo: { name: '', is_closed: false },
    });

    // Test update_name again
    const updateNameAction2 = actions.update_name({ name: 'Clean house' });
    const stateAfterUpdateName2 = reducer(stateAfterSave, updateNameAction2);
    expect(stateAfterUpdateName2).toEqual({
      todos: [{ name: 'Buy groceries', is_closed: false }],
      new_todo: { name: 'Clean house', is_closed: false },
    });

    // Test save again
    const saveAction2 = actions.save();
    const stateAfterSave2 = reducer(stateAfterUpdateName2, saveAction2);
    expect(stateAfterSave2).toEqual({
      todos: [
        { name: 'Buy groceries', is_closed: false },
        { name: 'Clean house', is_closed: false },
      ],
      new_todo: { name: '', is_closed: false },
    });

    // Test close
    const closeAction = actions.close({ todo_index: 0 });
    const stateAfterClose = reducer(stateAfterSave2, closeAction);
    expect(stateAfterClose).toEqual({
      todos: [
        { name: 'Buy groceries', is_closed: true },
        { name: 'Clean house', is_closed: false },
      ],
      new_todo: { name: '', is_closed: false },
    });
  });
});
