/**
 * Pine Script static parser -- extracts structure from Pine Script source code.
 * No TradingView connection needed. Pure string analysis.
 */

/**
 * Detect Pine Script version from source.
 * @param {string} source
 * @returns {number|null} Version number (3-6) or null if not found.
 */
export function detectVersion(source) {
  const match = source.match(/\/\/@version=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detect declaration type (indicator, strategy, library).
 * @param {string} source
 * @returns {{type: string, title: string, line: number}|null}
 */
export function detectDeclaration(source) {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const type of ["indicator", "strategy", "library"]) {
      const match = line.match(new RegExp(`^${type}\\s*\\(`));
      if (match) {
        const titleMatch = line.match(/["']([^"']+)["']/);
        return {
          type,
          title: titleMatch ? titleMatch[1] : "",
          line: i + 1,
        };
      }
    }
    // v4 compat
    if (line.match(/^study\s*\(/)) {
      const titleMatch = line.match(/["']([^"']+)["']/);
      return { type: "indicator", title: titleMatch ? titleMatch[1] : "", line: i + 1 };
    }
  }
  return null;
}

/**
 * Extract all variable declarations.
 * @param {string} source
 * @returns {Array<{name: string, mode: string, type: string|null, line: number}>}
 */
export function extractVariables(source) {
  const vars = [];
  const lines = source.split("\n");
  const varPattern = /^(var|varip)?\s*(?:(int|float|bool|string|color|line|box|label|table)\s+)?(\w+)\s*=\s*/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments and empty lines
    if (line.startsWith("//") || line === "") continue;
    // Skip function definitions, control flow
    if (line.match(/^(if|else|for|while|switch|export|method|type|enum|import)\b/)) continue;
    // Skip declaration statements
    if (line.match(/^(indicator|strategy|library|study)\s*\(/)) continue;

    const match = line.match(varPattern);
    if (match) {
      vars.push({
        name: match[3],
        mode: match[1] || "default",
        type: match[2] || null,
        line: i + 1,
      });
    }
  }
  return vars;
}

/**
 * Extract function definitions.
 * @param {string} source
 * @returns {Array<{name: string, params: string[], line: number, exported: boolean}>}
 */
export function extractFunctions(source) {
  const fns = [];
  const lines = source.split("\n");
  const fnPattern = /^(export\s+)?(method\s+)?(\w+)\s*\(([^)]*)\)\s*=>/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(fnPattern);
    if (match) {
      const params = match[4]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      fns.push({
        name: match[3],
        params,
        line: i + 1,
        exported: !!match[1],
      });
    }
  }
  return fns;
}

/**
 * Extract all input declarations.
 * @param {string} source
 * @returns {Array<{name: string, inputType: string, line: number}>}
 */
export function extractInputs(source) {
  const inputs = [];
  const lines = source.split("\n");
  const inputPattern = /(\w+)\s*=\s*input(?:\.(int|float|bool|color|string|text_area|timeframe|symbol|session|source|time|price|enum))?\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(inputPattern);
    if (match) {
      inputs.push({
        name: match[1],
        inputType: match[2] || "auto",
        line: i + 1,
      });
    }
  }
  return inputs;
}

/**
 * Extract plot calls.
 * @param {string} source
 * @returns {Array<{type: string, line: number}>}
 */
export function extractPlots(source) {
  const plots = [];
  const lines = source.split("\n");
  const plotTypes = [
    "plot",
    "plotshape",
    "plotchar",
    "plotarrow",
    "plotbar",
    "plotcandle",
    "bgcolor",
    "barcolor",
    "fill",
    "hline",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//")) continue;
    for (const type of plotTypes) {
      if (line.match(new RegExp(`^${type}\\s*\\(`))) {
        plots.push({ type, line: i + 1 });
      }
    }
  }
  return plots;
}

/**
 * Extract strategy order calls.
 * @param {string} source
 * @returns {Array<{type: string, line: number}>}
 */
export function extractStrategyOrders(source) {
  const orders = [];
  const lines = source.split("\n");
  const orderPattern = /strategy\.(entry|exit|order|close|close_all|cancel|cancel_all)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(orderPattern);
    if (match) {
      orders.push({ type: match[1], line: i + 1 });
    }
  }
  return orders;
}

/**
 * Extract request.security() and other request calls.
 * @param {string} source
 * @returns {Array<{type: string, line: number, hasLookahead: boolean, hasOffset: boolean}>}
 */
export function extractRequests(source) {
  const requests = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/request\.(security|security_lower_tf|financial|quandl|splits|dividends|earnings|economic|currency_rate|seed)\s*\(/);
    if (match) {
      requests.push({
        type: match[1],
        line: i + 1,
        hasLookahead: /lookahead\s*=\s*barmerge\.lookahead_on/.test(line),
        hasOffset: /\[\s*1\s*\]/.test(line),
      });
    }
    // v4 compat
    const v4Match = line.match(/(?<!\w)security\s*\(/);
    if (v4Match && !line.match(/request\.security/)) {
      requests.push({
        type: "security",
        line: i + 1,
        hasLookahead: /lookahead\s*=\s*barmerge\.lookahead_on/.test(line),
        hasOffset: /\[\s*1\s*\]/.test(line),
      });
    }
  }
  return requests;
}

/**
 * Count lines of code (excluding comments and blanks).
 * @param {string} source
 * @returns {{total: number, code: number, comments: number, blank: number}}
 */
export function countLines(source) {
  const lines = source.split("\n");
  let code = 0, comments = 0, blank = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      blank++;
    } else if (trimmed.startsWith("//")) {
      comments++;
    } else {
      code++;
    }
  }

  return { total: lines.length, code, comments, blank };
}
