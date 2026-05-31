"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PACKAGE_DIR = path.join(DIST_DIR, "ai-prompt-optimizer-extension");
const ZIP_PATH = path.join(DIST_DIR, "ai-prompt-optimizer-extension.zip");

const INCLUDE_PATHS = [
  "manifest.json",
  "background",
  "content",
  "popup",
  "shared",
  "icons",
  "README.md",
  "LICENSE",
  "PRIVACY.md"
];

function copyEntry(relativePath) {
  const source = path.join(ROOT_DIR, relativePath);
  const target = path.join(PACKAGE_DIR, relativePath);
  const stats = fs.statSync(source);

  if (stats.isDirectory()) {
    fs.cpSync(source, target, { recursive: true });
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(PACKAGE_DIR, { recursive: true });
INCLUDE_PATHS.forEach(copyEntry);

const zipResult = spawnSync("zip", ["-qr", ZIP_PATH, path.basename(PACKAGE_DIR)], {
  cwd: DIST_DIR,
  stdio: "inherit"
});

if (zipResult.status !== 0) {
  if (zipResult.error && zipResult.error.code === "ENOENT") {
    console.error(
      "错误：未找到 zip 命令。\n" +
      "macOS/Linux 通常已内置 zip。\n" +
      "Windows 用户请安装 zip（如通过 Git Bash、Cygwin 或 7-Zip 的命令行版本）。\n" +
      "或手动将 dist/ai-prompt-optimizer-extension/ 目录打包为 zip 文件。"
    );
    process.exit(1);
  }
  throw new Error("Failed to create extension zip. Make sure the zip command is available.");
}

console.log(`Created ${ZIP_PATH}`);
