import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrate, getMigrationGuide } from "../src/migrator.js";

describe("migrate v4 to v5", () => {
  it("updates version annotation", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')", 4, 5);
    assert.ok(migrated.includes("//@version=5"));
  });

  it("renames study to indicator", () => {
    const { migrated, changes } = migrate('//@version=4\nstudy("Test")', 4, 5);
    assert.ok(migrated.includes("indicator("));
    assert.ok(changes.some((c) => c.from === "study(" && c.to === "indicator("));
  });

  it("renames sma to ta.sma", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')\nval = sma(close, 14)", 4, 5);
    assert.ok(migrated.includes("ta.sma("));
  });

  it("renames abs to math.abs", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')\nval = abs(x)", 4, 5);
    assert.ok(migrated.includes("math.abs("));
  });

  it("renames tostring to str.tostring", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')\ns = tostring(val)", 4, 5);
    assert.ok(migrated.includes("str.tostring("));
  });

  it("renames security to request.security", () => {
    const { migrated } = migrate('//@version=4\nstudy("t")\nval = security(sym, "D", close)', 4, 5);
    assert.ok(migrated.includes("request.security("));
  });

  it("replaces iff with ternary", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')\nval = iff(cond, a, b)", 4, 5);
    assert.ok(migrated.includes("cond ? a : b"));
  });

  it("renames resolution to timeframe", () => {
    const { migrated } = migrate('//@version=4\nstudy("t")\nval = request.security(sym, resolution="D", close)', 4, 5);
    assert.ok(migrated.includes("timeframe="));
  });

  it("does not rename already-namespaced functions", () => {
    const { migrated } = migrate("//@version=4\nstudy('t')\nval = ta.sma(close, 14)", 4, 5);
    assert.ok(!migrated.includes("ta.ta.sma"));
  });
});

describe("migrate v5 to v6", () => {
  it("updates version annotation", () => {
    const { migrated } = migrate('//@version=5\nindicator("t")', 5, 6);
    assert.ok(migrated.includes("//@version=6"));
  });

  it("flags transp parameter", () => {
    const { migrated, changes } = migrate('//@version=5\nindicator("t")\nplot(x, color=color.red, transp=50)', 5, 6);
    assert.ok(changes.some((c) => c.rule === "transp-removal"));
    assert.ok(migrated.includes("TODO"));
  });

  it("flags when parameter", () => {
    const { migrated, changes } = migrate('//@version=5\nstrategy("t")\nstrategy.entry("L", strategy.long, when=cond)', 5, 6);
    assert.ok(changes.some((c) => c.rule === "when-removal"));
  });

  it("updates timeframe.period comparisons", () => {
    const { migrated } = migrate('//@version=5\nindicator("t")\nif timeframe.period == "D"', 5, 6);
    assert.ok(migrated.includes('"1D"'));
  });
});

describe("migrate v4 to v6", () => {
  it("applies both migration steps", () => {
    const { migrated, changes } = migrate('//@version=4\nstudy("t")\nval = sma(close, 14)', 4, 6);
    assert.ok(migrated.includes("//@version=6"));
    assert.ok(migrated.includes("ta.sma("));
    assert.ok(migrated.includes("indicator("));
    assert.ok(changes.length >= 3);
  });
});

describe("getMigrationGuide", () => {
  it("returns v4->v5 guide", () => {
    const guide = getMigrationGuide(4, 5);
    assert.ok(guide.includes("v4 -> v5"));
    assert.ok(guide.includes("ta.sma"));
  });

  it("returns v5->v6 guide", () => {
    const guide = getMigrationGuide(5, 6);
    assert.ok(guide.includes("v5 -> v6"));
    assert.ok(guide.includes("transp"));
  });
});
