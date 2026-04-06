import { describe, expect, it } from 'vitest';
import { getRowData } from './getTranslations';

describe('getRowData', () => {
  it('resolves es-AR text when CSV header uses mixed case', () => {
    const row = {
      item_id: 'continue_button_text',
      'es-AR': 'Continuar AR',
      es: 'Continuar ES',
      en: 'Continue',
    };

    const value = getRowData(row, 'es-AR', 'es');
    expect(value).toBe('Continuar AR');
  });

  it('falls back to base dialect when locale-specific translation is missing', () => {
    const row = {
      item_id: 'continue_button_text',
      'es-CO': 'Continuar CO',
      en: 'Continue',
    };

    const value = getRowData(row, 'es-AR', 'es');
    expect(value).toBe('Continuar CO');
  });
});
