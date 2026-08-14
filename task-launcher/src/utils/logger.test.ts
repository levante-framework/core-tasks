import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    Logger.resetInstanceForTests();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    Logger.resetInstanceForTests();
    vi.restoreAllMocks();
  });

  it('error forwards to the injected LevanteLogger', () => {
    const levanteLogger = {
      capture: vi.fn(),
      error: vi.fn(),
    };
    const gameParams = { taskName: 'egma-math' } as GameParamsType;
    const userParams = { pid: 'test-pid' } as UserParamsType;
    Logger.setInstance(levanteLogger, gameParams, userParams);

    const error = new Error('write failed');
    Logger.getInstance().error(error, { source: 'writeTrial' });

    expect(levanteLogger.error).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        gameParams,
        userParams,
        context: { source: 'writeTrial' },
      }),
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('capture forwards to the injected LevanteLogger', () => {
    const levanteLogger = {
      capture: vi.fn(),
      error: vi.fn(),
    };
    Logger.setInstance(levanteLogger, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);
    Logger.getInstance().capture('Task Launched', { source: 'test' });

    expect(levanteLogger.capture).toHaveBeenCalledWith(
      'Task Launched',
      expect.objectContaining({
        gameParams: { taskName: 'vocab' },
        context: { source: 'test' },
      }),
    );
  });

  it('error falls back to console when no LevanteLogger is injected', () => {
    Logger.setInstance(undefined, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);
    const error = new Error('via instance');
    Logger.getInstance().error(error, { source: 'timeline' });

    expect(console.error).toHaveBeenCalledWith(
      'Error: CoreTask',
      error,
      expect.objectContaining({
        gameParams: { taskName: 'vocab' },
        context: { source: 'timeline' },
      }),
    );
  });
});
