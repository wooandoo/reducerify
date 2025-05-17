import { type ActionWithPayload, forState } from '../src/index';

type AuthenticationState = AnonymousState | AuthenticatedState;

type AnonymousState = {
  is_authenticated: false;
};

type AuthenticatedState = {
  is_authenticated: true;
  user: { name: string };
};

const { reducer, actions } = forState<AuthenticationState>().createReducer({
  signed_in: (state, action: ActionWithPayload<{ user: { name: string } }>) => {
    return {
      is_authenticated: true,
      user: action.payload.user,
    };
  },

  signed_out: (state) => {
    return {
      is_authenticated: false,
    };
  },
});

console.log('=== --------------------------------------------');
console.log('=== AUTHENTICATION EXAMPLE');

let state: AuthenticationState = { is_authenticated: false };
console.log('-----------------');
console.log(state);

state = reducer(state, actions.signed_in({ user: { name: 'John' } }));
console.log('-----------------');
console.log(state);

state = reducer(state, actions.signed_out());
console.log('-----------------');
console.log(state);
