import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectVersion, detectDeclaration, extractVariables, extractFunctions, extractInputs, extractPlots, extractRequests, countLines } from "../src/parser.js";

describe("detectVersion", () => {
  it("detects v6", () => {
    assert.equal(detectVersion("//@version=6\nindicator('test')"), 6);
  });
  it("detects v5", () => {
    assert.equal(detectVersion("//@version=5\nindicator('test')"), 5);
  });
  it("detects v4", () => {
    assert.equal(detectVersion("//@version=4\nstudy('test')"), 4);
  });
  it("returns null when missing", () => {
    assert.equal(detectVersion("indicator('test')"), null);
  });
});

describe("detectDeclaration", () => {
  it("detects indicator", () => {
    const d = detectDeclaration('//@version=6\nindicator("My Ind", overlay=true)');
    assert.equal(d.type, "indicator");
    assert.equal(d.title, "My Ind");
  });
  it("detects strategy", () => {
    const d = detectDeclaration('//@version=6\nstrategy("My Strat")');
    assert.equal(d.type, "strategy");
  });
  it("detects library", () => {
    const d = detectDeclaration('//@version=6\nlibrary("MyLib")');
    assert.equal(d.type, "library");
  });
  it("detects v4 study as indicator", () => {
    const d = detectDeclaration('//@version=4\nstudy("Old")');
    assert.equal(d.type, "indicator");
  });
  it("returns null when missing", () => {
    assert.equal(detectDeclaration("//@version=6\nfoo = 1"), null);
  });
});

describe("extractVariables", () => {
  it("extracts simple vars", () => {
    const vars = extractVariables("//@version=6\nindicator('t')\nlength = 14\nsrc = close");
    assert.equal(vars.length, 2);
    assert.equal(vars[0].name, "length");
    assert.equal(vars[1].name, "src");
  });
  it("detects var mode", () => {
    const vars = extractVariables("//@version=6\nindicator('t')\nvar float total = 0.0");
    assert.equal(vars[0].mode, "var");
    assert.equal(vars[0].type, "float");
  });
  it("detects varip mode", () => {
    const vars = extractVariables("//@version=6\nindicator('t')\nvarip int counter = 0");
    assert.equal(vars[0].mode, "varip");
  });
});

describe("extractFunctions", () => {
  it("extracts single-line functions", () => {
    const fns = extractFunctions("myFunc(a, b) => a + b");
    assert.equal(fns.length, 1);
    assert.equal(fns[0].name, "myFunc");
    assert.deepEqual(fns[0].params, ["a", "b"]);
  });
  it("detects exported functions", () => {
    const fns = extractFunctions("export myFunc(x) => x * 2");
    assert.equal(fns[0].exported, true);
  });
  it("detects methods", () => {
    const fns = extractFunctions("method myMethod(int self, float x) => self + x");
    assert.equal(fns[0].name, "myMethod");
  });
});

describe("extractInputs", () => {
  it("extracts typed inputs", () => {
    const inputs = extractInputs('length = input.int(14, "Length")\nsrc = input.source(close)');
    assert.equal(inputs.length, 2);
    assert.equal(inputs[0].inputType, "int");
    assert.equal(inputs[1].inputType, "source");
  });
  it("extracts generic input", () => {
    const inputs = extractInputs('val = input(true, "Flag")');
    assert.equal(inputs[0].inputType, "auto");
  });
});

describe("extractPlots", () => {
  it("extracts plot calls", () => {
    const plots = extractPlots('plot(sma, "SMA")\nplotshape(cross, "X")\nbgcolor(col)');
    assert.equal(plots.length, 3);
    assert.equal(plots[0].type, "plot");
    assert.equal(plots[1].type, "plotshape");
    assert.equal(plots[2].type, "bgcolor");
  });
  it("ignores comments", () => {
    const plots = extractPlots("// plot(x)\nplot(y)");
    assert.equal(plots.length, 1);
  });
});

describe("extractRequests", () => {
  it("detects request.security", () => {
    const reqs = extractRequests('val = request.security(syminfo.tickerid, "D", close)');
    assert.equal(reqs.length, 1);
    assert.equal(reqs[0].type, "security");
  });
  it("detects lookahead", () => {
    const reqs = extractRequests("val = request.security(sym, tf, close, lookahead=barmerge.lookahead_on)");
    assert.equal(reqs[0].hasLookahead, true);
  });
  it("detects offset", () => {
    const reqs = extractRequests("val = request.security(sym, tf, close[1])");
    assert.equal(reqs[0].hasOffset, true);
  });
  it("detects v4 security()", () => {
    const reqs = extractRequests("val = security(sym, tf, close)");
    assert.equal(reqs.length, 1);
  });
});

describe("countLines", () => {
  it("counts correctly", () => {
    const result = countLines("// comment\ncode = 1\n\nmore = 2\n// end");
    assert.equal(result.total, 5);
    assert.equal(result.code, 2);
    assert.equal(result.comments, 2);
    assert.equal(result.blank, 1);
  });
});
