import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getInputDeviceErrors, isInputDevice, withInputDeviceCondition } from './deviceVariants';

const storeState: Record<string, unknown> = {};

vi.mock('../../../taskStore', () => ({
  taskStore: () => storeState,
}));

describe('isInputDevice', () => {
  it('accepts touch, keyboard and mouse', () => {
    expect(['touch', 'keyboard', 'mouse'].every(isInputDevice)).toBe(true);
    expect(isInputDevice('tablet')).toBe(false);
  });
});

describe('getInputDeviceErrors', () => {
  it('accepts blocks with a touch and a non-touch version of each screen, and rows without a device', () => {
    const rows = [
      { itemId: 'a-touch', device: 'touch', block_index: 0 },
      { itemId: 'a-keyboard', device: 'keyboard', block_index: 0 },
      { itemId: 'b-touch', device: 'touch', block_index: 1 },
      { itemId: 'b-mouse', device: 'mouse', block_index: 1 },
      { itemId: 'heart-instruct1', block_index: 0 },
    ];
    expect(getInputDeviceErrors(rows)).toEqual({});
  });

  it('reports a block where one device would see fewer screens', () => {
    const rows = [
      { itemId: 'a-touch', device: 'touch', block_index: 0 },
      { itemId: 'b-touch', device: 'touch', block_index: 0 },
      { itemId: 'a-keyboard', device: 'keyboard', block_index: 0 },
    ];
    expect(Object.keys(getInputDeviceErrors(rows))).toEqual(['device:block 0']);
  });

  it('reports unknown device values', () => {
    const errors = getInputDeviceErrors([{ itemId: 'a', device: 'tablet', block_index: 0 }]);
    expect(Object.keys(errors)).toEqual(['device:0:a']);
  });
});

describe('withInputDeviceCondition', () => {
  const trial = { type: 'trial' };

  beforeEach(() => {
    delete storeState.inputCapability;
  });

  it('returns rows without a device unchanged', () => {
    expect(withInputDeviceCondition(undefined, trial)).toBe(trial);
  });

  it('runs each version only on its devices, checked when reached', () => {
    const touchNode = withInputDeviceCondition('touch', trial) as { conditional_function: () => boolean };
    const keyboardNode = withInputDeviceCondition('keyboard', trial) as { conditional_function: () => boolean };
    const mouseNode = withInputDeviceCondition('mouse', trial) as { conditional_function: () => boolean };

    storeState.inputCapability = { touch: true };
    expect([touchNode, keyboardNode, mouseNode].map((node) => node.conditional_function())).toEqual([
      true,
      false,
      false,
    ]);

    storeState.inputCapability = { touch: false };
    expect([touchNode, keyboardNode, mouseNode].map((node) => node.conditional_function())).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('never runs a row with an unknown device', () => {
    const node = withInputDeviceCondition('tablet', trial) as { conditional_function: () => boolean };
    storeState.inputCapability = { touch: true };
    expect(node.conditional_function()).toBe(false);
  });
});
