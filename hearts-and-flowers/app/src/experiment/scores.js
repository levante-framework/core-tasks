import _mapValues from 'lodash/mapValues';
import _omit from 'lodash/omit';
import * as Papa from 'papaparse';
import store from 'store2';
import { getGrade } from '@bdelab/roar-utils';

export class RoarScores {
  constructor() {
    this.tableURL = 'https://storage.googleapis.com/roar-swr/scores/swr_lookup_v5.csv';
    this.lookupTable = [];
    this.tableLoaded = false;
  }

  async initTable() {
    return new Promise((resolve, reject) => {
      const ageInMonths = store.session.get('config').userMetadata?.ageMonths;

      if (!ageInMonths) reject();

      const ageMin = 72;
      const ageMax = 216;

      this.ageForScore = ageInMonths;
      if (ageInMonths < ageMin) this.ageForScore = ageMin;
      if (ageInMonths > ageMax) this.ageForScore = ageMax;

      Papa.parse(this.tableURL, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        step: (row) => {
          if (this.ageForScore === Number(row.data.ageMonths)) {
            this.lookupTable.push(_omit(row.data, ['', 'X']));
          }
        },
        complete: () => {
          this.tableLoaded = true;
          resolve();
        },
      });
    });
  }

  /**
   * This function calculates computed scores given raw scores for each subtask.
   *
   * The input raw scores are expected to conform to the following interface:
   *
   * interface IRawScores {
   *   [key: string]: {
   *     practice: ISummaryScores;
   *     test: ISummaryScores;
   *   };
   * }
   *
   * where the top-level keys correspond to this assessment's subtasks. If this
   * assessment has no subtasks, then there will be only one top-level key called
   * "composite." Each summary score object implements this interface:
   *
   * interface ISummaryScores {
   *   thetaEstimate: number | null;
   *   thetaSE: number | null;
   *   numAttempted: number;
   *   numCorrect: number;
   *   numIncorrect: number;
   * }
   *
   * The returned computed scores must have that same top-level keys as the input
   * raw scores, and each value must be an object with arbitrary computed scores.
   * For example, one might return the thetaEstimate, a "ROAR score", a percentile
   * score, and a predicted Woodcock-Johnson score:
   *
   * {
   *   composite: {
   *    thetaEstimate: number;
   *    roarScore: number;
   *    percentile: number;
   *    wjPercentile: number;
   *   }
   * }
   *
   * @param {*} rawScores
   * @returns {*} computedScores
   */
  computedScoreCallback = async (rawScores) => {
    const { userMetadata } = store.session.get('config');
    const configAge = userMetadata?.ageMonths;

    if (configAge) {
      if (!this.tableLoaded) {
        await this.initTable();
      }
    }

    // This returns an object with the same top-level keys as the input raw scores
    // but the values are the theta estimates
    const computedScores = _mapValues(rawScores, (subtaskScores) => {
      const score = subtaskScores.test?.thetaEstimate === undefined ? null : subtaskScores.test?.thetaEstimate;
      let computedScore = {
        thetaEstimate: score,
      };

      if (score && configAge) {
        const rounded = Number(score.toFixed(1));
        const grade = getGrade(userMetadata.grade);
        const { ageForScore } = this;
        let myRow;

        if (grade < 6) {
          [myRow] = this.lookupTable.filter(
            (row) =>
              Number(Number(row.ageMonths).toFixed(1)) === ageForScore &&
              Number(Number(row.thetaEstimate).toFixed(1)) === rounded,
          );
        } else {
          [myRow] = this.lookupTable.filter(
            (row) => Number(row.grade) === grade && Number(Number(row.thetaEstimate).toFixed(1)) === rounded,
          );
        }

        if (myRow !== undefined) {
          const { ageMonths, thetaEstimate, grade: rowGrade, ...normedScores } = myRow;

          computedScore = {
            ...computedScore,
            ...normedScores,
          };
        }
      }

      return computedScore;
    });

    return computedScores;
  };
}
