# Task Flows

Flowcharts of each task's jsPsych timeline, derived from `src/tasks/<task>/timeline.ts` (and `catTimeline.ts` where present).

## Sources of truth

What a participant sees in a task comes from three places:

| Source | What it holds | Changes when… |
|---|---|---|
| **Code** | The logic: how the corpus is read and turned into a timeline. This covers block order, branching, stopping and fallback rules, and how trials are built. | Someone edits `src/tasks/<task>/` |
| **Corpus** (Airtable, exported as CSV) | A row-by-row view of the task, structurally isomorphic to it: its blocks or trials, in order, and what each one involves (stimuli, prompts, answers, counts). | Someone edits the task's rows in Airtable |
| **Variant** (variant doc / task params) | High-level settings for one run of the task, such as language, `heavyInstructions`, `runCat` and `version`. | A different variant is assigned |

The charts don't mark which source each step comes from, because that split is expected to change in the upcoming core-tasks refactor. They also avoid specific counts and item IDs, so they stay correct when corpus or variant values change.

Inter-stimulus interval is the same in every task today. If it never varies, it can live in code instead of the variant or corpus.

**Legend**

- Rectangles are screens, trials or blocks. Diamonds are either checks made during the task or branches on variant params (`runCat`, `heavyInstructions`, `version`).
- Every task starts with preload and enter fullscreen, and ends with a task-finished screen and exit fullscreen. These are shown as `START` / `END`.
- **'Your turn' screen**: shown the first time the task moves from practice to test items. In CAT mode it always shows.
- **Adaptive items** (CAT mode) are picked one at a time from the participant's ability estimate. Otherwise items run in order.
- **Unnormed items**: a few random items that aren't calibrated yet, shown at the end in CAT mode.
- **Fallback check**: passes if the participant got too many of their recent test items wrong. Each task runs its fallback at most once.
- **Skip if flagged**: an item can be marked to be skipped while the task runs, and is then passed over.

## Tasks

- [Hearts and Flowers (`heartsAndFlowers`)](hearts-and-flowers.md)
- [Math (`egmaMath`)](math.md)
- [Matrix Reasoning (`matrixReasoning`)](matrix-reasoning.md)
- [Memory Game (`memoryGame`, Corsi blocks)](memory-game.md)
- [Mental Rotation (`mentalRotation`)](mental-rotation.md)
- [Same-Different Selection (`sameDifferentSelection`)](same-different-selection.md)
- [Theory of Mind (`theoryOfMind`), also used by `hostileAttribution`](theory-of-mind.md)
- [TROG (`trog`)](trog.md)
- [Vocab (`vocab`)](vocab.md)
- [Adult Reasoning (`adultReasoning`)](adult-reasoning.md)
- [Child Survey (`childSurvey`)](child-survey.md)
- [ROAR Inference (`roarInference`)](roar-inference.md)
- [Intro (`intro`)](intro.md)
