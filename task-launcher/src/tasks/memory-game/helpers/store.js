import store from 'store2';

// NOTE: This isn't stateful right now but may be in the future when we make tasks adaptive

/**
 * The memoryStore object stores various parameters related to stimuli and responses.
 * 
 * @typedef {Object} MemoryStore
 * @property {number} numOfBlocks - The number of blocks in the memory game.
 * @property {number} blockSize - The size of each block in the memory game.
 * @property {number} gridSize - The size of the grid in the memory game.
 */

/**
 * Store for managing state in the Hearts and Flowers task.
 * 
 * @type {import('store2').StoreAPI & (() => MemoryStore)}
 */
export const memoryStore = store.page.namespace('memoryStore');

export const setMemoryStore = (age) => {
    memoryStore({
        numOfBlocks: age > 12 ? 9 : 4,
        blockSize: age > 12 ? 30 : 50,
        gridSize: age > 12 ? 3 : 2,
    });
};



