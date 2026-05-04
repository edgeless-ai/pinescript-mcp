# Automated Code Review for Pine Script

Someone submits a Pine Script to your TradingView team or open source repo. Before reading
every line, run automated checks to catch structural issues, version problems, and dangerous
patterns.

---

## The Submitted Script

Looks reasonable at first glance — a multi-timeframe momentum strategy:

```pine
strategy("MTF Momentum Strategy", overlay=true)

fast_length = input(9, "Fast MA Length")
slow_length = input(21, "Slow MA Length")
rsi_length  = input(14)
overbought  = input(70)
oversold    = input(30)
tf1 = input("60", "Timeframe 1")
tf2 = input("240", "Timeframe 2")

// 42 total request.security() calls following this pattern:
close_tf1  = security(syminfo.tickerid, tf1, close,  lookahead=true)
close_tf2  = security(syminfo.tickerid, tf2, close,  lookahead=true)
high_tf1   = security(syminfo.tickerid, tf1, high,   lookahead=true)
volume_tf1 = security(syminfo.tickerid, tf1, volume, lookahead=true)
// ... 38 more

fast_ma = sma(close, fast_length)
slow_ma = sma(close, slow_length)
rsi_val = rsi(close, rsi_length)

bullish = fast_ma > slow_ma and rsi_val < overbought
bearish = fast_ma < slow_ma and rsi_val > oversold

if bullish
    strategy.entry("Long", strategy.long)
if bearish
    strategy.entry("Short", strategy.short)

plot(fast_ma)
plot(slow_ma)
plot(rsi_val)
```

---

## Step 1: pine_validate — Structural Audit

```
VALIDATION SUMMARY
==================
Version annotation : MISSING  (assumed v4 behavior)
Declaration type   : strategy
Inputs             : 8
Plots              : 3  (0 with titles)
request.security() : 42
Line count         : 38

ISSUES FOUND
------------
[ERROR]   No //@version= annotation. Version behavior is ambiguous.
[ERROR]   request.security() count (42) exceeds recommended limit of 40.
[WARNING] sma() and rsi() are v4 function names. v5 uses ta.sma() and ta.rsi().
[WARNING] 3 plot() calls are missing title= argument.
[WARNING] strategy() has entry calls but no strategy.close() or strategy.exit().
```

Five problems surfaced before reading any logic. Two are errors.

---

## Step 2: pine_lint — Full Rule-by-Rule Analysis

16 rules, three severity levels:

```
LINT RESULTS — 16 rules evaluated
===================================

ERRORS
-------
[E01] version-annotation-missing
      No //@version=5 found. Scripts without a version default to v4 semantics on
      TradingView, producing silent behavioral differences. Add //@version=5 first.

[E02] security-call-count-exceeded
      42 request.security() calls found. The practical limit is 40 — exceeding it
      causes load failures or silent data truncation. Consolidate using tuple
      returns: [c, h, l] = request.security(...).

WARNINGS
---------
[W01] deprecated-function-names
      sma() on line 21, rsi() on line 22. v5 names are ta.sma() and ta.rsi().
      v4 aliases produce editor warnings and may break in a future release.

[W02] plot-missing-title
      plot() on lines 29-31 have no title= argument. They appear as "Plot",
      "Plot 2", "Plot 3" in the style editor, making the script hard to configure.

[W03] strategy-no-exit
      strategy.entry() called on lines 25 and 27 but no strategy.close() or
      strategy.exit() found. Without explicit exits, the opposite entry closes the
      position — usually unintentional and distorts backtested trade count.

[W04] input-missing-tooltip
      8 input() calls have no tooltip= argument. Recommended for published scripts.

INFO
-----
[I01] no-alerts
      No alertcondition() calls. Traders automating this will need to add their own.

SUMMARY: 2 errors, 4 warnings, 1 info, 9 rules OK
```

---

## Step 3: pine_repainting_check — Focused Security Audit

Repainting is a data integrity issue — a strategy that uses future data is a silent failure.

```
REPAINTING ANALYSIS
====================
request.security() calls found : 42
Calls with lookahead=true       : 42  <-- ALL calls
Calls with lookahead=false      : 0

VERDICT: HIGH REPAINTING RISK

Every request.security() call uses lookahead=true. This resolves higher-timeframe
bars using their final closed value during the current bar — including bars that
haven't closed yet on the chart.

Effect: entries fire on data unavailable to a live trader — backtested results look
significantly better than live performance. Affected: lines 12-15 and 38 more.

Fix: Replace lookahead=true with barmerge.lookahead_off or omit it (default is off).
This introduces a one-bar lag on higher timeframe values — that is correct behavior.

  close_tf1 = request.security(syminfo.tickerid, tf1, close)
```

---

## What to Send Back to the Author

**Blocking — fix required before merge or publish:**

1. Add `//@version=5` as the first line.

2. Remove `lookahead=true` from all 42 `security()` calls. Every call reads future
   data. Backtest results are invalid and will not match live performance. Re-run
   the backtest after fixing — the equity curve will change.

3. Reduce `request.security()` calls from 42 to 40 or fewer. Use tuple returns to
   consolidate: `[c, h, l] = request.security(syminfo.tickerid, tf1, [close, high, low])`.

**Should fix:**

4. Replace `sma()` / `rsi()` with `ta.sma()` / `ta.rsi()`.

5. Add `title=` to all three `plot()` calls.

6. Add `strategy.exit()` or `strategy.close()`. The current behavior — each entry
   implicitly closing the opposite position — is probably not intentional and produces
   misleading backtested trade metrics.
