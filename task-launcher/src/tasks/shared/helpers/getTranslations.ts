import { camelize } from './camelize';
import { taskStore } from '../../../taskStore';

import 'regenerator-runtime/runtime';

let translations: Record<string, string> = {};

function parseTranslations(translationData: Record<string, string>[]) {
  for (const [key, value] of Object.entries(translationData)) {
    translations[camelize(key.trim())] = value as unknown as string;
  }
}

export const getTranslations = async (isDev: boolean, taskName: string, configLanguage?: string) => {
  // adult reasoning strings are in the math item bank
  if (taskName === 'adult-reasoning') {
    taskName = 'egma-math';
  }

  async function downloadJson(url: string): Promise<Record<string, string>[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch translations (${response.status}): ${url}`);
    }
    const data: unknown = await response.json();
    const rows = data as Record<string, string>[];

    parseTranslations(rows);
    return rows;
  }

  async function loadTranslationJsons(urls: string[]) {
    return Promise.all(urls.map((url) => downloadJson(url)));
  }

  async function fetchData() {
    const urls = [
      `https://storage.googleapis.com/levante-assets-${
        isDev ? 'dev' : 'prod'
      }/translations/itembank/${taskName}/${configLanguage}/item-bank-translations.json`,
      `https://storage.googleapis.com/levante-assets-${
        isDev ? 'dev' : 'prod'
      }/translations/itembank/general/${configLanguage}/item-bank-translations.json`,
    ];

    // hostile attribution requires some strings in the theory of mind item bank
    if (taskName === 'hostile-attribution') {
      urls.push(
        `https://storage.googleapis.com/levante-assets-${
          isDev ? 'dev' : 'prod'
        }/translations/itembank/theory-of-mind/${configLanguage}/item-bank-translations.json`,
      );
    }
    try {
      await loadTranslationJsons(taskName === 'intro' ? [urls[1]] : urls);
      taskStore('translations', translations);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  await fetchData();
};
