[![CI](https://github.com/edgeless-ai/pinescript-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/edgeless-ai/pinescript-mcp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/pinescript-mcp)](https://www.npmjs.com/package/pinescript-mcp)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

# pinescript-mcp

MCP server for Pine Script development. Lint, validate, migrate, and scaffold Pine Script without needing TradingView Desktop.

8 tools. Zero external dependencies beyond the MCP SDK. Pure static analysis.

## Tools

| Tool | Description |
|------|-------------|
| `pine_validate` | Parse and validate structure — version, declaration, variables, functions, inputs, plots |
| `pine_lint` | 16 rules across errors, warnings, and info — catches v4/v5/v6 breaking changes, repainting, bad practices |
| `pine_migrate` | Migrate code between v4→v5, v5→v6, or v4→v6 with a full change log |
| `pine_migration_guide` | Get the complete breaking changes guide for a version pair |
| `pine_template` | 7 starter templates — indicators, strategies, libraries, alerts |
| `pine_reference` | Look up built-in functions, variables, and constants by name |
| `pine_namespace` | Browse Pine Script namespaces (ta, math, str, request, strategy) |
| `pine_repainting_check` | Focused repainting analysis — lookahead leaks, timenow, barstate, varip |

## Install

```bash
npm install pinescript-mcp
```

### Claude Code

```bash
claude mcp add pinescript -- npx pinescript-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pinescript": {
      "command": "npx",
      "args": ["pinescript-mcp"]
    }
  }
}
```

### Manual

```bash
npx pinescript-mcp
```

Communicates over stdio using the Model Context Protocol.

## Lint Rules

### Errors

| Rule | Description |
|------|-------------|
| E001 | Missing `//@version=N` annotation |
| E002 | Missing `indicator()` / `strategy()` / `library()` declaration |
| E003 | `=` vs `:=` reassignment confusion |
| E004 | v4 functions used in v5+ (e.g., `sma()` → `ta.sma()`) |
| E005 | `security()` without `request.` prefix in v5+ |
| E006 | v6 breaking changes (`transp` removal, `when` parameter removal) |
| E007 | Plot functions called inside user-defined functions |

### Warnings

| Rule | Description |
|------|-------------|
| W001 | `request.security()` with `lookahead_on` but no `[1]` offset (repainting) |
| W002 | `timenow` usage (always repaints) |
| W003 | `barstate.isrealtime` without `barstate.isconfirmed` guard |
| W004 | `varip` — not reproducible on historical bars |
| W005 | More than 40 `request.*()` calls |
| W006 | More than 64 plot calls |
| W007 | `calc_on_every_tick=true` in strategy |

### Info

| Rule | Description |
|------|-------------|
| I001 | Missing `title` on plot functions |
| I002 | Strategy with entries but no exits or risk management |

## Migration

Supports v4→v5, v5→v6, and v4→v6 (chained).

**v4 → v5** renames 40+ functions:
- `study()` → `indicator()`
- `sma()` → `ta.sma()`, `ema()` → `ta.ema()`, `rsi()` → `ta.rsi()`, ...
- `security()` → `request.security()`
- `abs()` → `math.abs()`, `ceil()` → `math.ceil()`, ...
- `tostring()` → `str.tostring()`
- `iff(cond, a, b)` → `cond ? a : b`
- `resolution=` → `timeframe=`

**v5 → v6** handles breaking changes:
- `transp` parameter removal (flags with TODO)
- `when` parameter removal from strategy functions
- `timeframe.period` comparison updates (`"D"` → `"1D"`)

## Templates

- `indicator-basic` — Simple overlay indicator
- `indicator-oscillator` — Oscillator with overbought/oversold levels
- `strategy-basic` — Moving average crossover strategy
- `strategy-rsi-mean-reversion` — RSI mean reversion with risk management
- `strategy-breakout` — Donchian channel breakout
- `library-basic` — Reusable library scaffold
- `alert-setup` — Alert condition patterns

## Reference

Built-in reference covers 5 namespaces with function signatures, descriptions, and examples:

- **ta** — Technical analysis (sma, ema, rsi, macd, bb, stoch, crossover, ...)
- **math** — Math functions (abs, ceil, floor, round, sqrt, log, pow, ...)
- **str** — String operations (tostring, tonumber, contains, replace, ...)
- **request** — Data requests (security, security_lower_tf, currency_rate, ...)
- **strategy** — Strategy functions (entry, exit, close, close_all, risk, ...)

## Development

```bash
git clone https://github.com/edgeless-ai/pinescript-mcp.git
cd pinescript-mcp
npm install
npm test
```

53 tests across parser, linter, and migrator modules.

## License

MIT
