// utils/createReducer.ts

import { type Immutable, produce } from 'immer';
import type { ActionCreatorMap, ActionUnion, ActionWithPayload } from './types';

type ImmerHandler<TState> = (state: TState, action: ActionWithPayload<any>) => void;

// 2. Definition of the handlers map: either a state-only reducer or state+action reducer
export type ImmerReducerHandlers<TState> = {
  [TActionType in string]: ImmerHandler<TState>;
};

type CreateImmerReducerResult<THandlers extends ImmerReducerHandlers<TState>, TState> = {
  reducer: (state: Immutable<TState>, action: ActionUnion<THandlers, TState>) => TState;
  actions: ActionCreatorMap<THandlers, TState>;
};

// 5. Implementation of createReducer that infers everything
export function forState<TState>() {
  return {
    createImmerReducer: <THandlers extends ImmerReducerHandlers<TState>>(handlers: THandlers): CreateImmerReducerResult<THandlers, TState> => {
      const actions = {} as ActionCreatorMap<THandlers, TState>;

      // Generate action creators based on handlerFunction.length
      for (const actionType in handlers) {
        // biome-ignore lint/style/noNonNullAssertion: handlers has necessary a handlerFunction for the key actionType
        const handlerFunction = handlers[actionType]!;

        if (handlerFunction.length > 1) {
          // Action with payload
          actions[actionType as keyof THandlers] = ((payload: any) => ({
            type: actionType,
            payload,
          })) as any;
        } else {
          // Action without payload
          actions[actionType as keyof THandlers] = (() => ({
            type: actionType,
          })) as any;
        }
      }

      // Reducer implementation remains mostly unchanged
      const reducer = (state: TState, action: ActionUnion<THandlers, TState>): TState => {
        // Check if the action type exists in the handlers
        if (!(action.type in handlers)) return state;

        // biome-ignore lint/style/noNonNullAssertion: we previously verified that action.type is a key of handlers
        const handler = handlers[action.type as keyof THandlers]!;

        // If handler expects an action param
        if (handler.length > 1) {
          return (handler as (state: TState, action: ActionWithPayload<any>) => TState)(state, action as ActionWithPayload<any>);
        }

        // For handlers without payload, we need to ensure proper typing
        return (handler as (state: TState, action?: any) => TState)(state);
      };

      return { reducer: produce(reducer), actions };
    },
  };
}
