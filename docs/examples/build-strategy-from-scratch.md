# Building a Strategy from Scratch with Templates and Reference

You want to build a Bollinger Band breakout strategy. Instead of copying something from a forum, you use the MCP tools to scaffold it correctly, look up exact signatures, and validate before deploying.

---

## Step 1: List Available Templates

```
pine_template(action="list")
```

```
Available templates (7):

  indicator-basic              Basic indicator scaffold with plot()
  indicator-oscillator         Oscillator with upper/lower bands and hline()
  strategy-basic               Minimal strategy with entry/exit logic
  strategy-rsi-mean-reversion  RSI mean reversion with position sizing
  strategy-breakout            Donchian channel breakout, long and short
  library-basic                Exportable function library scaffold
  alert-setup                  Alert conditions with alertcondition()
```

`strategy-breakout` is the right starting point. A Bollinger Band breakout uses the same structure — price crossing a band triggers entry — so you only need to swap the channel calculation.

---

## Step 2: Fetch the Breakout Template

```
pine_template(action="get", name="strategy-breakout")
```

```pine
//@version=5
strategy("Breakout Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

length      = input.int(20, "Channel Length", minval=1)
useStopLoss = input.bool(true, "Use Stop Loss")
stopPct     = input.float(2.0, "Stop Loss %", minval=0.1, step=0.1)

upper = ta.highest(high, length)
lower = ta.lowest(low, length)
mid   = math.avg(upper, lower)

plot(upper, "Upper", color.blue)
plot(lower, "Lower", color.blue)
plot(mid,   "Mid",   color.gray)

longCondition  = ta.crossover(close, upper[1])
shortCondition = ta.crossunder(close, lower[1])

if longCondition
    strategy.entry("Long", strategy.long)

if shortCondition
    strategy.entry("Short", strategy.short)

if useStopLoss
    strategy.exit("Long SL",  "Long",  stop=strategy.position_avg_price * (1 - stopPct / 100))
    strategy.exit("Short SL", "Short", stop=strategy.position_avg_price * (1 + stopPct / 100))
```

Before editing, look up the exact `ta.bb` signature — the return-value order is easy to get backwards.

---

## Step 3: Look Up ta.bb

```
pine_reference(query="ta.bb")
```

```
ta.bb(series, length, mult) -> [middle, upper, lower]

  series  series(float)  — source series, typically close
  length  simple int     — SMA period
  mult    simple float   — standard deviation multiplier

Returns a tuple: middle first, then upper, then lower.

Example:
  [bbMid, bbUpper, bbLower] = ta.bb(close, 20, 2.0)
```

Middle comes first. Swapping `upper` and `lower` here would make the strategy enter in the wrong direction with no runtime error. Good to confirm before writing.

---

## Step 4: Browse the Strategy Namespace

```
pine_namespace(namespace="strategy")
```

```
strategy namespace — order management and position functions

  strategy.entry(id, direction, qty, ...)   Place or add to a position
  strategy.exit(id, from_entry, stop, ...)  Exit with stop, limit, or trail
  strategy.close(id, ...)                   Close position by entry id
  strategy.close_all(...)                   Close all open positions
  strategy.position_size                    Current open size (series float)
  strategy.position_avg_price               Average entry price (series float)
  strategy.long / strategy.short            Direction constants
```

---

## Step 5: Confirm strategy.entry Signature

```
pine_reference(query="strategy.entry")
```

```
strategy.entry(id, direction, qty, limit, stop, comment, alert_message)

  id         string              — unique trade identifier (required)
  direction  strategy.direction  — strategy.long or strategy.short (required)
  qty        series float        — contracts/shares; uses default_qty if omitted

Example:
  strategy.entry("Long", strategy.long)
  strategy.entry("Short", strategy.short, comment="BB Short")
```

Only `id` and `direction` are required. The template pattern is already correct.

---

## Step 6: Write the Modified Strategy

Replace the Donchian channel with `ta.bb`, add a multiplier input, and update labels. Everything else carries over unchanged.

```pine
//@version=5
strategy("BB Breakout Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

// --- Inputs ---
length      = input.int(20,    "BB Length",      minval=1)
mult        = input.float(2.0, "BB Multiplier",  minval=0.1, step=0.1)
useStopLoss = input.bool(true, "Use Stop Loss")
stopPct     = input.float(2.0, "Stop Loss %",    minval=0.1, step=0.1)

// --- Bollinger Bands ---
// ta.bb returns [middle, upper, lower] — note: middle is index 0
[bbMid, bbUpper, bbLower] = ta.bb(close, length, mult)

plot(bbUpper, "Upper Band", color.blue)
plot(bbLower, "Lower Band", color.blue)
plot(bbMid,   "Basis",      color.gray)

// --- Entry Logic ---
longCondition  = ta.crossover(close, bbUpper[1])
shortCondition = ta.crossunder(close, bbLower[1])

if longCondition
    strategy.entry("Long", strategy.long)

if shortCondition
    strategy.entry("Short", strategy.short)

// --- Stop Loss ---
if useStopLoss
    strategy.exit("Long SL",  "Long",  stop=strategy.position_avg_price * (1 - stopPct / 100))
    strategy.exit("Short SL", "Short", stop=strategy.position_avg_price * (1 + stopPct / 100))
```

Changes from the template: `ta.highest` / `ta.lowest` / `math.avg` replaced by one `ta.bb` call; `mult` input added; band variable names updated throughout.

---

## Step 7: Lint Before Deploying

```
pine_lint(code="<strategy above>")
```

```
pine_lint — 0 errors, 0 warnings

  [ok] //@version=5 declaration present
  [ok] strategy() call with overlay=true
  [ok] ta.bb destructuring order matches documented return [middle, upper, lower]
  [ok] strategy.entry ids consistent with strategy.exit calls
  [ok] input.* type functions correct throughout
  [ok] plot() series references valid

Script is ready to deploy.
```

The linter independently verified the `ta.bb` destructuring order — exactly the silent bug this workflow was designed to prevent.

---

## Summary

| Step | Tool | What It Gave You |
|------|------|-----------------|
| 1 | `pine_template list` | Menu of starting points |
| 2 | `pine_template get strategy-breakout` | Correct structural skeleton |
| 3 | `pine_reference ta.bb` | Return-value order for safe destructuring |
| 4 | `pine_namespace strategy` | Overview of available order functions |
| 5 | `pine_reference strategy.entry` | Required vs optional parameters |
| 6 | `pine_lint` | Validation before deployment |

Six calls, no forum-copying, no guessing at signatures. The template provided the skeleton; the reference lookups informed the two lines you changed; the lint pass confirmed the result.
