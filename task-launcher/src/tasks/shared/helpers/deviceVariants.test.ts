import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getInputDeviceVariant,
  getInputDeviceVariantBaseId,
  getInputDeviceVariantErrors,
  withInputDeviceCondition,
} from './deviceVariants';

const storeState: Record<string, unknown> = {};

vi.mock('../../../taskStore', () => ({
  taskStore: () => storeState,
}));

describe('getInputDeviceVariant', () => {
  it('reads the device from the item_id suffix', () => {
    expect(getInputDeviceVariant('demo-left-touch')).toBe('touch');
    expect(getInputDeviceVariant('demo-left-keyboard')).toBe('nonTouch');
    expect(getInputDeviceVariant('instruct-bubble-mouse')).toBe('nonTouch');
    expect(getInputDeviceVariant('heart-instruct1')).toBeUndefined();
  });

  it('pairs versions by the item_id without its suffix', () => {
    expect(getInputDeviceVariantBaseId('demo-left-touch')).toBe('demo-left');
    expect(getInputDeviceVariantBaseId('demo-left-keyboard')).toBe('demo-left');
    expect(getInputDeviceVariantBaseId('heart-instruct1')).toBe('heart-instruct1');
  });
});

describe('getInputDeviceVariantErrors', () => {
  it('accepts screens with both versions and rows without a suffix', () => {
    const rows = [{ itemId: 'a-touch' }, { itemId: 'a-keyboard' }, { itemId: 'b-touch' }, { itemId: 'b-mouse' }];
    expect(getInputDeviceVariantErrors([...rows, { itemId: 'heart-instruct1' }])).toEqual({});
  });

  it('reports a screen with only one version', () => {
    const errors = getInputDeviceVariantErrors([{ itemId: 'a-touch' }, { itemId: 'b-keyboard' }]);
    expect(Object.keys(errors).sort()).toEqual(['device:a', 'device:b']);
  });
});

describe('withInputDeviceCondition', () => {
  const trial = { type: 'trial' };

  beforeEach(() => {
    delete storeState.inputCapability;
  });

  it('returns rows without a suffix unchanged', () => {
    expect(withInputDeviceCondition('heart-instruct1', trial)).toBe(trial);
  });

  it('runs each version only on its devices, checked when reached', () => {
    const touchNode = withInputDeviceCondition('demo-touch', trial) as { conditional_function: () => boolean };
    const keyboardNode = withInputDeviceCondition('demo-keyboard', trial) as { conditional_function: () => boolean };

    storeState.inputCapability = { touch: true };
    expect(touchNode.conditional_function()).toBe(true);
    expect(keyboardNode.conditional_function()).toBe(false);

    storeState.inputCapability = { touch: false };
    expect(touchNode.conditional_function()).toBe(false);
    expect(keyboardNode.conditional_function()).toBe(true);
  });
});
