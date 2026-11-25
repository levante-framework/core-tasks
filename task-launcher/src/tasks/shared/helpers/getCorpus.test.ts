import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../utils/logger';
import { getCorpus, resolveChanceLevel, withCatGuessing } from './getCorpus';

type CorpusRow = {
  itemId: string;
  item: string;
};

const storeState: Record<string, unknown> = {};

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock('papaparse', () => ({
  default: {
    parse: parseMock,
  },
}));

vi.mock('../../../taskStore', () => {
  const taskStore = (key?: string | Record<string, unknown>, value?: unknown) => {
    if (key === undefined || typeof key === 'object') {
      return storeState;
    }
    if (value !== undefined) {
      storeState[key] = value;
      return value;
    }
    return storeState[key];
  };
  return { taskStore };
});

function corpusRow(itemId: string): Record<string, string> {
  return {
    source: 'test',
    block_index: '1',
    task: 'vocab',
    prompt: itemId,
    item: itemId,
    orig_item_num: '1',
    trial_type: 'test',
    time_limit: '',
    answer: '1',
    assessment_stage: 'test',
    chance_level: '0',
    item_id: itemId,
    item_uid: itemId,
    response_alternatives: '',
    trial_num: '1',
  };
}

type ParseConfig = {
  complete: (results: { data: Record<string, string>[] }) => void;
  error: (error: Error) => void;
};

function completeWith(rows: Record<string, string>[]) {
  parseMock.mockImplementation((_url: string, config: ParseConfig) => {
    config.complete({ data: rows });
  });
}

describe('getCorpus', () => {
  beforeEach(() => {
    for (const key of Object.keys(storeState)) {
      delete storeState[key];
    }
    storeState.runCat = false;
    parseMock.mockReset();
    Logger.resetInstance();
    Logger.setInstance(undefined, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('replaces the previous task rows instead of appending them', async () => {
    completeWith([corpusRow('child-survey-1'), corpusRow('child-survey-2')]);
    await getCorpus({ corpus: 'child-survey/bank', task: 'child-survey', sequentialStimulus: true }, false);

    completeWith([corpusRow('vocab-1')]);
    await getCorpus({ corpus: 'vocab/bank', task: 'vocab', sequentialStimulus: true }, false);

    const stimulus = (storeState.corpora as { stimulus: CorpusRow[] }).stimulus;
    expect(stimulus.map((row) => row.itemId)).toEqual(['vocab-1']);
    expect(storeState.totalTrials).toBe(1);
  });

  it('does not keep the previous corpus when the next download fails', async () => {
    completeWith([corpusRow('math-1'), corpusRow('math-2')]);
    await getCorpus({ corpus: 'math/bank', task: 'egma-math', sequentialStimulus: true }, false);

    parseMock.mockImplementation((_url: string, config: ParseConfig) => {
      config.error(new Error('download failed'));
    });
    await getCorpus({ corpus: 'mental-rotation/bank', task: 'mental-rotation', sequentialStimulus: true }, false);

    const stimulus = (storeState.corpora as { stimulus: CorpusRow[] }).stimulus;
    expect(stimulus).toEqual([]);
    expect(storeState.totalTrials).toBe(0);
  });

  it('writes nothing to the store when the launch is aborted during the download', async () => {
    completeWith([corpusRow('vocab-1')]);
    await getCorpus({ corpus: 'vocab/bank', task: 'vocab', sequentialStimulus: true }, false, () => true);

    expect(storeState.corpora).toBeUndefined();
    expect(storeState.totalTrials).toBeUndefined();
    expect(storeState.blockThresholds).toBeUndefined();
  it('uses a numeric chance level from chance_level, including 0', async () => {
    completeWith([
      { ...corpusRow('vocab-1'), chance_level: '0.25' },
      { ...corpusRow('vocab-0'), chance_level: '0' },
    ]);
    await getCorpus({ corpus: 'vocab/bank', task: 'vocab', sequentialStimulus: true }, false);

    const stimulus = (storeState.corpora as { stimulus: { chanceLevel: number }[] }).stimulus;
    expect(stimulus.map((row) => row.chanceLevel)).toEqual([0.25, 0]);
  });

  it('falls back to 0.5 when chance_level is blank or the column is absent', async () => {
    const { chance_level: _omitted, ...withoutColumn } = corpusRow('vocab-missing');
    completeWith([{ ...corpusRow('vocab-blank'), chance_level: '' }, withoutColumn]);
    await getCorpus({ corpus: 'vocab/bank', task: 'vocab', sequentialStimulus: true }, false);

    const stimulus = (storeState.corpora as { stimulus: { chanceLevel: number }[] }).stimulus;
    expect(stimulus.map((row) => row.chanceLevel)).toEqual([0.5, 0.5]);
  });

  it('reads a chanceLevel column when chance_level is not present', async () => {
    const { chance_level: _omitted, ...withoutSnake } = corpusRow('vocab-camel');
    completeWith([{ ...withoutSnake, chanceLevel: '0.33' }]);
    await getCorpus({ corpus: 'vocab/bank', task: 'vocab', sequentialStimulus: true }, false);

    const stimulus = (storeState.corpora as { stimulus: { chanceLevel: number }[] }).stimulus;
    expect(stimulus.map((row) => row.chanceLevel)).toEqual([0.33]);
  });
});

describe('resolveChanceLevel', () => {
  it('keeps a finite chance level and otherwise uses 0.5', () => {
    expect(resolveChanceLevel(0)).toBe(0);
    expect(resolveChanceLevel('0.25')).toBe(0.25);
    expect(resolveChanceLevel(undefined)).toBe(0.5);
    expect(resolveChanceLevel('')).toBe(0.5);
    expect(resolveChanceLevel('NA')).toBe(0.5);
  });
});

describe('withCatGuessing', () => {
  it('sets the guessing parameter jsCAT reads, using 0.5 when a task has no chance level', () => {
    expect(withCatGuessing([{ chanceLevel: 0.25 }, { chanceLevel: Number.NaN }, {}])).toEqual([
      { chanceLevel: 0.25, guessing: 0.25 },
      { chanceLevel: Number.NaN, guessing: 0.5 },
      { guessing: 0.5 },
    ]);
  });
});
