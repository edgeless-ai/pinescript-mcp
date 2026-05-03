import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lint } from "../src/linter.js";

describe("lint", () => {
  it("reports missing version", () => {
    const results = lint('indicator("test")');
    const e001 = results.find((r) => r.rule === "E001");
    assert.ok(e001);
    assert.equal(e001.severity, "error");
  });

  it("reports missing declaration", () => {
    const results = lint("//@version=6\nfoo = 1");
    const e002 = results.find((r) => r.rule === "E002");
    assert.ok(e002);
  });

  it("passes clean script", () => {
    const results = lint('//@version=6\nindicator("Test")\nplot(close)');
    const errors = results.filter((r) => r.severity === "error");
    assert.equal(errors.length, 0);
  });

  it("detects v4 functions in v5 script", () => {
    const results = lint('//@version=5\nindicator("Test")\nval = sma(close, 14)');
    const e004 = results.find((r) => r.rule === "E004");
    assert.ok(e004);
    assert.ok(e004.message.includes("ta.sma"));
  });

  it("detects security() without request prefix in v5", () => {
    const results = lint('//@version=5\nindicator("Test")\nval = security(syminfo.tickerid, "D", close)');
    const e005 = results.find((r) => r.rule === "E005");
    assert.ok(e005);
  });

  it("detects transp parameter in v6", () => {
    const results = lint('//@version=6\nindicator("Test")\nplot(close, color=color.red, transp=50)');
    const e006 = results.find((r) => r.rule === "E006");
    assert.ok(e006);
    assert.ok(e006.message.includes("transp"));
  });

  it("detects when parameter in v6 strategy", () => {
    const results = lint('//@version=6\nstrategy("Test")\nstrategy.entry("L", strategy.long, when=cond)');
    const e006 = results.find((r) => r.rule === "E006" && r.message.includes("when"));
    assert.ok(e006);
  });

  it("warns on lookahead without offset", () => {
    const results = lint('//@version=5\nindicator("T")\nval = request.security(sym, "D", close, lookahead=barmerge.lookahead_on)');
    const w001 = results.find((r) => r.rule === "W001");
    assert.ok(w001);
    assert.ok(w001.message.includes("future data leak"));
  });

  it("warns on timenow", () => {
    const results = lint('//@version=6\nindicator("T")\nt = timenow');
    const w002 = results.find((r) => r.rule === "W002");
    assert.ok(w002);
  });

  it("warns on varip", () => {
    const results = lint('//@version=6\nindicator("T")\nvarip int x = 0');
    const w004 = results.find((r) => r.rule === "W004");
    assert.ok(w004);
  });

  it("warns on calc_on_every_tick", () => {
    const results = lint('//@version=6\nstrategy("T", calc_on_every_tick=true)');
    const w007 = results.find((r) => r.rule === "W007");
    assert.ok(w007);
  });

  it("info on missing plot title", () => {
    const results = lint('//@version=6\nindicator("T")\nplot(close)');
    const i001 = results.find((r) => r.rule === "I001");
    assert.ok(i001);
  });

  it("info on strategy without exits", () => {
    const results = lint('//@version=6\nstrategy("T")\nstrategy.entry("L", strategy.long)');
    const i002 = results.find((r) => r.rule === "I002");
    assert.ok(i002);
  });
});
