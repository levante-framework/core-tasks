import Papa from 'papaparse';
import { camelize } from './camelize';
import { taskStore } from '../../../taskStore';

import 'regenerator-runtime/runtime';

let translations: Record<string, string> = {};

function getRowData(row: Record<string, string>, language: string, nonLocalDialect: string) {
  const translation = row[language.toLowerCase()];

  // Only need this because we don't have base language translations for all languages.
  // Ex we have 'es-co' but not 'es'
  const noBaseLang = Object.keys(row).find((key) => key.includes(nonLocalDialect)) || '';
  return translation || row[nonLocalDialect] || row[noBaseLang] || row['en'];
}

function parseTranslations(translationData: Record<string, string>[], configLanguage: string) {
  const nonLocalDialect = configLanguage.split('-')[0].toLowerCase();

  translationData.forEach((row) => {
    translations[camelize(row.item_id)] = getRowData(row, configLanguage, nonLocalDialect);
  });


  taskStore('translations', translations);
}

export const getTranslations = async (configLanguage: string) => {
  function downloadCSV(url: string) {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          parseTranslations(results.data, configLanguage);
          resolve(results.data);
        },
        error: function (error) {
          reject(error);
        },
      });
    });
  }

  async function parseCSVs(urls: string[]) {
    const promises = urls.map((url) => downloadCSV(url));
    return Promise.all(promises);
  }

  async function fetchData() {
    const urls = [
      // This will eventually be split into separate files
      `https://storage.googleapis.com/road-dashboard/item-bank-translations.csv`,
    ];

    try {
      await parseCSVs(urls);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  await fetchData();
};
