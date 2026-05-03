/**
 * Pine Script templates -- strategy and indicator scaffolds.
 */

const TEMPLATES = {
  "indicator-basic": {
    name: "Basic Indicator",
    description: "Simple overlay indicator with configurable parameters",
    version: 6,
    code: `//@version=6
indicator("My Indicator", overlay=true)

// Inputs
length = input.int(14, "Length", minval=1)
source = input.source(close, "Source")

// Calculation
value = ta.sma(source, length)

// Plot
plot(value, "SMA", color=color.blue, linewidth=2)
`,
  },

  "indicator-oscillator": {
    name: "Oscillator Indicator",
    description: "Non-overlay oscillator with overbought/oversold levels",
    version: 6,
    code: `//@version=6
indicator("My Oscillator")

// Inputs
length = input.int(14, "Length", minval=1)
overbought = input.float(70.0, "Overbought Level")
oversold = input.float(30.0, "Oversold Level")

// Calculation
value = ta.rsi(close, length)

// Levels
hlineOB = hline(overbought, "Overbought", color=color.red, linestyle=hline.style_dashed)
hlineOS = hline(oversold, "Oversold", color=color.green, linestyle=hline.style_dashed)
fill(hlineOB, hlineOS, color=color.new(color.purple, 90), title="Background")

// Plot
plot(value, "RSI", color=color.purple, linewidth=2)
`,
  },

  "strategy-basic": {
    name: "Basic Strategy",
    description: "Long/short strategy template with entry, exit, and risk management",
    version: 6,
    code: `//@version=6
strategy("My Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10, initial_capital=10000)

// Inputs
fastLength = input.int(9, "Fast MA Length", minval=1)
slowLength = input.int(21, "Slow MA Length", minval=1)
stopLossPct = input.float(2.0, "Stop Loss %", minval=0.1, step=0.1)
takeProfitPct = input.float(4.0, "Take Profit %", minval=0.1, step=0.1)

// Calculations
fastMA = ta.ema(close, fastLength)
slowMA = ta.ema(close, slowLength)

// Conditions
longCondition = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

// Entry
if longCondition
    strategy.entry("Long", strategy.long)

if shortCondition
    strategy.entry("Short", strategy.short)

// Exit with stop loss and take profit
if strategy.position_size > 0
    stopPrice = strategy.position_avg_price * (1 - stopLossPct / 100)
    targetPrice = strategy.position_avg_price * (1 + takeProfitPct / 100)
    strategy.exit("Long Exit", "Long", stop=stopPrice, limit=targetPrice)

if strategy.position_size < 0
    stopPrice = strategy.position_avg_price * (1 + stopLossPct / 100)
    targetPrice = strategy.position_avg_price * (1 - takeProfitPct / 100)
    strategy.exit("Short Exit", "Short", stop=stopPrice, limit=targetPrice)

// Plots
plot(fastMA, "Fast MA", color=color.blue, linewidth=2)
plot(slowMA, "Slow MA", color=color.red, linewidth=2)
bgcolor(strategy.position_size > 0 ? color.new(color.green, 90) : strategy.position_size < 0 ? color.new(color.red, 90) : na, title="Position")
`,
  },

  "strategy-rsi-mean-reversion": {
    name: "RSI Mean Reversion Strategy",
    description: "Buy oversold, sell overbought with RSI",
    version: 6,
    code: `//@version=6
strategy("RSI Mean Reversion", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10, initial_capital=10000)

// Inputs
rsiLength = input.int(14, "RSI Length", minval=1)
overbought = input.float(70.0, "Overbought", minval=50, maxval=100)
oversold = input.float(30.0, "Oversold", minval=0, maxval=50)
exitMiddle = input.float(50.0, "Exit at RSI", minval=20, maxval=80)
useStopLoss = input.bool(true, "Use Stop Loss")
stopLossPct = input.float(3.0, "Stop Loss %", minval=0.1)

// Calculation
rsiValue = ta.rsi(close, rsiLength)

// Entry conditions
longEntry = ta.crossover(rsiValue, oversold)
shortEntry = ta.crossunder(rsiValue, overbought)

// Exit conditions
longExit = ta.crossover(rsiValue, exitMiddle)
shortExit = ta.crossunder(rsiValue, exitMiddle)

// Entries
if longEntry
    strategy.entry("Long", strategy.long)
if shortEntry
    strategy.entry("Short", strategy.short)

// Exits
if longExit
    strategy.close("Long")
if shortExit
    strategy.close("Short")

// Stop loss
if useStopLoss and strategy.position_size > 0
    strategy.exit("Long SL", "Long", stop=strategy.position_avg_price * (1 - stopLossPct / 100))
if useStopLoss and strategy.position_size < 0
    strategy.exit("Short SL", "Short", stop=strategy.position_avg_price * (1 + stopLossPct / 100))

// Visual
plotshape(longEntry, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(shortEntry, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)
`,
  },

  "strategy-breakout": {
    name: "Breakout Strategy",
    description: "Donchian channel breakout with ATR-based stops",
    version: 6,
    code: `//@version=6
strategy("Donchian Breakout", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

// Inputs
channelLength = input.int(20, "Channel Length", minval=5)
atrLength = input.int(14, "ATR Length", minval=1)
atrMultiplier = input.float(2.0, "ATR Stop Multiplier", minval=0.5, step=0.5)
trailATR = input.float(1.5, "ATR Trail Multiplier", minval=0.5, step=0.5)

// Calculations
upperBand = ta.highest(high, channelLength)
lowerBand = ta.lowest(low, channelLength)
midBand = (upperBand + lowerBand) / 2
atrValue = ta.atr(atrLength)

// Entry conditions
longBreakout = ta.crossover(close, upperBand[1])
shortBreakout = ta.crossunder(close, lowerBand[1])

// Entries
if longBreakout
    strategy.entry("Long", strategy.long)
if shortBreakout
    strategy.entry("Short", strategy.short)

// ATR-based exits
if strategy.position_size > 0
    stopPrice = strategy.position_avg_price - atrMultiplier * atrValue
    trailOffset = trailATR * atrValue
    strategy.exit("Long Exit", "Long", stop=stopPrice, trail_points=trailOffset / syminfo.mintick, trail_offset=trailOffset / syminfo.mintick)

if strategy.position_size < 0
    stopPrice = strategy.position_avg_price + atrMultiplier * atrValue
    trailOffset = trailATR * atrValue
    strategy.exit("Short Exit", "Short", stop=stopPrice, trail_points=trailOffset / syminfo.mintick, trail_offset=trailOffset / syminfo.mintick)

// Plots
upperPlot = plot(upperBand, "Upper", color=color.green)
lowerPlot = plot(lowerBand, "Lower", color=color.red)
plot(midBand, "Mid", color=color.gray, linewidth=1)
fill(upperPlot, lowerPlot, color=color.new(color.blue, 95), title="Channel")
`,
  },

  "library-basic": {
    name: "Basic Library",
    description: "Reusable function library template",
    version: 6,
    code: `//@version=6
library("MyLibrary")

// Exported function: Simple moving average crossover detection
export crossoverSignal(float fastSrc, float slowSrc, int fastLen, int slowLen) =>
    fastMA = ta.sma(fastSrc, fastLen)
    slowMA = ta.sma(slowSrc, slowLen)
    signal = ta.crossover(fastMA, slowMA) ? 1 : ta.crossunder(fastMA, slowMA) ? -1 : 0
    signal

// Exported function: Normalize a value to 0-100 range
export normalize(float value, int length) =>
    lo = ta.lowest(value, length)
    hi = ta.highest(value, length)
    hi == lo ? 50.0 : 100.0 * (value - lo) / (hi - lo)

// Exported function: Calculate position size based on risk
export positionSize(float capital, float riskPct, float entryPrice, float stopPrice) =>
    riskAmount = capital * riskPct / 100.0
    riskPerUnit = math.abs(entryPrice - stopPrice)
    riskPerUnit > 0 ? math.floor(riskAmount / riskPerUnit) : 0
`,
  },

  "alert-setup": {
    name: "Alert Setup",
    description: "Indicator with webhook-ready alert conditions",
    version: 6,
    code: `//@version=6
indicator("Alert Setup", overlay=true)

// Inputs
fastLen = input.int(9, "Fast EMA")
slowLen = input.int(21, "Slow EMA")

// Calculations
fastEMA = ta.ema(close, fastLen)
slowEMA = ta.ema(close, slowLen)
bullCross = ta.crossover(fastEMA, slowEMA)
bearCross = ta.crossunder(fastEMA, slowEMA)

// Alert conditions (for TradingView alert system)
alertcondition(bullCross, "Bullish Crossover", "EMA bullish crossover on {{ticker}}")
alertcondition(bearCross, "Bearish Crossover", "EMA bearish crossover on {{ticker}}")

// Dynamic alerts (for webhook integration)
if bullCross
    alert("BUY signal on " + syminfo.ticker + " at " + str.tostring(close), alert.freq_once_per_bar_close)
if bearCross
    alert("SELL signal on " + syminfo.ticker + " at " + str.tostring(close), alert.freq_once_per_bar_close)

// Plots
plot(fastEMA, "Fast EMA", color=color.blue, linewidth=2)
plot(slowEMA, "Slow EMA", color=color.red, linewidth=2)
plotshape(bullCross, "Buy Signal", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(bearCross, "Sell Signal", shape.triangledown, location.abovebar, color.red, size=size.small)
`,
  },
};

/**
 * List available templates.
 * @returns {Array<{id: string, name: string, description: string, version: number}>}
 */
export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    version: t.version,
  }));
}

/**
 * Get a template by ID.
 * @param {string} id
 * @returns {{name: string, description: string, version: number, code: string}|null}
 */
export function getTemplate(id) {
  return TEMPLATES[id] || null;
}
