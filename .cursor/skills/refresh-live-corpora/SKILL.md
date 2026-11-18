---
name: refresh-live-corpora
description: >-
  Check or refresh docs/live-corpora.md against corpus CSVs referenced by
  registered prod variants. Use only when the user explicitly asks to refresh,
  check, or update the live corpus list.
disable-model-invocation: true
---

# Refresh live corpora

`docs/live-corpora.md` lists the corpus CSVs that registered prod variants load. Prod variants change outside this repo, so the list goes stale without a code change.

Invoke this skill by name. It does not run on its own.

## Check

From the core-tasks repo root:

```bash
node utilities/render-live-corpora.js prod --check
```

Auth is Application Default Credentials when the user is already logged in with Google (`gcloud auth application-default login`). A service-account JSON path in `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS_PROD` also works, from the shell or a `.env` in `utilities/`, the repo root, or the current directory. The `prod` or `dev` argument selects the Firebase project and the assets bucket. `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, and `FIREBASE_PROJECT` are not used. Do not invent links or commit `.env`.

- Exit 0: say the live corpus list matches registered prod variants.
- Exit 1: the list is stale. Refresh it, then summarize what changed. Do not commit unless the user asks.

## Refresh

```bash
node utilities/render-live-corpora.js prod
```

Compare with `git diff -- docs/live-corpora.md` and report added, removed, and missing CSVs.

## Rules

- Do not hand-edit `docs/live-corpora.md`. `utilities/render-live-corpora.js` is the source of the list.
- A variant with no `params.corpus` still loads `defaultCorpus` in `task-launcher/src/tasks/shared/helpers/config.ts`. The script already applies that fallback.
- Tasks with no registered prod variants are omitted.
- Hearts-and-flowers, memory-game, and intro have no corpus file. That is expected.
- If credentials fail, report the error. Do not invent links.
