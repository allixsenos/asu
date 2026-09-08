#!/usr/bin/env python3
"""Measure what a command costs in coding-agent subscription allowance.

Takes an `asu` snapshot before and after a command, reports the delta per usage
window, and appends a record to a ledger so costs accumulate across runs.

Usage:
  measure.py [-l LABEL] [--provider claude] [--ledger FILE] -- <command...>
  measure.py --snapshot [--provider claude]        # print current state, record nothing
  measure.py --report [--ledger FILE]              # summarize the ledger

Notes:
  * asu caches readings for ~5 minutes, so both snapshots use --fresh. Without
    that the "after" reading can echo the "before" one and every delta is zero.
  * Providers compute resetsAt relative to each request, so it can jitter by a
    second or more between snapshots. That is not a reset. A real reset moves
    it forward by a whole window and the percentage drops. Those are flagged
    rather than reported as a negative number.
  * percentUsed can be a whole number, a fraction, or null when the provider
    did not report it. Deltas are only computed when both readings are numbers.
"""
import argparse, json, os, subprocess, sys, time

DEFAULT_LEDGER = os.path.expanduser('~/.claude/asu-ledger.jsonl')


def snapshot(provider):
    """Fresh asu reading -> {window id: {label, percentUsed, resetsAt}} plus plan label."""
    cmd = ['npx', '--yes', '@allixsenos/asu']
    if provider:
        cmd.append(provider)
    cmd += ['--json', '--fresh']
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if r.returncode == 2:
        raise SystemExit(f'asu failed ({r.returncode}): {r.stderr.strip()[:300]}')
    start = r.stdout.find('{')
    if start < 0:
        raise SystemExit(f'asu produced no JSON: {r.stdout.strip()[:300]}')
    data = json.loads(r.stdout[start:])
    if data.get('schemaVersion') != 1:
        raise SystemExit(f"asu report schemaVersion {data.get('schemaVersion')} is not supported")
    out = {}
    plan = None
    for p in data.get('providers', []):
        if provider and p.get('providerId') != provider:
            continue
        if p.get('availability') != 'available':
            reason = p.get('reason') or {}
            raise SystemExit(f"{p.get('displayName', p.get('providerId'))}: {reason.get('code', p.get('availability'))}. {reason.get('message', '')}".strip())
        plan = plan or p.get('planLabel')
        for w in p.get('windows', []):
            out[f"{p['providerId']}:{w['id']}"] = {
                'label': f"{p.get('displayName', p['providerId'])} {w.get('label', w['id'])}",
                'percentUsed': w.get('percentUsed'),
                'resetsAt': w.get('resetsAt'),
            }
    if not out:
        raise SystemExit('asu returned no usage windows (signed in?)')
    return {'plan': plan, 'at': data.get('generatedAt'), 'windows': out}


def _ts(v):
    from datetime import datetime
    try: return datetime.fromisoformat(str(v).replace('Z', '+00:00')).timestamp()
    except Exception: return None


def pct(v, width=3):
    """A percentage for display: whole numbers as is, fractions with one decimal, null as a dash."""
    if v is None:
        return '-'.rjust(width)
    text = f'{v:.0f}' if float(v).is_integer() else f'{v:.1f}'
    return text.rjust(width)


def delta_text(d):
    if d is None:
        return 'n/a'
    return f'{d:+.0f} pp' if float(d).is_integer() else f'{d:+.1f} pp'


def deltas(before, after):
    rows = []
    for key, b in before['windows'].items():
        a = after['windows'].get(key)
        if not a:
            continue
        # resetsAt jitters between calls, so compare with tolerance. A real reset
        # moves it forward by a whole window, and the percentage drops.
        tb, ta = _ts(b.get('resetsAt')), _ts(a.get('resetsAt'))
        moved = (tb is not None and ta is not None and abs(ta - tb) > 300)
        bp, ap = b.get('percentUsed'), a.get('percentUsed')
        dropped = (bp is not None and ap is not None and ap < bp - 1)
        reset = moved or dropped
        d = None if (reset or bp is None or ap is None) else ap - bp
        rows.append({'key': key, 'label': b['label'], 'before': bp, 'after': ap,
                     'delta': d, 'reset': reset, 'resetsAt': a.get('resetsAt')})
    return rows


def fmt(rows, elapsed, label):
    w = max((len(r['label']) for r in rows), default=10)
    out = [f'usage delta{f" for {label}" if label else ""} over {elapsed/60:.1f} min:']
    for r in rows:
        line = f"  {r['label']:<{w}}  {pct(r['before'])}% -> {pct(r['after'])}%   "
        out.append(line + ('(window reset mid-run, delta unknown)' if r['reset'] else delta_text(r['delta'])))
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument('-l', '--label', default='')
    ap.add_argument('--provider', default='claude')
    ap.add_argument('--ledger', default=os.environ.get('ASU_LEDGER', DEFAULT_LEDGER))
    ap.add_argument('--snapshot', action='store_true')
    ap.add_argument('--report', action='store_true')
    ap.add_argument('-h', '--help', action='store_true')
    args, rest = ap.parse_known_args()
    if args.help:
        print(__doc__)
        return 0
    if rest and rest[0] == '--':
        rest = rest[1:]

    if args.report:
        if not os.path.exists(args.ledger):
            print(f'no ledger at {args.ledger}')
            return 0
        recs = [json.loads(l) for l in open(args.ledger) if l.strip()]
        print(f'{len(recs)} runs in {args.ledger}\n')
        keys = sorted({r['key'] for rec in recs for r in rec['rows']})
        print(f'{"label":28s} {"min":>6s}  ' + '  '.join(f'{k.split(":")[1]:>10s}' for k in keys))
        for rec in recs:
            by = {r['key']: r for r in rec['rows']}
            cells = []
            for k in keys:
                r = by.get(k)
                cells.append(f'{"-":>10s}' if not r or r['delta'] is None else f'{delta_text(r["delta"]):>10s}')
            print(f'{rec["label"][:28]:28s} {rec["elapsedSec"]/60:6.1f}  ' + '  '.join(cells))
        tot = {}
        for rec in recs:
            for r in rec['rows']:
                if r['delta'] is not None:
                    tot[r['key']] = tot.get(r['key'], 0) + r['delta']
        print('\ntotals (percentage points consumed, ignoring resets):')
        for k in keys:
            print(f'  {k:28s} {delta_text(tot.get(k, 0))}')
        return 0

    if args.snapshot or not rest:
        s = snapshot(args.provider)
        print(f"plan: {s['plan']}   at {s['at']}")
        for k, v in s['windows'].items():
            print(f"  {v['label']:<28s} {pct(v['percentUsed'])}%   resets {v['resetsAt']}")
        return 0

    before = snapshot(args.provider)
    t0 = time.time()
    rc = subprocess.run(rest).returncode
    elapsed = time.time() - t0
    after = snapshot(args.provider)
    rows = deltas(before, after)
    label = args.label or ' '.join(rest)[:60]
    print()
    print(fmt(rows, elapsed, label))
    if rc != 0:
        print(f'  (command exited {rc}, delta still recorded)')
    os.makedirs(os.path.dirname(args.ledger) or '.', exist_ok=True)
    with open(args.ledger, 'a') as f:
        f.write(json.dumps({'label': label, 'cmd': rest, 'exit': rc,
                            'startedAt': before['at'], 'endedAt': after['at'],
                            'elapsedSec': round(elapsed), 'plan': before['plan'],
                            'rows': rows}, ensure_ascii=False) + '\n')
    print(f'  recorded -> {args.ledger}')
    return rc


if __name__ == '__main__':
    sys.exit(main())
