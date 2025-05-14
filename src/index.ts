// utils/createReducer.ts

import { type Immutable, produce } from 'immer';

export type ActionWithoutPayload = {
  type: string;
};

export type ActionWithPayload<TPayload> = {
  type: string;
  payload: TPayload;
};

type Handler<TState> = (state: TState, action: ActionWithPayload<any>) => TState;
type ImmerHandler<TState> = (state: TState, action: ActionWithPayload<any>) => void;

// 2. Definition of the handlers map: either a state-only reducer or state+action reducer
export type ReducerHandlers<TState> = {
  [TActionType in string]: Handler<TState>;
};
export type ImmerReducerHandlers<TState> = {
  [TActionType in string]: ImmerHandler<TState>;
};

type ExtractHandlerType<THandler> = THandler extends (state: any) => any
  ? 'no-payload'
  : THandler extends (state: any, action: ActionWithPayload<infer TPayloadType>) => any
    ? TPayloadType
    : never;

// 3. Definition of the generated action creators map: infers payload types
export type ActionCreatorMap<THandlers extends Record<string, any>, TState> = {
  [TActionKey in keyof THandlers]: ExtractHandlerType<THandlers[TActionKey]> extends 'no-payload'
    ? () => ActionWithoutPayload
    : (payload: ExtractHandlerType<THandlers[TActionKey]>) => ActionWithPayload<ExtractHandlerType<THandlers[TActionKey]>>;
};

// 4. Union type of all possible action objects, with correct payload typings
export type ActionUnion<THandlers extends Record<string, any>, TState> = {
  [TActionKey in keyof THandlers]: ExtractHandlerType<THandlers[TActionKey]> extends 'no-payload'
    ? ActionWithoutPayload
    : ActionWithPayload<ExtractHandlerType<THandlers[TActionKey]>>;
}[keyof THandlers];

type CreateReducerResult<THandlers extends ReducerHandlers<TState>, TState> = {
  reducer: (state: TState, action: ActionUnion<THandlers, TState>) => TState;
  actions: ActionCreatorMap<THandlers, TState>;
};

type CreateImmerReducerResult<THandlers extends ImmerReducerHandlers<TState>, TState> = {
  reducer: (state: Immutable<TState>, action: ActionUnion<THandlers, TState>) => TState;
  actions: ActionCreatorMap<THandlers, TState>;
};

// 5. Implementation of createReducer that infers everything
export function forState<TState>() {
  return {
    createReducer: <THandlers extends ReducerHandlers<TState>>(handlers: THandlers): CreateReducerResult<THandlers, TState> => {
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

      return { reducer, actions };
    },

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
