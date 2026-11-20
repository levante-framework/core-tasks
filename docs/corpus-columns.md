# Corpus columns

Columns on the prod corpus CSVs linked from [live-corpora.md](live-corpora.md), and what the task runner does with them. Each entry starts with the tasks whose live corpus has the column. A task is listed when at least one of its live corpus files has it. Hearts and Flowers, Memory, and Intro have no live corpus.

"Every live corpus" means Math, Matrix Reasoning, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, Theory Of Mind, Child Survey, and Adult Reasoning.

## Columns the runner reads

### `answer`

Tasks: Every live corpus

The correct response. Numeric values are stored as numbers, and other values stay text.

### `assessment_stage`

Tasks: Every live corpus

Whether the row is an instruction, a practice trial, or a scored test trial (`instructions`, `practice_response`, or `test_response`). Practice and test rows follow different feedback and stopping rules.

### `audio_file`

Tasks: Every live corpus

Audio asset key for the trial. A comma-separated value is played as several clips. Instruction text on screen is often looked up from this key.

### `block_index`

Tasks: Every live corpus

Groups rows into blocks. Adaptive tasks select items within a block, and Math and Mental Rotation use it to order blocks.

### `block_threshold`

Tasks: Math, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, Theory Of Mind, Child Survey

Theta cutoff for moving Mental Rotation to the next adaptive block once the running estimate reaches that value. Mental Rotation is the only task that reads it. The others carry the column without reading it.

### `chance_level`

Tasks: Every live corpus

Probability of a correct guess, passed into adaptive item selection as the CAT guessing parameter. Read by Math, Matrix Reasoning, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, and Adult Reasoning. Theory Of Mind and Child Survey carry it without reading it.

### `d`

Tasks: Every live corpus

Item difficulty for adaptive selection. When both `d` and `difficulty` are set, `d` wins. It is ignored unless the variant runs CAT (`params.cat=true`). Read by Math, Matrix Reasoning, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, and Adult Reasoning. Theory Of Mind and Child Survey carry it without reading it.

### `difficulty`

Tasks: Every live corpus

Item difficulty for adaptive selection, used when `d` is empty. It is ignored unless the variant runs CAT (`params.cat=true`). Theory Of Mind and Child Survey include the column but do not run this selector.

### `downex`

Tasks: Math, Matrix Reasoning, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, Theory Of Mind, Child Survey

Rows marked `TRUE` or `CHECKED` are the younger-child item set. Other rows are the main set. Within those tasks the column appears only in some banks: Matrix Reasoning in its downex-pilot bank, Sentence Understanding in its es-PE and nl-NL banks, Vocab except the de-DE bank, and Theory Of Mind in its cat-test and downex-pilot banks.

### `image`

Tasks: Every live corpus

Image asset or assets for the trial. A comma-separated value is more than one image.

### `item`

Tasks: Every live corpus

The stimulus itself: a label, a story token, or, for Math number-line rows, the endpoints of the line.

### `item_id`

Tasks: Every live corpus

Stable id for the row. Layout, instructions, and saved responses are keyed by it.

### `item_uid`

Tasks: Every live corpus

Id written onto the saved trial and shown in the debug overlay.

### `prompt`

Tasks: Every live corpus

Text key for an instruction screen. Matrix Reasoning and Same Different Selection read it for those screens. Other tasks usually display text from `audio_file` instead.

### `randomize`

Tasks: Every live corpus

Whether response choices should be shuffled. Theory Of Mind passes this value into choice order. Same Different Selection ignores it and shuffles whenever the row has an answer.

### `required_selections`

Tasks: Every live corpus

How many cards a Same Different Selection trial requires before it can be answered. The parser copies the value only when the row's `task` is same-different-selection. Same Different Selection is the only task that reads it.

### `response_alternatives`

Tasks: Every live corpus

The choice list. Comma-separated text, or numbers when the cells have no letters. Child Survey does not use this column. It substitutes its own response scale.

### `response_branches`

Tasks: Theory Of Mind

Maps a chosen answer to the next story branch. The shared response handler reads it only for Theory Of Mind rows, and only `theory-of-mind-item-bank-downex-pilot-tu` has the column.

### `story_branch`

Tasks: Math, Theory Of Mind

Names the story branch a row belongs to. Theory Of Mind keeps a row only when the branch matches the one selected so far, and `getRealTrials` uses the same value so Math and Theory Of Mind omit branches that will not run. The column is only on `math-item-bank-downex-pilot` and `theory-of-mind-item-bank-downex-pilot-tu`.

### `story_group`

Tasks: Math, Mental Rotation, Same Different Selection, Sentence Understanding, Vocab, Theory Of Mind, Child Survey

Groups Theory Of Mind rows into a story. The adaptive picker draws the next item from the current group. Theory Of Mind is the only task that reads it. The others carry the column without reading it.

### `task`

Tasks: Every live corpus

Tells the parser which row shape it is looking at. Math number lines, Theory Of Mind items, Mental Rotation ids, Same Different Selection selection counts, and Child Survey and Adult Reasoning choices are all special-cased on this value.

### `trial_num`

Tasks: Every live corpus

Order of the row inside its block. Same Different Selection matches a response back to the row with this number and `block_index`. Same Different Selection is the only task that reads it.

### `trial_type`

Tasks: Every live corpus

Which kind of trial the row is, such as a number line or a same-different card set. That choice selects the layout and the response rules.

### `animation_types`, `animation_targets`, and `animation_triggers`

Tasks: Math, Vocab, Theory Of Mind

Parallel lists for image animations on a trial. Types and targets say what moves, and triggers are either timestamps or audio ids for when it moves. The shared stimulus renderer reads them. They appear only in `math-item-bank-downex-pilot`, `vocab-item-bank-en-US`, and `theory-of-mind-item-bank-downex-pilot-tu`.

## Unused columns or additional columns

Other columns in corpus files may be carryovers from a full itembank export or an earlier implementation. They are not used at runtime, though some may be passed to our databases alongside other trial information and stored as part of the trial. If you are running your own implementation of the core-tasks code, columns can be added and utilized to determine any aspect of trial-level behaviour as needed. 
