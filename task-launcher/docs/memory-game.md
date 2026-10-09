# Memory Game (`memoryGame`, Corsi blocks)

Timeline source: `src/tasks/memory-game/`. See the [README](README.md) for the legend and shared conventions.

Each **trial** is a pair: a display trial (blocks light up in a random sequence), then an input trial (the child taps them back, in reverse order for backward trials). The sequence is generated when the display trial starts. Nothing about the sequence comes from a corpus.

## Set when the task starts

Two settings are fixed before the first screen. Both depend on the child's age (the `age` param, or the age from the birth month and year):

| Setting | Rule | Effect |
|---|---|---|
| **Instruction flow** | Heavy if the `heavyInstructions` variant param is on, **or** age ≤ 4 | Heavy: downward-extension instructions and practice, with short fixed-length sequences and hints. Otherwise: the default instructions and practice. |
| **Grid** | 3×3 (9 blocks) if age > 4, otherwise 2×2 (4 larger blocks) | Board size for the whole task, unless the fallback switches it |

That gives these starting combinations:

| | Grid | Instruction flow |
|---|---|---|
| age > 4 | 3×3 | default |
| age > 4, `heavyInstructions` on | 3×3 | heavy |
| age ≤ 4 | 2×2 | heavy (always) |
| age unknown | 2×2 | default, unless `heavyInstructions` is on |

The last row is a side effect: an unknown age is `NaN`, which is neither ≤ 4 nor > 4.

"Downex" (downward extension) is the same thing as the heavy flow: an easier version of the instructions and practice for younger children.

## Flow

Every forward trial, early or not, is skipped once errors reach `maxIncorrect` (see below). The two `heavyInstructions?` diamonds are decided when the timeline is built. The fallback changes some settings while the task runs, but it does not change which backward practice is used.

```mermaid
flowchart TD
    START([START]) --> HV{"heavyInstructions?<br/>(set at start)"}

    HV -- no --> DEF_I[Instructions]
    DEF_I --> DEF_P["Forward practice<br/>(display → input → feedback)"]
    DEF_P --> DEF_C{Last practice correct?}
    DEF_C -- no --> DEF_P2[Second round of practice] --> RTP1
    DEF_C -- yes --> RTP1[Ready-to-play screen]

    HV -- yes --> DX["Downward-extension instructions and practice<br/>(short fixed-length sequences, with hints;<br/>a wrong answer gets one retry with the next block pulsing)"]

    RTP1 --> F4
    DX --> F4

    subgraph EARLY["Early forward trials"]
        F4["Forward trial<br/>(display → input)"] --> FBC{"Fallback check passes?<br/>(first time only)"}
        FBC -- yes --> FALL["Switch to heavy mode and the smaller grid<br/>→ repeat-instructions message<br/>→ downward-extension forward practice"] --> F4N
        FBC -- no --> F4N{Early trials done?}
        F4N -- no --> F4
    end

    F4N -- yes --> FWD["Remaining forward trials<br/>(skipped once errors reach maxIncorrect)"]
    FWD --> RESET["Reset sequence length and error count<br/>for the backward phase"]
    RESET --> REV_I[Reverse-order instructions]
    REV_I --> HV2{"heavyInstructions?<br/>(set at start)"}
    HV2 -- no --> RP["Reverse practice<br/>→ second round if last failed"]
    HV2 -- yes --> RDX[Downward-extension reverse practice]
    RP --> RTP2[Ready-to-play screen]
    RDX --> RTP2
    RTP2 --> REV["Reverse trials<br/>(display → input)"]
    REV --> ERR{"Errors reach maxIncorrect?"}
    ERR -- yes --> STOP([Task ends early])
    ERR -- no, trials left --> REV
    ERR -- no, done --> END([END])
```

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
- **`maxIncorrect`** is a variant param (default 3).
- **Fixed-length practice:** heavy practice uses fixed lengths instead of the staircase, and leaves the staircase untouched.

These rules live in the input trial's `on_finish` in `trials/stimulus.ts`.

## Fallback (switching to the heavy flow mid-task)

After each of the early forward test trials, a check runs. It can pass at most once, and passes when **the last 2 forward answers were both wrong**. (`checkFallbackCriteria` reads the last 4 test-stage records, which are 2 display/input pairs, and counts wrong inputs.) If it passes:

1. `heavyInstructions` turns on, and the grid switches to 2×2 with larger blocks for the rest of the task.
2. The repeat-instructions message plays, then the downward-extension forward practice.
3. The forward test trials continue on the smaller grid.

The fallback does **not** reset the error count or the sequence length. Backward practice stays the one chosen at the start, but display prompts for the rest of the task use the heavy versions, because they check `heavyInstructions` as each trial runs.

## Not CAT

Memory game does not use computerized adaptive testing:

- **CAT** (in tasks like math, matrix reasoning and vocab) keeps an ability estimate (theta) from an IRT model. It updates the estimate after each answer and picks the next corpus item by its calibrated difficulty, stopping once the estimate is precise enough.
- **Memory game** has no item difficulties, no ability estimate and no item selection. Sequences are random, the length follows the staircase above, and it stops on a fixed number of errors. The `cat` / `runCat` param has no effect on it.

The timeline does call `initializeCat()`, but nothing in memory game reads or updates the result.
