"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT_DIR = path.resolve(__dirname, "..");
const contentJs = fs.readFileSync(path.join(ROOT_DIR, "content", "content.js"), "utf8");
const contentCss = fs.readFileSync(path.join(ROOT_DIR, "content", "content.css"), "utf8");
const sharedConfigUtils = fs.readFileSync(path.join(ROOT_DIR, "shared", "config-utils.js"), "utf8");

test("floating button uses compact icon text labels", () => {
  assert.match(contentJs, /const AIPO_BUTTON_LABEL = "✨ 优化提示词"/);
  assert.match(contentJs, /const AIPO_BUTTON_LOADING_LABEL = "优化中\.\.\."/);
  assert.match(contentJs, /button\.textContent = AIPO_BUTTON_LABEL/);
  assert.match(contentJs, /loading \? AIPO_BUTTON_LOADING_LABEL : AIPO_BUTTON_LABEL/);
});

test("floating button CSS is a lightweight pill", () => {
  assert.match(contentCss, /display:\s*inline-flex;/);
  assert.match(contentCss, /height:\s*28px;/);
  assert.match(contentCss, /border-radius:\s*999px;/);
  assert.match(contentJs, /const AIPO_STYLE_ID = "aipo-runtime-styles-v2"/);
  assert.match(contentJs, /injectRuntimeStyles\(\);/);
  assert.doesNotMatch(contentCss, /box-shadow:\s*0 8px 22px/);
});

test("floating button positioning prefers outside top-right and clamps to viewport", () => {
  assert.match(contentJs, /window\.addEventListener\("scroll", handleScrollForPosition, true\);/);
  assert.match(contentJs, /function handleScrollForPosition\(event\)/);
  assert.match(contentJs, /if \(isInternalEditableScroll\(event\.target\)\)/);
  assert.match(contentJs, /function isInternalEditableScroll\(scrollTarget\)/);
  assert.match(contentJs, /return editableElement === targetElement \|\| editableElement\.contains\(targetElement\) \|\| targetElement\.contains\(editableElement\);/);
  assert.match(contentJs, /function getPositionAnchorRect\(editableElement\)/);
  assert.match(contentJs, /function getVisibleElementRect\(element\)/);
  assert.match(contentJs, /function intersectRects\(firstRect, secondRect\)/);
  assert.match(contentJs, /function clipsOverflow\(element\)/);
  assert.match(contentJs, /const anchorRect = getPositionAnchorRect\(editableElement\);/);
  assert.match(contentJs, /const placeInsideTopRight = shouldPlaceButtonInsideAnchor\(editableElement\);/);
  assert.match(contentJs, /const rightInset = placeInsideTopRight \? 16 : 24;/);
  assert.match(contentJs, /const preferredTop = placeInsideTopRight \? anchorRect\.top \+ 10 : anchorRect\.top - buttonHeight - gap;/);
  assert.match(contentJs, /const visibleEditableRect = getVisibleElementRect\(editableElement\);/);
  assert.match(contentJs, /const fallbackTop = anchorRect\.bottom \+ gap;/);
  assert.match(contentJs, /const unclampedLeft = anchorRect\.right - buttonWidth - rightInset;/);
  assert.match(contentJs, /const verticalPaddingTop = editableRect\.top - candidateRect\.top;/);
  assert.match(contentJs, /const horizontalExpansion = candidateRect\.width - editableRect\.width;/);
  assert.match(contentJs, /const isNearEditableWidth = horizontalExpansion <= Math\.max\(360, editableRect\.width \* 0\.75\);/);
  assert.match(contentJs, /const isSameWidthInputSurface = candidateRect\.width >= editableRect\.width - 8 &&/);
  assert.match(contentJs, /candidateRect\.height >= editableRect\.height \+ 48/);
  assert.match(contentJs, /const matchesInputSurfaceShape = isWiderContainer \|\| isSameWidthInputSurface;/);
  assert.match(contentJs, /const hasReasonableHorizontalPadding = leftExpansion >= -2 && rightExpansion >= -2/);
  assert.match(contentJs, /const hasTightTopPadding = verticalPaddingTop >= -2 && verticalPaddingTop <= 96;/);
  assert.match(contentJs, /const hasReasonableHeight = candidateRect\.height >= editableRect\.height && candidateRect\.height <= Math\.max\(260, editableRect\.height \+ 140\);/);
  assert.match(contentJs, /clamp\(/);
  assert.doesNotMatch(contentJs, /rect\.right \+ gap/);
  assert.doesNotMatch(contentJs, /window\.innerHeight \* 0\.5/);
});

test("Kimi positioning uses conservative tight anchors", () => {
  assert.match(contentJs, /function isKimiSite\(\)/);
  assert.match(contentJs, /function shouldPlaceButtonInsideAnchor\(editableElement\)/);
  assert.match(contentJs, /return isKimiSite\(\) && isVisibleEditableElement\(editableElement\);/);
  assert.match(contentJs, /const kimiSite = isKimiSite\(\);/);
  assert.match(contentJs, /isUsefulAnchorRect\(candidateRect, visibleEditableRect, kimiSite\)/);
  assert.match(contentJs, /function isUsefulAnchorRect\(candidateRect, editableRect, useStrictHorizontalAnchor\)/);
  assert.match(contentJs, /const strictHorizontalLimit = Math\.max\(220, editableRect\.width \* 0\.45\);/);
  assert.match(contentJs, /const passesStrictHorizontalAnchor = !useStrictHorizontalAnchor \|\|/);
  assert.match(contentJs, /rightExpansion <= strictHorizontalLimit/);
  assert.match(contentJs, /leftExpansion <= strictHorizontalLimit/);
});

test("content script supports site-level disable and conservative editable binding", () => {
  assert.match(contentJs, /disabledHostnames: \[\]/);
  assert.match(contentJs, /AIPO_GET_PAGE_INFO/);
  assert.match(contentJs, /function isButtonEnabledOnCurrentPage\(\)/);
  assert.match(contentJs, /disabledHostnames\.includes\(hostname\)/);
  assert.match(contentJs, /isPromptSite\(hostname\)/);
  assert.match(contentJs, /const conservativeEditable = role === "textbox" \|\|/);
  assert.match(contentJs, /contenteditable === "plaintext-only"/);
  assert.doesNotMatch(contentJs, /return !ariaDisabled && !ariaReadonly && editable && \(role === "textbox" \|\| editable\);/);
});

test("editable element has loading lock to prevent duplicate requests", () => {
  assert.match(contentJs, /loading/);
  assert.match(contentJs, /finally/);
  assert.match(contentJs, /setButtonLoading\(button,\s*false\)/);
});

test("prompt-like detection includes name, id, aria-describedby attributes", () => {
  assert.match(contentJs, /getAttribute\("name"\)/);
  assert.match(contentJs, /getAttribute\("id"\)/);
  assert.match(contentJs, /aria-describedby/);
});

test("error messages distinguish between key missing, provider error, network error, and background unavailable", () => {
  assert.match(contentJs, /API Key|apiKey/);
  assert.match(contentJs, /网络请求失败/);
  assert.match(contentJs, /刷新页面|重新加载扩展|扩展后台未响应/);
});

test("shared config-utils.js exposes normalization functions", () => {
  assert.match(sharedConfigUtils, /globalThis\.AIPO_normalizeConfig/);
  assert.match(sharedConfigUtils, /globalThis\.AIPO_normalizeHostnames/);
  assert.match(sharedConfigUtils, /globalThis\.AIPO_createDefaultProvidersConfig/);
});
