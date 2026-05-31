"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT_DIR = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"));

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

test("manifest uses minimum declared permissions for release", () => {
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.content_scripts[0].matches[0], "<all_urls>");
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.ok(manifest.host_permissions.includes("https://api.openai.com/*"));
});

test("open-source release files document privacy, security, and packaging", () => {
  [
    ".gitignore",
    "LICENSE",
    "PRIVACY.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "docs/store-submission.md",
    "package.json",
    "scripts/pack-extension.js"
  ].forEach((relativePath) => {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, relativePath)), `${relativePath} should exist`);
  });

  assert.match(read(".gitignore"), /\.omx\//);
  assert.match(read(".gitignore"), /\.playwright-mcp\//);
  assert.match(read("LICENSE"), /MIT License/);
  assert.match(read("PRIVACY.md"), /chrome\.storage\.local/);
  assert.match(read("PRIVACY.md"), /不会自动发送网页输入内容/);
  assert.match(read("SECURITY.md"), /不要在 issue/);
  assert.match(read("README.md"), /Permissions/);
  assert.match(read("README_CN.md"), /权限说明/);
  assert.match(read("docs/store-submission.md"), /Single purpose/);
});

test("new documentation and engineering files exist", () => {
  assert.ok(exists("ARCHITECTURE.md"), "ARCHITECTURE.md should exist");
  assert.ok(exists(".github/CODEOWNERS"), ".github/CODEOWNERS should exist");
  assert.ok(exists("package-lock.json"), "package-lock.json should exist");
});

test("ARCHITECTURE.md documents data flow and message types", () => {
  const architectureMd = read("ARCHITECTURE.md");
  assert.match(architectureMd, /AIPO_OPTIMIZE_PROMPT/);
  assert.match(architectureMd, /AIPO_TEST_CONNECTION|TEST_CONNECTION/);
  assert.match(architectureMd, /Content Script|Background/);
});

test("package.json declares Node >=18", () => {
  assert.ok(packageJson.engines, "package.json must have engines field");
  assert.match(packageJson.engines.node, /\b18\b|>=18|>= 18/);
});

test("PRIVACY.md includes uninstall data cleanup note", () => {
  const privacyMd = read("PRIVACY.md");
  assert.match(privacyMd, /uninstall|卸载/);
});

test("provider config includes temperature, maxTokens, deprecatedModels", () => {
  const providerConfig = read("shared/provider-config.js");
  assert.match(providerConfig, /temperature:/);
  assert.match(providerConfig, /maxTokens:/);
  assert.match(providerConfig, /deprecatedModels:/);
});

test("pack script shows helpful error when zip is missing", () => {
  const packScript = read("scripts/pack-extension.js");
  assert.match(packScript, /ENOENT|未找到 zip/);
});
