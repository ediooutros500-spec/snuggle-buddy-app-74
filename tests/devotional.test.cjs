const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
test("Hourly devotional changes at hour and midnight boundaries", () => {
  const { devotionalAt: f } = load("src/lib/devotional.ts");
  assert.deepEqual(f(new Date(2026, 9, 26, 9, 0)), f(new Date(2026, 9, 26, 9, 59)));
  assert.notEqual(f(new Date(2026, 9, 26, 9)).reference, f(new Date(2026, 9, 26, 10)).reference);
  assert.notEqual(f(new Date(2026, 9, 26, 23)).reference, f(new Date(2026, 9, 27, 0)).reference);
});
