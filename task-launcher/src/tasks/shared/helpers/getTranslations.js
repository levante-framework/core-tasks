import i18next from 'i18next';
import '../../../i18n/i18n';
import Papa from 'papaparse';
import store from 'store2';
import 'regenerator-runtime/runtime';
import { dashToCamelCase } from './dashToCamelCase';
import { camelize } from '@bdelab/roar-utils';
import { async } from 'regenerator-runtime';

let translations = {};

function getRowData(row, language) {
  for (const key in row) {
    // Ex 'es-co' -> 'es'
    const nonLocalDialect = language.split('-')[0];
    if (key === language || key.includes(nonLocalDialect)) {
      return row[key];
    }
  }
}

function parseTranslations(translationData) {
  translationData.forEach((row) => {
    // console.log('row:', row)
    translations[camelize(row.item_id)] = getRowData(row, i18next.language);
  });

  console.log('translations after parsing:', translations);
  store.session.set('translations', translations);
}

export const getTranslations = async () => {
  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          parseTranslations(results.data);
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
