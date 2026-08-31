const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/shared/core.js");

test("normalizes supported Saudi mobile formats", () => {
  const expected = "+966555957058";
  assert.equal(core.normalizeSaudiMobile("tel:+966555957058"), expected);
  assert.equal(core.normalizeSaudiMobile("966555957058"), expected);
  assert.equal(core.normalizeSaudiMobile("0555957058"), expected);
  assert.equal(core.normalizeSaudiMobile("٠٥٥٥٩٥٧٠٥٨"), expected);
});

test("rejects invalid mobile values", () => {
  assert.equal(core.normalizeSaudiMobile("123"), null);
  assert.equal(core.normalizeSaudiMobile(""), null);
});

test("validates Apps Script deployment URLs", () => {
  assert.equal(
    core.normalizeWebAppUrl("https://script.google.com/macros/s/abc123/exec"),
    "https://script.google.com/macros/s/abc123/exec"
  );
  assert.throws(() => core.normalizeWebAppUrl("https://example.com/exec"));
});

test("renders provider message variables", () => {
  assert.equal(
    core.buildProviderMessage("{الخدمة} في {المدينة} {رقم_المزود}", {
      city: "حائل",
      service: "وايتات مياه",
      phone: "+966555957058"
    }),
    "وايتات مياه في حائل +966555957058"
  );
});
