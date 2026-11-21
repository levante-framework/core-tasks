#!/usr/bin/env python3
"""Build the "Which tasks read each parameter" matrix for core-tasks.

Method (same as described in launch-params-assessment.md):
  1. Start from each task's timeline file(s).
  2. Follow every relative import to the file that *defines* each imported name,
     resolving through barrel files (`export * from`, `export { x } from`).
     Barrels themselves aren't counted unless they define the name.
  3. Don't follow imports into the root `src/index.ts` (trial files import
     `mediaAssets` from it, and it imports every task).
  4. Add the launch path, which runs for every task before its timeline is built:
     the root `src/index.ts` itself (not its imports), plus `getCorpus.ts` for every
     task that `index.ts` doesn't skip.
  5. In every file reached, look for `taskStore().<key>`, `config.<key>`, or a
     destructure `{ ... } = taskStore()` / `= config`. `taskStore/index.ts` and
     `shared/helpers/config.ts` are skipped: they copy every key, so they'd match all
     of them (the same exclusion as launch-params-grep.sh).

`corpus` gets two rows: "file to load" (read on the launch path, by getCorpus) and
"on trials" (read on the timeline path, where trials copy it into trial data).

The check is per file, not per function, so a shared file that reads a key in
one function counts as "read" for every task that imports anything from it.

Usage (from the core-tasks repo root):
  git archive origin/main task-launcher/src | tar -x -C /tmp/main-src
  python3 -I launch-params-assessment/scripts/param_matrix.py /tmp/main-src/task-launcher/src
  python3 -I launch-params-assessment/scripts/param_matrix.py <src> --why            # files behind each cell
  python3 -I launch-params-assessment/scripts/param_matrix.py <src> --compare launch-params-assessment/launch-params-assessment.md
"""
import argparse
import re
import sys
from pathlib import Path

# Column -> timeline file(s), relative to src/. MR and SDS pick a timeline by `runCat`
# in taskConfig.ts, so both files count. hostile-attribution uses the ToM timeline.
TASKS = {
    'math': ['tasks/math/timeline.ts'],
    'matrix': ['tasks/matrix-reasoning/timeline.ts'],
    'MR': ['tasks/mental-rotation/timeline.ts', 'tasks/mental-rotation/catTimeline.ts'],
    'H&F': ['tasks/hearts-and-flowers/timeline.ts'],
    'memory': ['tasks/memory-game/timeline.ts'],
    'SDS': ['tasks/same-different-selection/timeline.ts', 'tasks/same-different-selection/catTimeline.ts'],
    'TROG': ['tasks/trog/timeline.ts'],
    'vocab': ['tasks/vocab/timeline.ts'],
    'ToM': ['tasks/theory-of-mind/timeline.ts'],
    'intro': ['tasks/intro/timeline.ts'],
    'inference': ['tasks/roar-inference/timeline.ts'],
    'adult': ['tasks/adult-reasoning/timeline.ts'],
    'survey': ['tasks/child-survey/timeline.ts'],
}

# Param -> the names it has in `config` / `taskStore`.
PARAMS = {
    'taskName': ['task', 'taskName'],
    'language': ['language'],
    'demoMode': ['demoMode'],
    'maxTime': ['maxTime'],
    'showAudioKeys': ['showAudioKeys'],
    'experimenterButtons': ['experimenterButtons'],
    'startingTheta': ['startingTheta'],
    'corpus': ['corpus'],
    'sequentialStimulus': ['sequentialStimulus'],
    'cat': ['cat', 'runCat'],
    'semThreshold': ['semThreshold'],
    'heavyInstructions': ['heavyInstructions'],
    'maxIncorrect': ['maxIncorrect'],
    'version': ['version'],
    'buttonLayout': ['buttonLayout'],
    'audioFeedback': ['audioFeedback'],
    'storeItemId': ['storeItemId'],
    'debug': ['debug'],
    'numberOfStories': ['numberOfStories'],
    'bubblePractice': ['bubblePractice'],
    'keyHelpers': ['keyHelpers'],
    'stimulusBlocks': ['stimulusBlocks'],
    'inferenceNumStories': ['inferenceNumStories'],
    # age is only read through the values setTaskStore derives from it
    'age (direct)': ['age', 'numOfBlocks', 'blockSize', 'gridSize'],
}

# Files that copy every key; reading them would mark every param as read.
COPY_ONLY = ['taskStore/index.ts', 'tasks/shared/helpers/config.ts']

EXTS = ['.ts', '.js', '.tsx', '/index.ts', '/index.js']
IMPORT_RE = re.compile(r'\bimport\s+(type\s+)?([\s\S]*?)\s+from\s+[\'"]([^\'"]+)[\'"]')
SIDE_EFFECT_RE = re.compile(r'\bimport\s+[\'"]([^\'"]+)[\'"]')
REEXPORT_RE = re.compile(r'\bexport\s+(type\s+)?(\*|\{[\s\S]*?\})\s+from\s+[\'"]([^\'"]+)[\'"]')
# Sources a param can be read from. `this.gameParams` only appears in the root index.ts.
SOURCES = r'(?:taskStore\(\)|\bconfig\b|\bthis\.gameParams\b)'
DESTRUCTURE_RE = re.compile(r'(?:const|let|var)\s*\{([^}]*)\}\s*(?::[^=]+)?=\s*' + SOURCES)

# Reads that the per-file check can't see are gated to one task. getCorpus.ts runs
# for every corpus task, but only reads these inside `if (task === 'roar-inference')`.
GATED = {
    ('tasks/shared/helpers/getCorpus.ts', 'inferenceNumStories'): 'roar-inference',
    ('tasks/shared/helpers/getCorpus.ts', 'stimulusBlocks'): 'roar-inference',
}


def strip_comments(text):
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    return re.sub(r'(^|[^:])//[^\n]*', r'\1', text)


class Project:
    def __init__(self, src):
        self.src = src.resolve()
        self.root_index = (self.src / 'index.ts').resolve()
        self._text = {}

    def text(self, path):
        if path not in self._text:
            self._text[path] = strip_comments(path.read_text(errors='replace'))
        return self._text[path]

    def resolve(self, from_file, spec):
        if not spec.startswith('.'):
            return None  # package import
        base = (from_file.parent / spec)
        for ext in [''] + EXTS:
            p = Path(str(base) + ext) if ext else base
            if p.is_file():
                return p.resolve()
        return None

    @staticmethod
    def names(clause):
        """Names imported by an import clause: ('named', orig) / ('default',) / ('namespace',)."""
        out = []
        clause = clause.strip()
        m = re.search(r'\{([\s\S]*)\}', clause)
        if m:
            for part in m.group(1).split(','):
                part = re.sub(r'^\s*type\s+', '', part).strip()
                if part:
                    out.append(('named', part.split(' as ')[0].strip()))
            clause = clause[:m.start()] + clause[m.end():]
        clause = clause.strip().strip(',').strip()
        if clause.startswith('* as'):
            out.append(('namespace',))
        elif clause:
            out.append(('default',))
        return out

    def defines_locally(self, path, name):
        t = self.text(path)
        if re.search(r'\bexport\s+(default\s+)?(async\s+)?(function\*?|const|let|var|class|type|interface|enum)\s+'
                     + re.escape(name) + r'\b', t):
            return True
        for m in re.finditer(r'\bexport\s*\{([^}]*)\}(?!\s*from)', t):
            if any(p.split(' as ')[-1].strip() == name for p in m.group(1).split(',')):
                return True
        return False

    def defining_files(self, path, name, seen=None):
        """Files that define `name` as exported from `path`, following re-exports."""
        seen = seen or set()
        if (path, name) in seen:
            return set()
        seen.add((path, name))
        if self.defines_locally(path, name):
            return {path}
        found = set()
        for m in REEXPORT_RE.finditer(self.text(path)):
            target = self.resolve(path, m.group(3))
            if not target or target == self.root_index:
                continue
            if m.group(2) == '*':
                found |= self.defining_files(target, name, seen)
            else:
                for part in m.group(2).strip('{}').split(','):
                    part = re.sub(r'^\s*type\s+', '', part).strip()
                    if not part:
                        continue
                    orig, _, alias = part.partition(' as ')
                    if (alias.strip() or orig.strip()) == name:
                        found |= self.defining_files(target, orig.strip(), seen)
        return found

    def deps(self, path):
        """Files whose definitions `path` uses."""
        out = set()
        t = self.text(path)
        for m in IMPORT_RE.finditer(t):
            target = self.resolve(path, m.group(3))
            if not target or target == self.root_index:
                continue
            for n in self.names(m.group(2)):
                if n[0] == 'named':
                    out |= self.defining_files(target, n[1]) or {target}
                else:
                    out.add(target)
        for m in SIDE_EFFECT_RE.finditer(t):
            target = self.resolve(path, m.group(1))
            if target and target != self.root_index:
                out.add(target)
        return out

    def reachable(self, entries):
        todo = [(self.src / e).resolve() for e in entries]
        seen = set()
        while todo:
            f = todo.pop()
            if f in seen or not f.is_file():
                continue
            seen.add(f)
            todo.extend(self.deps(f) - seen)
        return seen

    def reads(self, path, key):
        t = self.text(path)
        if re.search(SOURCES + r'\.' + re.escape(key) + r'\b', t):
            return True
        for m in DESTRUCTURE_RE.finditer(t):
            for part in m.group(1).split(','):
                if re.split(r'[:=]', part)[0].strip() == key:
                    return True
        return False


def corpus_skipped_tasks(proj):
    """Task names that `index.ts` doesn't call getCorpus for (`taskName !== '...'`)."""
    return set(re.findall(r"taskName\s*!==\s*'([^']+)'", proj.text(proj.root_index)))


# Column -> the taskName that index.ts compares against.
TASK_NAMES = {
    'math': 'egma-math', 'matrix': 'matrix-reasoning', 'MR': 'mental-rotation', 'H&F': 'hearts-and-flowers',
    'memory': 'memory-game', 'SDS': 'same-different-selection', 'TROG': 'trog', 'vocab': 'vocab',
    'ToM': 'theory-of-mind', 'intro': 'intro', 'inference': 'roar-inference', 'adult': 'adult-reasoning',
    'survey': 'child-survey',
}

ROWS = [p for p in PARAMS if p != 'corpus']
ROWS.insert(ROWS.index('sequentialStimulus'), 'corpus (file to load)')
ROWS.insert(ROWS.index('cat') + 1, 'corpus (on trials)')


def build(src):
    proj = Project(src)
    skip = {(proj.src / f).resolve() for f in COPY_ONLY}
    skipped_tasks = corpus_skipped_tasks(proj)
    get_corpus = (proj.src / 'tasks/shared/helpers/getCorpus.ts').resolve()
    matrix, why = {}, {}
    for col, entries in TASKS.items():
        timeline = proj.reachable(entries) - skip
        launch = {proj.root_index}
        if TASK_NAMES[col] not in skipped_tasks:
            launch.add(get_corpus)
        for row in ROWS:
            if row == 'corpus (file to load)':
                files, keys = launch, PARAMS['corpus']
            elif row == 'corpus (on trials)':
                files, keys = timeline - launch, PARAMS['corpus']
            else:
                files, keys = launch | timeline, PARAMS[row]
            hits = []
            for f in files:
                rel = str(f.relative_to(proj.src))
                if GATED.get((rel, row), TASK_NAMES[col]) != TASK_NAMES[col]:
                    continue
                if any(proj.reads(f, k) for k in keys):
                    hits.append(rel)
            hits.sort()
            matrix[(row, col)] = bool(hits)
            why[(row, col)] = hits
    return matrix, why


def to_markdown(matrix):
    cols = list(TASKS)
    lines = ['| Param | ' + ' | '.join(cols) + ' |', '|---|' + '|'.join([':-:'] * len(cols)) + '|']
    for p in ROWS:
        lines.append(f'| `{p}` | ' + ' | '.join('✓' if matrix[(p, c)] else ' ' for c in cols) + ' |')
    return '\n'.join(lines)


def parse_doc(md_path):
    """Read the per-task table from the assessment doc: {(param, col): bool}."""
    text = Path(md_path).read_text()
    sec = text.split('## Which tasks read each parameter', 1)[1].split('\n## ', 1)[0]
    rows = [l for l in sec.splitlines() if l.startswith('|')]
    header = [c.strip().rstrip('¹²³⁴') for c in rows[0].strip('|').split('|')]
    cols = header[1:]
    doc = {}
    for l in rows[2:]:
        cells = [c.strip() for c in l.strip('|').split('|')]
        m = re.match(r'`([^`]+)`', cells[0])
        if not m:
            continue  # group header row
        label = cells[0]
        param = m.group(1)
        if param == 'age':
            param = 'age (direct)'
        if param == 'corpus':
            param = 'corpus (on trials)' if 'on trials' in label else 'corpus (file to load)'
        for c, v in zip(cols, cells[1:]):
            doc[(param, c)] = '✓' in v
    return doc


def compare(matrix, doc):
    diffs = []
    for (param, col), in_doc in sorted(doc.items()):
        if (param, col) not in matrix:
            continue
        got = matrix[(param, col)]
        if got != in_doc:
            diffs.append((param, col, in_doc, got))
    return diffs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', type=Path, help='path to task-launcher/src')
    ap.add_argument('--why', action='store_true', help='list the files behind each ✓')
    ap.add_argument('--compare', metavar='DOC', help='compare with the table in the assessment doc')
    args = ap.parse_args()
    if not (args.src / 'tasks').is_dir():
        sys.exit(f'{args.src} does not look like task-launcher/src')

    matrix, why = build(args.src)
    print(to_markdown(matrix))
    if args.why:
        print()
        for (param, col), files in sorted(why.items()):
            if files:
                print(f'{param:22} {col:9} ' + ', '.join(files))
    if args.compare:
        diffs = compare(matrix, parse_doc(args.compare))
        print(f'\n{len(diffs)} cell(s) differ from the doc')
        for param, col, in_doc, got in diffs:
            print(f'  {param:24} {col:9} doc={"✓" if in_doc else "-"}  script={"✓" if got else "-"}')


if __name__ == '__main__':
    main()
