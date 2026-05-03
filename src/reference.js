/**
 * Pine Script reference lookup -- built-in functions, variables, and constants.
 */

const NAMESPACES = {
  ta: {
    description: "Technical analysis functions",
    functions: {
      "sma": { sig: "ta.sma(source, length) -> series float", desc: "Simple Moving Average" },
      "ema": { sig: "ta.ema(source, length) -> series float", desc: "Exponential Moving Average" },
      "wma": { sig: "ta.wma(source, length) -> series float", desc: "Weighted Moving Average" },
      "hma": { sig: "ta.hma(source, length) -> series float", desc: "Hull Moving Average" },
      "rma": { sig: "ta.rma(source, length) -> series float", desc: "Running Moving Average (Wilder's smoothing)" },
      "alma": { sig: "ta.alma(series, length, offset, sigma) -> series float", desc: "Arnaud Legoux Moving Average" },
      "vwma": { sig: "ta.vwma(source, length) -> series float", desc: "Volume Weighted Moving Average" },
      "swma": { sig: "ta.swma(source) -> series float", desc: "Symmetrically Weighted Moving Average (fixed 4-bar)" },
      "rsi": { sig: "ta.rsi(source, length) -> series float", desc: "Relative Strength Index" },
      "macd": { sig: "ta.macd(source, fastlen, slowlen, siglen) -> [macdLine, signalLine, histogram]", desc: "Moving Average Convergence Divergence" },
      "atr": { sig: "ta.atr(length) -> series float", desc: "Average True Range" },
      "bb": { sig: "ta.bb(series, length, mult) -> [middle, upper, lower]", desc: "Bollinger Bands" },
      "stoch": { sig: "ta.stoch(source, high, low, length) -> series float", desc: "Stochastic" },
      "cci": { sig: "ta.cci(source, length) -> series float", desc: "Commodity Channel Index" },
      "mfi": { sig: "ta.mfi(series, length) -> series float", desc: "Money Flow Index" },
      "supertrend": { sig: "ta.supertrend(factor, atrPeriod) -> [supertrend, direction]", desc: "Supertrend indicator" },
      "sar": { sig: "ta.sar(start, inc, max) -> series float", desc: "Parabolic SAR" },
      "crossover": { sig: "ta.crossover(source1, source2) -> series bool", desc: "True when source1 crosses above source2" },
      "crossunder": { sig: "ta.crossunder(source1, source2) -> series bool", desc: "True when source1 crosses below source2" },
      "cross": { sig: "ta.cross(source1, source2) -> series bool", desc: "True when source1 crosses source2 in either direction" },
      "highest": { sig: "ta.highest(source, length) -> series float", desc: "Highest value over length bars" },
      "lowest": { sig: "ta.lowest(source, length) -> series float", desc: "Lowest value over length bars" },
      "change": { sig: "ta.change(source, length) -> series float", desc: "Difference between current and previous value" },
      "cum": { sig: "ta.cum(source) -> series float", desc: "Cumulative sum" },
      "stdev": { sig: "ta.stdev(source, length) -> series float", desc: "Standard deviation" },
      "correlation": { sig: "ta.correlation(source1, source2, length) -> series float", desc: "Pearson correlation coefficient" },
      "pivothigh": { sig: "ta.pivothigh(source, leftbars, rightbars) -> series float", desc: "Pivot high detection" },
      "pivotlow": { sig: "ta.pivotlow(source, leftbars, rightbars) -> series float", desc: "Pivot low detection" },
      "valuewhen": { sig: "ta.valuewhen(condition, source, occurrence) -> series float", desc: "Value of source when condition was true" },
      "barsince": { sig: "ta.barsince(condition) -> series int", desc: "Bars since condition was true" },
      "linreg": { sig: "ta.linreg(source, length, offset) -> series float", desc: "Linear regression" },
    },
    variables: {
      "accdist": "Accumulation/Distribution",
      "obv": "On Balance Volume",
      "pvt": "Price Volume Trend",
      "vwap": "Volume Weighted Average Price",
      "tr": "True Range",
    },
  },
  math: {
    description: "Mathematical functions",
    functions: {
      "abs": { sig: "math.abs(number) -> simple/series float", desc: "Absolute value" },
      "ceil": { sig: "math.ceil(number) -> simple/series int", desc: "Round up to nearest integer" },
      "floor": { sig: "math.floor(number) -> simple/series int", desc: "Round down to nearest integer" },
      "round": { sig: "math.round(number, precision?) -> simple/series float", desc: "Round to nearest integer or precision" },
      "sqrt": { sig: "math.sqrt(number) -> simple/series float", desc: "Square root" },
      "pow": { sig: "math.pow(base, exponent) -> simple/series float", desc: "Power" },
      "log": { sig: "math.log(number) -> simple/series float", desc: "Natural logarithm" },
      "log10": { sig: "math.log10(number) -> simple/series float", desc: "Base-10 logarithm" },
      "exp": { sig: "math.exp(number) -> simple/series float", desc: "e raised to the power" },
      "max": { sig: "math.max(a, b) -> simple/series float", desc: "Maximum of two values" },
      "min": { sig: "math.min(a, b) -> simple/series float", desc: "Minimum of two values" },
      "avg": { sig: "math.avg(a, b, ...) -> simple/series float", desc: "Average of values" },
      "sum": { sig: "math.sum(source, length) -> series float", desc: "Sum over length bars" },
      "sign": { sig: "math.sign(number) -> simple/series int", desc: "Sign (-1, 0, 1)" },
      "random": { sig: "math.random(min?, max?, seed?) -> series float", desc: "Random number" },
      "round_to_mintick": { sig: "math.round_to_mintick(number) -> simple/series float", desc: "Round to symbol's min tick" },
    },
    constants: {
      "pi": "3.14159...",
      "e": "2.71828...",
      "phi": "1.61803... (golden ratio)",
      "rphi": "0.61803... (reciprocal golden ratio)",
    },
  },
  str: {
    description: "String manipulation functions",
    functions: {
      "contains": { sig: "str.contains(source, str) -> series bool", desc: "Check if string contains substring" },
      "startswith": { sig: "str.startswith(source, str) -> series bool", desc: "Check if string starts with prefix" },
      "endswith": { sig: "str.endswith(source, str) -> series bool", desc: "Check if string ends with suffix" },
      "length": { sig: "str.length(string) -> series int", desc: "String length" },
      "lower": { sig: "str.lower(source) -> series string", desc: "Convert to lowercase" },
      "upper": { sig: "str.upper(source) -> series string", desc: "Convert to uppercase" },
      "replace_all": { sig: "str.replace_all(source, target, replacement) -> series string", desc: "Replace all occurrences" },
      "split": { sig: "str.split(string, separator) -> array<string>", desc: "Split string into array" },
      "substring": { sig: "str.substring(source, begin, end?) -> series string", desc: "Extract substring" },
      "tostring": { sig: "str.tostring(value, format?) -> series string", desc: "Convert to string" },
      "tonumber": { sig: "str.tonumber(string) -> series float", desc: "Parse string to number" },
      "format": { sig: "str.format(formatString, arg0, arg1, ...) -> series string", desc: "Format string with placeholders" },
    },
  },
  request: {
    description: "External data request functions",
    functions: {
      "security": { sig: "request.security(symbol, timeframe, expression, gaps?, lookahead?) -> series", desc: "Request data from another symbol/timeframe" },
      "security_lower_tf": { sig: "request.security_lower_tf(symbol, timeframe, expression) -> array", desc: "Request lower timeframe data as array" },
      "financial": { sig: "request.financial(symbol, financial_id, period, gaps?) -> series float", desc: "Request financial data" },
      "economic": { sig: "request.economic(country_code, field, gaps?) -> series float", desc: "Request economic data" },
      "dividends": { sig: "request.dividends(ticker, field, gaps?) -> series float", desc: "Request dividend data" },
      "earnings": { sig: "request.earnings(ticker, field, gaps?) -> series float", desc: "Request earnings data" },
      "splits": { sig: "request.splits(ticker, field, gaps?) -> series float", desc: "Request split data" },
    },
  },
  strategy: {
    description: "Strategy order and position functions",
    functions: {
      "entry": { sig: "strategy.entry(id, direction, qty?, limit?, stop?, comment?, alert_message?)", desc: "Place an entry order" },
      "exit": { sig: "strategy.exit(id, from_entry?, qty?, profit?, limit?, loss?, stop?, trail_price?, trail_points?, trail_offset?)", desc: "Place an exit order" },
      "order": { sig: "strategy.order(id, direction, qty?, limit?, stop?, comment?)", desc: "Place a one-time order" },
      "close": { sig: "strategy.close(id, comment?, qty?, qty_percent?)", desc: "Close a position" },
      "close_all": { sig: "strategy.close_all(comment?)", desc: "Close all positions" },
      "cancel": { sig: "strategy.cancel(id)", desc: "Cancel a pending order" },
      "cancel_all": { sig: "strategy.cancel_all()", desc: "Cancel all pending orders" },
    },
    variables: {
      "position_size": "Current position size (positive=long, negative=short, 0=flat)",
      "position_avg_price": "Average price of current position",
      "equity": "Current equity",
      "netprofit": "Net profit",
      "openprofit": "Unrealized profit/loss",
      "max_drawdown": "Maximum drawdown",
    },
  },
};

const BUILT_IN_VARS = {
  ohlcv: {
    description: "Price and volume data",
    vars: {
      "open": "Opening price of current bar",
      "high": "Highest price of current bar",
      "low": "Lowest price of current bar",
      "close": "Closing price of current bar",
      "volume": "Volume of current bar",
      "hl2": "(high + low) / 2",
      "hlc3": "(high + low + close) / 3",
      "ohlc4": "(open + high + low + close) / 4",
    },
  },
  barstate: {
    description: "Bar execution state",
    vars: {
      "barstate.isfirst": "True on the first bar",
      "barstate.islast": "True on the last bar",
      "barstate.ishistory": "True on historical bars",
      "barstate.isrealtime": "True on realtime bars",
      "barstate.isnew": "True on the first tick of a new bar",
      "barstate.isconfirmed": "True on the last tick of a completed bar",
    },
  },
  syminfo: {
    description: "Symbol information",
    vars: {
      "syminfo.ticker": "Symbol ticker (e.g., AAPL)",
      "syminfo.tickerid": "Full ticker ID with exchange",
      "syminfo.currency": "Quote currency",
      "syminfo.basecurrency": "Base currency (crypto)",
      "syminfo.type": "Symbol type (stock, crypto, forex, etc.)",
      "syminfo.mintick": "Minimum price change",
      "syminfo.pointvalue": "Point value for futures",
    },
  },
  time: {
    description: "Time and date variables",
    vars: {
      "time": "Opening time of current bar (UNIX ms)",
      "time_close": "Closing time of current bar (UNIX ms)",
      "timenow": "Current real time (UNIX ms) -- repaints!",
      "bar_index": "Current bar number (0-based)",
      "year": "Year", "month": "Month (1-12)", "dayofmonth": "Day (1-31)",
      "dayofweek": "Day of week (1=Sun, 7=Sat)",
      "hour": "Hour (0-23)", "minute": "Minute (0-59)", "second": "Second (0-59)",
    },
  },
};

/**
 * Look up a function or variable by name.
 * @param {string} query - e.g., "ta.sma", "sma", "close", "barstate.isconfirmed"
 * @returns {Array<{match: string, signature?: string, description: string, namespace?: string}>}
 */
export function lookup(query) {
  const results = [];
  const q = query.toLowerCase().trim();

  // Search namespaced functions
  for (const [ns, data] of Object.entries(NAMESPACES)) {
    if (data.functions) {
      for (const [name, info] of Object.entries(data.functions)) {
        const fullName = `${ns}.${name}`;
        if (fullName.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
          results.push({
            match: fullName,
            signature: info.sig,
            description: info.desc,
            namespace: ns,
          });
        }
      }
    }
    if (data.variables) {
      for (const [name, desc] of Object.entries(data.variables)) {
        const fullName = `${ns}.${name}`;
        if (fullName.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
          results.push({ match: fullName, description: desc, namespace: ns });
        }
      }
    }
    if (data.constants) {
      for (const [name, desc] of Object.entries(data.constants)) {
        const fullName = `${ns}.${name}`;
        if (fullName.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
          results.push({ match: fullName, description: desc, namespace: ns });
        }
      }
    }
  }

  // Search built-in variables
  for (const [, group] of Object.entries(BUILT_IN_VARS)) {
    for (const [name, desc] of Object.entries(group.vars)) {
      if (name.toLowerCase().includes(q)) {
        results.push({ match: name, description: desc });
      }
    }
  }

  return results;
}

/**
 * List all available namespaces.
 * @returns {Array<{name: string, description: string, functionCount: number}>}
 */
export function listNamespaces() {
  return Object.entries(NAMESPACES).map(([name, data]) => ({
    name,
    description: data.description,
    functionCount: data.functions ? Object.keys(data.functions).length : 0,
  }));
}

/**
 * Get all functions in a namespace.
 * @param {string} namespace
 * @returns {Array<{name: string, signature: string, description: string}>|null}
 */
export function getNamespace(namespace) {
  const ns = NAMESPACES[namespace];
  if (!ns) return null;
  const result = [];
  if (ns.functions) {
    for (const [name, info] of Object.entries(ns.functions)) {
      result.push({ name: `${namespace}.${name}`, signature: info.sig, description: info.desc });
    }
  }
  if (ns.variables) {
    for (const [name, desc] of Object.entries(ns.variables)) {
      result.push({ name: `${namespace}.${name}`, description: desc });
    }
  }
  if (ns.constants) {
    for (const [name, desc] of Object.entries(ns.constants)) {
      result.push({ name: `${namespace}.${name}`, description: desc });
    }
  }
  return result;
}
