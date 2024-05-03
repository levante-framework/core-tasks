import Papa from 'papaparse';
import store from 'store2';
import 'regenerator-runtime/runtime';
import { camelize } from '@bdelab/roar-utils';

let translations = {};

function getRowData(row, language, nonLocalDialect) {
  const translation = row[language.toLowerCase()];

  // Only need this because we don't have base language translations for all languages.
  // Ex we have 'es-co' but not 'es'
  const noBaseLang = Object.keys(row).find((key) => key.includes(nonLocalDialect));
  return translation || row[nonLocalDialect] || row[noBaseLang] || row['en'];
}

function parseTranslations(translationData) {
  const configLanguage = store.session.get('config').language;
  const nonLocalDialect = configLanguage.split('-')[0].toLowerCase();

  translationData.forEach((row) => {
    translations[camelize(row.item_id)] = getRowData(row, configLanguage, nonLocalDialect);
  });


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
