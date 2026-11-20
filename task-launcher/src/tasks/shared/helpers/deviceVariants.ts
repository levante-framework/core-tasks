import { taskStore } from '../../../taskStore';

/**
 * Corpus rows can have one version per input device, marked by an item_id suffix:
 * `-touch` rows play on touch devices; `-keyboard` or `-mouse` rows play on all other devices.
 * Rows without a suffix play on every device.
 */
export type InputDeviceVariant = 'touch' | 'nonTouch';

const NON_TOUCH_SUFFIXES = ['-keyboard', '-mouse'];

/** Which devices a row's item_id is for, or undefined if it plays on every device. */
export function getInputDeviceVariant(itemId: string): InputDeviceVariant | undefined {
  if (itemId.endsWith('-touch')) return 'touch';
  if (NON_TOUCH_SUFFIXES.some((suffix) => itemId.endsWith(suffix))) return 'nonTouch';
  return undefined;
}

/** The item_id without its device suffix, so a row's touch and non-touch versions can be paired. */
export function getInputDeviceVariantBaseId(itemId: string): string {
  return itemId.replace(/-(touch|keyboard|mouse)$/, '');
}

/**
 * Wraps a timeline node so it only runs on the devices its item_id is for.
 * The device is checked when the node is reached, since input capability is detected
 * during the fullscreen trial, after the timeline is built.
 */
export function withInputDeviceCondition<T extends object>(itemId: string, node: T) {
  const variant = getInputDeviceVariant(itemId);
  if (!variant) return node;
  return {
    timeline: [node],
    conditional_function: () => (variant === 'touch') === Boolean(taskStore().inputCapability?.touch),
  };
}

/**
 * Describes each device-specific row whose other version is missing, so no device is left
 * without the screen. Pass every row of the corpus, not only those for the current device.
 */
export function getInputDeviceVariantErrors(rows: { itemId: string }[]): Record<string, string> {
  const variantsByBaseId = new Map<string, Set<InputDeviceVariant>>();
  for (const { itemId } of rows) {
    const variant = getInputDeviceVariant(itemId);
    if (!variant) continue;
    const baseId = getInputDeviceVariantBaseId(itemId);
    if (!variantsByBaseId.has(baseId)) variantsByBaseId.set(baseId, new Set());
    variantsByBaseId.get(baseId)?.add(variant);
  }

  const errors: Record<string, string> = {};
  for (const [baseId, variants] of variantsByBaseId) {
    if (variants.size < 2) {
      const missing = variants.has('touch') ? 'a -keyboard or -mouse' : 'a -touch';
      errors[`device:${baseId}`] = `has only one device version; add ${missing} row`;
    }
  }
  return errors;
}
