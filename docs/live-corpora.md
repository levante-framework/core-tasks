# Live corpora

Task code in this repo does not include item banks. A registered variant loads
`params.corpus` from the assets bucket. When that param is absent, the task
uses `defaultCorpus` in `task-launcher/src/tasks/shared/helpers/config.ts`.

URL pattern:
`https://storage.googleapis.com/levante-assets-prod/corpus/{taskId}/{corpus}.csv?alt=media`

Update this file with the refresh-live-corpora skill, or `node utilities/render-live-corpora.mjs prod`. Do not edit it by hand.

_Last refreshed 2026-11-18T19:09:49+00:00 from **prod** variants (`tasks/{taskId}/variants` where `registered == true`)._

## Math (`egma-math`)

8 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `math-item-bank` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL`, `pt-BR` | 8 | `params.corpus` | [math-item-bank.csv](https://storage.googleapis.com/levante-assets-prod/corpus/egma-math/math-item-bank.csv?alt=media) |

## Matrix Reasoning (`matrix-reasoning`)

10 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `matrix-reasoning-item-bank` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [matrix-reasoning-item-bank.csv](https://storage.googleapis.com/levante-assets-prod/corpus/matrix-reasoning/matrix-reasoning-item-bank.csv?alt=media) |
| `matrix-reasoning-item-bank-downex-pilot` | `de-DE`, `en-US`, `es-CO` | 3 | `params.corpus` | [matrix-reasoning-item-bank-downex-pilot.csv](https://storage.googleapis.com/levante-assets-prod/corpus/matrix-reasoning/matrix-reasoning-item-bank-downex-pilot.csv?alt=media) |

## Mental Rotation (`mental-rotation`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `mental-rotation-item-bank-goat-pilot` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [mental-rotation-item-bank-goat-pilot.csv](https://storage.googleapis.com/levante-assets-prod/corpus/mental-rotation/mental-rotation-item-bank-goat-pilot.csv?alt=media) |

## Same Different Selection (`same-different-selection`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `same-different-selection-item-bank-spark` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [same-different-selection-item-bank-spark.csv](https://storage.googleapis.com/levante-assets-prod/corpus/same-different-selection/same-different-selection-item-bank-spark.csv?alt=media) |

## Sentence Understanding (`trog`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `trog-item-bank` | `es-CO` | 1 | `params.corpus` | [trog-item-bank.csv](https://storage.googleapis.com/levante-assets-prod/corpus/trog/trog-item-bank.csv?alt=media) |
| `trog-item-bank-es-PE` | `es-PE` | 1 | `params.corpus` | [trog-item-bank-es-PE.csv](https://storage.googleapis.com/levante-assets-prod/corpus/trog/trog-item-bank-es-PE.csv?alt=media) |
| `trog-item-bank-full-params` | `de-DE`, `en-GB`, `en-US`, `es-AR` | 4 | `params.corpus` | [trog-item-bank-full-params.csv](https://storage.googleapis.com/levante-assets-prod/corpus/trog/trog-item-bank-full-params.csv?alt=media) |
| `trog-item-bank-nl-NL` | `nl-NL` | 1 | `params.corpus` | [trog-item-bank-nl-NL.csv](https://storage.googleapis.com/levante-assets-prod/corpus/trog/trog-item-bank-nl-NL.csv?alt=media) |

## Vocab (`vocab`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `vocab-item-bank-de-DE` | `de-DE` | 1 | `params.corpus` | [vocab-item-bank-de-DE.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-de-DE.csv?alt=media) |
| `vocab-item-bank-en-GB` | `en-GB` | 1 | `params.corpus` | [vocab-item-bank-en-GB.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-en-GB.csv?alt=media) |
| `vocab-item-bank-en-US` | `en-US` | 1 | `params.corpus` | [vocab-item-bank-en-US.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-en-US.csv?alt=media) |
| `vocab-item-bank-es-AR` | `es-AR` | 1 | `params.corpus` | [vocab-item-bank-es-AR.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-es-AR.csv?alt=media) |
| `vocab-item-bank-es-CO` | `es-CO` | 1 | `params.corpus` | [vocab-item-bank-es-CO.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-es-CO.csv?alt=media) |
| `vocab-item-bank-es-PE` | `es-PE` | 1 | `params.corpus` | [vocab-item-bank-es-PE.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-es-PE.csv?alt=media) |
| `vocab-item-bank-nl-NL` | `nl-NL` | 1 | `params.corpus` | [vocab-item-bank-nl-NL.csv](https://storage.googleapis.com/levante-assets-prod/corpus/vocab/vocab-item-bank-nl-NL.csv?alt=media) |

## Theory Of Mind (`theory-of-mind`)

8 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `CO-theory-of-mind-retest-B` | `es-CO` | 1 | `params.corpus` | [CO-theory-of-mind-retest-B.csv](https://storage.googleapis.com/levante-assets-prod/corpus/theory-of-mind/CO-theory-of-mind-retest-B.csv?alt=media) |
| `theory-of-mind-item-bank-cat-test` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [theory-of-mind-item-bank-cat-test.csv](https://storage.googleapis.com/levante-assets-prod/corpus/theory-of-mind/theory-of-mind-item-bank-cat-test.csv?alt=media) |

## Hearts And Flowers (`hearts-and-flowers`)

7 registered variants.

No corpus file. Trials are defined in the task code.

## Memory (`memory-game`)

7 registered variants.

No corpus file. Trials are defined in the task code.

## Intro (`intro`)

7 registered variants.

No corpus file. Trials are defined in the task code.

## Child Survey (`child-survey`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `child-survey-item-bank` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [child-survey-item-bank.csv](https://storage.googleapis.com/levante-assets-prod/corpus/child-survey/child-survey-item-bank.csv?alt=media) |

## Adult Reasoning (`adult-reasoning`)

7 registered variants.

| Corpus | Languages | Variants | How chosen | File |
| --- | --- | --- | --- | --- |
| `adult-reasoning-item-bank` | `de-DE`, `en-GB`, `en-US`, `es-AR`, `es-CO`, `es-PE`, `nl-NL` | 7 | `params.corpus` | [adult-reasoning-item-bank.csv](https://storage.googleapis.com/levante-assets-prod/corpus/adult-reasoning/adult-reasoning-item-bank.csv?alt=media) |
