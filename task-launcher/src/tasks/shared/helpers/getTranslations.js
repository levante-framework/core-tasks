import Papa from 'papaparse';
import 'regenerator-runtime/runtime';
import { camelize } from '@bdelab/roar-utils';
import { taskStore } from './';

let translations = {};

function getRowData(row, language, nonLocalDialect) {
  const translation = row[language.toLowerCase()];

  // Only need this because we don't have base language translations for all languages.
  // Ex we have 'es-co' but not 'es'
  const noBaseLang = Object.keys(row).find((key) => key.includes(nonLocalDialect));
  return translation || row[nonLocalDialect] || row[noBaseLang] || row['en'];
}

function parseTranslations(translationData, configLanguage) {
  const nonLocalDialect = configLanguage.split('-')[0].toLowerCase();

  translationData.forEach((row) => {
    translations[camelize(row.item_id)] = getRowData(row, configLanguage, nonLocalDialect);
  });


  taskStore('translations', translations);
}

export const getTranslations = async (configLanguage) => {
  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
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

  async function parseCSVs(urls) {
    const promises = urls.map((url, i) => downloadCSV(url, i));
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
