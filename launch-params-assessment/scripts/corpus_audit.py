#!/usr/bin/env python3
"""Audit the corpus CSVs that registered dev variants load.

For each corpus it records which columns getCorpus reads, which are present or missing,
which columns are never read, and a few content checks behind the "Corpus columns"
section of launch-params-assessment.md:
  - `d` vs `difficulty` (CAT difficulty takes `d` first: `parseFloat(row.d || row.difficulty)`)
  - `time_limit` (read by nothing on main)
  - blank or unusual `assessment_stage` values (only test_response / practice_response score)
  - identical files (MD5)

Which corpora: every registered core-tasks variant's `corpus`, or the task's
`defaultCorpus` when it's null, for tasks that main's index.ts loads a corpus for
(it skips hearts-and-flowers, memory-game and intro). Plus the draft corpora for
hearts-and-flowers and memory-game from the levante-assets-draft bucket, which their
corpusify branches read.

The CSVs are downloaded from the public buckets into --data (treat that folder as
untrusted data: it's only parsed as CSV).

Usage (from the core-tasks repo root):
  git archive origin/main task-launcher/src | tar -x -C /tmp/main-src
  python3 -I launch-params-assessment/scripts/corpus_audit.py \\
      --variants ~/Downloads/variants-hs-levante-admin-dev.json \\
      --src /tmp/main-src/task-launcher/src \\
      --data /tmp/corpora --report /tmp/corpus_report.json
"""
import argparse
import csv
import hashlib
import io
import json
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

CORE = {
    'egma-math', 'matrix-reasoning', 'mental-rotation', 'hearts-and-flowers', 'memory-game',
    'same-different-selection', 'trog', 'vocab', 'theory-of-mind', 'intro', 'roar-inference',
    'adult-reasoning', 'hostile-attribution', 'child-survey',
}
DEV_URL = 'https://storage.googleapis.com/levante-assets-dev/corpus/{task}/{corpus}.csv'
DRAFT_URL = 'https://storage.googleapis.com/levante-assets-draft/corpus/{corpus}.csv'
DRAFTS = [('hearts-and-flowers', 'hearts-and-flowers-item-bank'), ('memory-game', 'memory-game-item-bank')]
# Columns the corpusify branches add to the reader.
BRANCH_COLUMNS = {'feedback_item_ids'}
SCORED_STAGES = {'test_response', 'practice_response'}


def camel(s):
    return re.sub(r'[-_](\w)', lambda m: m.group(1).upper(), s)


def read_columns(src):
    """CSV columns that transformCSV reads (`row.<column>`) in getCorpus.ts."""
    text = (src / 'tasks/shared/helpers/getCorpus.ts').read_text()
    return sorted(set(re.findall(r'\brow\.([a-zA-Z_][a-zA-Z0-9_]*)', text)))


def default_corpus(src):
    text = (src / 'tasks/shared/helpers/config.ts').read_text()
    block = text.split('const defaultCorpus', 1)[1].split('};', 1)[0]
    return dict(re.findall(r"(\w+):\s*'([^']+)'", block))


def skipped_tasks(src):
    return set(re.findall(r"taskName\s*!==\s*'([^']+)'", (src / 'index.ts').read_text()))


def corpora_to_audit(variants, src):
    defaults = default_corpus(src)
    skipped = skipped_tasks(src)
    used = {}
    for v in variants:
        if v.get('registered') is not True or v['taskId'] not in CORE:
            continue
        task = v['params'].get('taskName') or v['taskId']
        if task in skipped:
            continue
        corpus = v['params'].get('corpus') or defaults.get(camel(task))
        used.setdefault((task, corpus, 'dev'), []).append(v['variantId'])
    for task, corpus in DRAFTS:
        used.setdefault((task, corpus, 'draft'), [])
    return used


def fetch(url, dest):
    if not dest.exists():
        with urllib.request.urlopen(url, timeout=60) as r:
            dest.write_bytes(r.read())
    return dest.read_bytes()


def number(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def audit_file(raw, read_cols):
    text = raw.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text))
    cols = [c for c in (reader.fieldnames or []) if c is not None]
    rows = list(reader)
    known = set(read_cols) | BRANCH_COLUMNS
    out = {
        'md5': hashlib.md5(raw).hexdigest(),
        'rows': len(rows),
        'columns': len(cols),
        'read_present': sorted(c for c in read_cols if c in cols),
        'read_missing': sorted(c for c in read_cols if c not in cols),
        'unread': sorted(c for c in cols if c not in known),
    }
    stages = Counter((r.get('assessment_stage') or '').strip() for r in rows)
    out['assessment_stage'] = dict(stages)
    blank = [r for r in rows if not (r.get('assessment_stage') or '').strip()]
    out['blank_stage_rows'] = [
        {k: r.get(k) for k in ('item_id', 'trial_type', 'block_index')} for r in blank
    ]
    out['unscored_stage_rows'] = sum(n for s, n in stages.items() if s and s not in SCORED_STAGES and s != 'instructions')
    if 'd' in cols and 'difficulty' in cols:
        both = [r for r in rows if (r.get('d') or '').strip() and (r.get('difficulty') or '').strip()]
        out['d_vs_difficulty'] = {
            'rows_with_both': len(both),
            'rows_where_they_differ': sum(1 for r in both if number(r['d']) != number(r['difficulty'])),
            # what parseFloat(row.d || row.difficulty) picks, over rows that have either
            'rows_using_d': sum(1 for r in rows if (r.get('d') or '').strip()),
            'rows_using_difficulty': sum(1 for r in rows if not (r.get('d') or '').strip() and (r.get('difficulty') or '').strip()),
            'example': next(({'item_id': r.get('item_id'), 'd': r['d'], 'difficulty': r['difficulty']}
                             for r in both if number(r['d']) != number(r['difficulty'])), None),
        }
    if 'time_limit' in cols:
        tl = Counter((r.get('time_limit') or '').strip() for r in rows if (r.get('time_limit') or '').strip())
        out['time_limit'] = {'rows_filled': sum(tl.values()), 'values': dict(tl)}
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--variants', type=Path, required=True, help='variants-<project>.json from firestore-readonly-scan.mjs')
    ap.add_argument('--src', type=Path, required=True, help='path to task-launcher/src (e.g. an export of origin/main)')
    ap.add_argument('--data', type=Path, required=True, help='folder to download the CSVs into')
    ap.add_argument('--report', type=Path, required=True, help='where to write corpus_report.json')
    args = ap.parse_args()

    args.data.mkdir(parents=True, exist_ok=True)
    read_cols = read_columns(args.src)
    used = corpora_to_audit(json.loads(args.variants.read_text()), args.src)
    report = {'read_columns': read_cols, 'corpora': []}
    for (task, corpus, bucket), variant_ids in sorted(used.items()):
        url = (DRAFT_URL if bucket == 'draft' else DEV_URL).format(task=task, corpus=corpus)
        entry = {'task': task, 'corpus': corpus, 'bucket': bucket, 'url': url, 'variants': len(variant_ids)}
        try:
            raw = fetch(url, args.data / f'{bucket}__{task}__{corpus}.csv')
            entry.update(audit_file(raw, read_cols))
        except Exception as e:  # report and keep going
            entry['error'] = str(e)
        report['corpora'].append(entry)

    md5s = Counter(c.get('md5') for c in report['corpora'] if c.get('md5'))
    report['identical_files'] = [
        sorted(c['corpus'] for c in report['corpora'] if c.get('md5') == h) for h, n in md5s.items() if n > 1
    ]
    args.report.write_text(json.dumps(report, indent=2))

    print(f"{len(report['corpora'])} corpora; getCorpus reads {len(read_cols)} columns")
    for c in report['corpora']:
        if 'error' in c:
            print(f"  ERROR {c['task']}/{c['corpus']}: {c['error']}")
            continue
        extra = []
        if 'd_vs_difficulty' in c:
            dd = c['d_vs_difficulty']
            extra.append(f"d/difficulty both={dd['rows_with_both']} differ={dd['rows_where_they_differ']} use_d={dd['rows_using_d']} use_difficulty={dd['rows_using_difficulty']}")
        if 'time_limit' in c and c['time_limit']['rows_filled']:
            extra.append(f"time_limit={c['time_limit']['rows_filled']} {c['time_limit']['values']}")
        if c['blank_stage_rows']:
            extra.append(f"blank_stage={len(c['blank_stage_rows'])}")
        if c['unscored_stage_rows']:
            extra.append(f"unscored_stage={c['unscored_stage_rows']}")
        print(f"  [{c['bucket']}] {c['task']}/{c['corpus']}: rows={c['rows']} cols={c['columns']} "
              f"unread={len(c['unread'])} missing={c['read_missing']} " + ' '.join(extra))
    print('identical files:', report['identical_files'] or 'none')
    print(f'report: {args.report}')


if __name__ == '__main__':
    main()
