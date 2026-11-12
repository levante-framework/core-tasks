#!/usr/bin/env bash
# Launch params come from two sources: userParams and gameParams and are read by the TaskLauncher index.ts.
# They are also destructured from the shared config object in setSharedConfig.
# For each launch param, count reads per file in task-launcher/src on origin/main.
# config.ts and taskStore/index.ts are excluded because they copy every param;
# taskStore/index.ts also derives values (age, heavyInstructions, experimenterButtons), so read it by hand.
# Run from the core-tasks repo root after `git fetch origin`.

REF=${1:-origin/main}

PARAMS=(
  # gameParams read directly by TaskLauncher index.ts
  taskName language demoMode
  # userParams
  birthMonth birthYear
  # setSharedConfig destructure
  corpus age userMetadata maxTime maxIncorrect cat semThreshold startingTheta
  heavyInstructions experimenterButtons version taskVersion numberOfStories bubblePractice
  buttonLayout audioFeedback sequentialStimulus storeItemId debug showAudioKeys
  keyHelpers stimulusBlocks inferenceNumStories
  sequentialPractice numberOfTrials numOfPracticeTrials skipInstructions _isPaused
  # passed in by serve.js and read as config.pid, but never destructured, so it never reaches config
  pid
  # names that only exist in config/taskStore
  runCat corpusId startTime isRoarApp
)

echo "ref: $REF ($(git rev-parse --short "$REF"))"
for p in "${PARAMS[@]}"; do
  out=$(git grep -cw "$p" "$REF" -- task-launcher/src \
    ':!*helpers/config.ts' ':!*taskStore/index.ts' ':!*.test.*' ':!*/i18n/*' ':!*.csv' \
    | sed "s|^$REF:task-launcher/src/||")
  n=$(printf "%s" "$out" | grep -c .)
  echo "== $p  ($n files)"
  [ -n "$out" ] && printf "%s\n" "$out" | sed 's/^/   /'
done
