import { forState, type ActionWithPayload } from '../dist/index.js';

type TodoState = { todos: Todo[]; new_todo: Todo };
type Todo = { name: string; is_closed: boolean };

const { reducer: todo_reducer, actions: todo_actions } = forState<TodoState>().createReducer({
  update_name: (state, action: ActionWithPayload<{ name: string }>) => {
    return {
      todos: state.todos,
      new_todo: {
        ...state.new_todo,
        name: action.payload.name,
      },
    };
  },
  save: (state) => {
    return {
      todos: [...state.todos, state.new_todo],
      new_todo: { name: '', is_closed: false },
    };
  },
  close: (state, action: ActionWithPayload<{ todo_index: number }>) => {
    return {
      todos: [
        ...state.todos.slice(0, action.payload.todo_index),
        {
          ...state.todos[action.payload.todo_index],
          is_closed: true,
        } as Todo,
        ...state.todos.slice(action.payload.todo_index + 1),
      ],
      new_todo: state.new_todo,
    };
  },
});

let state: TodoState = { todos: [], new_todo: { name: '', is_closed: false } };
console.log('-----------------');
console.log(state);

state = todo_reducer(state, todo_actions.update_name({ name: 'do something' }));
console.log('-----------------');
console.log(state);

state = todo_reducer(state, todo_actions.save());
console.log('-----------------');
console.log(state);

state = todo_reducer(state, todo_actions.update_name({ name: 'do other thing' }));
console.log('-----------------');
console.log(state);

state = todo_reducer(state, todo_actions.save());
console.log('-----------------');
console.log(state);

state = todo_reducer(state, todo_actions.close({ todo_index: 1 }));
console.log('-----------------');
console.log(state);
