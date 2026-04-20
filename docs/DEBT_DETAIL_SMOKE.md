# `lucas accounts debt-detail` — smoke checklist

Exercise the command against a real backend and assert each of the 8 spec scenarios.

Prerequisites:

- Backend dev server running on `http://localhost:3000` (or prod endpoint).
- CLI authenticated — `~/.config/lucas/credentials.json` must exist and not be expired.
- `python3` available for JSON parsing.

All IDs captured via env vars so the reader can re-run each scenario independently.

---

## Automated scenarios (run against local clone/dev)

### Scenario 2 — Fresh CREDIT + 40 expenses, zero payments

```bash
S2_ID=$(lucas accounts create --name "S2" --type CREDIT --bank TestBank \
  --credit-limit 5000 --statement-closing-day 5 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
for i in $(seq 1 40); do
  lucas transactions create --account-id $S2_ID --amount 10 --type EXPENSE --description "S2-$i" > /dev/null
done
lucas accounts debt-detail $S2_ID | python3 -c "
import json,sys
s=json.load(sys.stdin)['data']['summary']
assert s['charges']==400 and s['payments']==0 and s['currentDebt']==400, s
print('S2 OK')
"
```

Expected: `S2 OK`.

### Scenario 3 — 40 expenses + $20 payment

```bash
S3_DEBIT=$(lucas accounts create --name "S3-debit" --type DEBIT --bank TestBank --balance 1000 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
S3_ID=$(lucas accounts create --name "S3" --type CREDIT --bank TestBank \
  --credit-limit 5000 --statement-closing-day 5 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
for i in $(seq 1 40); do
  lucas transactions create --account-id $S3_ID --amount 10 --type EXPENSE --description "S3-$i" > /dev/null
done
lucas transfers create --from-account-id $S3_DEBIT --to-account-id $S3_ID --amount 20 > /dev/null
lucas accounts debt-detail $S3_ID | python3 -c "
import json,sys
s=json.load(sys.stdin)['data']['summary']
assert s['charges']==400 and s['payments']==20 and s['net']==380, s
print('S3 OK')
"
```

Expected: `S3 OK`. Note: the $20 payment appears as a separate item row; individual charges are NOT marked partially paid.

### Scenario 4 — Carry-over from prior cycle

```bash
S4_DEBIT=$(lucas accounts create --name "S4-debit" --type DEBIT --bank TestBank --balance 500 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
S4_ID=$(lucas accounts create --name "S4" --type CREDIT --bank TestBank \
  --credit-limit 5000 --statement-closing-day 5 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
for i in $(seq 1 5); do
  lucas transactions create --account-id $S4_ID --amount 50 --type EXPENSE --description "S4-pre-$i" --date 2026-04-01 > /dev/null
done
for i in $(seq 1 5); do
  lucas transactions create --account-id $S4_ID --amount 30 --type EXPENSE --description "S4-post-$i" --date 2026-04-10 > /dev/null
done
lucas transfers create --from-account-id $S4_DEBIT --to-account-id $S4_ID --amount 50 --date 2026-04-10 > /dev/null
lucas accounts debt-detail $S4_ID | python3 -c "
import json,sys
s=json.load(sys.stdin)['data']['summary']
inv = abs(s['currentDebt'] - (s['composedDebt'] + s['outsideRangeDebt']))
assert s['outsideRangeDebt'] > 0, 'expected carry-over'
assert inv < 0.01, f'invariant broken: {inv}'
print('S4 OK')
"
```

Expected: `S4 OK`. Invariant: `currentDebt == composedDebt + outsideRangeDebt` (±0.01).

### Scenario 5 — CREDIT without `statementClosingDay`

```bash
S5_RESP=$(lucas accounts create --name "S5" --type CREDIT --bank TestBank --credit-limit 5000)
echo "$S5_RESP" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
assert 'creationWarning' in d, 'expected creationWarning'
assert 'statementClosingDay' in d['creationWarning']
print('S5 creationWarning OK')
"
S5_ID=$(echo "$S5_RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")

# Default mode should fail with 400
set +e
lucas accounts debt-detail $S5_ID > /tmp/s5_default.out 2>&1
EXIT=$?
set -e
[ $EXIT -eq 1 ] || { echo "S5 default should fail"; exit 1; }
grep -q "día de cierre es requerido" /tmp/s5_default.out || { echo "S5 wrong error"; exit 1; }

# Custom mode should succeed
lucas accounts debt-detail $S5_ID --mode custom | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['ok']==True and d['data']['mode']=='custom'
print('S5 custom OK')
"
```

### Scenario 6 — DEBIT rejected

```bash
S6_ID=$(lucas accounts create --name "S6" --type DEBIT --bank TestBank --balance 100 \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
set +e
lucas accounts debt-detail $S6_ID > /tmp/s6.out 2>&1
EXIT=$?
set -e
[ $EXIT -eq 1 ] || { echo "S6 should fail"; exit 1; }
grep -q "Solo disponible para cuentas de crédito" /tmp/s6.out || { echo "S6 wrong error"; exit 1; }
echo "S6 OK"
```

### Scenario 8 — `availableCredit` in list

```bash
lucas accounts list | python3 -c "
import json,sys
accounts = json.load(sys.stdin)['data']['accounts']
for a in accounts:
    if a['type']=='CREDIT' and a.get('creditLimit') is not None:
        assert 'availableCredit' in a, f'missing for {a[\"name\"]}'
        expected = max(0, round(a['creditLimit'] - a['currentDebt'], 2))
        assert abs(a['availableCredit'] - expected) < 0.01
    else:
        assert 'availableCredit' not in a, f'unexpected on {a[\"name\"]}'
print('S8 OK')
"
```

### Cleanup after automated scenarios

```bash
for id in $S2_ID $S3_ID $S3_DEBIT $S4_ID $S4_DEBIT $S5_ID $S6_ID; do
  lucas accounts delete $id || true
done
```

---

## Manual scenarios (prod data required)

### Scenario 1 — Real account "iO Dólares", current cycle

Find the real credit card ID from `lucas accounts list`, then:

```bash
IO_ID=<id>
CD_FROM_LIST=$(lucas accounts list | python3 -c "
import json,sys
for a in json.load(sys.stdin)['data']['accounts']:
    if a['id']=='$IO_ID':
        print(a['currentDebt']); break
")
CD_FROM_DETAIL=$(lucas accounts debt-detail $IO_ID | python3 -c "
import json,sys
print(json.load(sys.stdin)['data']['summary']['currentDebt'])
")
python3 -c "
assert abs(float('$CD_FROM_LIST') - float('$CD_FROM_DETAIL')) < 0.01, \
  f'mismatch: {\"$CD_FROM_LIST\"} vs {\"$CD_FROM_DETAIL\"}'
print('S1 OK')
"
```

Invariant: `summary.composedDebt + summary.outsideRangeDebt ≈ summary.currentDebt` (±0.01).

### Scenario 7 — Archived CREDIT

Observed behavior (captured on 2026-04-19): the breakdown endpoint does **not** filter archived accounts — `lucas accounts debt-detail <archived-id>` still returns the breakdown. This matches the underlying `findFirst({ id, userId })` in `accounts.credit-debt-breakdown.ts:43-51`, which has no `isArchived` filter. The CLI inherits this behavior by pass-through.

If the AI caller needs archived cards hidden, filter client-side or file a backend spec. This is **not** a change in scope for this spec.
