# Migrating a Legacy v4 Codebase to Pine Script v6

You inherited a TradingView account with 23 Pine Script indicators, all written in v4.
TradingView is deprecating v4. You have a weekend to migrate everything to v6 before
they stop compiling. This is the workflow — applied to one representative script that
hits all the common failure modes.

---

## The script you inherited

A multi-timeframe RSI + MACD indicator. Classic v4: bare function names, `security()`,
`transp` everywhere.

```pine
//@version=4
study("MTF RSI+MACD", overlay=false)

rsiLen   = input(14, title="RSI Length")
macdFast = input(12, title="MACD Fast")
macdSlow = input(26, title="MACD Slow")
macdSig  = input(9,  title="MACD Signal")
htfRes   = input("60", title="Higher Timeframe")

src = close

rsiVal                          = rsi(src, rsiLen)
[macdLine, signalLine, histLine] = macd(src, macdFast, macdSlow, macdSig)

htfRsi = security(syminfo.tickerid, htfRes, rsi(close, rsiLen), lookahead=barmerge.lookahead_on)

crossUp   = crossover(rsiVal, 30)
crossDown = crossunder(rsiVal, 70)

plot(rsiVal,     title="RSI",       color=color.blue,   transp=0)
plot(htfRsi,    title="HTF RSI",   color=color.orange, transp=20)
plot(macdLine,  title="MACD",      color=color.green,  transp=10)
plot(signalLine, title="Signal",   color=color.red,    transp=10)
plot(histLine,   title="Histogram", color=color.gray,  transp=30)
hline(70, "Overbought", color=color.red,   linestyle=hline.style_dashed)
hline(30, "Oversold",   color=color.green, linestyle=hline.style_dashed)
plotshape(crossUp,   style=shape.triangleup,   location=location.bottom, color=color.green)
plotshape(crossDown, style=shape.triangledown, location=location.top,    color=color.red)
```

---

## Step 1 — Audit structure with `pine_validate`

Before touching code, get a structural inventory. `pine_validate` parses the script and
returns its version, declaration type, inputs, plots, and any `request.security` calls.

The result flags two things worth noting before the lint: five `transp` parameters
(v6 removes this) and a `security()` call with `lookahead_on` and no `[1]` offset
(a repainting leak). Both are fixable — knowing they exist up front shapes the review.

---

## Step 2 — Find every violation with `pine_lint`

`pine_lint` runs 16 rules. On this script it returns:

```
ERRORS (6)
  E004 line 13  'rsi' → ta.rsi()
  E004 line 14  'macd' → ta.macd()
  E005 line 16  'security()' → request.security()
  E004 line 18  'crossover' → ta.crossover()
  E004 line 18  'crossunder' → ta.crossunder()
  E006 line 21  'transp' parameter removed in v6 — use color.new(color, transparency)

WARNINGS (1)
  W001 line 16  request.security() with lookahead_on but no [1] offset — repaints on live bars
```

Six errors, one repainting warning. This is typical for a v4 script. The bulk of the
work is mechanical namespace renaming plus the `transp` removal — exactly what the
migrator handles automatically.

---

## Step 3 — Understand the changes with `pine_migration_guide`

Call `pine_migration_guide` with `from: "v4"`, `to: "v6"` once at the start of the
sprint. It covers both hops.

**v4 → v5:** All bare TA function names gain `ta.` prefix (`sma`, `ema`, `rsi`, `macd`,
`crossover`, ...). Math functions gain `math.`, string functions gain `str.`. `security()`
becomes `request.security()`. `study()` becomes `indicator()`. `input()` splits into
typed variants (`input.int()`, `input.string()`, `input.source()`).

**v5 → v6:** `transp` is removed from every plot/fill/hline call — transparency moves
into `color.new(color, transparency)`. The `when` parameter is removed from
`strategy.entry()` and `strategy.exit()` — conditions move into `if` blocks. Bare
timeframe strings change: `"D"` becomes `"1D"`.

Share this with teammates before the migration sprint starts. It makes the scope concrete.

---

## Step 4 — Auto-rewrite with `pine_migrate`

Call `pine_migrate` with `from: 4`, `to: 6`. The tool chains both hops internally and
returns the rewritten source plus a changelog.

```pine
//@version=6
indicator("MTF RSI+MACD", overlay=false)

rsiLen   = input.int(14,      title="RSI Length")
macdFast = input.int(12,      title="MACD Fast")
macdSlow = input.int(26,      title="MACD Slow")
macdSig  = input.int(9,       title="MACD Signal")
htfRes   = input.string("60", title="Higher Timeframe")

src = close

rsiVal                          = ta.rsi(src, rsiLen)
[macdLine, signalLine, histLine] = ta.macd(src, macdFast, macdSlow, macdSig)

htfRsi = request.security(syminfo.tickerid, htfRes, ta.rsi(close, rsiLen)[1], lookahead=barmerge.lookahead_on)

crossUp   = ta.crossover(rsiVal, 30)
crossDown = ta.crossunder(rsiVal, 70)

plot(rsiVal,     title="RSI",        color=color.new(color.blue,   0))
plot(htfRsi,    title="HTF RSI",    color=color.new(color.orange, 20))
plot(macdLine,  title="MACD",       color=color.new(color.green,  10))
plot(signalLine, title="Signal",    color=color.new(color.red,    10))
plot(histLine,   title="Histogram", color=color.new(color.gray,   30))
hline(70, "Overbought", color=color.red,   linestyle=hline.style_dashed)
hline(30, "Oversold",   color=color.green, linestyle=hline.style_dashed)
plotshape(crossUp,   style=shape.triangleup,   location=location.bottom, color=color.green)
plotshape(crossDown, style=shape.triangledown, location=location.top,    color=color.red)
```

The migrator made 18 changes: version bump, `study` → `indicator`, five `input` →
`input.int`/`input.string` rewrites, five `ta.` namespace prefixes, `security` →
`request.security` with the repainting `[1]` offset applied, and five `transp` →
`color.new()` rewrites. Zero manual decisions required for this script.

---

## Step 5 — Re-lint to confirm clean

Run `pine_lint` on the migrated source:

```
No errors. No warnings. No info.
```

Zero findings. Paste it into TradingView.

---

## What still needs manual attention

The migrator handles everything it can prove is mechanical. Two categories require
human judgment and get flagged with `// TODO:` comments instead of being auto-rewritten.

**Dynamic `transp` variables.** When `transp` was set from a variable rather than a
literal — `plot(x, transp=myAlpha)` — the migrator cannot infer the correct
`color.new()` call because the color argument is also needed. These get a comment and
are left for you to fix. Search your migrated files for `// TODO: transp`.

**`when` parameter in strategy scripts.** If any of your 23 scripts are strategies, the
`when` parameter on `strategy.entry()` and `strategy.exit()` must become an `if` block:

```pine
// Before (v4/v5)
strategy.entry("Long", strategy.long, when=ta.crossover(ta.rsi(close, 14), 30))

// After (v6)
if ta.crossover(ta.rsi(close, 14), 30)
    strategy.entry("Long", strategy.long)
```

The migrator flags these because the condition may need to combine with existing `if`
logic in non-obvious ways. The fix itself takes about two minutes per occurrence.

---

## Batching 23 scripts

For each script in the account: `pine_validate` to confirm version and note complexity,
`pine_lint` to capture the error list, `pine_migrate` to auto-rewrite, `pine_lint`
again to verify zero errors, then scan for `// TODO:` comments.

Run `pine_migration_guide` once at the start — not once per script.

For a 23-script batch, expect roughly 15 scripts to reach zero-error lint after
auto-migration with no manual edits. The rest will have dynamic `transp` variables or
strategy `when` parameters — each takes a couple of minutes to fix manually.
