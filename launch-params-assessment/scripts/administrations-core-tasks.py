# Core-tasks assessments on registered variants: which differ on a key core-tasks reads, and which are still open.
#
# Input: the JSON files written by firestore-readonly-scan.mjs (not committed; they contain Firestore data).
# Usage: python3 -I launch-params-assessment/scripts/administrations-core-tasks.py administrations-hs-levante-admin-dev.json variants-hs-levante-admin-dev.json
# Recovered from a scratch folder on 2026-11-08; the 'now' date used for open/closed is hard-coded as 2026-11-08.

import json, sys, collections
rows = json.load(open(sys.argv[1])); vs = json.load(open(sys.argv[2]))
V = {(v['taskId'],v['variantId']):v for v in vs}
C={'egma-math','matrix-reasoning','mental-rotation','hearts-and-flowers','memory-game','same-different-selection','trog','vocab','theory-of-mind','intro','roar-inference','adult-reasoning','hostile-attribution','child-survey'}
op=lambda r:(r['dateClosed'] or '9999')>='2026-11-08'
core=[r for r in rows if r['taskId'] in C]
reg=[r for r in core if r['variantRegistered'] is True]
print("core assessments", len(core), "on registered", len(reg), "admins", len({r['adminId'] for r in reg}), "variants", len({(r['taskId'],r['variantId']) for r in reg}))
print("  open", len([r for r in reg if op(r)]))
d=[r for r in reg if r['differsFromVariant']]
print("differ", len(d), "admins", len({r['adminId'] for r in d}), "variants", len({(r['taskId'],r['variantId']) for r in d}), "open", len([r for r in d if op(r)]), "open admins", len({r['adminId'] for r in d if op(r)}))
read={'taskName','language','corpus','maxTime','maxIncorrect','cat','semThreshold','startingTheta','heavyInstructions','experimenterButtons','version','taskVersion','numberOfStories','bubblePractice','buttonLayout','audioFeedback','sequentialStimulus','storeItemId','debug','showAudioKeys','keyHelpers','stimulusBlocks','inferenceNumStories','age','demoMode'}
print("changed keys (all/open):")
allc=collections.Counter(k for r in d for k in r['changedKeys']); opc=collections.Counter(k for r in d if op(r) for k in r['changedKeys'])
for k,n in allc.most_common(): print(f"  {k:22} {n:4} {opc[k]:4}  {'READ' if k in read else 'ignored'}")
dr=[r for r in d if set(r['changedKeys'])&read]
print("differ on a key core-tasks reads:", len(dr), "open", len([r for r in dr if op(r)]), "open admins", len({r['adminId'] for r in dr if op(r)}))
vp=lambda r:{k:v for k,v in (V.get((r['taskId'],r['variantId']),{}).get('params') or {}).items() if v is not None}
c=collections.Counter()
for r in dr:
  for k in set(r['changedKeys'])&read: c[(k,r['taskId'],json.dumps(r['params'].get(k)),json.dumps(vp(r).get(k)))]+=(1 if op(r) else 0)
print("\nopen assessments by (key, task, admin -> variant):")
for k,n in sorted(c.items()):
  if n: print(f"  {n:4} {k}")
# missing load params
for r in reg:
  if op(r) and (not r['params'].get('taskName') or not r['params'].get('language')): print("MISSING", r['taskId'], r['adminName'], r['params'])
m=[r for r in core if not r['variantFound']]; u=[r for r in core if r['variantFound'] and r['variantRegistered'] is not True]
print("\nmissing variant", len(m), "open", len([r for r in m if op(r)]), collections.Counter(r['taskId'] for r in m))
print("unregistered", len(u), "open", len([r for r in u if op(r)]), "admins open", len({r['adminId'] for r in u if op(r)}))
print("  open unregistered by task", collections.Counter(r['taskId'] for r in u if op(r)).most_common())
print("  open unreg admin names sample", collections.Counter((r['adminName'] or '')[:18] for r in u if op(r)).most_common(8))
print("  open missing", [(r['taskId'],r['adminName'],r['variantId']) for r in m if op(r)])
