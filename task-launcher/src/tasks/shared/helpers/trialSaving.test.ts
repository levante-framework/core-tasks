// NB: These tests cover only how `initTrialSaving` wires up the jsPsych hooks and
// isolates writes/completion to the current run (e.g. when a new task launches before
// a previous run is closed). They do NOT exercise the trial-saving logic itself —
// what gets written, how data is shaped, stopping rules, demo/abort handling, etc.
// Future work: expand coverage to the trial-saving behavior beyond run isolation.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsPsych } from '../../taskSetup';
import { initTrialSaving } from './trialSaving';

// taskStore is a singleton keyed store; expose a mutable backing object so tests can
// drive the flags the trial-saving hooks read (demoMode, taskAborted, etc.).
const storeState: Record<string, unknown> = {};

vi.mock('../../taskSetup', () => {
  // Minimal stand-in for the real jsPsych singleton: the hooks only touch `opts`.
  // They must start as functions because `extend` calls through to the previous handler.
  const jsPsych = {
    opts: {
      on_finish: () => {},
      on_trial_finish: () => {},
      on_data_update: () => {},
    },
  };
  return { jsPsych };
});

vi.mock('../../../taskStore', () => {
  const taskStore = (key?: string | Record<string, unknown>, value?: unknown) => {
    if (key === undefined || typeof key === 'object') return storeState;
    if (value !== undefined) {
      storeState[key] = value;
      return value;
    }
    return storeState[key];
  };
  return { taskStore };
});

// Keep the transitive trial/completion/logger imports out of this unit.
vi.mock('../trials', () => ({ finishTaskEarly: vi.fn() }));
vi.mock('./recordCompletion', () => ({ recordCompletion: vi.fn() }));
vi.mock('../../../utils/logger', () => ({
  Logger: { getInstance: () => ({ capture: vi.fn(), error: vi.fn() }) },
}));

function makeFirekit() {
  return {
    writeTrial: vi.fn().mockResolvedValue(undefined),
    finishRun: vi.fn(),
    updateStopReason: vi.fn(),
  };
}

describe('initTrialSaving run isolation', () => {
  beforeEach(() => {
    for (const key of Object.keys(storeState)) delete storeState[key];
    storeState.demoMode = false;
    storeState.taskAborted = false;
    storeState.effectiveStoppingRule = 'sufficientTrials';
  });

  it('writes a new task trial only to the current run, not the previous open run', async () => {
    const firekitA = makeFirekit();
    const firekitB = makeFirekit();

    // Task A launches, then task B launches before A's run is closed.
    initTrialSaving({ firekit: firekitA, isRoarApp: false });
    initTrialSaving({ firekit: firekitB, isRoarApp: false });

    (jsPsych as any).opts.on_data_update({ save_trial: true, trial_index: 0, response_source: 'mouse' });
    await Promise.resolve();

    expect(firekitB.writeTrial).toHaveBeenCalledTimes(1);
    expect(firekitA.writeTrial).not.toHaveBeenCalled();
  });

  it('finishes only the current run when the new task completes', () => {
    const firekitA = makeFirekit();
    const firekitB = makeFirekit();

    initTrialSaving({ firekit: firekitA, isRoarApp: false });
    initTrialSaving({ firekit: firekitB, isRoarApp: false });

    (jsPsych as any).opts.on_finish();

    expect(firekitB.finishRun).toHaveBeenCalledTimes(1);
    expect(firekitA.finishRun).not.toHaveBeenCalled();
  });
});
