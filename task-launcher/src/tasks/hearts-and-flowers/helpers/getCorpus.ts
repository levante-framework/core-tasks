import 'regenerator-runtime/runtime';
import Papa from 'papaparse';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils/logger';
import { getBucketName } from '../../shared/helpers/getBucketName';

type BlockConfigRow = {
  block: string;
  test_trial_count: string;
  practice_trial_count: string;
  correct_practice_trial: string;
  stimulus_presentation_time: string;
  inter_stimulus_interval: string;
};

type ParsedBlockConfig = {
  testTrialCount: number;
  stimulusPresentationTime: number;
  interStimulusInterval: number;
  practiceTrialCount?: number;
  correctPracticeTrial?: number;
};

export const getCorpus = async (config: Record<string, any>, isDev: boolean): Promise<void> => {
  const bucketName = getBucketName(config.task, isDev, 'corpus');
  const url = `https://storage.googleapis.com/${bucketName}/${config.corpus}.csv?alt=media&v=3`;

  await new Promise<void>((resolve, reject) => {
    Papa.parse<BlockConfigRow>(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const blockConfig: Record<string, ParsedBlockConfig> = {};

        for (const row of results.data) {
          const hasPractice = row.practice_trial_count !== '' && row.correct_practice_trial !== '';
          blockConfig[row.block] = {
            testTrialCount: parseInt(row.test_trial_count, 10),
            stimulusPresentationTime: parseInt(row.stimulus_presentation_time, 10),
            interStimulusInterval: parseInt(row.inter_stimulus_interval, 10),
            ...(hasPractice && {
              practiceTrialCount: parseInt(row.practice_trial_count, 10),
              correctPracticeTrial: parseInt(row.correct_practice_trial, 10),
            }),
          };
        }

        taskStore('corpora', { blockConfig });
        resolve();
      },
      error: (error) => {
        Logger.getInstance().error(error, { source: 'getCorpus (hearts-and-flowers)' });
        reject(error);
      },
    });
  });
};
