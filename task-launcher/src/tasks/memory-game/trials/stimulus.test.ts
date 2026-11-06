import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStoreState: Record<string, unknown> = {};

vi.mock('@jspsych-contrib/plugin-corsi-blocks', () => ({
  default: {},
}));

vi.mock('../../../taskStore', () => {
  const storeFn = ((key?: string, value?: unknown) => {
    if (key === undefined) {
      return mockStoreState;
    }
    if (value !== undefined) {
      mockStoreState[key] = value;
      return value;
    }
    return mockStoreState[key];
  }) as ((key?: string, value?: unknown) => unknown) & {
    transact: (key: string, fn: (val: unknown) => unknown) => unknown;
  };
  storeFn.transact = (key: string, fn: (val: unknown) => unknown) => {
    mockStoreState[key] = fn(mockStoreState[key]);
    return mockStoreState[key];
  };
  return { taskStore: storeFn };
});

vi.mock('../../shared/helpers', () => ({
  addExperimenterButtons: vi.fn(),
  camelToKebab: (str: string) => str,
  getParticipantUtilityButtonsHtml: () =>
    '<div id="participant-utils"><button id="replay-btn-revisited"></button></div>',
  PageAudioHandler: {
    playAudio: vi.fn(),
    stopAndDisconnectNode: vi.fn(),
    replayPresses: 0,
  },
  PageStateHandler: vi.fn(),
  setupFullscreenButton: vi.fn(),
  setupReplayAudio: vi.fn(),
}));

const mockFinishTaskEarly = vi.fn();
vi.mock('../../shared/trials', () => ({
  finishTaskEarly: (...args: unknown[]) => mockFinishTaskEarly(...args),
}));

const mockAddDataToLastTrial = vi.fn();
vi.mock('../../taskSetup', () => ({
  jsPsych: {
    data: {
      addDataToLastTrial: (...args: unknown[]) => mockAddDataToLastTrial(...args),
    },
  },
}));

vi.mock('../../../index', () => ({
  mediaAssets: {
    images: { cursor: 'cursor.png' },
    audio: {},
  },
}));

vi.mock('../timeline', () => ({
  TOTAL_FORWARD_TRIALS: 14,
}));

import { TOTAL_FORWARD_TRIALS } from '../timeline';
import { getCorsiBlocks, resetMemoryGameState } from './stimulus';

function resetMockStore() {
  Object.keys(mockStoreState).forEach((k) => {
    delete mockStoreState[k];
  });
  Object.assign(mockStoreState, {
    numOfBlocks: 9,
    blockSize: 50,
    gridSize: 3,
    heavyInstructions: false,
    displayPromptDurations: {
      memoryGameForwardPrompt: 1.5,
      memoryGameBackwardPrompt: 1.8,
      memoryGameInstruct2Downex: 2.1,
      memoryGameInstruct3Downex: 2.2,
    },
    numIncorrect: 0,
    maxIncorrect: 3,
    testTrialCount: 0,
    isCorrect: false,
    translations: {},
  });
}

function runTrialPair(
  options: {
    reverse?: boolean;
    isPractice?: boolean;
    resetSeq?: boolean;
    customSeqLength?: number;
  },
  answerCorrectly: boolean,
) {
  const displayTrial = getCorsiBlocks({
    mode: 'display',
    reverse: options.reverse,
    isPractice: options.isPractice,
    customSeqLength: options.customSeqLength,
  });
  const inputTrial = getCorsiBlocks({
    mode: 'input',
    reverse: options.reverse,
    isPractice: options.isPractice,
    resetSeq: options.resetSeq,
    customSeqLength: options.customSeqLength,
  });

  const displaySeq = displayTrial.sequence() as number[];
  displayTrial.on_finish({});

  const expectedInputSeq = inputTrial.sequence() as number[];
  const response = answerCorrectly ? [...expectedInputSeq] : [-1];
  inputTrial.on_finish({
    sequence: expectedInputSeq,
    response,
    correct: answerCorrectly,
  });

  const lastTrialCall = mockAddDataToLastTrial.mock.calls[mockAddDataToLastTrial.mock.calls.length - 1][0] as {
    itemUid: string;
    correct: boolean;
  };
  return {
    displaySeq,
    expectedInputSeq,
    itemUid: lastTrialCall.itemUid,
    recordedCorrect: lastTrialCall.correct,
  };
}

describe('Memory Game state logic (PR #570 regressions)', () => {
  beforeEach(() => {
    resetMockStore();
    resetMemoryGameState();
    mockAddDataToLastTrial.mockClear();
    mockFinishTaskEarly.mockClear();
  });

  it('increments sequenceLength by 1 after every 2 consecutive correct test trials', () => {
    const observedLengths: number[] = [];

    for (let i = 0; i < 6; i++) {
      const { displaySeq, itemUid } = runTrialPair({}, true);
      observedLengths.push(displaySeq.length);
      expect(itemUid).toBe(`mg_forward_3grid_len${displaySeq.length}`);
    }

    expect(observedLengths).toEqual([2, 2, 3, 3, 4, 4]);
    expect(mockStoreState.testTrialCount).toBe(6);
  });

  it('resets partial streak (numCorrect) on an incorrect answer so 2 consecutive correct answers are required', () => {
    // 1 correct at length 2 -> streak = 1
    expect(runTrialPair({}, true).displaySeq).toHaveLength(2);
    // 1 wrong at length 2 -> streak resets to 0
    expect(runTrialPair({}, false).displaySeq).toHaveLength(2);
    // Next correct is only streak = 1, so the trial after it must STILL be length 2
    expect(runTrialPair({}, true).displaySeq).toHaveLength(2);
    expect(runTrialPair({}, true).displaySeq).toHaveLength(2);
    // Now after 2 consecutive correct answers, length increments to 3
    expect(runTrialPair({}, true).displaySeq).toHaveLength(3);
  });

  it('clears partial numCorrect streak on resetSeq transition into backward block', () => {
    // Advance forward block to sequenceLength = 4 (clear length 2 and length 3 -> backwardsStartingSequenceLength becomes 3)
    runTrialPair({}, true); // len 2 (streak 1)
    runTrialPair({}, true); // len 2 (streak 2 -> len 3)
    runTrialPair({}, true); // len 3 (streak 1)
    runTrialPair({}, true); // len 3 (streak 2 -> len 4, backwardsStartingSequenceLength = 3)

    // On the final forward trial (with resetSeq: true), get 1 correct answer (which would leave numCorrect = 1 if not cleared)
    const lastForward = runTrialPair({ resetSeq: true }, true);
    expect(lastForward.displaySeq).toHaveLength(4);

    // Backward test trials should start at length 3 AND require 2 consecutive correct answers before incrementing to 4
    const bwd1 = runTrialPair({ reverse: true }, true);
    const bwd2 = runTrialPair({ reverse: true }, true);
    const bwd3 = runTrialPair({ reverse: true }, true);

    expect(bwd1.displaySeq).toHaveLength(3);
    expect(bwd2.displaySeq).toHaveLength(3);
    expect(bwd3.displaySeq).toHaveLength(4);
  });

  it('keeps backward practice trials at customSeqLength = 2 without inheriting or mutating test sequenceLength', () => {
    // Reach sequenceLength > 3 in forward block so resetSeq sets sequenceLength = 3 for backward phase
    runTrialPair({}, true); // len 2
    runTrialPair({}, true); // len 2 -> 3
    runTrialPair({}, true); // len 3
    runTrialPair({ resetSeq: true }, true); // len 3 -> 4, then resetSeq sets sequenceLength = 3

    // Run 3 backward practice trials with customSeqLength = 2 (as configured in timeline.ts)
    for (let i = 0; i < 3; i++) {
      const practice = runTrialPair({ reverse: true, isPractice: true, customSeqLength: 2 }, true);
      expect(practice.displaySeq).toHaveLength(2);
      expect(practice.itemUid).toBe('mg_backward_3grid_len2');
    }

    // First real backward test trial must still start at sequenceLength = 3
    const firstBackwardTest = runTrialPair({ reverse: true }, true);
    expect(firstBackwardTest.displaySeq).toHaveLength(3);
    expect(firstBackwardTest.itemUid).toBe('mg_backward_3grid_len3');
  });

  it('starts backward block at length 2 when participant errors out of forward block before clearing length 3', () => {
    // Clear length 2 -> reaches length 3, but never clears length 3
    runTrialPair({}, true); // len 2
    runTrialPair({}, true); // len 2 -> 3

    // 3 incorrect answers in forward block -> hits maxIncorrect (3)
    runTrialPair({}, false); // numIncorrect = 1
    runTrialPair({}, false); // numIncorrect = 2
    runTrialPair({}, false); // numIncorrect = 3 -> triggers forward skip

    expect(mockFinishTaskEarly).not.toHaveBeenCalled();
    // Forward skip sets testTrialCount to TOTAL_FORWARD_TRIALS + 1 (since testTrialCount also increments at end of trial)
    expect(mockStoreState.testTrialCount).toBe(TOTAL_FORWARD_TRIALS + 1);

    // Backward test starts at length 2 because length 3 was never cleared
    const firstBackward = runTrialPair({ reverse: true }, true);
    expect(firstBackward.displaySeq).toHaveLength(2);
  });

  it('calls finishTaskEarly("errorOut") when maxIncorrect is reached in backward block', () => {
    runTrialPair({ reverse: true }, false);
    runTrialPair({ reverse: true }, false);
    expect(mockFinishTaskEarly).not.toHaveBeenCalled();

    runTrialPair({ reverse: true }, false);
    expect(mockFinishTaskEarly).toHaveBeenCalledWith('errorOut');
  });

  it('resetMemoryGameState resets sequenceLength, numCorrect, and backwardsStartingSequenceLength across SPA runs', () => {
    // Run 1: reach sequenceLength = 4 and backwardsStartingSequenceLength = 3, with a partial streak of 1
    runTrialPair({}, true); // len 2
    runTrialPair({}, true); // len 2 -> 3
    runTrialPair({}, true); // len 3
    runTrialPair({}, true); // len 3 -> 4 (backwardsStartingSequenceLength = 3)
    runTrialPair({}, true); // len 4 (numCorrect = 1)

    // Simulate starting Run 2 in the same SPA session
    resetMemoryGameState();
    resetMockStore();

    // Run 2 must start at sequenceLength = 2, require 2 correct to increment, and keep backwardsStartingSequenceLength = 2 if not cleared
    const run2Trial1 = runTrialPair({}, true);
    const run2Trial2 = runTrialPair({ resetSeq: true }, false);
    expect(run2Trial1.displaySeq).toHaveLength(2);
    expect(run2Trial2.displaySeq).toHaveLength(2);

    // Since Run 2 never cleared length 3, backward block after resetSeq must start at length 2 (not 3 from Run 1)
    const run2Backward1 = runTrialPair({ reverse: true }, true);
    expect(run2Backward1.displaySeq).toHaveLength(2);
  });
});
