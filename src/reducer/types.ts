export type ActionWithoutPayload = {
  type: string;
};

export type ActionWithPayload<TPayload> = {
  type: string;
  payload: TPayload;
};

// Definition of the generated action creators map: infers payload types
export type ActionCreatorMap<THandlers extends Record<string, any>, TState> = {
  [TActionKey in keyof THandlers]: ExtractHandlerType<THandlers[TActionKey]> extends 'no-payload'
    ? () => ActionWithoutPayload
    : (payload: ExtractHandlerType<THandlers[TActionKey]>) => ActionWithPayload<ExtractHandlerType<THandlers[TActionKey]>>;
};

export type ExtractHandlerType<THandler> = THandler extends (state: any) => any
  ? 'no-payload'
  : THandler extends (state: any, action: ActionWithPayload<infer TPayloadType>) => any
    ? TPayloadType
    : never;

// Union type of all possible action objects, with correct payload typings
export type ActionUnion<THandlers extends Record<string, any>, TState> = {
  [TActionKey in keyof THandlers]: ExtractHandlerType<THandlers[TActionKey]> extends 'no-payload'
    ? ActionWithoutPayload
    : ActionWithPayload<ExtractHandlerType<THandlers[TActionKey]>>;
}[keyof THandlers];
