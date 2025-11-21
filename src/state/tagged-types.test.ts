import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { taggedEnum } from './tagged-types';

describe('taggedEnum', () => {
  /**
   * Test suite for basic constructors
   * Demonstrates how to create instances of tagged enums
   */
  describe('Constructors', () => {
    test('should create instances without payload', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const loading = RemoteData.Loading();

      expect(loading).toEqual({ _tag: 'Loading' });
      expect(loading._tag).toBe('Loading');
    });

    test('should create instances with simple payload', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const success = RemoteData.Success({ data: 42 });

      expect(success).toEqual({ _tag: 'Success', data: 42 });
      expect(success._tag).toBe('Success');
      expect(success.data).toBe(42);
    });

    test('should create instances with multiple fields', () => {
      const TaskState = taggedEnum({
        Completed: {
          result: z.string(),
          duration: z.number(),
        },
      });

      const completed = TaskState.Completed({
        result: 'done',
        duration: 1000,
      });

      expect(completed).toEqual({
        _tag: 'Completed',
        result: 'done',
        duration: 1000,
      });
    });

    test('should create instances with complex Zod schemas', () => {
      const ApiResponse = taggedEnum({
        Success: {
          data: z.object({
            id: z.number(),
            name: z.string(),
          }),
          timestamp: z.date(),
        },
      });

      const timestamp = new Date('2024-01-01');
      const response = ApiResponse.Success({
        data: { id: 1, name: 'Alice' },
        timestamp,
      });

      expect(response._tag).toBe('Success');
      expect(response.data).toEqual({ id: 1, name: 'Alice' });
      expect(response.timestamp).toBe(timestamp);
    });
  });

  /**
   * Test suite for matchAll - exhaustive pattern matching
   * Demonstrates how to handle all possible cases
   */
  describe('matchAll - Exhaustive Pattern Matching', () => {
    test('should match all cases with empty payload', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const loading = RemoteData.Loading();

      const result = RemoteData.matchAll(loading, {
        Loading: () => 'loading',
        Success: ({ data }) => `got: ${data}`,
        Failure: ({ reason }) => `failed: ${reason}`,
      });

      expect(result).toBe('loading');
    });

    test('should match all cases with simple payload', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const success = RemoteData.Success({ data: 42 });

      const result = RemoteData.matchAll(success, {
        Loading: () => 'loading',
        Success: ({ data }) => `got: ${data}`,
        Failure: ({ reason }) => `failed: ${reason}`,
      });

      expect(result).toBe('got: 42');
    });

    test('should match all cases with error payload', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const failure = RemoteData.Failure({ reason: 'not found' });

      const result = RemoteData.matchAll(failure, {
        Loading: () => 'loading',
        Success: ({ data }) => `got: ${data}`,
        Failure: ({ reason }) => `failed: ${reason}`,
      });

      expect(result).toBe('failed: not found');
    });

    test('should handle multiple fields in payload', () => {
      const TaskState = taggedEnum({
        NotStarted: {},
        Running: { progress: z.number().min(0).max(100) },
        Completed: {
          result: z.string(),
          duration: z.number(),
        },
        Failed: { error: z.string() },
      });

      const completed = TaskState.Completed({
        result: 'success',
        duration: 1500,
      });

      const result = TaskState.matchAll(completed, {
        NotStarted: () => 'not started',
        Running: ({ progress }) => `running: ${progress}%`,
        Completed: ({ result, duration }) => `${result} in ${duration}ms`,
        Failed: ({ error }) => `error: ${error}`,
      });

      expect(result).toBe('success in 1500ms');
    });

    test('should work with different return types', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const loading = RemoteData.Loading();
      const success = RemoteData.Success({ data: 42 });

      // Return numbers
      const numberResult = RemoteData.matchAll(success, {
        Loading: () => 0,
        Success: ({ data }) => data * 2,
      });

      expect(numberResult).toBe(84);

      // Return booleans
      const boolResult = RemoteData.matchAll(loading, {
        Loading: () => true,
        Success: () => false,
      });

      expect(boolResult).toBe(true);

      // Return objects
      const objectResult = RemoteData.matchAll(success, {
        Loading: () => ({ status: 'pending' }),
        Success: ({ data }) => ({ status: 'done', value: data }),
      });

      expect(objectResult).toEqual({ status: 'done', value: 42 });
    });
  });

  /**
   * Test suite for matchSome - partial pattern matching
   * Demonstrates how to handle specific cases with optional default
   */
  describe('matchSome - Partial Pattern Matching', () => {
    test('should match specific case without _default', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const success = RemoteData.Success({ data: 42 });

      const result = RemoteData.matchSome(success, {
        Success: ({ data }) => `got: ${data}`,
      });

      expect(result).toBe('got: 42');
    });

    test('should return undefined for unmatched case without _default', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const loading = RemoteData.Loading();

      const result = RemoteData.matchSome(loading, {
        Success: ({ data }) => `got: ${data}`,
      });

      expect(result).toBeUndefined();
    });

    test('should use _default handler for unmatched cases', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const loading = RemoteData.Loading();

      const result = RemoteData.matchSome(loading, {
        Success: ({ data }) => `got: ${data}`,
        _default: () => 'loading or error',
      });

      expect(result).toBe('loading or error');
    });

    test('should prefer specific handler over _default', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const success = RemoteData.Success({ data: 42 });

      const result = RemoteData.matchSome(success, {
        Success: ({ data }) => `got: ${data}`,
        _default: () => 'other case',
      });

      expect(result).toBe('got: 42');
    });

    test('should handle multiple specific cases with _default', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const loading = RemoteData.Loading();
      const success = RemoteData.Success({ data: 42 });
      const failure = RemoteData.Failure({ reason: 'error' });

      const handler = {
        Loading: () => 'loading...',
        Failure: ({ reason }: { reason: string }) => `error: ${reason}`,
        _default: () => 'success',
      };

      expect(RemoteData.matchSome(loading, handler)).toBe('loading...');
      expect(RemoteData.matchSome(success, handler)).toBe('success');
      expect(RemoteData.matchSome(failure, handler)).toBe('error: error');
    });

    test('should handle empty payload cases', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const loading = RemoteData.Loading();

      const result = RemoteData.matchSome(loading, {
        Loading: () => 'loading state',
      });

      expect(result).toBe('loading state');
    });

    test('should work without any handler matching (no _default)', () => {
      const ApiResponse = taggedEnum({
        Idle: {},
        Loading: {},
        Success: { data: z.number() },
        Error: { message: z.string() },
      });

      const idle = ApiResponse.Idle();

      const result = ApiResponse.matchSome(idle, {
        Success: ({ data }) => `data: ${data}`,
        Error: ({ message }) => `error: ${message}`,
      });

      expect(result).toBeUndefined();
    });
  });

  /**
   * Test suite for is() - type guard factory
   * Demonstrates how to narrow types safely
   */
  describe('is() - Type Guards', () => {
    test('should correctly identify matching tag', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const success = RemoteData.Success({ data: 42 });

      expect(RemoteData.is('Success')(success)).toBe(true);
      expect(RemoteData.is('Loading')(success)).toBe(false);
      expect(RemoteData.is('Failure')(success)).toBe(false);
    });

    test('should work with empty payload tags', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const loading = RemoteData.Loading();

      expect(RemoteData.is('Loading')(loading)).toBe(true);
      expect(RemoteData.is('Success')(loading)).toBe(false);
    });

    test('should enable type narrowing in conditionals', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      type RemoteDataType = typeof RemoteData.Types.All;

      const value: RemoteDataType = RemoteData.Success({ data: 42 });

      if (RemoteData.is('Success')(value)) {
        // TypeScript should narrow the type here
        expect(value.data).toBe(42);
        expect(value._tag).toBe('Success');
      } else {
        throw new Error('Should have matched Success');
      }
    });

    test('should work with multiple type guards', () => {
      const TaskState = taggedEnum({
        NotStarted: {},
        Running: { progress: z.number() },
        Completed: { result: z.string() },
        Failed: { error: z.string() },
      });

      const running = TaskState.Running({ progress: 50 });

      expect(TaskState.is('NotStarted')(running)).toBe(false);
      expect(TaskState.is('Running')(running)).toBe(true);
      expect(TaskState.is('Completed')(running)).toBe(false);
      expect(TaskState.is('Failed')(running)).toBe(false);
    });

    test('should enable safe property access after narrowing', () => {
      const ApiResponse = taggedEnum({
        Idle: {},
        Success: {
          data: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      });

      const response = ApiResponse.Success({
        data: { id: 1, name: 'Alice' },
      });

      if (ApiResponse.is('Success')(response)) {
        // Should have type-safe access to nested properties
        expect(response.data.id).toBe(1);
        expect(response.data.name).toBe('Alice');
      }
    });
  });

  /**
   * Test suite for Zod schema validation
   * Demonstrates runtime validation capabilities
   */
  describe('Zod Schema Validation', () => {
    test('should validate correct data', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      const external = { _tag: 'Success', data: 42 };
      const validated = RemoteData.schema.parse(external);

      expect(validated).toEqual({ _tag: 'Success', data: 42 });
    });

    test('should reject invalid tag', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
      });

      const external = { _tag: 'Invalid', data: 42 };

      expect(() => RemoteData.schema.parse(external)).toThrow();
    });

    test('should reject invalid payload type', () => {
      const RemoteData = taggedEnum({
        Success: { data: z.number() },
      });

      const external = { _tag: 'Success', data: 'not a number' };

      expect(() => RemoteData.schema.parse(external)).toThrow();
    });

    test('should reject missing required fields', () => {
      const RemoteData = taggedEnum({
        Success: { data: z.number() },
      });

      const external = { _tag: 'Success' };

      expect(() => RemoteData.schema.parse(external)).toThrow();
    });

    test('should validate complex nested schemas', () => {
      const ApiResponse = taggedEnum({
        Success: {
          data: z.object({
            id: z.number(),
            name: z.string(),
          }),
          timestamp: z.date(),
        },
      });

      const timestamp = new Date('2024-01-01');
      const external = {
        _tag: 'Success',
        data: { id: 1, name: 'Alice' },
        timestamp,
      };

      const validated = ApiResponse.schema.parse(external);

      expect(validated).toEqual(external);
    });

    test('should validate enum constraints', () => {
      const ApiResponse = taggedEnum({
        Error: {
          code: z.enum(['NOT_FOUND', 'UNAUTHORIZED', 'SERVER_ERROR']),
          message: z.string(),
        },
      });

      const validExternal = {
        _tag: 'Error',
        code: 'NOT_FOUND',
        message: 'Resource not found',
      };

      const validated = ApiResponse.schema.parse(validExternal);
      expect(validated.code).toBe('NOT_FOUND');

      const invalidExternal = {
        _tag: 'Error',
        code: 'INVALID_CODE',
        message: 'Resource not found',
      };

      expect(() => ApiResponse.schema.parse(invalidExternal)).toThrow();
    });

    test('should work with safeParse for non-throwing validation', () => {
      const RemoteData = taggedEnum({
        Success: { data: z.number() },
      });

      const validData = { _tag: 'Success', data: 42 };
      const validResult = RemoteData.schema.safeParse(validData);

      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toEqual(validData);
      }

      const invalidData = { _tag: 'Success', data: 'invalid' };
      const invalidResult = RemoteData.schema.safeParse(invalidData);

      expect(invalidResult.success).toBe(false);
    });
  });

  /**
   * Test suite for Types utility
   * Demonstrates how to extract specific variant types
   */
  describe('Types Utility', () => {
    test('should provide access to individual variant types', () => {
      const RemoteData = taggedEnum({
        Loading: {},
        Success: { data: z.number() },
        Failure: { reason: z.string() },
      });

      type LoadingType = (typeof RemoteData.Types)['Loading'];
      type SuccessType = (typeof RemoteData.Types)['Success'];
      type FailureType = (typeof RemoteData.Types)['Failure'];
      type AllTypes = (typeof RemoteData.Types)['All'];

      const loading: LoadingType = RemoteData.Loading();
      const success: SuccessType = RemoteData.Success({ data: 42 });
      const failure: FailureType = RemoteData.Failure({ reason: 'error' });

      expect(loading._tag).toBe('Loading');
      expect(success._tag).toBe('Success');
      expect(failure._tag).toBe('Failure');

      // AllTypes should accept any variant
      const acceptAll = (value: AllTypes) => value._tag;

      expect(acceptAll(loading)).toBe('Loading');
      expect(acceptAll(success)).toBe('Success');
      expect(acceptAll(failure)).toBe('Failure');
    });
  });

  /**
   * Integration test - Real-world scenario
   * Demonstrates a complete workflow using all features
   */
  describe('Integration - Real-world Scenario', () => {
    test('should handle a complete API request workflow', () => {
      // Define the API response type
      const ApiResponse = taggedEnum({
        Idle: {},
        Loading: {},
        Success: {
          data: z.object({
            id: z.number(),
            username: z.string(),
            email: z.string().email(),
          }),
          fetchedAt: z.date(),
        },
        Error: {
          code: z.enum(['NETWORK_ERROR', 'NOT_FOUND', 'UNAUTHORIZED']),
          message: z.string(),
        },
      });

      type ApiState = (typeof ApiResponse.Types)['All'];

      // Simulate different states
      const states: ApiState[] = [
        ApiResponse.Idle(),
        ApiResponse.Loading(),
        ApiResponse.Success({
          data: { id: 1, username: 'alice', email: 'alice@example.com' },
          fetchedAt: new Date('2024-01-01'),
        }),
        ApiResponse.Error({
          code: 'NOT_FOUND',
          message: 'User not found',
        }),
      ];

      // Format each state for display
      const formatted = states.map((state) =>
        ApiResponse.matchAll(state, {
          Idle: () => 'Ready to fetch',
          Loading: () => 'Fetching data...',
          Success: ({ data, fetchedAt }) => `User ${data.username} (${data.email}) loaded at ${fetchedAt.toISOString()}`,
          Error: ({ code, message }) => `[${code}] ${message}`,
        })
      );

      expect(formatted).toEqual([
        'Ready to fetch',
        'Fetching data...',
        'User alice (alice@example.com) loaded at 2024-01-01T00:00:00.000Z',
        '[NOT_FOUND] User not found',
      ]);

      // Handle only errors
      const errorMessages = states
        .map((state) =>
          ApiResponse.matchSome(state, {
            Error: ({ code, message }) => `${code}: ${message}`,
          })
        )
        .filter((msg) => msg !== undefined);

      expect(errorMessages).toEqual(['NOT_FOUND: User not found']);

      // Type-safe filtering
      const successStates = states.filter(ApiResponse.is('Success'));

      expect(successStates).toHaveLength(1);
      expect(successStates[0]?._tag).toBe('Success');
      const firstSuccess = successStates[0];
      if (firstSuccess && ApiResponse.is('Success')(firstSuccess)) {
        expect(firstSuccess.data.username).toBe('alice');
      }
    });
  });

  /**
   * Test suite for taggedEnum options
   * Demonstrates how to use prefix, tagKey, and separator options
   */
  describe('Options', () => {
    describe('prefix option', () => {
      test('should add prefix to tag values', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });

        expect(loading).toEqual({ _tag: 'remote-data/Loading' });
        expect(success).toEqual({ _tag: 'remote-data/Success', data: 42 });
      });

      test('should work with matchAll when using prefix', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
            Failure: { reason: z.string() },
          },
          { prefix: 'remote-data' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });

        const result_loading = RemoteData.matchAll(loading, {
          Loading: () => 'loading',
          Success: ({ data }) => `got: ${data}`,
          Failure: ({ reason }) => `failed: ${reason}`,
        });

        const result_success = RemoteData.matchAll(success, {
          Loading: () => 'loading',
          Success: ({ data }) => `got: ${data}`,
          Failure: ({ reason }) => `failed: ${reason}`,
        });

        expect(result_loading).toBe('loading');
        expect(result_success).toBe('got: 42');
      });

      test('should work with matchSome when using prefix', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
            Failure: { reason: z.string() },
          },
          { prefix: 'remote-data' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });

        const result_loading = RemoteData.matchSome(loading, {
          Success: ({ data }) => `got: ${data}`,
          _default: () => 'other',
        });

        const result_success = RemoteData.matchSome(success, {
          Success: ({ data }) => `got: ${data}`,
        });

        expect(result_loading).toBe('other');
        expect(result_success).toBe('got: 42');
      });

      test('should work with is() type guard when using prefix', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data' }
        );

        const success = RemoteData.Success({ data: 42 });

        expect(RemoteData.is('Success')(success)).toBe(true);
        expect(RemoteData.is('Loading')(success)).toBe(false);
      });

      test('should validate with prefixed schema', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data' }
        );

        const external = { _tag: 'remote-data/Success', data: 42 };
        const validated = RemoteData.schema.parse(external);

        expect(validated).toEqual({ _tag: 'remote-data/Success', data: 42 });

        // Should reject non-prefixed tags
        const invalid = { _tag: 'Success', data: 42 };

        expect(() => RemoteData.schema.parse(invalid)).toThrow();
      });
    });

    describe('tagKey option', () => {
      test('should use custom tag key', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { tagKey: 'type' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });

        expect(loading).toEqual({ type: 'Loading' });
        expect(success).toEqual({ type: 'Success', data: 42 });
      });

      test('should work with matchAll using custom tagKey', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { tagKey: 'type' }
        );

        const success = RemoteData.Success({ data: 42 });

        const result = RemoteData.matchAll(success, {
          Loading: () => 'loading',
          Success: ({ data }) => `got: ${data}`,
        });

        expect(result).toBe('got: 42');
      });

      test('should work with is() using custom tagKey', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { tagKey: 'type' }
        );

        const success = RemoteData.Success({ data: 42 });

        expect(RemoteData.is('Success')(success)).toBe(true);
        expect(RemoteData.is('Loading')(success)).toBe(false);
      });

      test('should validate schema with custom tagKey', () => {
        const RemoteData = taggedEnum(
          {
            Success: { data: z.number() },
          },
          { tagKey: 'type' }
        );

        const external = { type: 'Success', data: 42 };
        const validated = RemoteData.schema.parse(external);

        expect(validated).toEqual({ type: 'Success', data: 42 });

        // Should reject wrong key
        const invalid = { _tag: 'Success', data: 42 };

        expect(() => RemoteData.schema.parse(invalid)).toThrow();
      });
    });

    describe('separator option', () => {
      test('should use custom separator with prefix', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data', separator: ':' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });

        expect(loading).toEqual({ _tag: 'remote-data:Loading' });
        expect(success).toEqual({ _tag: 'remote-data:Success', data: 42 });
      });

      test('should work with matchAll using custom separator', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data', separator: '::' }
        );

        const success = RemoteData.Success({ data: 42 });

        const result = RemoteData.matchAll(success, {
          Loading: () => 'loading',
          Success: ({ data }) => `got: ${data}`,
        });

        expect(result).toBe('got: 42');
      });
    });

    describe('combined options', () => {
      test('should work with all options combined', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
            Failure: { reason: z.string() },
          },
          { prefix: 'api', tagKey: 'kind', separator: '.' }
        );

        const loading = RemoteData.Loading();
        const success = RemoteData.Success({ data: 42 });
        const failure = RemoteData.Failure({ reason: 'not found' });

        expect(loading).toEqual({ kind: 'api.Loading' });
        expect(success).toEqual({ kind: 'api.Success', data: 42 });
        expect(failure).toEqual({ kind: 'api.Failure', reason: 'not found' });

        // Test matchAll
        const result = RemoteData.matchAll(success, {
          Loading: () => 'loading',
          Success: ({ data }) => `got: ${data}`,
          Failure: ({ reason }) => `failed: ${reason}`,
        });

        expect(result).toBe('got: 42');

        // Test is()
        expect(RemoteData.is('Success')(success)).toBe(true);
        expect(RemoteData.is('Loading')(success)).toBe(false);

        // Test schema validation
        const external = { kind: 'api.Success', data: 42 };
        const validated = RemoteData.schema.parse(external);

        expect(validated).toEqual({ kind: 'api.Success', data: 42 });
      });

      test('should provide correct Types with options', () => {
        const RemoteData = taggedEnum(
          {
            Loading: {},
            Success: { data: z.number() },
          },
          { prefix: 'remote-data' }
        );

        type LoadingType = (typeof RemoteData.Types)['Loading'];
        type SuccessType = (typeof RemoteData.Types)['Success'];
        type AllTypes = (typeof RemoteData.Types)['All'];

        const loading: LoadingType = RemoteData.Loading();
        const success: SuccessType = RemoteData.Success({ data: 42 });

        expect(loading._tag).toBe('remote-data/Loading');
        expect(success._tag).toBe('remote-data/Success');

        const accept_all = (value: AllTypes) => value._tag;

        expect(accept_all(loading)).toBe('remote-data/Loading');
        expect(accept_all(success)).toBe('remote-data/Success');
      });
    });
  });
});
