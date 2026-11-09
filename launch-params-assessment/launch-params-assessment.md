# Core-tasks launch parameters assessment
🤖 Co-authored with Claude Code

## Approach
For each parameter core-tasks takes at launch, ask:
- Does the task need it to launch?
- Is it used after load (load = every step in TaskLauncher `init()` and `run()` up until `jsPsych.run(timeline)`)?
- Does it reach Firestore (run doc or trial doc)?
- Where does it come from?

### Scope:
- **Code side:** core-tasks `origin/main`, last re-checked at `5c9d9082` (2026-11-06). The two commits since the original snapshot (`14a6c1ee`), #587 and #588, don't change how any parameter is read.
    - Unmerged branches that change parameter use are in [In-flight changes](#in-flight-changes)
    - Each parameter is traced from `TaskLevante.vue` (dashboard) through `TaskLauncher` (core-tasks) and `setSharedConfig` (`task-launcher/src/tasks/shared/helpers/config.ts`) to every place it's used
    - Firestore writes are traced through firekit 9.7.0.
- **Data side:** the 91 registered core-tasks variants in Firestore dev (`hs-levante-admin-dev` on 2026-10-29)
- **Corpora:** only the corpus columns that depend on a parameter, overlap with one, or reach Firestore (see [Corpus columns](#corpus-columns))
- ***Out of scope:***
    - Unregistered variants
    - Corpus content and data quality (e.g. `d` vs `difficulty`, blank `assessment_stage` rows, duplicate and unread columns). Tracked separately as a side quest; the audit script is [corpus_audit.py](./scripts/corpus_audit.py)
    - prod (everything assessed here is dev)
    - Parameter validation: core-tasks doesn't validate parameters, it only fills in default values and converts types. The only validation happens when a variant is created (`levante-firebase-functions` > `create-task-variant.ts`).

### Steps
1. **Find how params enter:** Read `TaskLauncher` (`index.ts`) and its caller (`TaskLevante.vue`)<br/>
   → [How parameters reach the task](#how-parameters-reach-the-tasks)
2. **List every param the code accepts:** Read the `setSharedConfig` destructure and the direct
   `gameParams` reads in `index.ts`; check the list against every `config.<name>` read<br/>
   → [Parameter table](#parameter-audit-table), [Computed or hard-coded](#computed-or-hard-coded-not-passed-in)
3. **Trace each param:** Read the `config` block in `config.ts` for defaults, read `init()` for load
   requirements, [grep](./scripts/launch-params-grep.sh) for reads across the codebase, and read `config.ts` and `taskStore/index.ts` by hand (the grep excludes them)<br/>
   → [Parameter table](#parameter-audit-table) columns 2–4, [Which tasks read each parameter](#which-tasks-read-each-parameter)
4. **Trace Firestore writes:** Read firekit's `startRun`, `writeTrial` and `updateUser`, and every
   `addDataToLastTrial` call<br/>
    → [What reaches trial docs](#what-reaches-trial-docs)
5. **Find other readers:** Grep `levante-dashboard` and `levante-firebase-functions` for variant
   param reads<br/>
    → [Other code that reads variant params](#other-code-that-reads-variant-params)
6. **Inventory the data:** Run the [read-only scan](./scripts/firestore-readonly-scan.mjs) on Firestore dev, then filter to registered core-tasks variants and tally each key<br/>
    → "Registered dev variants" column
7. ...corpora audit, administrations scan, re-check on `origin/main`

## How parameters reach the tasks:
By task:

- **`gameParams`**: the administration's copy of the variant's `params`, passed in unchanged (`gameParams = { ...appKit._taskInfo.variantParams }`). The copy is made when the assignment is saved (`CreateAssignment.vue`, `params: toRaw(assessment.variant.params)`), and the `startTask` cloud function returns it (`startTask.ts`, `variantParams: assessmentDefinition.params || {}`). **Editing a variant later doesn't change assignments that already exist.** The registered-variant counts in this doc describe what new assignments would get. What existing assignments launch with is in `administrations/{id}.assessments[]`. For 12% of the assessments on registered core-tasks variants, that copy differs from the current variant (see [What existing assignments launch with](#what-existing-assignments-launch-with)).
- **`userParams`**: only `{ birthMonth, birthYear }`, read from the user doc by the dashboard. The dashboard won't launch a task until both are present.
- **Merge:** `setSharedConfig` merges them as `{ ...gameParams, ...userParams }` and then drops null and undefined values. So user params win over variant params, and a null value in a variant is the same as the key being absent.
- **What core-tasks reads:** only the 33 keys destructured in `setSharedConfig`. `index.ts` also reads three of them (`taskName`, `language`, `demoMode`) directly, before `setSharedConfig` runs. Core-tasks never uses any other variant key, but it still passes the whole object on: to the run doc (below), and to the context of every error log (`Logger.error` attaches the full `gameParams` and `userParams`).
- **`taskStore` is internal to core-tasks.** `setSharedConfig` turns the params into `config`, and `setTaskStore` copies that into `taskStore`, a store2 namespace that only core-tasks' own trials read. The dashboard never reads it. Outside core-tasks, the dashboard and backend read the variant params themselves, before launch (see [Other code that reads variant params](#other-code-that-reads-variant-params)).
- **Run doc:** firekit's `startRun` copies the **entire** variant params object into `variantParams`. Every key in the variant ends up in every run doc, used or not. The run doc's `userData` (`birthMonth`, `birthYear`, `assessmentPid`, `grade`, `schoolLevel`, `assessmentUid`) is read by firekit straight from the user doc, not from `userParams`.
- **Trial docs:** the config is not saved. Only `corpus` is copied from a parameter; `storeItemId` and `cat` decide whether some other fields are written. See [What reaches trial docs](#what-reaches-trial-docs).
- **No real validation:** core-tasks only coerces values and fills in defaults. Only `taskName` and `language` are needed for a task to load.

### Diagrams (still under work)

- [Flow of params](diagrams/launch-params-flow.svg): the whole path, from variant doc to run and trial docs. Open the SVG directly to click nodes through to the code. Source: [launch-params-flow.d2](diagrams/launch-params-flow.d2); re-render with `d2 diagrams/launch-params-flow.d2 diagrams/launch-params-flow.svg`.
- [How variant params get from the variant doc to the task launcher](diagrams/variant-params-to-launcher.md): the assignment-time copy into the administration doc, and what `startTask` returns at launch (mermaid).


### Other code that reads variant params

Some params are not read by core-tasks, but by other parts of the codebase (`levante-dashboard` and `levante-firebase-functions` at `e8c4e6d`):

| Where | What it reads | Effect |
|---|---|---|
| Dashboard `TaskPicker.vue:388` | `params.language` | Filters the variants shown when an assignment is created |
| Dashboard `assignments/VariantCard.vue:58` | `params.cat` | Shows a CAT badge on the variant card |
| Dashboard `VariantCard.vue`, `VariantsTimeline.vue`, `filterVariantsByParamQuery.ts` | Every key | Shows the params as a table, diffs revisions, and lets admins search variants by any key |
| Dashboard `CreateAssignment.vue:635, :731` | The whole object | Copies it into the administration (the snapshot `startTask` returns) |
| Backend `create-task-variant.ts:41` | Every key | `assertParamsAllowedBySpecs`: a new variant can only use keys that are in the param spec catalog |
| Backend `startTask.ts:262` | The whole object | Returns the administration's copy as `variantParams` |
| Backend `provision-offline-pack.ts:92-96` | `params.language` | Picks the language of the offline pack (default `en-US`) |
| Backend `sync-offline-runs.ts:200` | The whole object | Copies `variantParams` into synced offline runs |

Summary:
- **`language` and `cat` are read by the dashboard and backend too.** Changing how they're stored (e.g. normalizing language codes) has to keep `TaskPicker` and the offline pack working.
- **The dead keys** (`sequentialPractice`, `numberOfTrials`, `numOfPracticeTrials`, `skipInstructions`, ...) are only read by the generic table, diff and search code, so removing them from variants is safe. To stop new variants from using them, also remove them from the param spec catalog, since `create-task-variant` only allows catalogued keys.

### In registered variants but not read by core-tasks

1. `validUserTypes`: 8 survey variants (child-survey 7, adult-reasoning 1). Its type isn't consistent: `["student"]` (5), `"student"` (2), `["parent"]` (1). **The copy in variant params is redundant and can be removed**:
  - **It belongs on the task doc.** `levante-firebase-functions` declares it on `TaskDoc` (`firestore-schema.ts:538`, typed `("parent" | "student" | "teacher")[]`), not on variants.
  - **The task docs already have it, with the same values** (read from dev on 2026-11-08): `tasks/child-survey` has `["student"]` and `tasks/adult-reasoning` has `["parent"]`. Both task docs were last updated on 2026-10-20, the day dashboard #1113 merged, so they were probably backfilled for it.
  - **The dashboard reads the task-doc field.** Since #1113 (`levante-dashboard` at `fbfb1012`), `TaskPicker.vue:517` and `EditVariantDialog.vue:534` read `variant.task.validUserTypes` to set an assignment's default `userType` conditions, with a fallback based on the task ID for tasks that haven't been backfilled.
  - **Nothing reads `params.validUserTypes`.** Not core-tasks, the dashboard, firekit, or the functions repo.

### Computed or hard-coded, not passed in

These are fields in the `config` object that `setSharedConfig` builds itself. They aren't in the destructure, so no variant or user param can set them.

`taskTimer`, `isPaused` and `displayPromptDurations` are runtime state, not config. They're only in `config` because `setSharedConfig` returns `TaskStoreDataType` (`config.ts:67`), the same type `setTaskStore` takes, and that type declares all three as required. That one type describes both the config and the store's runtime state. `startTime` isn't in that type at all, so it's simply left over.

| Field | Kind | Used? |
|---|---|---|
| `firekit` | Constructor argument | Yes |
| `isRoarApp` | Computed from the firekit project ID | Yes, only changes how trials are saved (legacy ROAR) |
| `userMetadata.age` | Computed from `age`, or from `birthMonth`/`birthYear` | Yes (heavy instructions, memory-game sizes) |
| `startTime` | Hard-coded `new Date()` | **No.** Nothing reads `config.startTime`, and `setTaskStore` doesn't copy it. The real one is set by `startAppTimer` (`appTimer.ts:59`) as `Date.now()` once the fullscreen step finishes (`baseTimeline.ts:17`), so it's a different value, taken at a different time |
| `taskTimer` | Hard-coded `null` | **No.** `setTaskStore` sets it to `null` again itself, and `appTimer.ts` manages it from there |
| `isPaused` | Hard-coded `false` | **No.** `setTaskStore` sets it to `false` again itself, and the experimenter pause buttons (`addUtilityButtons.ts`) change it. This hard-coded value is why the `_isPaused` param is dead |
| `displayPromptDurations` | Hard-coded `{}` | **No.** `setTaskStore` doesn't copy it. Memory-game writes it to `taskStore` during the task (`instructions.ts:170`) and reads it there (`stimulus.ts:199`) |

Two more values aren't fields in `config`:
- **`isDev`**: computed in `index.ts` from the firekit project ID, or from `demoMode` when there's no firekit. Used for bucket names.
- **`displayElement`**: read in `trialSaving.ts:104-106` (`if (config.displayElement) { ... = config.display_element }`), but nothing ever sets it, so that code never runs. It would also do nothing if it did, because it checks `displayElement` and then assigns `display_element`. Dead code.

## Parameter audit table

Total count: 34 (33 from `setSharedConfig` destructure, 1 (pid) is dev-only)

| Param | Source / default | Needed to load? | Used after load? | Firestore write | Registered dev variants | Notes |
|---|---|---|---|---|---|---|
| `taskName` | variant | **Yes**: the task config lookup and bucket names crash without it (confirmed by running, see *Checked by running*) | Yes (`config.task`, logging) | run | 91, all valid | The `'egma-math'` default in config is unreachable because `init()` has already crashed |
| `language` | variant | **Yes**: an undefined audio bucket makes `getMediaAssets` throw (confirmed by running, see *Checked by running*) | Load only (asset and translation paths) | run | 91. **27 use 2-letter codes** (`en` 10, `es` 10, `de` 7). Others: `es-AR`, `nl-NL`, `en-GB`, `es-PE` (11 each), `pt-BR` 6, `en-US` 5, `de-DE` 5, `es-CO` 3, `fr-CA` 1. **The `fr-CA` variant (vocab "French (Canada)") fails to load in dev**: `levante-assets-dev` has no `audio/fr-CA/` folder | Any code without a matching audio folder fails the same way, so a valid-looking code isn't enough. `config.language` is never read. 2-letter codes are mapped (`es` → `es-CO`, `en` → `en-US`, `de` → `de-DE`) only in `index.ts`. The `i18next` fallback is unreachable |
| `corpus` | variant, falling back to the hard-coded `defaultCorpus` map | No | Yes (corpus CSV filename) | run + **trial** | 69. 22 null, so they use the default | Ignored by hearts-and-flowers, memory-game and intro (`index.ts` skips `getCorpus` for them) |
| `birthMonth` / `birthYear` | user doc via `userParams` | Dashboard requires them; core-tasks doesn't | Yes, used to compute age | run `userData` (firekit reads them itself) | n/a | |
| `age` | variant | No | Yes, overrides the computed age | run | 0 (49 have `age: null`) | Not set on any registered variant, but a non-null value would override the age of every child assigned that variant. With no age at all, age is `NaN`: heavy instructions are off, but memory-game still uses the young-child settings (4 blocks, 2x2 grid) |
| `userMetadata` | variant | No | Only passed to `firekit.updateUser` | none | 0 | `updateUser` only writes these fields for guest users, so this does nothing in Levante |
| `pid` | serve.js URL only (`?pid=`, sent in `userParams`) | No | **No** | none | 0 | Never copied into config. Under serve.js there's no firekit, so `updateUser` isn't called. Under the dashboard, `pid` isn't passed, so `updateUser` gets a random `makePid()` value, and firekit throws it away because it only writes `assessmentPid` for guest users. The real `assessmentPid` comes from the backend (`startTask`). The only place `pid` appears is error-log context (`Logger.error` attaches `userParams`) |
| `maxTime` | 100 (minutes) | No | Yes (app timer, time-left check before each stimulus, CAT block time budgets) | run | 91: 4 (24), 6 (20), 8 (17), 100 (16), 15 (14) | |
| `maxIncorrect` | 3 | No | Yes (2AFC, SDS, hearts-and-flowers, memory-game, roar-inference) | run | 55: 3 (38), **100** (16: hearts-and-flowers 9, theory-of-mind 7), 10 (1) | 100 is used to switch the rule off |
| `cat` | false | No | Yes (becomes `runCat`; picks the CAT timeline and drives theta updates) | run | 73, 57 true | |
| `semThreshold` | `Number(undefined)` = NaN | No | Yes, CAT early stop (mental-rotation, vocab, TROG, matrix-reasoning) | run | 48, **all 0** | With 0 or NaN, CAT never stops early |
| `startingTheta` | NaN, turned into 0 | No | Yes, CAT initial theta | run | 63, all 0 | Same as the default |
| `heavyInstructions` | false, also forced on when age ≤ 4 | No | Yes (SDS, math, matrix-reasoning, hearts-and-flowers, memory-game) | run | 56, 1 true (hearts-and-flowers) | |
| `experimenterButtons` | **true** unless set to `false` (changed in #583) | No | Yes, but only when heavy instructions are active (age ≤ 4 or `heavyInstructions`) | run | 11, all true | Since #583 these are redundant: true is now the default. No registered variant sets `false` |
| `version` (`taskVersion` is a deprecated alias) | 1 | No | Yes, v2 feature flags in hearts-and-flowers, theory-of-mind, mental-rotation and SDS | run | `version` 21: mental-rotation 8, theory-of-mind 7 (all the string `"2"`), SDS 4, hearts-and-flowers 2. **`taskVersion` 12**: hearts-and-flowers 7 (six `2`, one `1`), SDS 5 | No variant sets both. Strings work because config runs `Number()`. Easy to confuse with the run doc's `taskVersion`, which is the core-tasks package version |
| `numberOfStories` | 3 | No | theory-of-mind v2 only | run | 0 | Always the default |
| `bubblePractice` | false | No | intro only | run | 0 | Intro bubble practice never runs from a registered variant |
| `buttonLayout` | `'default'` | No | Yes, `'diamond'` layout in 2AFC, math slider and roar-inference | run | 91, all `default` | The `'diamond'` path isn't used by any registered variant |
| `audioFeedback` | `'neutral'` | No | Yes, `'binary'` plays coin/fail sounds (mental-rotation, SDS, math, matrix-reasoning) | run | 0 | Always neutral. Since #581, SDS's neutral case plays no sound (`nullAudio`) rather than `select` |
| `sequentialStimulus` | true | No | Yes, `false` shuffles the corpus | run | 91, all true | The shuffle path isn't used by any registered variant |
| `storeItemId` | false | No | Yes, adds `itemId` (and in 2AFC and child-survey, `corpusId`) to trials | run + **trial** | 89, **42 true** (vocab, SDS, egma-math, mental-rotation, matrix-reasoning, trog) | `corpusId` is never set anywhere, so it's `undefined`, and firekit's `removeUndefined` drops it: **no trial doc ever has `corpusId`**. In the other 47 variants, trial docs have **no `itemId`**; only `itemUid` identifies the item |
| `demoMode` | false (serve.js: `DEMO` build flag) | Changes load: skips `startRun` | Yes, blocks all Firestore writes | none if true | 0 | If someone sets it in a variant, no data is saved and nothing warns |
| `debug` | false | No | Yes, shows CAT theta on screen | run | 0 | |
| `showAudioKeys` | false | No | Yes, shows audio keys on screen | run | 0 | |
| `keyHelpers` | false | No | roar-inference only | run | 90, 16 true (hearts-and-flowers 9, memory-game 7) | Neither of those tasks reads it, so it has no effect. No roar-inference variant is registered |
| `stimulusBlocks` | 3 | No | roar-inference only | run | 50, all 3 | No effect (no registered roar-inference variant) |
| `inferenceNumStories` | undefined | No | roar-inference only | run | 0 (17 have it as null) | |
| `sequentialPractice` | true | No | **No** (dead) | run | 91 | |
| `numberOfTrials` | 300 | No | **No** (dead) | run | 83 | |
| `numOfPracticeTrials` | 2 | No | **No** (dead) | run | 64 | |
| `skipInstructions` | false | No | **No** (dead; a code comment says so) | run | 59 | |
| `_isPaused` | none | No | **No**; `isPaused` is hard-coded to false | run | 0 | |

## Which tasks read each parameter

Built with [`param_matrix.py`](./scripts/param_matrix.py), run on `origin/main` at `5c9d9082`. For each task it collects two sets of files:
- **The timeline path.** It starts from the task's timeline file(s) and follows each imported name to the file that defines it, through the helper barrels (`export * from`). It doesn't follow imports into the root `index.ts`: trial files import `mediaAssets` from it, and it imports every task.
- **The launch path**, which runs before the timeline is built: the root `index.ts` itself, plus `getCorpus.ts` for every task that `index.ts` doesn't skip.

In each file it looks for `taskStore().<key>`, `config.<key>`, `this.gameParams.<key>`, or a destructure from any of them. It skips `taskStore/index.ts` and `shared/helpers/config.ts`, which copy every key (the same exclusion as the grep script). The check works per file, not per function, which is why `startingTheta` and `experimenterButtons` show up for every task (footnotes ³ and ⁴). The one exception is coded by hand: `getCorpus.ts` reads `inferenceNumStories` and `stimulusBlocks` only inside `if (task === 'roar-inference')`, so those count for inference only. `--why` lists the files behind each ✓, and `--compare` checks the script's output against this table.

The table is in three groups: params read by every task, params read by every task that loads a corpus, and params that depend on the task.

| Param | math | matrix | MR | H&F | memory | SDS | TROG | vocab | ToM¹ | intro | inference | adult | survey |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **▼ Read by every task** | | | | | | | | | | | | | |
| `taskName` (`index.ts`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `language` (`index.ts`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `demoMode` (`index.ts`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `maxTime` (app timer) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `showAudioKeys` (audio handler) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `experimenterButtons`³ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `startingTheta`⁴ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **▼ Read by every task that loads a corpus** (`getCorpus`) | | | | | | | | | | | | | |
| `corpus` (file to load) | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ |
| `sequentialStimulus` | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ |
| **▼ Depends on the task** | | | | | | | | | | | | | |
| `cat`⁵ | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ |
| `semThreshold` |  | ✓ | ✓ |  |  |  | ✓ | ✓ |  |  |  |  |  |
| `heavyInstructions` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |
| `maxIncorrect` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |
| `version` |  |  | ✓ | ✓ |  | ✓ |  |  | ✓ |  |  |  |  |
| `buttonLayout` | ✓ | ✓ | ✓ |  |  |  | ✓ | ✓ | ✓ |  | ✓ | ✓ |  |
| `audioFeedback` | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  |  |
| `storeItemId` | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ |
| `corpus` (on trials) | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ |
| `debug` | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `numberOfStories` |  |  |  |  |  |  |  |  | ✓ |  |  |  |  |
| `bubblePractice` |  |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `keyHelpers` |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `stimulusBlocks` |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `inferenceNumStories` |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `age` (direct)² |  |  |  |  | ✓ |  |  |  |  |  |  |  |  |

<sub>¹ hostile-attribution uses the theory-of-mind timeline, so it has the same column.<br/>
² Every task also uses age indirectly: age ≤ 4 turns on `heavyInstructions`, which also gates `experimenterButtons`. Only memory-game reads age directly, for its block and grid sizes.<br/>
³ Read by shared code for every task, but the buttons only appear on the heavy-instructions path (age ≤ 4 or `heavyInstructions`).<br/>
⁴ Read by `initializeCat` for every task, but it only matters when `cat` is true.<br/>
⁵ For inference and survey, only `getCorpus.ts:120` reads it, to decide whether to parse each row's difficulty (`taskStore().runCat ? parseFloat(row.d || row.difficulty) : NaN`). Neither timeline uses CAT item selection, so it has no effect there.</sub>

**Set on registered variants of tasks that never read them** (no effect):
- `keyHelpers`: on all 91. It's `true` on 16 (hearts-and-flowers 9, memory-game 7).
- `stimulusBlocks: 3`: on 50 variants across 11 tasks.
- `buttonLayout`: on hearts-and-flowers, memory-game, SDS, intro and child-survey.
- `storeItemId: false`: on hearts-and-flowers, memory-game and intro.
- `cat: false` and `semThreshold: 0`: on non-CAT variants (child-survey, intro, hearts-and-flowers). Child-survey does read `cat`, but only in `getCorpus` (footnote ⁵), and with `false` that does nothing. `maxIncorrect: 3` on child-survey and intro.
- **`corpus` on hearts-and-flowers**: `NuoJc6KKEyZ3kXolkjsP` ("en-US New H&F Pilot") has `"same-different-selection-item-bank-spark"` and `amEyWgFLY9j5psnYmaOM` (pt-BR) has `"none"`. `main` ignores both, but see [In-flight changes](#in-flight-changes).



## What reaches trial docs
This is built by grepping every `addDataToLastTrial`, trial `data:` object and `data.<x> =` assignment under `tasks/` for values taken from `taskStore()` or `config`. The config itself isn't saved after every trial. Every trial doc gets the trial's jsPsych data plus firekit's `taskId` and timestamps. These are the trial fields whose value or presence depends on a parameter, plus `itemUid` and `inputType`, which are listed for comparison. Only `corpus` holds a parameter's value; for the others, a parameter only decides whether the field is written:

| Trial field | Value comes from | Written when | Tasks |
|---|---|---|---|
| `corpus` | The `corpus` parameter (or the `defaultCorpus` fallback) | Every scored trial | All tasks that load a corpus (math, matrix, MR, SDS, TROG, vocab, ToM, hostile-attribution, adult-reasoning, child-survey). In roar-inference, only when `storeItemId` is true. Not hearts-and-flowers, memory-game or intro |
| `itemId` | The corpus CSV's `item_id` column (`getCorpus.ts:104`, `itemId: row.item_id`) | Only when `storeItemId` is true | The same tasks |
| `itemUid` | For corpus tasks, the corpus CSV's `item_uid` column (`getCorpus.ts:105`). Hearts-and-flowers and memory-game build it in code on `main`: `hf_<trial type>_<stimulus>` (`hearts-and-flowers/trials/stimulus.ts:146`) and `mg_<direction>_<grid size>grid_len<length>` (`memory-game/trials/stimulus.ts:217-223`) | Always. **Not controlled by any parameter**, listed for comparison with `itemId`. When `storeItemId` is false, it's the only item identifier on the trial | 2AFC tasks, SDS, math, matrix downex, child-survey, hearts-and-flowers and memory-game |
| `corpusId` | `taskStore().corpusId`, which is never set | **Never written.** It's added when `storeItemId` is true, but it's always `undefined`, and firekit drops undefined fields | 2AFC tasks (TROG, vocab, ToM, matrix, adult-reasoning) and child-survey |
| `thetaEstimate` | The CAT algorithm's current theta | When `cat` is true (`updateTheta`) | 2AFC tasks, math slider, SDS |
| `inputType` | **Not a parameter.** Device detection on the fullscreen screen (`fullScreen.ts:26-27` → `utils/detectInput.ts`), stored as `taskStore().inputCapability` and turned into a label after each trial (`trialSaving.ts:153-163`): `mouse/keyboard` if a fine pointer is detected, otherwise `touch`. Mouse is checked first, so a touchscreen laptop with a trackpad is recorded as `mouse/keyboard` | Every trial | All |

## Corpus columns

The corpus CSV is the third source of task settings, alongside the variant and the user doc. `getCorpus.ts` (`transformCSV`) reads 24 columns on `main`, mostly item content (`item`, `answer`, `image`, `audio_file`, `prompt`, ...). These are the ones that matter for a parameter refactor: they only take effect with a certain parameter value, repeat what a parameter says, or reach Firestore. The corpusify branches move more settings into the corpus (see [In-flight changes](#in-flight-changes)), so check this list before removing a parameter.

| Column | Read as | Parameter link | What it does |
|---|---|---|---|
| `d`, then `difficulty` | `difficulty` = `parseFloat(row.d \|\| row.difficulty)` | **Only read when `cat` is true** (`getCorpus.ts:120`); otherwise `NaN` | Item difficulty for the CAT |
| `chance_level` | `chanceLevel` | Only used when `cat` is true | Guessing parameter for the CAT |
| `block_threshold` | collected into `blockThresholds` | Only used by the mental-rotation CAT (`cat: true`, `setupNextBlock`) | Theta cut-offs for moving up a block |
| `story_group` | `storyGroup` | **Only used when `version: 2`** (theory-of-mind). `numberOfStories` repeats what this column already says, and nothing checks that they agree (candidate 2) | Story-group selection |
| `downex` | `downex` (`'TRUE'`) | Partly tied to `heavyInstructions` (or age ≤ 4): math and matrix use downex rows on the heavy-instructions path. Matrix and mental-rotation also use them when a child meets the fall-back criteria (`checkFallbackCriteria`), which doesn't depend on a parameter. SDS's CAT timeline loads them too; its exact condition isn't traced here | Moves the row into the separate downex corpus |
| `assessment_stage` | `assessmentStage` | **Reaches every trial doc** as `assessment_stage`, which firekit requires on every saved trial. Only `test_response` and `practice_response` update run scores | Marks a row as test, practice or instructions |
| `time_limit` | `timeLimit` | **Read by nothing on `main`.** The H&F branch reads it in place of presentation times that were in code | Presentation time |
| `feedback_item_ids` | `feedbackItemIds` | **Read by nothing on `main`.** The H&F and memory-game branches read it in place of feedback trials that were in code | Links rows to feedback trials |

## H&F and Memory game corpusification branches may change this audit

- **Per-task table:** the H&F and memory columns gain ✓ for `corpus` and `sequentialStimulus`, and the H&F column loses `version` and `maxIncorrect`. The `corpus` row's note in the parameter table ("ignored by hearts-and-flowers, memory-game and intro") would apply only to intro.
- **`version`** would be read only by mental-rotation, SDS and theory-of-mind.
- **Corpus columns:** `time_limit` would be read (by H&F), and `feedback_item_ids` by both tasks.

## Candidates for the refactor ticket

1. **Remove the dead parameters**:
   - From the code: `sequentialPractice`, `numberOfTrials`, `numOfPracticeTrials`, `skipInstructions`, `_isPaused`, `pid`, `userMetadata`, and `corpusId`.
   - About `corpusId`: it isn't a renamed `corpus`. `setTaskStore` copies both, `corpus: config.corpus` and `corpusId: config.corpusId` (`taskStore/index.ts:147-148`), and `setSharedConfig` never sets `corpusId`, so it's always undefined. It looks like a leftover from ROAR: the trial code that writes it says "corpusId and itemId fields are used by ROAR but not ROAD". There are two options:
     - **Fill it from `corpus`.** The 42 registered variants with `storeItemId: true` would then get `corpusId` on their trial docs.
     - **Drop it** from the store and from the four files that write it to trials (`afcStimulus.ts`, `child-survey/helpers/stimulus.ts`, `matrix-reasoning/trials/downexStimulus.ts`, `roar-inference/trials/afcInference.ts`).

     Trial docs already have a `corpus` field with the same value, so dropping it is probably fine. Check with whoever analyses trial data first.
   - From `setSharedConfig`'s output: the hard-coded fields that are never read (see [Computed or hard-coded](#computed-or-hard-coded-not-passed-in)).
     - `startTime`: delete it. Nothing else needs to change.
     - `taskTimer`, `isPaused`, `displayPromptDurations`: these are runtime state and belong only in `taskStore`. Deleting them alone breaks the build, because `TaskStoreDataType` requires them. Give the config its own type (or make these fields optional), and remove them from `setSharedConfig`.
     - Also add `displayPromptDurations: {}` to `setTaskStore`'s initial values. Today it's undefined in the store until memory-game's instructions set it, and memory-game's stimulus trial indexes it directly (`stimulus.ts:200`).
   - From `trialSaving.ts`: the `displayElement` block, which never runs.
   - From `baseTimeline.ts`: the `updateUser` call, and with it `pid` and `makePID.ts`. It sends `assessmentPid` (always a new random `makePid()` value, because `pid` never reaches `config`), `userMetadata`, and the computed age. Firekit's `updateUser` only writes those for guest users (`user.js:116`). Dashboard users get their real `assessmentPid` from `startTask`, and under `serve.js` there's no firekit, so the call is skipped. Check whether Levante still runs tasks for guest users before removing it.
   - From registered variants: `sequentialPractice` (91), `numberOfTrials` (83), `numOfPracticeTrials` (64), `skipInstructions` (59). Every run doc copies them.
2. **Handle the task-specific parameters**: several parameters in the shared `setSharedConfig` are read by only one task.
   - **Option: move them out of the shared config.** Each task could read its own parameters in its own config, so the shared config only holds what every task uses.
   - **roar-inference only: `keyHelpers`, `stimulusBlocks`, `inferenceNumStories`.** No registered variant is for roar-inference, but these keys are on most registered variants.
     - If roar-inference is kept, `inferenceNumStories` is effectively required, and without it the task runs no stimulus trials:
       1. The default is `Number(x) || undefined`, so a null value becomes `undefined`.
       2. In `shuffleStories`, the loop `i < undefined` never runs, so no stories are picked.
       3. In `roar-inference/timeline.ts`, `inferenceNumStories * stimulusBlocks ?? totalTrials` gives `NaN`. `??` doesn't catch `NaN`, so the `totalTrials` fallback never applies, and the trial loop runs zero times.

       Both dev roar-inference variants (unregistered) have `inferenceNumStories: null`. Validate it, give it a working default, or fix the fallback (e.g. `|| totalTrials`).
     - `stimulusBlocks` is used as the number of items per story. That explains the unread `numItemsPerStory` and `numStories` keys on 18 unregistered dev variants: someone tried to set these values under the names the code uses internally. If these parameters stay, rename them to match what they do.
   - **theory-of-mind v2 only: `numberOfStories`.** It sets both the number of story blocks and the number of story-group buckets. No registered variant sets it, so it's always 3, which matches the 3 story groups (0, 1, 2) in `theory-of-mind-item-bank-cat-test`. But it repeats what the corpus's `story_group` column already says, and nothing checks that the two agree:
     - **Lower than the corpus:** rows from the extra groups are silently added to group 0, because of the fallback added in #579 (`storyGroups[trial.storyGroup ?? 0] ?? storyGroups[0]`).
     - **Higher than the corpus:** the timeline runs blocks for groups that have no rows. I haven't checked what an empty block does when it runs.

     Option: work the count out from the corpus (largest `story_group` + 1) and drop the parameter.
   - **intro only: `bubblePractice`.** It's opt-in (`=== true`), added in #520 (2026-09-01). None of the 7 registered intro variants set it, so the bubble-popping practice from #520 never runs from a registered dev variant. Check with the #520 author whether it should be on. If it should always run, make it the default, or remove the flag.
3. **Migrate values before simplifying the code**:
   - `language`: rewrite the 27 two-letter codes, then remove the mapping in `index.ts`.
   - `taskVersion`: move the 12 hearts-and-flowers/SDS variants to `version`, then remove the alias. Removing the alias first would silently turn v2 off for them. If either corpusify branch merges first (both stop H&F reading `version`), only the 5 SDS variants need it.
   - Because of the administration copy, migrating a variant doesn't change existing assignments. Either re-save the assignments, or keep the code paths until those assignments close. In dev today, 69 open hearts-and-flowers assessments still send `language: "de"`, so the two-letter mapping can't go until they're migrated or closed (see [What existing assignments launch with](#what-existing-assignments-launch-with)).
   - `version`: store the 7 theory-of-mind values as numbers rather than strings.
   - `experimenterButtons: true`: redundant since #583. It can be dropped from the 11 variants.
4. **Decide which parameters a variant should be allowed to set**:
   - `age` and `demoMode` aren't used by any registered variant, and both are risky in a variant. Consider blocking them.
   - These are set by every registered variant that has them, but always to the default, so they could go from variants: `semThreshold` (all 0), `startingTheta` (all 0), `buttonLayout` (all `default`), `sequentialStimulus` (all true). Check whether anyone plans to use the non-default paths.
5. **Validate the two required parameters at variant creation**: nothing stops a bad `taskName` or `language` from being saved. One registered dev variant already can't load (vocab "French (Canada)", `fr-CA`: no audio folder in the dev bucket). Checking that the language has an audio folder would have caught it.
6. **Fix the bad defaults**: `semThreshold` and age both end up as NaN when not set.
7. **Decide whether `itemId` should depend on `storeItemId`**: in 47 registered variants, trial docs have no `itemId`. Either always write it (and drop `storeItemId`), or confirm that `itemUid` is enough for analysis.
8. **Make parameter parsing consistent** (`setSharedConfig`, `config.ts:106-145`). None of these affect the registered dev variants today. They're traps for the next variant someone creates.
   - **One way to read booleans.** `GameParamsType` is typed as `Record<string, string>`, but booleans actually arrive as real booleans (the `experimenterButtons` comment says so). Today there are three different patterns:

     | Pattern | Params | A string `"false"` becomes |
     |---|---|---|
     | `!!x` | `cat`, `heavyInstructions`, `storeItemId`, `keyHelpers`, `showAudioKeys`, `demoMode`, `debug`, `bubblePractice`, `skipInstructions` | **`true`** |
     | `x ?? true`, not converted | `sequentialStimulus`, `sequentialPractice` | The string `"false"`, which counts as true, so the corpus is **not shuffled** |
     | `String(x).toLowerCase() !== 'false'` | `experimenterButtons` only | `false` (correct) |

     So `demoMode: "false"` would save no data, and `cat: "false"` would run the CAT. Every boolean in the dev core-tasks variants is a real boolean. But string booleans do exist elsewhere in dev (ROAR's `storyOption: "false"`), so this can happen. Use one helper that handles both real booleans and strings, and fix the type.
   - **Let 0 through where 0 is valid.** `Number(x) || default` treats 0 as unset for `maxIncorrect`, `maxTime`, `stimulusBlocks`, `numberOfStories`, `numOfPracticeTrials` and `age`. For example, `maxIncorrect: 0` becomes 3. This is why variants switch the rule off with 100, 1000 or 100000. Use `??` with an explicit check for `NaN` instead. No dev variant sets any of these to 0 today.
   - **Make the unit of `age` clear.** `Number(age) || getAge(...)` treats the variant's `age` as years and uses it in place of the birth date. Unregistered dev variants have `age` values like 60, 30 and 15, which look like months. The dashboard works in months elsewhere (`ageInMonths`, `participantAgeInMonths`). Rename it (e.g. `ageYears`), or block it as in candidate 4.
   - **Replace the shared `version` flag.** `version: 2` turns on different features in hearts-and-flowers, mental-rotation, SDS and theory-of-mind. Nothing records what v2 means for each task, and a new task that reused the parameter would share the name but not the meaning. It also has no safety net: `Number("v2")` gives `NaN`, and nothing after `Number()` catches it. Consider per-task, named flags. If the number stays, document what each version means for each task.
   - **Decide on the default for booleans.** `experimenterButtons` defaults to on (#583), and every other boolean defaults to off. So a missing key means "off" for twelve parameters and "on" for one. Keep it if that's intended, but document it next to the parsing helper.
9. **Optional: stop renaming parameters inside core-tasks.** Two parameters change name between the variant and the code that reads them:

    | Param | In `config` | In `taskStore` | Renamed in |
    |---|---|---|---|
    | `taskName` | `task` | `task` | `setSharedConfig` |
    | `cat` | `cat` | `runCat` | `setTaskStore` |

    - **What it costs:** searching for a parameter's name doesn't find where it's used. Searching for `cat` misses every `runCat` read. The type is also wrong: `TaskStoreDataType` declares `cat`, but the store holds `runCat`.
    - **What it buys:** no change in behaviour. Variants and Firestore aren't affected.
    - **The risk:** `taskStore` is a store2 namespace with no types, so TypeScript won't catch a missed rename. `runCat` is read in 16 files, and a missed read would quietly become `undefined`, which turns CAT off. Do it after the store is typed, or with a careful search.

    Keep this separate from removing dead parameters. That work changes which inputs exist; this only changes names inside core-tasks.

## What existing assignments launch with

`startTask` returns `administrations/{id}.assessments[].params`, not the variant doc, so this copy is what a child's run actually gets. [firestore-readonly-scan.mjs](./scripts/firestore-readonly-scan.mjs) compared every copy with its current variant on 2026-11-08 (dev). Null and missing count as the same, as they do in `setSharedConfig`. The numbers below come from running [administrations-core-tasks.py](./scripts/administrations-core-tasks.py) and [administrations-diff-by-key.py](./scripts/administrations-diff-by-key.py) on its output ([administrations-summary.py](./scripts/administrations-summary.py) covers all tasks, not just core-tasks).

**Scope:** assessments for the 14 core-tasks task IDs (the ones in `taskConfig`, the same set as the 91 registered variants). "Open" means `dateClosed` is on or after 2026-11-08.

| | Assessments | Open |
|---|---|---|
| On a registered core-tasks variant | 6,063 (5,385 administrations, all 91 variants) | 4,389 |
| Params differ from the current variant | 724 (27 variants) | 400 (388 administrations) |
| Differ on a key core-tasks reads | 644 | 389 |
| Variant no longer exists | 11 | 3 (all "QA vocab", `variantId: "snapshot"`) |
| On an unregistered variant (out of scope) | 1,400 | 466 |

**What the differences change at launch (open assessments only):**

| Key | Task | Copy in administration → current variant | Open | Effect |
|---|---|---|---|---|
| `version` / `taskVersion` | hearts-and-flowers | missing → `version: 2` | 99 | Runs v1, not v2 |
| | mental-rotation | missing → `version: 2` | 101 | Runs legacy instructions, not v2 |
| | SDS | missing → `version: 2` or `taskVersion: 2` | 121 | Runs legacy stimulus, not v2 |
| | hearts-and-flowers | missing → `taskVersion: 1` | 55 | None (v1 either way) |
| `corpus` | SDS | `same-different-selection-item-bank` → `...-spark` | 121 | Different item bank |
| | mental-rotation | `mental-rotation-item-bank` → `...-goat-pilot` | 101 | Different item bank |
| | vocab | `vocab-item-bank-en-US` → `nl-NL` / `fr-CA` | 4 | English items for a Dutch/French variant |
| `language` | hearts-and-flowers, mental-rotation, adult-reasoning | `de` / `en` → `de-DE` / `en-US` | 72 | None today (mapped in `index.ts`), but blocks removing the mapping |
| `experimenterButtons` | memory-game, H&F, mental-rotation | missing → `true` | 8 | None since #583 (defaults to on) |
| `heavyInstructions` | hearts-and-flowers | missing → `true` | 2 | Heavy instructions only for age ≤ 4 |
| `cat` | vocab | `false` → `true` | 2 | Runs without CAT |
| `maxIncorrect` | vocab | `999` → missing | 2 | Rule effectively off, not 3 |

`validUserTypes` also differs on 93 assessments (13 open), but core-tasks doesn't read it.

**Findings:**

- **Most of this is QA automation.** 375 of the 400 open differing assessments are in administrations named `QA <task> <hash>`. The other 25 are hand-made test administrations ("All Downex", "Serena 4/23 …", "Groove Selection I", "Cypress Test Assignment" and others). Prod hasn't been checked.
- **New administrations still get the old params.** The differences aren't only old copies left over from before a variant was edited. For example, the mental-rotation variant `So5OCT2Zn4fFaEo4KfV7` was last updated on 2026-04-03. Two "QA mental-rotation" administrations created on 2026-11-08 copied it differently: one has `version: 2`, and the other has no `version`. So whatever creates the QA administrations sometimes doesn't copy the current variant params. That means daily QA runs of hearts-and-flowers, mental-rotation and SDS partly test the v1/legacy code paths and the old corpora, not what the variant now specifies. Worth raising with whoever owns the QA assignment script (outside core-tasks).
- **No open assessment on a registered variant is missing `taskName` or `language`.** So none of them hit the load failures in [Checked by running](#checked-by-running).
- **Consequences for the refactor:** see candidate 3. Every key that a migration would rewrite (`language`, `taskVersion`, `version` as a string) still appears in open administration copies. Removing the code paths is safe only after those copies are re-saved or their administrations close.

**Caveat:** `differsFromVariant` was computed live on 2026-11-08. The "current variant" values in the second table come from the 2026-10-29 variants export, so a variant edited in between could show a stale value.

## Not verified

- **Firekit version:** firekit behaviour comes from 9.7.0 (installed in core-tasks). The dashboard depends on `^9.7.2`, which isn't installed locally.
- **How QA administrations are created.** Why some new QA administrations copy outdated params (see above) wasn't traced. That code isn't in core-tasks.
- **Undefined `taskName` / `language` under the dashboard.** These were tested with the nearest values `serve.js` allows (an unknown name, an empty string), not with `undefined`. The code path is the same, but it wasn't run.
- **SDS `test-dimensions` rows**: whether those trials are saved, with an empty `assessment_stage`, wasn't checked by running the task.
- **Per-task matrix**: built from static imports at file granularity. A read through an aliased store (`const s = taskStore(); s.x`) would be missed, but a grep found none. I spot-checked hearts-and-flowers, memory-game and SDS against the code by hand.
- **Prod**: not scanned (no access yet).
