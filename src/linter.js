/**
 * Pine Script linter -- static analysis rules for common errors,
 * repainting issues, and best practices.
 */

import {
  detectVersion,
  detectDeclaration,
  extractRequests,
  extractPlots,
  extractFunctions,
  extractStrategyOrders,
} from "./parser.js";

/** @typedef {{severity: "error"|"warning"|"info", rule: string, message: string, line: number|null, fix?: string}} LintResult */

/**
 * Run all lint rules against Pine Script source.
 * @param {string} source
 * @returns {LintResult[]}
 */
export function lint(source) {
  const results = [];
  const version = detectVersion(source);
  const declaration = detectDeclaration(source);
  const lines = source.split("\n");

  // --- ERRORS ---

  // E001: Missing version annotation
  if (!version) {
    results.push({
      severity: "error",
      rule: "E001",
      message: "Missing //@version=N annotation. Must be the first non-comment line.",
      line: 1,
      fix: "Add //@version=6 at the top of the script.",
    });
  }

  // E002: Missing declaration statement
  if (!declaration) {
    results.push({
      severity: "error",
      rule: "E002",
      message: 'Missing declaration statement. Every script needs indicator(), strategy(), or library().',
      line: null,
      fix: 'Add indicator("My Script", overlay=true) after the version annotation.',
    });
  }

  // E003: = vs := confusion
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//") || line === "") continue;
    // Detect reassignment with = where := is needed (heuristic: indented = without type/var/varip)
    if (line.match(/^\s/) && lines[i].match(/^\s+\w+\s*=[^=]/) && !lines[i].match(/^\s+(var|varip|int|float|bool|string|color|line|box|label|table|array|matrix|map)\s/)) {
      // Check if this looks like a reassignment inside a block
      const varName = lines[i].trim().match(/^(\w+)\s*=/)?.[1];
      if (varName && !["if", "else", "for", "while", "switch", "true", "false", "na"].includes(varName)) {
        // Check if variable was declared earlier
        const priorDecl = source.substring(0, source.split("\n").slice(0, i).join("\n").length).includes(varName);
        if (priorDecl) {
          results.push({
            severity: "warning",
            rule: "E003",
            message: `Possible = vs := confusion for '${varName}'. Use := for reassignment.`,
            line: i + 1,
            fix: `Change '${varName} =' to '${varName} :=' if this is a reassignment.`,
          });
        }
      }
    }
  }

  // E004: v4 functions used in v5+ script
  if (version >= 5) {
    const v4Functions = [
      ["study", "indicator"],
      ["sma", "ta.sma"], ["ema", "ta.ema"], ["rsi", "ta.rsi"],
      ["macd", "ta.macd"], ["atr", "ta.atr"], ["bb", "ta.bb"],
      ["stoch", "ta.stoch"], ["crossover", "ta.crossover"],
      ["crossunder", "ta.crossunder"], ["highest", "ta.highest"],
      ["lowest", "ta.lowest"], ["abs", "math.abs"], ["ceil", "math.ceil"],
      ["floor", "math.floor"], ["round", "math.round"], ["sqrt", "math.sqrt"],
      ["log", "math.log"], ["pow", "math.pow"], ["max", "math.max"],
      ["min", "math.min"], ["tostring", "str.tostring"], ["tonumber", "str.tonumber"],
    ];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("//")) continue;
      for (const [oldName, newName] of v4Functions) {
        const regex = new RegExp(`\\b${oldName}\\s*\\(`);
        // Skip if already namespaced (e.g. ta.sma)
        if (regex.test(lines[i]) && !new RegExp(`\\w\\.${oldName}\\s*\\(`).test(lines[i])) {
          results.push({
            severity: "error",
            rule: "E004",
            message: `v4 function '${oldName}()' is not available in v${version}. Use '${newName}()'.`,
            line: i + 1,
            fix: `Replace with ${newName}()`,
          });
        }
      }
    }
  }

  // E005: security() without request. prefix in v5+
  if (version >= 5) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("//")) continue;
      if (/(?<!\w)security\s*\(/.test(lines[i]) && !/request\.security/.test(lines[i])) {
        results.push({
          severity: "error",
          rule: "E005",
          message: "security() must be request.security() in v5+.",
          line: i + 1,
          fix: "Replace security() with request.security().",
        });
      }
    }
  }

  // E006: v6-specific breaking changes
  if (version >= 6) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith("//")) continue;

      // transp parameter removed
      if (/\btransp\s*=/.test(line)) {
        results.push({
          severity: "error",
          rule: "E006",
          message: "'transp' parameter removed in v6. Use color.new() for transparency.",
          line: i + 1,
          fix: "Replace transp=X with color=color.new(yourColor, X).",
        });
      }

      // when parameter removed from strategy functions
      if (/strategy\.(entry|exit|order|close)\s*\(/.test(line) && /\bwhen\s*=/.test(line)) {
        results.push({
          severity: "error",
          rule: "E006",
          message: "'when' parameter removed from strategy functions in v6. Use an if block.",
          line: i + 1,
          fix: "Wrap the strategy call in an if block with the condition.",
        });
      }
    }
  }

  // E007: Plot functions inside function definitions
  const fns = extractFunctions(source);
  const plotFnNames = ["plot", "plotshape", "plotchar", "plotarrow", "plotbar", "plotcandle", "bgcolor", "barcolor", "fill", "hline", "alertcondition"];
  for (const fn of fns) {
    // Scan lines after function definition until next unindented line
    for (let i = fn.line; i < lines.length; i++) {
      const line = lines[i];
      if (i > fn.line && line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) break;
      for (const plotFn of plotFnNames) {
        if (new RegExp(`\\b${plotFn}\\s*\\(`).test(line)) {
          results.push({
            severity: "error",
            rule: "E007",
            message: `${plotFn}() cannot be called inside function '${fn.name}()'. Plot functions are global-scope only.`,
            line: i + 1,
            fix: `Move the ${plotFn}() call outside the function body.`,
          });
        }
      }
    }
  }

  // --- WARNINGS ---

  // W001: Repainting - request.security with lookahead but no offset
  const requests = extractRequests(source);
  for (const req of requests) {
    if (req.hasLookahead && !req.hasOffset) {
      results.push({
        severity: "warning",
        rule: "W001",
        message: "request.security() with lookahead_on but no [1] offset causes future data leak (repainting).",
        line: req.line,
        fix: "Add [1] offset to the expression, or remove lookahead_on.",
      });
    }
  }

  // W002: Repainting - timenow usage
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("//")) continue;
    if (/\btimenow\b/.test(lines[i])) {
      results.push({
        severity: "warning",
        rule: "W002",
        message: "'timenow' always repaints -- its value changes on every tick.",
        line: i + 1,
        fix: "Consider using 'time' or 'time_close' for historical consistency.",
      });
    }
  }

  // W003: Repainting - barstate.isrealtime without isconfirmed
  const hasIsRealtime = source.includes("barstate.isrealtime");
  const hasIsConfirmed = source.includes("barstate.isconfirmed");
  if (hasIsRealtime && !hasIsConfirmed) {
    for (let i = 0; i < lines.length; i++) {
      if (/barstate\.isrealtime/.test(lines[i])) {
        results.push({
          severity: "warning",
          rule: "W003",
          message: "barstate.isrealtime without barstate.isconfirmed may cause repainting.",
          line: i + 1,
          fix: "Guard with barstate.isconfirmed to only act on confirmed bars.",
        });
      }
    }
  }

  // W004: varip usage warning
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*varip\b/.test(lines[i])) {
      results.push({
        severity: "warning",
        rule: "W004",
        message: "'varip' values are not reproducible on historical bars. Results differ between realtime and replay.",
        line: i + 1,
      });
    }
  }

  // W005: Too many request calls (>40)
  if (requests.length > 40) {
    results.push({
      severity: "warning",
      rule: "W005",
      message: `${requests.length} request.*() calls detected. Maximum is 40 (64 for Ultimate plans).`,
      line: null,
    });
  }

  // W006: Too many plots (>64)
  const plots = extractPlots(source);
  if (plots.length > 64) {
    results.push({
      severity: "warning",
      rule: "W006",
      message: `${plots.length} plot calls detected. Maximum is 64.`,
      line: null,
    });
  }

  // W007: calc_on_every_tick
  if (/calc_on_every_tick\s*=\s*true/.test(source)) {
    for (let i = 0; i < lines.length; i++) {
      if (/calc_on_every_tick\s*=\s*true/.test(lines[i])) {
        results.push({
          severity: "warning",
          rule: "W007",
          message: "calc_on_every_tick=true causes strategy to recalculate on every tick. This may produce unreliable backtest results.",
          line: i + 1,
        });
      }
    }
  }

  // --- INFO ---

  // I001: Missing title on plot functions
  for (const plot of plots) {
    const line = lines[plot.line - 1];
    if (!line.includes("title")) {
      results.push({
        severity: "info",
        rule: "I001",
        message: `${plot.type}() on line ${plot.line} has no 'title' parameter. Adding titles improves readability in TradingView.`,
        line: plot.line,
      });
    }
  }

  // I002: Strategy without risk management
  if (declaration?.type === "strategy") {
    const orders = extractStrategyOrders(source);
    const hasExit = orders.some((o) => o.type === "exit");
    const hasRisk = /strategy\.risk\./.test(source);
    if (!hasExit && !hasRisk && orders.length > 0) {
      results.push({
        severity: "info",
        rule: "I002",
        message: "Strategy has entry orders but no strategy.exit() or strategy.risk.*() calls. Consider adding exit conditions.",
        line: null,
      });
    }
  }

  return results;
}
