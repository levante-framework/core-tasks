# Summary of administration param copies vs current variants (all tasks).
#
# Input: the JSON files written by firestore-readonly-scan.mjs (not committed; they contain Firestore data).
# Usage: python3 -I launch-params-assessment/scripts/administrations-summary.py administrations-hs-levante-admin-dev.json
# Recovered from a scratch folder on 2026-11-08; the 'now' date used for open/closed is hard-coded as 2026-11-08.

import json, sys, collections
rows = json.load(open(sys.argv[1]))
print("assessments", len(rows), "admins", len({r['adminId'] for r in rows}))
c = collections.Counter()
for r in rows:
    c[(r['variantFound'], r['variantRegistered'], r['differsFromVariant'])] += 1
for k,v in sorted(c.items(), key=str): print(k, v)
reg = [r for r in rows if r['variantRegistered'] is True]
print("\non registered variants:", len(reg), "admins", len({r['adminId'] for r in reg}))
diff = [r for r in reg if r['differsFromVariant']]
print("differ:", len(diff), "admins", len({r['adminId'] for r in diff}))
kc = collections.Counter(k for r in diff for k in r['changedKeys'])
print("changed keys:", kc.most_common())
print("tasks:", collections.Counter(r['taskId'] for r in diff).most_common())
print("variants:", len({(r['taskId'],r['variantId']) for r in diff}), "of", len({(r['taskId'],r['variantId']) for r in reg}))
# open admins
import datetime
now = "2026-11-08"
op = [r for r in diff if (r['dateClosed'] or "9999") >= now]
print("differ & not yet closed:", len(op), "admins", len({r['adminId'] for r in op}))
print("by year created:", collections.Counter((r['dateCreated'] or '')[:7] for r in diff).most_common())
missing = [r for r in rows if not r['variantFound']]
print("\nmissing variant:", len(missing), collections.Counter(r['taskId'] for r in missing).most_common(10))
unreg = [r for r in rows if r['variantFound'] and r['variantRegistered'] is not True]
print("unregistered:", len(unreg), "admins", len({r['adminId'] for r in unreg}), "open", len([r for r in unreg if (r['dateClosed'] or '9999')>=now]))
