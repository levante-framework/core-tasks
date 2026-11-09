# Which keys differ between administration copies and current variants, with example values (core tasks, registered variants).
#
# Input: the JSON files written by firestore-readonly-scan.mjs (not committed; they contain Firestore data).
# Usage: python3 -I launch-params-assessment/scripts/administrations-diff-by-key.py administrations-hs-levante-admin-dev.json variants-hs-levante-admin-dev.json
# Recovered from a scratch folder on 2026-11-08; the 'now' date used for open/closed is hard-coded as 2026-11-08.

import json, sys, collections
rows = json.load(open(sys.argv[1])); vs = json.load(open(sys.argv[2]))
V = {(v['taskId'],v['variantId']):v for v in vs}
NONCORE = {'child-survey','caregiver-survey','teacher-survey','MEFS'}
reg = [r for r in rows if r['variantRegistered'] is True and r['taskId'] not in NONCORE]
print("core reg assessments", len(reg), "variants", len({(r['taskId'],r['variantId']) for r in reg}))
diff = [r for r in reg if r['differsFromVariant']]
print("differ", len(diff), "admins", len({r['adminId'] for r in diff}), "variants", len({(r['taskId'],r['variantId']) for r in diff}))
openN = [r for r in diff if (r['dateClosed'] or '9999') >= '2026-11-08']
print("open", len(openN), "admins", len({r['adminId'] for r in openN}))
print(collections.Counter(k for r in diff for k in r['changedKeys']).most_common())
print(collections.Counter(k for r in openN for k in r['changedKeys']).most_common())
# variant edited after admin created?
after=0; before=0; unk=0
for r in diff:
    lu = V.get((r['taskId'],r['variantId']),{}).get('lastUpdated')
    if not lu or not r['dateCreated']: unk+=1
    elif lu > r['dateCreated']: after+=1
    else: before+=1
print("variant lastUpdated after admin created:", after, "before:", before, "unknown:", unk)
def vp(r): return {k:v for k,v in (V.get((r['taskId'],r['variantId']),{}).get('params') or {}).items() if v is not None}
for key in ['language','corpus','version','taskVersion','experimenterButtons','maxTime','taskName','cat','heavyInstructions','maxIncorrect','keyHelpers']:
    ex = collections.Counter()
    for r in diff:
        if key in (r['changedKeys'] or []):
            ex[(r['taskId'], json.dumps(r['params'].get(key)), json.dumps(vp(r).get(key)))] += 1
    print(f"\n== {key}  (admin value -> current variant value)")
    for (t,a,b),n in ex.most_common(12): print(f"  {n:4} {t}: {a} -> {b}")
