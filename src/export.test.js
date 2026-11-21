import test from "node:test";
import assert from "node:assert/strict";
import { exportFile } from "./export.js";

for (const [name, content, type] of [
  ["backup.json", '{"name":"Kopi ☕"}', "application/json"],
  ["transactions.csv", "Nama,Nominal\nKopi,25000", "text/csv"],
  ["empty.csv", "", "text/csv"],
]) {
  test(`native export shares UTF-8 cache file: ${name}`, async () => {
    let written;
    let shared;
    await exportFile(content, name, type, {
      native: true,
      filesystem: { writeFile: async (options) => {
        written = options;
        return { uri: `file:///cache/${name}` };
      } },
      share: { share: async (options) => { shared = options; } },
    });
    assert.deepEqual(written, { path: name, data: content, directory: "CACHE", encoding: "utf8" });
    assert.deepEqual(shared, { title: name, files: [`file:///cache/${name}`] });
  });
}

test("failed cache write does not open share sheet", async () => {
  await assert.rejects(exportFile("{}", "backup.json", "application/json", {
    native: true,
    filesystem: { writeFile: async () => { throw new Error("disk full"); } },
    share: { share: async () => assert.fail("must not share") },
  }), /disk full/);
});

test("share failure is reported to caller", async () => {
  await assert.rejects(exportFile("{}", "backup.json", "application/json", {
    native: true,
    filesystem: { writeFile: async () => ({ uri: "file:///cache/backup.json" }) },
    share: { share: async () => { throw new Error("share failed"); } },
  }), /share failed/);
});

test("web export retains blob download and releases URL", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let clicked = false;
  let revoked;
  const anchor = { click: () => { clicked = true; } };
  await exportFile("{}", "backup.json", "application/json", {
    native: false,
    browserDocument: { createElement: (tag) => { assert.equal(tag, "a"); return anchor; } },
    browserURL: {
      createObjectURL: (blob) => { assert.equal(blob.type, "application/json"); return "blob:backup"; },
      revokeObjectURL: (url) => { revoked = url; },
    },
  });
  assert.equal(anchor.href, "blob:backup");
  assert.equal(anchor.download, "backup.json");
  assert.equal(clicked, true);
  t.mock.timers.tick(1000);
  assert.equal(revoked, "blob:backup");
});
