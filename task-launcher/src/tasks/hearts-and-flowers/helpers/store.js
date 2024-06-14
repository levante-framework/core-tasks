import store from "store2";

/**
 * The hfStore object stores various parameters related to stimuli and responses.
 * 
 * @typedef {Object} HFStore
 * @property {string} stimulus - The type of stimulus, e.g., 'heart'.
 * @property {string} stimulusSide - The side of the stimulus, e.g., 'left'.
 * @property {number} stimulusPosition - The position of the stimulus, e.g., 0.
 * @property {boolean} correct - Indicates whether the response was correct.
 */

/**
 * Store for managing state in the Hearts and Flowers task.
 * 
 * @type {import('store2').StoreAPI & (() => HFStore)}
 */
export const hfStore = store.page.namespace('hfStore')

hfStore({
    stimulus: 'heart',
    stimulusSide: 'left',
    stimulusPosition: 0,
    correct: false,
});
