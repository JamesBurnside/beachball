import { jest, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';
import realConsole from 'console';

/** Methods that will be mocked. More could be added later if needed. */
type MockLogMethod = 'log' | 'warn' | 'error';
const mockedMethods: MockLogMethod[] = ['log', 'warn', 'error'];

type MockLogsOptions = {
  /**
   * Whether to also log to the real console (or subset of methods to log to the console).
   * All logging can be enabled by setting the VERBOSE env var.
   */
  alsoLog?: boolean | MockLogMethod[];
};

export type MockLogs = {
  /** Mocked methods (to access calls etc) */
  mocks: { [k in MockLogMethod]: SpyInstance<typeof console.log> };

  /** Actual console methods */
  realConsole: typeof realConsole;

  /** Set override options for one test only */
  setOverrideOptions: (options: MockLogsOptions) => void;

  /** Get the lines logged to a particular method) */
  getMockLines: (method: MockLogMethod) => string;
};

/**
 * Initialize console log mocks, which will be reset after each test. This should be called **outside**
 * of any lifecycle hooks or tests because it calls lifecycle hooks internally for setup and teardown.
 */
export function initMockLogs(options: MockLogsOptions = {}): MockLogs {
  const { alsoLog } = options;
  let overrideOptions: MockLogsOptions | undefined;

  const logs: MockLogs = {
    mocks: {} as MockLogs['mocks'],
    realConsole,
    setOverrideOptions: options => {
      overrideOptions = options;
    },
    getMockLines: method =>
      logs.mocks[method].mock.calls
        .map(args => args.join(' '))
        .join('\n')
        .trim(),
  };

  beforeAll(() => {
    for (const method of mockedMethods) {
      const mainShouldLog = shouldLog(method, alsoLog);

      logs.mocks[method] = jest.spyOn(console, method).mockImplementation((...args) => {
        const currentShouldLog =
          overrideOptions === undefined ? mainShouldLog : shouldLog(method, overrideOptions.alsoLog);
        if (process.env.VERBOSE || currentShouldLog) {
          logs.realConsole[method](...args);
        }
      });
    }
  });

  afterEach(() => {
    overrideOptions = undefined;
    Object.values(logs.mocks).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    Object.values(logs.mocks).forEach(mock => mock.mockRestore());
  });

  return logs;
}

function shouldLog(method: MockLogMethod, alsoLog: boolean | MockLogMethod[] | undefined) {
  return typeof alsoLog === 'boolean' ? alsoLog : alsoLog?.includes(method);
}
