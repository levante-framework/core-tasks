// The fields of a corpus row (see shared/helpers/getCorpus.ts) that memory game reads.
// Each row is one instruction screen or one sequence (a display trial followed by an input trial and optional feedback), in play order.
export type CorpusRow = {
  itemId: string;
  block_index: number;
  assessmentStage: string;
  trialType: string;
  // Audio file key to grab from GCS; can be a single file or an array of files
  audioFile: string | string[];
  // Image or video key to grab from GCS
  image: string | string[];
  // Length of stimulus sequence; blank uses current adaptive length
  item: string | number[];
  downex: boolean;
};

export const Direction = {
  Forward: 'forward',
  Backward: 'backward',
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];
