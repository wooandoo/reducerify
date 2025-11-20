import { z } from 'zod';

/**
 * Helper function to detect if a value is already a Zod schema
 *
 * @param value - The value to check
 * @returns True if the value is a Zod schema
 *
 * @example
 * ```ts
 * const schema = z.string();
 * isZodSchema(schema); // true
 * isZodSchema({ name: z.string() }); // false
 * ```
 */
export function isZodSchema(value: any): value is z.ZodTypeAny {
  return value && typeof value === 'object' && '_def' in value;
}

/**
 * Infers the TypeScript type from a tagged case definition
 *
 * @template TDefinition - Either a Zod schema, a record of Zod schemas, or an empty object
 *
 * @example
 * ```ts
 * type Case1 = InferTaggedCase<z.ZodString>; // string
 * type Case2 = InferTaggedCase<{ name: z.ZodString }>; // { name: string }
 * type Case3 = InferTaggedCase<{}>; // {}
 * ```
 */
export type InferTaggedCase<TDefinition> = TDefinition extends z.ZodTypeAny
  ? z.infer<TDefinition>
  : TDefinition extends Record<string, z.ZodTypeAny>
    ? { [TKey in keyof TDefinition]: z.infer<TDefinition[TKey]> }
    : Record<string, never>;

/**
 * Definition structure for a tagged enum
 * Each tag can have fields defined as:
 * - An empty object {} for tags without payload
 * - A Zod schema directly
 * - A record of Zod schemas for multiple fields
 *
 * @example
 * ```ts
 * const definition: TaggedEnumDefinition = {
 *   Loading: {},
 *   Success: { data: z.string() },
 *   Error: z.object({ code: z.number() })
 * };
 * ```
 */
export type TaggedEnumDefinition = Record<string, Record<string, z.ZodTypeAny> | z.ZodTypeAny | Record<string, never>>;

/**
 * Infers the union type of all tagged cases from a definition
 *
 * @template TDefinition - The tagged enum definition
 *
 * @example
 * ```ts
 * type MyEnum = InferTaggedEnum<{
 *   Loading: {},
 *   Success: { data: z.ZodString }
 * }>;
 * // Result: { _tag: "Loading" } | { _tag: "Success", data: string }
 * ```
 */
export type InferTaggedEnum<TDefinition extends TaggedEnumDefinition> = {
  [TTag in keyof TDefinition]: { _tag: TTag } & InferTaggedCase<TDefinition[TTag]>;
}[keyof TDefinition];

/**
 * Maps each tag to its constructor function
 * Tags with empty payload get a nullary constructor
 * Tags with fields get a unary constructor accepting the payload
 *
 * @template TDefinition - The tagged enum definition
 *
 * @example
 * ```ts
 * type Ctors = Constructors<{
 *   Loading: {},
 *   Success: { data: z.ZodString }
 * }>;
 * // Result: {
 * //   Loading: () => { _tag: "Loading" },
 * //   Success: (payload: { data: string }) => { _tag: "Success", data: string }
 * // }
 * ```
 */
export type Constructors<TDefinition extends TaggedEnumDefinition> = {
  [TTag in keyof TDefinition]: Record<string, never> extends InferTaggedCase<TDefinition[TTag]>
    ? () => { _tag: TTag }
    : (payload: InferTaggedCase<TDefinition[TTag]>) => { _tag: TTag } & InferTaggedCase<TDefinition[TTag]>;
};

/**
 * Defines the structure of match cases for exhaustive pattern matching
 * Each case handler receives the payload (if any) and returns TReturnType
 *
 * @template TDefinition - The tagged enum definition
 * @template TReturnType - The return type of all case handlers
 *
 * @example
 * ```ts
 * type Cases = MatchAllCases<
 *   { Loading: {}, Success: { data: z.ZodString } },
 *   string
 * >;
 * // Result: {
 * //   Loading: () => string,
 * //   Success: (payload: { data: string }) => string
 * // }
 * ```
 */
export type MatchAllCases<TDefinition extends TaggedEnumDefinition, TReturnType> = {
  [TTag in keyof TDefinition]: Record<string, never> extends InferTaggedCase<TDefinition[TTag]>
    ? () => TReturnType
    : (payload: InferTaggedCase<TDefinition[TTag]>) => TReturnType;
};

/**
 * Defines the structure for partial match cases
 * Allows defining only some cases with an optional _default handler
 *
 * @template TDefinition - The tagged enum definition
 * @template TReturnType - The return type of all case handlers
 *
 * @example
 * ```ts
 * type SomeCases = MatchSomeCases<
 *   { Loading: {}, Success: { data: z.ZodString }, Error: { message: z.ZodString } },
 *   string
 * >;
 * // You can define:
 * // { Success: (payload) => string, _default: () => string }
 * // Or just: { Success: (payload) => string }
 * ```
 */
export type MatchSomeCases<TDefinition extends TaggedEnumDefinition, TReturnType> = Partial<{
  [TTag in keyof TDefinition]: Record<string, never> extends InferTaggedCase<TDefinition[TTag]>
    ? () => TReturnType
    : (payload: InferTaggedCase<TDefinition[TTag]>) => TReturnType;
}> & {
  _default?: () => TReturnType;
};

/**
 * Helper type to generate an object with all variants as individual types plus an "All" union type
 *
 * @template TSchema - The Zod discriminated union schema
 *
 * @example
 * ```ts
 * const schema = z.discriminatedUnion('_tag', [
 *   z.object({ _tag: z.literal('A'), value: z.number() }),
 *   z.object({ _tag: z.literal('B'), text: z.string() })
 * ]);
 *
 * type Types = InferTaggedTypes<typeof schema>;
 * // Result: {
 * //   A: { _tag: 'A', value: number },
 * //   B: { _tag: 'B', text: string },
 * //   All: { _tag: 'A', value: number } | { _tag: 'B', text: string }
 * // }
 * ```
 */
export type InferTaggedTypes<TSchema extends z.ZodDiscriminatedUnion<any, any>> = {
  [TTag in z.infer<TSchema>['_tag']]: Extract<z.infer<TSchema>, { _tag: TTag }>;
} & {
  All: z.infer<TSchema>;
};

/**
 * Creates a tagged enum (discriminated union) with type-safe constructors, pattern matching, and runtime validation
 *
 * @template TDefinition - The tagged enum definition
 * @param definition - Object mapping tag names to their field definitions
 * @returns An object containing:
 *   - Constructor functions for each tag
 *   - `schema`: Zod schema for validation
 *   - `matchAll`: Exhaustive pattern matching function
 *   - `matchSome`: Partial pattern matching function with optional _default
 *   - `is`: Type guard factory
 *   - `Types`: Type helper for extracting individual variant types
 *
 * @example
 * ```ts
 * const RemoteData = taggedEnum({
 *   Loading: {},
 *   Success: { data: z.number() },
 *   Failure: { reason: z.string() }
 * });
 *
 * // Create instances
 * const loading = RemoteData.Loading();
 * const success = RemoteData.Success({ data: 42 });
 * const failure = RemoteData.Failure({ reason: "Not found" });
 *
 * // Exhaustive pattern matching
 * const message = RemoteData.matchAll(success, {
 *   Loading: () => "Loading...",
 *   Success: ({ data }) => `Got: ${data}`,
 *   Failure: ({ reason }) => `Error: ${reason}`
 * });
 *
 * // Partial pattern matching
 * const result1 = RemoteData.matchSome(success, {
 *   Success: ({ data }) => `Got: ${data}`,
 *   _default: () => "Other case"
 * });
 *
 * const result2 = RemoteData.matchSome(success, {
 *   Success: ({ data }) => `Got: ${data}`
 * }); // Can return undefined for unhandled cases
 *
 * // Type narrowing
 * if (RemoteData.is("Success")(success)) {
 *   console.log(success.data); // TypeScript knows success.data exists
 * }
 *
 * // Validation
 * const external = { _tag: "Success", data: 42 };
 * const validated = RemoteData.schema.parse(external);
 *
 * // Type extraction
 * type SuccessType = typeof RemoteData.Types.Success;
 * type AllTypes = typeof RemoteData.Types.All;
 * ```
 */
export function taggedEnum<TDefinition extends TaggedEnumDefinition>(definition: TDefinition) {
  type Enum = InferTaggedEnum<TDefinition>;

  // Create Zod schemas for each case
  const schemas: Record<string, z.ZodObject<any>> = {};

  for (const [tag, fields] of Object.entries(definition)) {
    let fieldSchema: z.ZodObject<any>;

    if (isZodSchema(fields)) {
      const baseSchema = z.object({ _tag: z.literal(tag) });

      if (fields instanceof z.ZodObject) {
        fieldSchema = baseSchema.merge(fields);
      } else {
        fieldSchema = baseSchema;
      }
    } else if (typeof fields === 'object' && fields !== null && Object.keys(fields).length > 0) {
      const schemaFields: Record<string, z.ZodTypeAny> = {
        _tag: z.literal(tag),
      };

      for (const [key, value] of Object.entries(fields)) {
        schemaFields[key] = value as z.ZodTypeAny;
      }

      fieldSchema = z.object(schemaFields);
    } else {
      fieldSchema = z.object({ _tag: z.literal(tag) });
    }

    schemas[tag] = fieldSchema;
  }

  // Create constructors
  const constructors: any = {};

  for (const [tag, fields] of Object.entries(definition)) {
    const hasFields = !isZodSchema(fields) && typeof fields === 'object' && fields !== null && Object.keys(fields).length > 0;

    if (hasFields) {
      constructors[tag] = (payload: any) => ({ _tag: tag, ...payload });
    } else {
      constructors[tag] = () => ({ _tag: tag });
    }
  }

  // Create union schema
  const schemaValues = Object.values(schemas);
  const unionSchema = z.discriminatedUnion('_tag', schemaValues as any);

  /**
   * Exhaustive pattern matching helper for complete case analysis
   *
   * @template TReturnType - The return type of all case handlers
   * @param value - The tagged enum value to match against
   * @param cases - Object mapping each tag to its handler function
   * @returns The result of executing the matching case handler
   *
   * @example
   * ```ts
   * const result = RemoteData.matchAll(someValue, {
   *   Loading: () => "Loading...",
   *   Success: ({ data }) => `Data: ${data}`,
   *   Failure: ({ reason }) => `Error: ${reason}`
   * });
   * ```
   */
  function matchAll<TReturnType>(value: Enum, cases: MatchAllCases<TDefinition, TReturnType>): TReturnType {
    const tag = value._tag as keyof TDefinition;
    const handler = cases[tag] as any;

    const payload: any = {};

    for (const key in value) {
      if (key !== '_tag') {
        payload[key] = value[key as keyof typeof value];
      }
    }

    return Object.keys(payload).length > 0 ? handler(payload) : handler();
  }

  /**
   * Partial pattern matching helper with optional default case
   * Allows handling only specific cases with a fallback or undefined
   *
   * @template TReturnType - The return type of all case handlers
   * @param value - The tagged enum value to match against
   * @param cases - Object mapping some tags to their handler functions, with optional _default
   * @returns The result of executing the matching case handler, the _default handler, or undefined
   *
   * @example
   * ```ts
   * // With _default handler
   * const result1 = RemoteData.matchSome(someValue, {
   *   Success: ({ data }) => `Data: ${data}`,
   *   _default: () => "Other case"
   * });
   *
   * // Without _default handler - returns undefined for unhandled cases
   * const result2 = RemoteData.matchSome(someValue, {
   *   Success: ({ data }) => `Data: ${data}`
   * }); // Can be undefined
   *
   * // Handling multiple specific cases
   * const result3 = RemoteData.matchSome(someValue, {
   *   Loading: () => "Loading...",
   *   Error: ({ reason }) => `Error: ${reason}`,
   *   _default: () => "Success or other"
   * });
   * ```
   */
  function matchSome<TReturnType>(value: Enum, cases: MatchSomeCases<TDefinition, TReturnType>): TReturnType | undefined {
    const tag = value._tag as keyof TDefinition;
    const handler = cases[tag] as any;

    if (handler !== undefined) {
      const payload: any = {};

      for (const key in value) {
        if (key !== '_tag') {
          payload[key] = value[key as keyof typeof value];
        }
      }

      return Object.keys(payload).length > 0 ? handler(payload) : handler();
    }

    if (cases._default !== undefined) {
      return cases._default();
    }

    return undefined;
  }

  /**
   * Type guard factory for type-safe narrowing
   *
   * @template TTag - The tag to check for
   * @param tag - The tag name to create a type guard for
   * @returns A type guard function that narrows the type when true
   *
   * @example
   * ```ts
   * const value: RemoteData.Types.All = getRemoteData();
   *
   * if (RemoteData.is("Success")(value)) {
   *   // TypeScript knows value is { _tag: "Success", data: number }
   *   console.log(value.data);
   * }
   * ```
   */
  function is<TTag extends keyof TDefinition>(tag: TTag): (value: Enum) => value is Extract<Enum, { _tag: TTag }> {
    return (value): value is Extract<Enum, { _tag: TTag }> => value._tag === tag;
  }

  return {
    ...(constructors as Constructors<TDefinition>),
    schema: unionSchema,
    matchAll,
    matchSome,
    is,
    Types: {} as InferTaggedTypes<typeof unionSchema>,
  };
}

// === Usage examples ===
//
// Example 1: RemoteData
// const RemoteData = taggedEnum({
//   Loading: {},
//   Success: {
//     data: z.number(),
//   },
//   Failure: {
//     reason: z.string(),
//   },
// })
//
// type RemoteDataTypes = typeof RemoteData.Types
//
// type LoadingType = RemoteDataTypes["Loading"]
// type SuccessType = RemoteDataTypes["Success"]
// type FailureType = RemoteDataTypes["Failure"]
// type RemoteDataAll = RemoteDataTypes["All"]
//
// const loading = RemoteData.Loading()
// const success = RemoteData.Success({ data: 42 })
// const failure = RemoteData.Failure({ reason: "not found" })
//
// function handle_remote(data: RemoteDataTypes["All"]) {
//   return RemoteData.matchAll(data, {
//     Loading: () => "loading",
//     Success: ({ data }) => `got: ${data}`,
//     Failure: ({ reason }) => `failed: ${reason}`,
//   })
// }
//
// console.log(handle_remote(loading)) // "loading"
// console.log(handle_remote(success)) // "got: 42"
// console.log(handle_remote(failure)) // "failed: not found"
//
// // Partial matching with _default
// function handle_remote_partial(data: RemoteDataTypes["All"]) {
//   return RemoteData.matchSome(data, {
//     Success: ({ data }) => `got: ${data}`,
//     _default: () => "loading or error"
//   })
// }
//
// console.log(handle_remote_partial(loading)) // "loading or error"
// console.log(handle_remote_partial(success)) // "got: 42"
// console.log(handle_remote_partial(failure)) // "loading or error"
//
// // Partial matching without _default
// function handle_only_success(data: RemoteDataTypes["All"]) {
//   return RemoteData.matchSome(data, {
//     Success: ({ data }) => `got: ${data}`
//   })
// }
//
// console.log(handle_only_success(loading)) // undefined
// console.log(handle_only_success(success)) // "got: 42"
// console.log(handle_only_success(failure)) // undefined
//
// Example 2: TaskState
// const TaskState = taggedEnum({
//   NotStarted: {},
//   Running: {
//     progress: z.number().min(0).max(100),
//   },
//   Completed: {
//     result: z.string(),
//     duration: z.number(),
//   },
//   Failed: {
//     error: z.string(),
//   },
// })
//
// type TaskTypes = typeof TaskState.Types
//
// type NotStartedType = TaskTypes["NotStarted"]
// type RunningType = TaskTypes["Running"]
// type CompletedType = TaskTypes["Completed"]
// type FailedType = TaskTypes["Failed"]
// type TaskStateType = TaskTypes["All"]
//
// const task1 = TaskState.NotStarted()
// const task2 = TaskState.Running({ progress: 50 })
// const task3 = TaskState.Completed({ result: "done", duration: 1000 })
// const task4 = TaskState.Failed({ error: "timeout" })
//
// function do_action(state: TaskTypes["All"]) {
//   return TaskState.matchAll(state, {
//     NotStarted: () => console.log("Starting task..."),
//     Running: ({ progress }) => console.log(`Task is ${progress}% complete`),
//     Completed: ({ result, duration }) =>
//       console.log(`Task completed: ${result} in ${duration}ms`),
//     Failed: ({ error }) => console.log(`Task failed: ${error}`),
//   })
// }
//
// function handle_running(state: TaskTypes["Running"]) {
//   console.log(`Progress: ${state.progress}%`)
// }
//
// function handle_multiple(state: TaskTypes["Running"] | TaskTypes["Completed"]) {
//   if (state._tag === "Running") {
//     console.log(`Running: ${state.progress}%`)
//   } else {
//     console.log(`Completed: ${state.result}`)
//   }
// }
//
// // Tests
// do_action(task1)
// do_action(task2)
// handle_running(task2)
// handle_multiple(task2)
// handle_multiple(task3)
//
// Example 3: ApiResponse with complex types
// const ApiResponse = taggedEnum({
//   Idle: {},
//   Loading: {},
//   Success: {
//     data: z.object({
//       id: z.number(),
//       name: z.string(),
//     }),
//     timestamp: z.date(),
//   },
//   Error: {
//     code: z.enum(["NOT_FOUND", "UNAUTHORIZED", "SERVER_ERROR"]),
//     message: z.string(),
//   },
// })
//
// type ApiResponseTypes = typeof ApiResponse.Types
//
// type IdleType = ApiResponseTypes["Idle"]
// type ApiLoadingType = ApiResponseTypes["Loading"]
// type ApiSuccessType = ApiResponseTypes["Success"]
// type ApiErrorType = ApiResponseTypes["Error"]
// type ApiResponseAll = ApiResponseTypes["All"]
//
// const response = ApiResponse.Success({
//   data: { id: 1, name: "Alice" },
//   timestamp: new Date(),
// })
//
// const result = ApiResponse.matchAll(response, {
//   Idle: () => "Not started",
//   Loading: () => "Loading...",
//   Success: ({ data, timestamp }) => `${data.name} (loaded at ${timestamp})`,
//   Error: ({ code, message }) => `[${code}] ${message}`,
// })
//
// console.log(result)
//
// // Type narrowing with is()
// if (ApiResponse.is("Success")(response)) {
//   console.log(response.data.name) // Type narrowed: response is ApiSuccessType
// }
//
// // Partial matching - handling only errors with _default
// const errorResult = ApiResponse.matchSome(response, {
//   Error: ({ code, message }) => `[${code}] ${message}`,
//   _default: () => "Request is pending or successful"
// })
// console.log(errorResult) // "Request is pending or successful"
//
// const errorResponse = ApiResponse.Error({
//   code: "NOT_FOUND",
//   message: "User not found"
// })
// console.log(ApiResponse.matchSome(errorResponse, {
//   Error: ({ code, message }) => `[${code}] ${message}`,
//   _default: () => "Request is pending or successful"
// })) // "[NOT_FOUND] User not found"
//
// // Partial matching - handling only Success without _default
// const successOnly = ApiResponse.matchSome(response, {
//   Success: ({ data, timestamp }) => `${data.name} (loaded at ${timestamp})`
// })
// console.log(successOnly) // "Alice (loaded at ...)"
//
// const idleResponse = ApiResponse.Idle()
// console.log(ApiResponse.matchSome(idleResponse, {
//   Success: ({ data, timestamp }) => `${data.name} (loaded at ${timestamp})`
// })) // undefined
//
// // Partial matching - handling multiple specific cases
// const loadingOrError = ApiResponse.matchSome(response, {
//   Loading: () => "Please wait...",
//   Error: ({ code }) => `Error code: ${code}`,
//   _default: () => "Ready"
// })
// console.log(loadingOrError) // "Ready" (for Success or Idle)
//
// // Validation of external value
// const external = { _tag: "Success", data: 123 }
// const validated = RemoteData.schema.parse(external)
// console.log(validated)
//
// === Export ===
// export { taggedEnum }
// export type { TaggedEnumDefinition, InferTaggedEnum, InferTaggedTypes }
