# Memory Game (`memoryGame`, Corsi blocks)

Timeline source: `src/tasks/memory-game/`. Corpus: `memory-game-item-bank`. See the [README](README.md) for the legend and shared conventions.

Each **trial** is a pair: a display trial (blocks light up in a random sequence), then an input trial (the child taps them back, in reverse order for backward trials). The sequence itself is always random and generated when the display trial starts. The corpus decides everything around it: the order of screens, how many practice and test trials there are, fixed practice lengths, cursor hints and audio cues (see "Corpus-driven structure").

## Set when the task starts

Two settings are fixed before the first screen. Both depend on the child's age (the `age` param, or the age from the birth month and year):

| Setting | Rule | Effect |
|---|---|---|
| **Instruction flow** | Heavy/downex if age ≤ 4 **or** if the `heavyInstructions` variant param is on (this param should be deprecated eventually) | Heavy: the corpus's downex rows, where a block has them. Otherwise: the main rows. |
| **Grid** | 3×3 (9 blocks) if age > 4, otherwise 2×2 (4 larger blocks) | Board size for the whole task, unless the fallback switches it |

## Corpus-driven structure

The timeline is built from the corpus, **one row per screen or trial, in corpus order**. The corpus has two sets of rows: main rows (`downex` FALSE) and downex rows (`downex` TRUE). For each `block_index`, a heavy run uses that block's downex rows if it has any, and the main rows otherwise. A default run always uses the main rows.

| Row | `assessment_stage` | `trial_type` | Becomes |
|---|---|---|---|
| Instruction screen | `instructions` | `instructions` | One screen: `audio_file` (one key) plays, `image` (image or video) is shown |
| Practice trial | `practice_response` | `forward` or `backward` | Display → input → feedback. How a wrong answer is handled depends on the flow (see below). |
| Test trial | `test_response` | `forward` or `backward` | Display → input, no feedback. Moves the staircase. |
| Feedback | `feedback` | `forward` or `backward` | Not played in order (no `block_index`). Holds one feedback prompt in `audio_file`, which practice rows point to by `item_id`. |

Other columns:

- **`item`:** a fixed sequence length for that trial. Blank uses the current staircase length.
- **`image` = `cursor`** (downex practice rows only): a guided trial. A cursor sits on the next block to press and the other blocks are disabled.
- **`audio_file`** on a trial row: `"display,input"`, the cues for the two screens. Blank uses the defaults: `memoryGameDisplay` (or `memoryGameInstruct7Downex` when `heavyInstructions` is on) for display, and `memoryGameInstruct8Downex` / `memoryGameInstruct11Downex` for forward / backward input. The on-screen text is the translation of that same key. The `prompt` column isn't read.
- **`feedback_item_ids`** (practice rows only): `"correct,incorrect"`, the `item_id`s of the feedback rows to use after a correct and a wrong answer, looked up among the rows with the same `downex` value. Either part can be blank, which means nothing happens after that kind of answer.

**Default practice:** consecutive practice rows with the same `trial_type` form one run. After each trial, a correct answer gets the feedback screen with the correct prompt in place of "correct". A wrong answer gets the feedback screen's "not quite right", then the incorrect prompt as a try-again. If the run's last answer is wrong, the whole run plays once more, and the last trial of the replay gets feedback only if it's correct.

**Heavy practice:** each row is one trial. A correct answer gets the feedback screen with the correct prompt. A wrong answer gets no feedback screen. Instead there's a single input-only retry with the next block pulsing, and the incorrect prompt as its cue.

### Corpus checks

The task fails to start with a `Corpus validation failed` error if:

- there are no test rows (the corpus is missing or failed to load)
- there are no downex forward practice rows to replay on fallback
- an instruction row has no `audio_file`, more than one, or an `image` that isn't a known image or video
- a row has an unknown `assessment_stage` or `trial_type`
- a row other than a downex practice row is guided (`image` = `cursor`)
- `item` isn't a positive whole number
- a trial row's `audio_file` isn't blank or exactly two keys
- a feedback row has no `audio_file`, or more than one
- a non-practice row has `feedback_item_ids`, or it isn't exactly two parts
- `feedback_item_ids` names a feedback row that doesn't exist (with the same `downex` value)
- a feedback row is unused, used as both correct and incorrect, or two feedback rows share an `item_id`

## Legend

The legend at the bottom of the chart explains the colors, line styles and shapes. Colors apply to nodes, arrows and arrow labels. Following only solid arrows takes you from START to END. Also:

- `(xN)`: the step repeats N times (once if absent).
- `Age≤4` / `Age>4` on an arrow: the downex or default flow, chosen when the task starts (see "Set when the task starts"). "Age≤4" also covers runs with the `heavyInstructions` param on.

```mermaid
%%{init: {"themeCSS": ".edgeLabel, .edgeLabel p, .labelBkg { background-color: transparent !important; } .edgeLabel rect { fill: transparent !important; opacity: 0 !important; }"}}%%
flowchart TD
    START([START])
    START -- Age≤4 --> FWD_PRAC_INST_DX
    START -- Age>4 ----> FWD_PRAC_INST

    subgraph FORWARD_PRACTICE["FORWARD PRACTICE"]
        FWD_PRAC_INST_DX("Practice instructions (heavier) + guided 1 block-long practice trial") --> FWD_PRAC_TRIALS_DX_LEN1("Forward practice with 1 block-long sequences (x2)<br/>(1 retry chance each)") --> FWD_PRAC_INSTR_DX_LEN2("Guided 2 blocks-long practice trial") --> FWD_PRAC_TRIALS_DX_LEN2("Forward practice with 2 blocks-long sequences (x2)<br/>(1 retry chance each)")
        FWD_PRAC_INST("Practice instructions") --> FWD_PRAC_TRIALS("Forward practice trials with feedback (x3)") 
        FWD_PRAC_TRIALS --> THIRD_TRIAL_CHECK{"3rd trial incorrect?"} -. Yes, 1st time .-> FWD_PRAC_TRIALS
    end

    FWD_PRAC_TRIALS_DX_LEN2 --> FWD_TRIALS_INSTR
    THIRD_TRIAL_CHECK{"3rd trial incorrect?"} -- No --> FWD_TRIALS_INSTR
    THIRD_TRIAL_CHECK{"3rd trial incorrect?"} -. Yes, 2nd time .-> FWD_TRIALS_INSTR

    FALLBACK_CHECK -. Yes: restart in Age ≤ 4 mode .-> FORWARD_PRACTICE

    subgraph FWD_TEST["&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FORWARD TEST TRIALS"]
        FWD_TRIALS_FIRST("Forward trials 1-4<br/>*length +1 after every 2 consecutive correct<br/>*max length 8")
        FWD_TRIALS_INSTR -- Age≤4: block length starts at 2, 2x2 grid --> FWD_TRIALS_FIRST --Age≤4--> FWD_TRIALS_REST
        FWD_TRIALS_INSTR("Test trials instructions") -- Age>4: block length starts at 2, 3x3 grid --> FWD_TRIALS_FIRST
        FWD_TRIALS_FIRST -- Age>4 --> FALLBACK_CHECK{"Fallback check: Last 2 trials both wrong?"}
        FALLBACK_CHECK -- No --> FWD_TRIALS_REST
        FWD_TRIALS_REST("Forward test trials 5-14<br/>*length +1 after every 2 consecutive correct<br/>*max length 8") .->THIRD_ERROR{"Accumulated three errors"} -. Remaining trials skipped .-> RESET["Before backward:<br/>error count resets to 0"]
        FWD_TRIALS_REST -- "All 14 trials played" --> RESET
    end
    
    RESET -- Age>4 --> BWD_PRAC_INST
    RESET -- Age≤4 --> BWD_PRAC_INST_DX

    subgraph BWD_PRACTICE["BACKWARD PRACTICE"]
        BWD_PRAC_INST("Practice instructions") --> BWD_PRAC_TRIALS("Practice trials with feedback (x3)") 
        BWD_PRAC_TRIALS --> BWD_THIRD_TRIAL_CHECK{"3rd trial incorrect?"} -. Yes, 1st time .-> BWD_PRAC_TRIALS

        BWD_PRAC_INST_DX("Practice instructions (heavier) + guided practice trial") --> BWD_PRAC_TRIALS_DX_LEN2("Practice with 2 block-long sequences (x2)<br/>(1 retry chance each)")
    end

    BWD_PRAC_TRIALS_DX_LEN2 --> BWD_TRIALS_INSTR
    BWD_THIRD_TRIAL_CHECK -- No --> BWD_TRIALS_INSTR
    BWD_THIRD_TRIAL_CHECK -. Yes, 2nd time .-> BWD_TRIALS_INSTR

    subgraph BWD_TEST["BACKWARD TEST TRIALS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"]
        BWD_TRIALS("Backward trials<br/>*length +1 after every 2 consecutive correct<br/>*max length 8<br/>(x12)")
        BWD_TRIALS_INSTR("Test trials instructions") -- Age≤4: block sequence length starts at 2; 2x2 grid --> BWD_TRIALS
        BWD_TRIALS_INSTR("Test trials instructions") -- Age>4 --> START_LEN{"Child progressed to 3 blocks-long sequences in forward section?"}
        START_LEN -- Yes: block sequence length starts at 3; 3x3 grid --> BWD_TRIALS
        START_LEN -- No: block sequence length starts at 2; 3x3 grid --> BWD_TRIALS
        BWD_TRIALS .-> BWD_THIRD_ERROR{"Accumulated 3 errors"} .-> STOP(["Task ends early<br/>(error out)"])
        BWD_TRIALS -- All 12 trials played --> END([END])
    end

    %% Legend: keep it after all other arrows so it doesn't shift the linkStyle numbers below
    subgraph LEGEND["LEGEND"]
        direction LR
        LG_DX("Downex (age ≤ 4) only"):::downex
        LG_NDX("Non-downex (age > 4) only"):::nondownex
        LG_BOTH("Both flows")
        LG_TERM(["Start / end"])
        LG_STEP("Screen or trials")
        LG_CHECK{"Check"}
        LG_A1[" "] --> LG_A2["If all goes well"]
        LG_A3[" "] .-> LG_A4["If something doesn't go well"]
        %% invisible links lay each legend row out left to right
        LG_DX ~~~ LG_NDX ~~~ LG_BOTH
        LG_TERM ~~~ LG_STEP ~~~ LG_CHECK
    end
    STOP ~~~ LEGEND

    classDef default fill:#FFFFFF,stroke:#1a1a1a,color:#1a1a1a
    classDef downex fill:#FDEBD3,stroke:#C7711A,color:#1a1a1a
    classDef nondownex fill:#DCEBFA,stroke:#2F6FB5,color:#1a1a1a
    class FWD_PRAC_INST_DX,FWD_PRAC_TRIALS_DX_LEN1,FWD_PRAC_INSTR_DX_LEN2,FWD_PRAC_TRIALS_DX_LEN2,BWD_PRAC_INST_DX,BWD_PRAC_TRIALS_DX_LEN2 downex
    class FWD_PRAC_INST,FWD_PRAC_TRIALS,THIRD_TRIAL_CHECK,BWD_PRAC_INST,BWD_PRAC_TRIALS,BWD_THIRD_TRIAL_CHECK,FALLBACK_CHECK,START_LEN nondownex
    style RESET stroke:none,fill:none
    %% diamonds: no background, keep the border color from their class
    style THIRD_TRIAL_CHECK fill:none
    style FALLBACK_CHECK fill:none
    style BWD_THIRD_TRIAL_CHECK fill:none
    style START_LEN fill:none
    style THIRD_ERROR fill:none
    style BWD_THIRD_ERROR fill:none
    style LG_CHECK fill:none
    %% legend arrow endpoints are invisible
    style LG_A1 fill:none,stroke:none
    style LG_A2 fill:none,stroke:none
    style LG_A3 fill:none,stroke:none
    style LG_A4 fill:none,stroke:none

    %% section boxes: light grey instead of the default theme's yellow
    style FORWARD_PRACTICE fill:#F4F4F4,stroke:#C8C8C8
    style FWD_TEST fill:#F4F4F4,stroke:#C8C8C8
    style BWD_PRACTICE fill:#F4F4F4,stroke:#C8C8C8
    style BWD_TEST fill:#F4F4F4,stroke:#C8C8C8
    style LEGEND fill:#FFFFFF,stroke:#C8C8C8

    %% Arrow colors go by arrow order (0 = first arrow written, each segment of a chain counts).
    %% Adding, removing or reordering an arrow above shifts these numbers.
    linkStyle 17,18,19,33,34,35,36,37 stroke:#1a1a1a,stroke-width:2px,color:#1a1a1a
    linkStyle 0,2,3,4,8,12,13,21,25,26,29 stroke:#C7711A,stroke-width:2px,color:#9A5410
    linkStyle 1,5,6,7,9,10,11,14,15,16,20,22,23,24,27,28,30,31,32 stroke:#2F6FB5,stroke-width:2px,color:#1F4E85
```

Test trials played: forward 3–14, backward 3–12, whole task 6–26. A run counts as complete at 21 test trials (80% of 26). See the next section.

## Trial counts and when the task stops

Counts below are for the current corpus, with the error budget from the `maxIncorrect` variant param at its default of 3. A "trial" is one display + input pair.

### Per block

| Block | Default flow | Heavy flow |
|---|---|---|
| Forward practice | 3 trials with feedback. If the 3rd is wrong, all 3 are replayed (the last gets feedback only if correct): **3 or 6** | 6 trials at lengths 1, 1, 1, 2, 2, 2. Each wrong answer on one of the 4 unguided trials adds one input-only retry with the next block pulsing: **6 trials, plus 0–4 retries** |
| Fallback replay (at most once, during the early forward trials) | the heavy forward practice: **6 trials, plus 0–4 retries** | same |
| Forward test | **at most 14**, at least 3 | same |
| Backward practice | 3 trials with feedback, all 3 replayed if the 3rd is wrong: **3 or 6** | 3 trials (1 guided at the staircase length, then 2 at length 2). The 2 unguided trials can each add a retry: **3, plus 0–2 retries** |
| Backward test | **at most 12**, at least 3 | same |

Practice trials never count as test trials, toward the error budget, or toward completion.

### Maximum vs. early termination

| | Ends when | Test trials played |
|---|---|---|
| **Forward phase** | all 14 played, **or** the 3rd error (the remaining forward trials are skipped and backward starts) | 3–14 |
| **Backward phase** | all 12 played, **or** the 3rd error, which **ends the whole task** (`errorOut`) | 3–12 |
| **Whole task** | all trials done, the 3rd backward error, `maxTime` reached (default 100 minutes, `timeOut`), or the experimenter exits | **6–26** |

The minimum of 3 per phase means 3 wrong in a row. Errors are a running total, so a phase usually ends later than that, with some correct answers in between.

### Sequence lengths reached

- **Forward:** starts at 2 and goes up 1 after every 2 correct in a row. With all 14 correct, trials go 2, 2, 3, 3, … 8, 8, so the **maximum is 8**.
- **Backward:** starts at 3 if the child got past length 3 going forward, otherwise 2. With all 12 correct, the maximum is **8** from a start of 3, or **7** from a start of 2. It can be 1 higher if a forward streak carries over (see "How difficulty adapts").

### Completion

A run counts as complete (`recordCompletion`) once the test-trial count reaches **80% of 26**, so 21 test trials, whether or not the task ended early afterwards.

- If forward ends early on errors, the count jumps as if all forward trials had been played, so the child is still counted as complete after enough backward trials.
- **Counting bug:** the count is set to the number of forward trials (14), and then the trial that just ended is added, giving 15. So completion is reached one backward trial early (6 instead of 7).

## How difficulty adapts

Difficulty is the **sequence length** (how many blocks light up). It follows a simple staircase that **only goes up**, and it only changes on test trials. Practice trials never change the length or the error count.

```mermaid
flowchart TD
    IN["Test input trial answered"] --> C{Correct?}
    C -- yes --> S["Streak + 1"]
    S --> S2{"Streak reached<br/>2 in a row?"}
    S2 -- yes --> UP["Sequence length + 1<br/>streak resets"]
    S2 -- no --> NEXT
    UP --> NEXT[Next trial]
    C -- no --> W["Streak resets<br/>errors + 1<br/>(length stays the same)"]
    W --> M{"Errors reached<br/>maxIncorrect?"}
    M -- no --> NEXT
    M -- "yes, forward" --> SKIP["Skip the remaining forward trials<br/>→ backward phase"]
    M -- "yes, backward" --> STOP([Task ends early])
```

- **Starting length:** 2 for forward. For backward: 3 if the child got past length 3 going forward, otherwise 2.
- **Errors are a running total, not consecutive.** A correct answer resets the streak but not the error count. The error count resets once, before the backward phase.
- **The streak is not reset before the backward phase.** If the forward phase ends partway through a streak, the first correct backward test trial raises the length.
- **`maxIncorrect`** is a variant param (default 3).
- **Practice uses the staircase length unless `item` is set.** Rows with a fixed `item` use that length. Rows without one, like the main practice rows and the guided heavy backward row, use the current length without changing it.

These rules live in the input trial's `on_finish` in `trials/stimulus.ts`.

## Fallback (switching to the heavy flow mid-task)

After each of the first 4 forward test trials (`FALLBACK_CHECK_TRIALS`), a check runs. It can pass at most once, and passes when **the last 2 forward answers were both wrong**. (`checkFallbackCriteria` reads the last 4 test-stage records, which are 2 display/input pairs, and counts wrong inputs.) So it can't pass after the first trial, only after the second, third or fourth. If it passes:

1. `heavyInstructions` turns on, and the grid switches to 2×2 with larger blocks for the rest of the task.
2. The repeat-instructions message plays, then the downex forward practice is replayed. That's the downex rows of its block, starting at the first practice row, so the intro screen is skipped.
3. The forward test trials continue on the smaller grid.

The fallback does **not** reset the error count or the sequence length. The 2 errors that triggered it still count toward `maxIncorrect`, so with the default of 3, one more forward error ends the forward phase.

The rows were picked when the timeline was built, so a child who falls back keeps playing the **main** rows: the main forward and backward test trials, and the default backward practice. Cues set in a row's `audio_file` don't change. Only blank cells switch to the heavy display cue, because the default checks `heavyInstructions` as each trial runs.

## Not CAT

Memory game does not use computerized adaptive testing:

- **CAT** (in tasks like math, matrix reasoning and vocab) keeps an ability estimate (theta) from an IRT model. It updates the estimate after each answer and picks the next corpus item by its calibrated difficulty, stopping once the estimate is precise enough.
- **Memory game** has no item difficulties, no ability estimate and no item selection. Sequences are random, the length follows the staircase above, and it stops on a fixed number of errors. The `cat` / `runCat` param has no effect on it.

The timeline does call `initializeCat()`, but nothing in memory game reads or updates the result.
