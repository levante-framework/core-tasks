---
name: refresh-corpus-columns
description: >-
  Update docs/corpus-columns.md from the columns on live prod corpus CSVs and
  from where the task runner reads them. Use only when the user explicitly asks
  to refresh, check, or update the corpus column guide.
disable-model-invocation: true
---

# Refresh corpus columns

`docs/corpus-columns.md` says what each column on a live corpus CSV is for, and which tasks it applies to. Invoke this skill by name. It does not run on its own.

## Update

1. Read `docs/live-corpora.md`. Collect the CSV URLs. Skip files marked missing on GCS.
2. Fetch only the header row of each CSV. A task applies to a column when any of its live corpus files has that header. Hearts and Flowers, Memory, and Intro have no live corpus, so leave them out.
3. For each column, search `task-launcher/src` for the header name and for the camelCase field the parser stores. Note whether a task reads the column, or only carries it.
4. Rewrite the entries in `docs/corpus-columns.md`. Each entry starts with a `Tasks:` line. Use `Tasks: Every live corpus` when all nine live tasks have the column. Otherwise list the task names, in the order used by the headings in `docs/live-corpora.md`. Then one or two sentences on what the column is for. Say which task reads it, and say the others carry it when they do not.
5. Keep the closing section on carryover columns as it is unless the header sets have changed in a way that affects it.
6. Do not commit unless the user asks.

## Rules

- Do not invent columns that are absent from the live headers.
- Do not describe a column as used because a task stores it. Name the code that reads it.
- Do not put the task list at the end of an entry. It goes on the `Tasks:` line at the top.
- Do not add group labels for sets of tasks. Name the tasks. The only defined term is "Every live corpus", which the intro of the guide defines.
- Do not add a per-column unused table. Carryover columns are covered by the closing section.
- `de`, `en`, and `es` are not column names. Do not add a note about locale codes.
