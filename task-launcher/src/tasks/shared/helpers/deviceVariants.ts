import { taskStore } from '../../../taskStore';

/**
 * Corpus rows can have one version per input device, set by the `device` column:
 * `touch` rows play on touch devices; `keyboard` or `mouse` rows play on all other devices.
 * Rows with a blank `device` play on every device.
 */
export const INPUT_DEVICES = ['touch', 'keyboard', 'mouse'] as const;
export type InputDevice = (typeof INPUT_DEVICES)[number];

type DeviceRow = { itemId: string; device?: string; block_index?: number };

export function isInputDevice(value: string): value is InputDevice {
  return (INPUT_DEVICES as readonly string[]).includes(value);
}

function playsOnCurrentDevice(device: InputDevice) {
  return (device === 'touch') === Boolean(taskStore().inputCapability?.touch);
}

/**
 * Wraps a timeline node so it only runs on the devices its row's `device` value is for.
 * The device is checked when the node is reached, since input capability is detected
 * during the fullscreen trial, after the timeline is built.
 */
export function withInputDeviceCondition<T extends object>(device: string | undefined, node: T) {
  if (!device) return node;
  return {
    timeline: [node],
    conditional_function: () => isInputDevice(device) && playsOnCurrentDevice(device),
  };
}

/**
 * Describes each unknown `device` value, and each block where touch and non-touch devices would see
 * a different number of device-specific screens (each screen needs a version for both).
 * Pass every row of the corpus, not only those for the current device.
 */
export function getInputDeviceErrors(rows: DeviceRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const countsByBlock = new Map<number | undefined, { touch: number; nonTouch: number }>();

  for (const row of rows) {
    if (!row.device) continue;
    if (!isInputDevice(row.device)) {
      errors[`device:${row.block_index}:${row.itemId}`] =
        `unknown device "${row.device}"; use touch, keyboard, mouse or blank`;
      continue;
    }
    if (!countsByBlock.has(row.block_index)) countsByBlock.set(row.block_index, { touch: 0, nonTouch: 0 });
    const counts = countsByBlock.get(row.block_index);
    if (counts) counts[row.device === 'touch' ? 'touch' : 'nonTouch'] += 1;
  }

  for (const [blockIndex, { touch, nonTouch }] of countsByBlock) {
    if (touch !== nonTouch) {
      errors[`device:block ${blockIndex}`] =
        `${touch} touch rows but ${nonTouch} keyboard/mouse rows; each device-specific screen needs a version for both`;
    }
  }
  return errors;
}
