/* eslint-disable import/no-mutable-exports */
import i18next from 'i18next';
// eslint-disable-next-line import/no-duplicates
import '../i18n';
// eslint-disable-next-line import/no-duplicates
import { wordlist } from '../i18n';
import { shuffle } from '../helperFunctions';

export let csvTransformed;
export let corpusAll;
export let corpusNew;
export let corpusOriginal;

export function processCSV() {
  const csvAssets = {
    practice: wordlist[i18next.language].dataPracticeURL,
    validated: wordlist[i18next.language].dataValidatedURL,
    new: wordlist[i18next.language].dataNewURL,
  };

  const transformCSV = (csvInput, isPractice) =>
    csvInput.reduce((accum, row) => {
      const newRow = {
        stimulus: row.word,
        correct_response: row.realpseudo === 'real' ? 'ArrowRight' : 'ArrowLeft',
        difficulty: isPractice ? row.difficulty : row.b,
        corpus_src: isPractice ? row.block : row.corpusId,
        realpseudo: row.realpseudo,
      };
      accum.push(newRow);
      return accum;
    }, []);

  const createSpanishWordList = (list) => {
    const core = list.filter((row) => row.corpus_src === 'spanish-core');
    const random = shuffle(list.filter((row) => row.corpus_src === 'spanish-random'));
    const randomReal = random.filter((row) => row.realpseudo === 'real').slice(0, 50);
    const randomPseudo = random.filter((row) => row.realpseudo === 'pseudo').slice(0, 50);
    return shuffle(core.concat(randomReal).concat(randomPseudo));
  };

  csvTransformed = {
    practice: transformCSV(csvAssets.practice, true),
    validated:
      i18next.language === 'es'
        ? createSpanishWordList(transformCSV(csvAssets.validated, false))
        : transformCSV(csvAssets.validated, false),
    new: i18next.language === 'en' ? shuffle(transformCSV(csvAssets.new, false)) : [], // csvAssets.new,
  };

  corpusAll = {
    name: 'corpusAll',
    corpus_pseudo: csvTransformed.validated.filter((row) => row.realpseudo === 'pseudo'),
    corpus_real: csvTransformed.validated.filter((row) => row.realpseudo === 'real'),
  };

  corpusOriginal = {
    name: 'corpusOriginal',
    corpus_pseudo: csvTransformed.validated.filter(
      (row) => row.realpseudo === 'pseudo' && row.corpus_src === 'en-validated-v1',
    ),
    corpus_real: csvTransformed.validated.filter(
      (row) => row.realpseudo === 'real' && row.corpus_src === 'en-validated-v1',
    ),
  };

  corpusNew = {
    name: 'corpusNew',
    corpus_pseudo: csvTransformed.new.filter((row) => row.realpseudo === 'pseudo'),
    corpus_real: csvTransformed.new.filter((row) => row.realpseudo === 'real'),
  };
}
