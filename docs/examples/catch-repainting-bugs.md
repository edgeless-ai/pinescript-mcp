# Catching Repainting Bugs Before They Cost You Money

Your backtest shows 400% returns over two years. The equity curve is smooth, the drawdowns are manageable, and every trade looks clean in hindsight. It looks too good to be true — because it is.

The strategy has repainting bugs. They leak future data into historical bars, letting the backtest "know" what happened next before placing entries. In live trading, that information does not exist. The strategy will perform nothing like its backtest.

This walkthrough shows how to find and fix these bugs using the pinescript-mcp tools.

---

## The Buggy Strategy

Here is a realistic-looking momentum strategy with four repainting issues baked in:

```pine
//@version=5
strategy("Momentum Breakout", overlay=true, calc_on_every_tick=true)

// Pull higher-timeframe close with lookahead enabled
htf_close = request.security("", "240", close, lookahead=barmerge.lookahead_on)

// Entry timing based on current wall-clock time
entry_hour = hour(timenow, "America/New_York")
market_open = entry_hour >= 9 and entry_hour < 16

// Track position state differently on realtime bars
varip in_position = false

fast_ma = ta.ema(close, 9)
slow_ma = ta.ema(close, 21)
momentum = fast_ma > slow_ma

// Only act on realtime bars (skips historical confirmation)
if barstate.isrealtime
    if momentum and market_open and not in_position
        strategy.entry("Long", strategy.long)
        in_position := true
    if not momentum and in_position
        strategy.close("Long")
        in_position := false
```

Run this, and you might see 400% returns. None of it is real.

---

## Step 1: Run pine_repainting_check

This is the first tool to reach for. It does a focused analysis of repainting patterns and returns findings organized by severity.

```
Tool: pine_repainting_check
Input: <the script above>
```

**Output:**

```
REPAINTING ANALYSIS — 4 issues found

CRITICAL
--------
[Line 6] request.security() with lookahead=barmerge.lookahead_on and no [1] offset
  Pattern: request.security("", "240", close, lookahead=barmerge.lookahead_on)
  Risk: Leaks the FUTURE close of the higher timeframe bar into the current bar.
        On historical bars, Pine knows how the HTF bar closed. With lookahead_on,
        it serves that final value immediately rather than waiting. In live trading,
        the HTF bar has not closed yet, so you get a different (unfinished) value.
  Fix: Use lookahead=barmerge.lookahead_off, or offset the series by [1]:
       request.security("", "240", close[1], lookahead=barmerge.lookahead_on)

[Line 13] barstate.isrealtime without barstate.isconfirmed guard
  Pattern: if barstate.isrealtime
  Risk: isrealtime is true on every tick of a live bar, including ticks that are
        later revised. Strategy logic runs repeatedly on the same bar with
        different price data. Historical bars skip this block entirely, so the
        backtest does not reflect live behavior.
  Fix: Gate on barstate.isconfirmed instead, or combine:
       if barstate.isrealtime and barstate.isconfirmed

WARNING
-------
[Line 9] timenow used for entry logic
  Pattern: entry_hour = hour(timenow, "America/New_York")
  Risk: timenow always returns the current wall-clock time, not the bar's time.
        On historical bars, timenow is the time the script ran (today), not
        the time when that bar occurred. Every historical bar passes the
        market_open check using today's time, not its actual session time.
  Fix: Use time or the bar's open time instead:
       entry_hour = hour(time, "America/New_York")

MINOR
-----
[Line 1] calc_on_every_tick=true in strategy declaration
  Pattern: strategy(..., calc_on_every_tick=true)
  Risk: Recalculates on every incoming tick rather than at bar close.
        Combined with other issues above, this amplifies repainting effects.
        Historical data only has OHLCV per bar — there are no intrabar ticks
        to replay, so the backtest cannot simulate this accurately.
  Fix: Remove calc_on_every_tick=true or set it to false unless you
       specifically need tick-level order simulation and understand the tradeoffs.

[Line 12] varip variable used in strategy logic
  Pattern: varip in_position = false
  Risk: varip variables persist across ticks on realtime bars but reset between
        bars on historical bars. This creates different state behavior depending
        on whether the bar is historical or realtime. Position tracking built
        on varip will diverge between backtest and live.
  Fix: Use var instead of varip unless you explicitly need per-tick persistence
       and have accounted for the historical/realtime asymmetry.
```

Four issues. Two are critical — they directly explain the inflated returns.

---

## Step 2: Confirm with pine_lint

`pine_repainting_check` is focused. `pine_lint` casts a wider net and will catch the same repainting issues alongside style problems, unused variables, and API misuse.

```
Tool: pine_lint
Input: <the script above>
```

**Output (repainting-related excerpt):**

```
[ERROR] Line 6: request.security with lookahead_on is a known repainting source.
        If you need the confirmed HTF close, use close[1] with lookahead_on,
        or use close with lookahead_off.

[ERROR] Line 1: calc_on_every_tick=true cannot be accurately backtested.
        Historical data lacks intrabar ticks.

[WARN]  Line 9: timenow reflects script execution time, not bar time.
        Use `time` for historical bar timestamps.

[WARN]  Line 13: barstate.isrealtime fires on unconfirmed ticks.
        Add barstate.isconfirmed to avoid acting on repainting tick data.

[INFO]  Line 12: varip behaves differently on historical vs realtime bars.
        Consider whether var is sufficient here.
```

Consistent with the repainting check. The lint tool also flags two additional non-repainting issues not shown here (unused import patterns, missing `syminfo` argument in security call).

---

## Step 3: Look Up the Correct request.security() Signature

If the `lookahead` parameter behavior is unfamiliar, use `pine_reference` to pull the official docs before rewriting.

```
Tool: pine_reference
Query: request.security lookahead barmerge
```

**Output (excerpt):**

```
request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency)

lookahead (barmerge.lookahead_enum)
  barmerge.lookahead_off  — Default. Returns the value available at the time
                            of the current bar. Safe for backtesting.
  barmerge.lookahead_on   — Returns the value that will be the final value for
                            that higher-timeframe bar. On historical bars, this
                            means the future is known. On realtime bars, the bar
                            has not closed, so you get the current (changing) value.

Common safe pattern for confirmed HTF data:
  htf_close = request.security("", "D", close[1], lookahead=barmerge.lookahead_on)
  // close[1] ensures you're reading the PREVIOUS completed bar's close,
  // not the current one that hasn't finished yet.
```

This confirms the fix: offset by `[1]` to read the last confirmed bar, or switch to `lookahead_off` and accept that the HTF value updates as the bar closes.

---

## The Fixed Strategy

```pine
//@version=5
strategy("Momentum Breakout", overlay=true)
// Removed: calc_on_every_tick=true

// Read the PREVIOUS confirmed 4H close — no future leak
htf_close = request.security("", "240", close[1], lookahead=barmerge.lookahead_on)

// Use bar time, not wall-clock time
entry_hour = hour(time, "America/New_York")
market_open = entry_hour >= 9 and entry_hour < 16

// var persists between bars consistently on historical and realtime
var bool in_position = false

fast_ma = ta.ema(close, 9)
slow_ma = ta.ema(close, 21)
momentum = fast_ma > slow_ma

// Act on confirmed bars only — behavior matches between backtest and live
if barstate.isconfirmed
    if momentum and market_open and not in_position
        strategy.entry("Long", strategy.long)
        in_position := true
    if not momentum and in_position
        strategy.close("Long")
        in_position := false
```

Run this version. The returns will be lower — probably much lower. That is the correct result.

---

## Why This Matters

Repainting bugs are the single most common cause of strategies that look profitable in backtests and fail immediately in live trading. The pattern is always the same: the script accidentally uses information that was not available at the time the historical bar occurred.

The three mechanisms at work in this example:

**Future data via request.security()**: `lookahead_on` without an offset gives the backtest the final, closed value of a higher-timeframe bar before it has closed. Every entry based on that value is placed with perfect foreknowledge.

**Time confusion via timenow**: The backtest replays history, but `timenow` does not replay — it always returns today's time. A 2022 bar evaluated in 2024 will use 2024's clock. Every session filter built on `timenow` is broken in backtests.

**Tick-level execution via barstate.isrealtime and calc_on_every_tick**: Historical bars have one data point (OHLCV). Live bars have hundreds of ticks. When strategy logic only runs on `isrealtime` or recalculates every tick, the backtest cannot simulate it. The engine approximates and the approximation flatters the strategy.

The backtest engine cannot warn you about these. It runs the script you give it. If you give it a script that peeks at future data, it will report results based on future data. It does not know your intent.

`pine_repainting_check` knows what patterns produce this class of error. Run it before you trust any backtest result.
