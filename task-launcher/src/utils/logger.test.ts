import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    Logger.resetInstance();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    Logger.resetInstance();
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
        context: { source: 'test' },
      }),
    );
    expect(levanteLogger.capture.mock.calls[0][1]).not.toHaveProperty('gameParams');
    expect(levanteLogger.capture.mock.calls[0][1]).not.toHaveProperty('userParams');
  });

  it('userMistake forwards to the injected LevanteLogger', () => {
    const levanteLogger = {
      capture: vi.fn(),
      error: vi.fn(),
      userMistake: vi.fn(),
    };
    const gameParams = { taskName: 'egma-math' } as GameParamsType;
    const userParams = { pid: 'test-pid' } as UserParamsType;
    Logger.setInstance(levanteLogger, gameParams, userParams);

    Logger.getInstance().userMistake('invalid_class_code', { page: 'join' });

    expect(levanteLogger.userMistake).toHaveBeenCalledWith(
      'invalid_class_code',
      expect.objectContaining({
        gameParams,
        userParams,
        context: { page: 'join' },
      }),
    );
    expect(levanteLogger.capture).not.toHaveBeenCalled();
    expect(levanteLogger.error).not.toHaveBeenCalled();
  });

  it('userMistake uses capture when the host has no userMistake method', () => {
    const levanteLogger = {
      capture: vi.fn(),
      error: vi.fn(),
    };
    Logger.setInstance(levanteLogger, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);

    Logger.getInstance().userMistake('invalid_class_code', { page: 'join' });

    expect(levanteLogger.error).not.toHaveBeenCalled();
    expect(levanteLogger.capture).toHaveBeenCalledWith('User Mistake', {
      context: { code: 'invalid_class_code', page: 'join' },
    });
    expect(levanteLogger.capture.mock.calls[0][1]).not.toHaveProperty('gameParams');
    expect(levanteLogger.capture.mock.calls[0][1]).not.toHaveProperty('userParams');
  });

  it('userMistake falls back to console when no LevanteLogger is injected', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    Logger.setInstance(undefined, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);

    Logger.getInstance().userMistake('invalid_class_code', { page: 'join' });

    expect(console.info).toHaveBeenCalledWith(
      'User Mistake: CoreTask',
      'invalid_class_code',
      expect.objectContaining({
        gameParams: { taskName: 'vocab' },
        context: { page: 'join' },
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
