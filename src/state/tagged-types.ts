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
 * Options for customizing tagged enum behavior
 *
 * @example
 * ```ts
 * const RemoteData = taggedEnum({
 *   Loading: {},
 *   Success: { data: z.number() }
 * }, {
 *   prefix: 'remote-data',     // _tag: "remote-data/Loading"
 *   tagKey: 'type',            // Uses "type" instead of "_tag"
 *   separator: ':'             // _tag: "remote-data:Loading"
 * });
 * ```
 */
export type TaggedEnumOptions = {
  /** Prefix added to each tag (e.g., "remote-data" → "remote-data/Loading") */
  prefix?: string;
  /** Property name for the discriminant (default: "_tag") */
  tagKey?: string;
  /** Separator between prefix and tag name (default: "/") */
  separator?: string;
};

/**
 * Builds the full tag value with optional prefix
 *
 * @template TTag - The tag name
 * @template TPrefix - Optional prefix string
 * @template TSeparator - Separator between prefix and tag (default: "/")
 */
type BuildTagValue<
  TTag extends string,
  TPrefix extends string | undefined = undefined,
  TSeparator extends string = '/',
> = TPrefix extends string ? `${TPrefix}${TSeparator}${TTag}` : TTag;

/**
 * Infers the union type of all tagged cases from a definition
 *
 * @template TDefinition - The tagged enum definition
 * @template TTagKey - The property name for the tag (default: "_tag")
 * @template TPrefix - Optional prefix for tag values
 * @template TSeparator - Separator between prefix and tag (default: "/")
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
export type InferTaggedEnum<
  TDefinition extends TaggedEnumDefinition,
  TTagKey extends string = '_tag',
  TPrefix extends string | undefined = undefined,
  TSeparator extends string = '/',
> = {
  [TTag in keyof TDefinition & string]: { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> } & InferTaggedCase<
    TDefinition[TTag]
  >;
}[keyof TDefinition & string];

/**
 * Maps each tag to its constructor function
 * Tags with empty payload get a nullary constructor
 * Tags with fields get a unary constructor accepting the payload
 *
 * @template TDefinition - The tagged enum definition
 * @template TTagKey - The property name for the tag (default: "_tag")
 * @template TPrefix - Optional prefix for tag values
 * @template TSeparator - Separator between prefix and tag (default: "/")
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
export type Constructors<
  TDefinition extends TaggedEnumDefinition,
  TTagKey extends string = '_tag',
  TPrefix extends string | undefined = undefined,
  TSeparator extends string = '/',
> = {
  [TTag in keyof TDefinition & string]: Record<string, never> extends InferTaggedCase<TDefinition[TTag]>
    ? () => { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> }
    : (payload: InferTaggedCase<TDefinition[TTag]>) => { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> } & InferTaggedCase<TDefinition[TTag]>;
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
 * @template TDefinition - The tagged enum definition
 * @template TTagKey - The property name for the tag (default: "_tag")
 * @template TPrefix - Optional prefix for tag values
 * @template TSeparator - Separator between prefix and tag (default: "/")
 *
 * @example
 * ```ts
 * type Types = InferTaggedTypes<{ A: { value: z.ZodNumber }, B: { text: z.ZodString } }>;
 * // Result: {
 * //   A: { _tag: 'A', value: number },
 * //   B: { _tag: 'B', text: string },
 * //   All: { _tag: 'A', value: number } | { _tag: 'B', text: string }
 * // }
 * ```
 */
export type InferTaggedTypes<
  TDefinition extends TaggedEnumDefinition,
  TTagKey extends string = '_tag',
  TPrefix extends string | undefined = undefined,
  TSeparator extends string = '/',
> = {
  [TTag in keyof TDefinition & string]: { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> } & InferTaggedCase<
    TDefinition[TTag]
  >;
} & {
  All: InferTaggedEnum<TDefinition, TTagKey, TPrefix, TSeparator>;
};

/**
 * Creates a tagged enum (discriminated union) with type-safe constructors, pattern matching, and runtime validation
 *
 * @template TDefinition - The tagged enum definition
 * @template TOptions - Optional configuration for tag customization
 * @param definition - Object mapping tag names to their field definitions
 * @param options - Optional settings for prefix, tagKey, and separator
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
 * // Basic usage
 * const RemoteData = taggedEnum({
 *   Loading: {},
 *   Success: { data: z.number() },
 *   Failure: { reason: z.string() }
 * });
 *
 * // With prefix option
 * const RemoteData = taggedEnum({
 *   Loading: {},
 *   Success: { data: z.number() }
 * }, { prefix: 'remote-data' });
 * // RemoteData.Loading() => { _tag: "remote-data/Loading" }
 *
 * // With custom tagKey
 * const RemoteData = taggedEnum({
 *   Loading: {}
 * }, { tagKey: 'type' });
 * // RemoteData.Loading() => { type: "Loading" }
 *
 * // With custom separator
 * const RemoteData = taggedEnum({
 *   Loading: {}
 * }, { prefix: 'remote-data', separator: ':' });
 * // RemoteData.Loading() => { _tag: "remote-data:Loading" }
 * ```
 */
export function taggedEnum<
  TDefinition extends TaggedEnumDefinition,
  TTagKey extends string = '_tag',
  TPrefix extends string | undefined = undefined,
  TSeparator extends string = '/',
>(
  definition: TDefinition,
  options?: {
    prefix?: TPrefix;
    tagKey?: TTagKey;
    separator?: TSeparator;
  }
) {
  const tag_key = (options?.tagKey ?? '_tag') as TTagKey;
  const prefix = options?.prefix as TPrefix;
  const separator = (options?.separator ?? '/') as TSeparator;

  type Enum = InferTaggedEnum<TDefinition, TTagKey, TPrefix, TSeparator>;

  const build_full_tag = (tag: string): string => {
    if (prefix === undefined) {
      return tag;
    }

    return `${prefix}${separator}${tag}`;
  };

  const extract_tag_name = (full_tag: string): string => {
    if (prefix === undefined) {
      return full_tag;
    }

    const prefix_with_separator = `${prefix}${separator}`;

    if (full_tag.startsWith(prefix_with_separator)) {
      return full_tag.slice(prefix_with_separator.length);
    }

    return full_tag;
  };

  // Create Zod schemas for each case
  const schemas: Record<string, z.ZodObject<any>> = {};

  for (const [tag, fields] of Object.entries(definition)) {
    const full_tag = build_full_tag(tag);
    let field_schema: z.ZodObject<any>;

    if (isZodSchema(fields)) {
      const base_schema = z.object({ [tag_key]: z.literal(full_tag) });

      if (fields instanceof z.ZodObject) {
        field_schema = base_schema.merge(fields);
      } else {
        field_schema = base_schema;
      }
    } else if (typeof fields === 'object' && fields !== null && Object.keys(fields).length > 0) {
      const schema_fields: Record<string, z.ZodTypeAny> = {
        [tag_key]: z.literal(full_tag),
      };

      for (const [key, value] of Object.entries(fields)) {
        schema_fields[key] = value as z.ZodTypeAny;
      }

      field_schema = z.object(schema_fields);
    } else {
      field_schema = z.object({ [tag_key]: z.literal(full_tag) });
    }

    schemas[tag] = field_schema;
  }

  // Create constructors
  const constructors: any = {};

  for (const [tag, fields] of Object.entries(definition)) {
    const full_tag = build_full_tag(tag);
    const has_fields =
      !isZodSchema(fields) && typeof fields === 'object' && fields !== null && Object.keys(fields).length > 0;

    if (has_fields) {
      constructors[tag] = (payload: any) => ({ [tag_key]: full_tag, ...payload });
    } else {
      constructors[tag] = () => ({ [tag_key]: full_tag });
    }
  }

  // Create union schema
  const schema_values = Object.values(schemas);
  const union_schema = z.discriminatedUnion(tag_key, schema_values as any);

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
    const full_tag = (value as any)[tag_key] as string;
    const tag_name = extract_tag_name(full_tag);
    const handler = cases[tag_name as keyof TDefinition] as any;

    const payload: any = {};

    for (const key in value) {
      if (key !== (tag_key as string)) {
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
  function matchSome<TReturnType>(
    value: Enum,
    cases: MatchSomeCases<TDefinition, TReturnType>
  ): TReturnType | undefined {
    const full_tag = (value as any)[tag_key] as string;
    const tag_name = extract_tag_name(full_tag);
    const handler = cases[tag_name as keyof TDefinition] as any;

    if (handler !== undefined) {
      const payload: any = {};

      for (const key in value) {
        if (key !== (tag_key as string)) {
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
  function is<TTag extends keyof TDefinition & string>(
    tag: TTag
  ): (value: Enum) => value is Extract<Enum, { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> }> {
    const full_tag = build_full_tag(tag);

    return (value): value is Extract<Enum, { [K in TTagKey]: BuildTagValue<TTag, TPrefix, TSeparator> }> =>
      (value as any)[tag_key] === full_tag;
  }

  return {
    ...(constructors as Constructors<TDefinition, TTagKey, TPrefix, TSeparator>),
    schema: union_schema,
    matchAll,
    matchSome,
    is,
    Types: {} as InferTaggedTypes<TDefinition, TTagKey, TPrefix, TSeparator>,
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
