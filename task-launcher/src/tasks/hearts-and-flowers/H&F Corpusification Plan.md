# H&F Corpusification Plan

## Questions
- v1 deprecation: v1's existence makes both the corpus for h&f and the parsing of it in `timeline.ts` more complicated than it has to be, so it could actually be nice if v1 can be deprecated first, but not sure if that is currently constrained by sites using v1
- Why does `getCorpus()` in `shared/helpers/getCorpus.ts` have multiple parallel CSV url fetching features? Are there any tasks that import multiple CSVs?

- where does `config.corpus` get set for H&F? All other tasks receive a corpus filename via game params or a default in `setSharedConfig`. H&F currently has no `corpus` field. Either:
  - Add `corpus: 'hf-block-config'` as a default in `setSharedConfig` for H&F, or
  - Set explicitly in a task-specific `setConfig` if H&F needs multiple corpus variants (what exactly varies at the corpus variant level? is it cat vs non cat, or just versioning over time like H&F v1 vs v2, or is it locale?)

## Overview

H&F's block configuration (trial counts, timing per block) is currently hardcoded in `timeline.ts`. Corpusification moves it to a CSV file in GCS so researchers can adjust it without a code change.

H&F's corpus is structurally different from other tasks: traditionally each row would be an individual stimulus item/trial (e.g. child-survey), but this would be silly for H&F because each trial is just either a heart or a flower on either side of the screen. The meaningful parameterization is at the block level (e.g. how many practice/test trials, hearts-only or flowers-only or both, rsi, etc.), so instead each row is a block config. 

Parts to add:

- Rows in Airtable for each block config (heart, flower, mixed1, mixed2, mixed3)
- Export the Airtable as a CSV file and upload to GCS (this might already be automated..?)
- A new `hearts-and-flowers/helpers/getCorpus.ts` parses the CSV into `taskStore().corpora.blockConfig` (instead of taskStore().corpora.stimulus)
- `timeline.ts` reads `blockConfig` instead of the hardcoded object in `timelineAdminConfig`
- `taskConfig.ts` and `index.ts` are wired to call H&F's `getCorpus` instead of `shared/helpers/getCorpus.ts`

## CSV Format (this matches `SectionConfig` and `TestSectionConfig` types currently in `timeline.ts`)

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `block` | string | yes | `heart`, `flower`, `mixed1`, `mixed2`, `mixed3` |
| `test_trial_count` | integer | yes | Number of test trials in this block |
| `stimulus_presentation_time` | integer | yes | Milliseconds the stimulus stays on screen (v2 only; v1 ignores) |
| `inter_stimulus_interval` | integer | yes | Milliseconds of fixation between trials |
| `practice_trial_count` | integer | no | Leave empty for blocks with no practice phase |
| `correct_practice_trial` | integer | no | Win-streak length to exit practice early; leave empty if no practice |

Concretely:

```csv
block,test_trial_count,practice_trial_count,correct_practice_trial,stimulus_presentation_time,inter_stimulus_interval
heart,12,6,2,3000,500
flower,16,6,2,3000,500
mixed1,16,6,3,3000,500
mixed2,16,,,2000,500
mixed3,16,,,1500,500
```

The `getCorpus` parser checks whether `practice_trial_count` is non-empty to decide whether to include practice fields in the parsed object.

## Google Cloud (under `corpus/hearts-and-flowers`)
Need to upload CSV to dev and eventually prod, then add the filename (e.g. `hf-block-configs`) to `taskConfig.ts` (although this will be refactored later to move out of taskConfig.ts and into each task's folder). 

- Dev: `levante-assets-dev/corpus/hearts-and-flowers/hf-block-configs.csv`
- Prod: `levante-assets-prod/corpus/hearts-and-flowers/hf-block-configs.csv`


## Airtable Structure
helppp, would look like the CSV format above but also have a bunch of linking between tables stuff..?

## Code Changes

**`hearts-and-flowers/helpers/getCorpus.ts`** — new file (already written)

Fetches the CSV from GCS, parses each row into a typed block config object, writes to `taskStore('corpora', { blockConfig })`. Practice fields are conditionally included based on whether `practice_trial_count` is non-empty in the row.

---

**`hearts-and-flowers/timeline.ts`**

Replace the hardcoded `timelineAdminConfig` value with a read from `taskStore`:

```typescript
// Before
const timelineAdminConfig: {
  heart: SectionConfig;
  flower: SectionConfig;
  mixed1: SectionConfig;
  mixed2: TestSectionConfig;
  mixed3: TestSectionConfig;
} = { heart: { ... }, flower: { ... }, ... };

// After
const timelineAdminConfig: {
  heart: SectionConfig;
  flower: SectionConfig;
  mixed1: SectionConfig;
  mixed2: TestSectionConfig;
  mixed3: TestSectionConfig;
} = taskStore().corpora.blockConfig;
```

*Note: can also potentially remove the `// TODO: parse form user input` comment which I think means corpusification??
---

**`tasks/taskConfig.ts`**

- Needs to designate H&F to use `getCorpus()` in its own folder not the shard one like so:*
```typescript
import { getCorpus as getHeartsAndFlowersCorpus } from './hearts-and-flowers/helpers/getCorpus';

// In the heartsAndFlowers entry:
heartsAndFlowers: {
  setConfig: setSharedConfig,
  getCorpus: getHeartsAndFlowersCorpus,   // was: getCorpus (shared)
  getTranslations,
  buildTaskTimeline: heartsAndFlowersTimeline,
},
```

- From CLaude: also need to add a default `corpus` value to the H&F config so `config.corpus` is defined when `getCorpus` runs. The right place for this is in the `setConfig` / `setSharedConfig` call — check whether `corpus` needs to be set as a default there or if it comes from game params.

---

**`index.ts`**

Remove H&F from the exclusion list on the `getCorpus` call:

```typescript
// Before
if (taskName !== 'hearts-and-flowers' && taskName !== 'memory-game' && taskName !== 'intro') {
  await getCorpus(config, isDev);
}

// After
if (taskName !== 'memory-game' && taskName !== 'intro') {
  await getCorpus(config, isDev);
}
```
