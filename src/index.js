#!/usr/bin/env node

/**
 * Pine Script MCP Server
 *
 * A Model Context Protocol server for Pine Script development.
 * Provides linting, validation, version migration, templates, and reference lookup.
 * No TradingView Desktop or account required -- pure static analysis.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "@modelcontextprotocol/sdk/zod.js";

import { detectVersion, detectDeclaration, extractVariables, extractFunctions, extractInputs, extractPlots, extractRequests, extractStrategyOrders, countLines } from "./parser.js";
import { lint } from "./linter.js";
import { migrate, getMigrationGuide } from "./migrator.js";
import { listTemplates, getTemplate } from "./templates.js";
import { lookup, listNamespaces, getNamespace } from "./reference.js";

const server = new McpServer({
  name: "pinescript-mcp",
  version: "1.0.0",
});

// --- Tool: pine_validate ---
server.tool(
  "pine_validate",
  "Validate Pine Script source code. Checks version, declaration, structure, and returns a summary.",
  { source: z.string().describe("Pine Script source code to validate") },
  async ({ source }) => {
    const version = detectVersion(source);
    const declaration = detectDeclaration(source);
    const variables = extractVariables(source);
    const functions = extractFunctions(source);
    const inputs = extractInputs(source);
    const plots = extractPlots(source);
    const requests = extractRequests(source);
    const orders = extractStrategyOrders(source);
    const lines = countLines(source);

    const issues = [];
    if (!version) issues.push("Missing //@version=N annotation");
    if (!declaration) issues.push("Missing indicator()/strategy()/library() declaration");
    if (version && version < 4) issues.push(`Version ${version} is very old. Consider upgrading to v6.`);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: issues.length === 0,
          version,
          declaration,
          summary: {
            lines: lines,
            variables: variables.length,
            functions: functions.length,
            inputs: inputs.length,
            plots: plots.length,
            requests: requests.length,
            strategyOrders: orders.length,
          },
          issues,
          variables,
          functions,
          inputs,
        }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_lint ---
server.tool(
  "pine_lint",
  "Lint Pine Script code for errors, warnings, repainting issues, and best practices.",
  { source: z.string().describe("Pine Script source code to lint") },
  async ({ source }) => {
    const results = lint(source);
    const errors = results.filter((r) => r.severity === "error");
    const warnings = results.filter((r) => r.severity === "warning");
    const info = results.filter((r) => r.severity === "info");

    let summary = `${errors.length} error(s), ${warnings.length} warning(s), ${info.length} info`;
    if (errors.length === 0 && warnings.length === 0) {
      summary = "Clean -- no issues found.";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ summary, results }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_migrate ---
server.tool(
  "pine_migrate",
  "Migrate Pine Script code between versions (v4->v5, v5->v6, or v4->v6). Returns transformed code and a change log.",
  {
    source: z.string().describe("Pine Script source code to migrate"),
    from_version: z.number().int().min(4).max(5).describe("Source version (4 or 5)"),
    to_version: z.number().int().min(5).max(6).describe("Target version (5 or 6)"),
  },
  async ({ source, from_version, to_version }) => {
    if (from_version >= to_version) {
      return { content: [{ type: "text", text: "Error: from_version must be less than to_version." }] };
    }
    const { migrated, changes } = migrate(source, from_version, to_version);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          migrated,
          changes,
          changeCount: changes.length,
          note: "Review TODO comments for manual migration steps (transp, when parameters).",
        }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_migration_guide ---
server.tool(
  "pine_migration_guide",
  "Get the migration guide between two Pine Script versions. Lists all breaking changes, renames, and new features.",
  {
    from_version: z.number().int().min(4).max(5).describe("Source version"),
    to_version: z.number().int().min(5).max(6).describe("Target version"),
  },
  async ({ from_version, to_version }) => {
    const guide = getMigrationGuide(from_version, to_version);
    return { content: [{ type: "text", text: guide }] };
  }
);

// --- Tool: pine_template ---
server.tool(
  "pine_template",
  "Get a Pine Script template. Use template_id to get code, or omit it to list all available templates.",
  {
    template_id: z.string().optional().describe("Template ID (omit to list all). Options: indicator-basic, indicator-oscillator, strategy-basic, strategy-rsi-mean-reversion, strategy-breakout, library-basic, alert-setup"),
  },
  async ({ template_id }) => {
    if (!template_id) {
      const templates = listTemplates();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ templates }, null, 2),
        }],
      };
    }
    const template = getTemplate(template_id);
    if (!template) {
      const available = listTemplates().map((t) => t.id).join(", ");
      return { content: [{ type: "text", text: `Template '${template_id}' not found. Available: ${available}` }] };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: template.name,
          description: template.description,
          version: template.version,
          code: template.code,
        }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_reference ---
server.tool(
  "pine_reference",
  "Look up Pine Script built-in functions, variables, and constants. Search by name (e.g., 'ta.sma', 'rsi', 'close', 'barstate').",
  {
    query: z.string().describe("Function or variable name to look up (e.g., 'ta.sma', 'rsi', 'close')"),
  },
  async ({ query }) => {
    const results = lookup(query);
    if (results.length === 0) {
      return { content: [{ type: "text", text: `No matches for '${query}'. Try a broader search term.` }] };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ query, matches: results.length, results }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_namespace ---
server.tool(
  "pine_namespace",
  "List all functions in a Pine Script namespace (ta, math, str, request, strategy). Omit namespace to list all namespaces.",
  {
    namespace: z.string().optional().describe("Namespace name (e.g., 'ta', 'math', 'str'). Omit to list all."),
  },
  async ({ namespace }) => {
    if (!namespace) {
      const ns = listNamespaces();
      return { content: [{ type: "text", text: JSON.stringify({ namespaces: ns }, null, 2) }] };
    }
    const result = getNamespace(namespace);
    if (!result) {
      const available = listNamespaces().map((n) => n.name).join(", ");
      return { content: [{ type: "text", text: `Namespace '${namespace}' not found. Available: ${available}` }] };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ namespace, entries: result.length, functions: result }, null, 2),
      }],
    };
  }
);

// --- Tool: pine_repainting_check ---
server.tool(
  "pine_repainting_check",
  "Focused check for repainting issues in Pine Script code. Repainting means the script shows different results on historical vs. realtime bars.",
  { source: z.string().describe("Pine Script source code to check for repainting") },
  async ({ source }) => {
    const issues = [];
    const lines = source.split("\n");

    // Check request.security with lookahead
    const requests = extractRequests(source);
    for (const req of requests) {
      if (req.hasLookahead && !req.hasOffset) {
        issues.push({
          severity: "critical",
          line: req.line,
          issue: "request.security() with lookahead_on but no [1] offset -- leaks future data",
          fix: "Add [1] to the expression parameter, or set lookahead=barmerge.lookahead_off",
        });
      }
      if (!req.hasLookahead && !req.hasOffset) {
        issues.push({
          severity: "minor",
          line: req.line,
          issue: "request.security() without [1] offset or lookahead -- may show different values on realtime vs historical",
          fix: "Consider adding [1] offset for consistent historical behavior",
        });
      }
    }

    // Check timenow
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("//")) continue;
      if (/\btimenow\b/.test(lines[i])) {
        issues.push({ severity: "critical", line: i + 1, issue: "timenow always repaints", fix: "Use time or time_close instead" });
      }
    }

    // Check barstate.isrealtime/isnew without isconfirmed
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("//")) continue;
      if (/barstate\.(isrealtime|isnew)/.test(lines[i]) && !/barstate\.isconfirmed/.test(lines[i])) {
        issues.push({
          severity: "warning",
          line: i + 1,
          issue: `${lines[i].match(/barstate\.\w+/)?.[0]} without barstate.isconfirmed guard`,
          fix: "Add barstate.isconfirmed check to only act on confirmed bars",
        });
      }
    }

    // Check varip
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*varip\b/.test(lines[i])) {
        issues.push({
          severity: "warning",
          line: i + 1,
          issue: "varip variables behave differently on historical vs realtime bars",
          fix: "Values are not reproducible in replay mode. Consider using var instead.",
        });
      }
    }

    // Check calc_on_every_tick
    if (/calc_on_every_tick\s*=\s*true/.test(source)) {
      issues.push({
        severity: "warning",
        line: null,
        issue: "calc_on_every_tick=true causes strategy to recalculate on every tick",
        fix: "Backtests will not match realtime behavior. Use calc_on_every_tick=false for reliable results.",
      });
    }

    const critical = issues.filter((i) => i.severity === "critical").length;
    const summary = issues.length === 0
      ? "No repainting issues detected."
      : `Found ${issues.length} potential repainting issue(s) (${critical} critical).`;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ summary, repaints: issues.length > 0, issues }, null, 2),
      }],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
