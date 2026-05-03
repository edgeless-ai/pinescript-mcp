/**
 * Pine Script version migrator -- transforms code between Pine Script versions.
 */

/** v4 -> v5 function rename map */
const V4_TO_V5 = new Map([
  // Declaration
  ["study", "indicator"],
  // Technical analysis
  ["sma", "ta.sma"], ["ema", "ta.ema"], ["wma", "ta.wma"], ["rma", "ta.rma"],
  ["rsi", "ta.rsi"], ["macd", "ta.macd"], ["atr", "ta.atr"], ["bb", "ta.bb"],
  ["stoch", "ta.stoch"], ["cci", "ta.cci"], ["mfi", "ta.mfi"], ["cmo", "ta.cmo"],
  ["mom", "ta.mom"], ["roc", "ta.roc"], ["sar", "ta.sar"], ["vwma", "ta.vwma"],
  ["hma", "ta.hma"], ["alma", "ta.alma"], ["swma", "ta.swma"],
  ["crossover", "ta.crossover"], ["crossunder", "ta.crossunder"],
  ["cross", "ta.cross"], ["highest", "ta.highest"], ["lowest", "ta.lowest"],
  ["highestbars", "ta.highestbars"], ["lowestbars", "ta.lowestbars"],
  ["rising", "ta.rising"], ["falling", "ta.falling"],
  ["change", "ta.change"], ["cum", "ta.cum"],
  ["pivothigh", "ta.pivothigh"], ["pivotlow", "ta.pivotlow"],
  ["valuewhen", "ta.valuewhen"], ["barsince", "ta.barsince"],
  ["stdev", "ta.stdev"], ["variance", "ta.variance"],
  ["correlation", "ta.correlation"], ["dev", "ta.dev"],
  ["percentrank", "ta.percentrank"], ["median", "ta.median"],
  ["linreg", "ta.linreg"], ["supertrend", "ta.supertrend"],
  // Math
  ["abs", "math.abs"], ["ceil", "math.ceil"], ["floor", "math.floor"],
  ["round", "math.round"], ["sqrt", "math.sqrt"], ["log", "math.log"],
  ["log10", "math.log10"], ["pow", "math.pow"], ["exp", "math.exp"],
  ["max", "math.max"], ["min", "math.min"], ["avg", "math.avg"],
  ["sign", "math.sign"], ["sum", "math.sum"],
  ["sin", "math.sin"], ["cos", "math.cos"], ["tan", "math.tan"],
  ["asin", "math.asin"], ["acos", "math.acos"], ["atan", "math.atan"],
  ["todegrees", "math.todegrees"], ["toradians", "math.toradians"],
  ["random", "math.random"],
  // String
  ["tostring", "str.tostring"], ["tonumber", "str.tonumber"],
  // Request
  ["security", "request.security"], ["financial", "request.financial"],
  ["quandl", "request.quandl"],
  // Ticker
  ["tickerid", "ticker.new"], ["heikinashi", "ticker.heikinashi"],
  ["kagi", "ticker.kagi"], ["linebreak", "ticker.linebreak"],
  ["pointfigure", "ticker.pointfigure"], ["renko", "ticker.renko"],
]);

/** v5 -> v6 parameter removals */
const V5_TO_V6_PARAM_REMOVALS = ["transp", "when"];

/**
 * Migrate Pine Script source from one version to another.
 * @param {string} source - Pine Script source code
 * @param {number} fromVersion - Source version (4, 5)
 * @param {number} toVersion - Target version (5, 6)
 * @returns {{migrated: string, changes: Array<{line: number, from: string, to: string, rule: string}>}}
 */
export function migrate(source, fromVersion, toVersion) {
  const changes = [];
  let result = source;

  if (fromVersion === 4 && toVersion >= 5) {
    const r = migrateV4ToV5(result);
    result = r.migrated;
    changes.push(...r.changes);
  }

  if (fromVersion <= 5 && toVersion >= 6) {
    const r = migrateV5ToV6(result);
    result = r.migrated;
    changes.push(...r.changes);
  }

  return { migrated: result, changes };
}

function migrateV4ToV5(source) {
  const changes = [];
  let result = source;

  // Update version annotation
  result = result.replace(/\/\/@version=4/, "//@version=5");
  if (/\/\/@version=4/.test(source)) {
    changes.push({ line: 1, from: "//@version=4", to: "//@version=5", rule: "version" });
  }

  // Rename functions -- process line by line to track line numbers
  const lines = result.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("//")) continue;

    for (const [oldName, newName] of V4_TO_V5) {
      // Match as standalone function call (word boundary)
      const regex = new RegExp(`\\b${oldName}\\s*\\(`, "g");
      // Don't replace if it's already namespaced (e.g., ta.sma)
      const alreadyNamespaced = new RegExp(`\\w\\.${oldName}\\s*\\(`);
      if (regex.test(lines[i]) && !alreadyNamespaced.test(lines[i])) {
        const oldLine = lines[i];
        lines[i] = lines[i].replace(new RegExp(`\\b${oldName}(\\s*\\()`, "g"), `${newName}$1`);
        if (lines[i] !== oldLine) {
          changes.push({ line: i + 1, from: `${oldName}(`, to: `${newName}(`, rule: "rename" });
        }
      }
    }

    // Parameter renames: resolution -> timeframe
    if (/\bresolution\s*=/.test(lines[i]) && /request\.security|indicator|strategy/.test(lines[i])) {
      const oldLine = lines[i];
      lines[i] = lines[i].replace(/\bresolution\s*=/g, "timeframe=");
      lines[i] = lines[i].replace(/\bresolution_gaps\s*=/g, "timeframe_gaps=");
      if (lines[i] !== oldLine) {
        changes.push({ line: i + 1, from: "resolution=", to: "timeframe=", rule: "param-rename" });
      }
    }

    // Remove iff() -> ternary
    const iffMatch = lines[i].match(/iff\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)/);
    if (iffMatch) {
      const oldLine = lines[i];
      lines[i] = lines[i].replace(
        /iff\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)/,
        "$1 ? $2 : $3"
      );
      if (lines[i] !== oldLine) {
        changes.push({ line: i + 1, from: "iff()", to: "ternary ? :", rule: "iff-removal" });
      }
    }
  }

  result = lines.join("\n");
  return { migrated: result, changes };
}

function migrateV5ToV6(source) {
  const changes = [];
  let result = source;

  // Update version annotation
  result = result.replace(/\/\/@version=5/, "//@version=6");
  if (/\/\/@version=5/.test(source)) {
    changes.push({ line: 1, from: "//@version=5", to: "//@version=6", rule: "version" });
  }

  const lines = result.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("//")) continue;

    // Flag transp parameter (cannot auto-fix without knowing the color)
    if (/\btransp\s*=\s*(\d+)/.test(lines[i])) {
      const transpMatch = lines[i].match(/\btransp\s*=\s*(\d+)/);
      changes.push({
        line: i + 1,
        from: `transp=${transpMatch[1]}`,
        to: "// MANUAL: Replace with color.new(yourColor, " + transpMatch[1] + ")",
        rule: "transp-removal",
      });
      // Add a comment instead of breaking the code
      lines[i] = lines[i].replace(
        /,?\s*transp\s*=\s*\d+/,
        " /* TODO: transp removed in v6 -- use color.new() */"
      );
    }

    // Flag when parameter on strategy functions
    if (/strategy\.(entry|exit|order|close)\s*\(/.test(lines[i]) && /\bwhen\s*=/.test(lines[i])) {
      changes.push({
        line: i + 1,
        from: "when=...",
        to: "// MANUAL: Wrap in if block",
        rule: "when-removal",
      });
      lines[i] = lines[i] + " // TODO: 'when' removed in v6 -- wrap in if block";
    }

    // timeframe.period comparisons: "D" -> "1D", "W" -> "1W", "M" -> "1M"
    if (/timeframe\.period/.test(lines[i])) {
      const oldLine = lines[i];
      lines[i] = lines[i].replace(/"D"/g, '"1D"');
      lines[i] = lines[i].replace(/"W"/g, '"1W"');
      lines[i] = lines[i].replace(/"M"/g, '"1M"');
      if (lines[i] !== oldLine) {
        changes.push({ line: i + 1, from: '"D"/"W"/"M"', to: '"1D"/"1W"/"1M"', rule: "timeframe-period" });
      }
    }
  }

  result = lines.join("\n");
  return { migrated: result, changes };
}

/**
 * Get the migration guide summary between two versions.
 * @param {number} from
 * @param {number} to
 * @returns {string}
 */
export function getMigrationGuide(from, to) {
  const guides = [];

  if (from === 4 && to >= 5) {
    guides.push(`## v4 -> v5 Migration

### Function Renames (${V4_TO_V5.size} total)
All built-in functions moved to namespaces:
- Technical analysis: ta.sma(), ta.ema(), ta.rsi(), etc.
- Math: math.abs(), math.ceil(), math.floor(), etc.
- Strings: str.tostring(), str.tonumber()
- Requests: request.security(), request.financial()
- Tickers: ticker.new(), ticker.heikinashi()

### Declaration Change
- study() -> indicator()

### Parameter Renames
- resolution -> timeframe
- resolution_gaps -> timeframe_gaps

### Removed Functions
- iff(cond, a, b) -> cond ? a : b
- offset() -> use [] operator`);
  }

  if (to >= 6) {
    guides.push(`## v5 -> v6 Breaking Changes

### Type System
- int/float no longer auto-cast to bool (use explicit bool() or comparison)
- bool cannot be na (only true/false)
- Integer division always returns float: 5/2 = 2.5 (was 2 for const int)

### Removed Parameters
- transp -> use color.new(color, transparency)
- when -> wrap strategy calls in if blocks

### Timeframe Changes
- timeframe.period returns "1D", "1W", "1M" (multiplier always included)

### Behavior Changes
- and/or use short-circuit (lazy) evaluation
- Duplicate parameter names are errors (were warnings)
- For loop bounds re-evaluated every iteration
- UDT field history: obj.field[10] -> (obj[10]).field
- Default margins changed from 0 to 100
- Minimum linewidth is 1 (was 0)
- Plot offset requires simple (was series)`);
  }

  return guides.join("\n\n");
}
