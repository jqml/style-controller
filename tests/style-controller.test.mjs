import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/main.ts");
const cssPath = path.join(root, "styles.css");
const source = await readFile(sourcePath, "utf8");
const css = await readFile(cssPath, "utf8");

const bundle = await build({
  entryPoints: [sourcePath],
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  plugins: [{
    name: "obsidian-test-stub",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test-stub" }));
      buildApi.onLoad({ filter: /.*/, namespace: "test-stub" }, () => ({
        contents: `
          export class Plugin {}
          export class PluginSettingTab {}
          export class Modal {}
          export class Notice {}
          export class Setting {}
          export class TFolder {}
          export const MarkdownRenderer = {};
          export const prepareFuzzySearch = () => () => null;
          export const normalizePath = (value) => value;
        `,
        loader: "js"
      }));
    }
  }]
});

const moduleRecord = { exports: {} };
const context = vm.createContext({ console, exports: moduleRecord.exports, module: moduleRecord });
new vm.Script(bundle.outputFiles[0].text, { filename: "style-controller-test-bundle.cjs" }).runInContext(context);
const pluginModule = moduleRecord.exports;

const {
  default: StyleControllerPlugin,
  BLOCK_CODE_BACKGROUND_SELECTORS,
  BLOCK_CODE_TEXT_SELECTORS,
  INLINE_CODE_SELECTORS,
  STYLE_FIELD_REGISTRY,
  STYLE_SCOPE_CLASS,
  applyProfileCssVariables,
  clearProfileCssVariables,
  configurationToExport,
  createConfigurationSnapshot,
  normalizeHexColor,
  normalizeProfile,
  normalizeSettings,
  parseConfigurationImport
} = pluginModule;

class FakeClassList {
  constructor(values = []) {
    this.values = new Set(values);
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

function fakeElement() {
  const attributes = new Map();
  const element = {
    css: new Map(),
    classList: new FakeClassList(),
    setCssProps(properties) {
      Object.entries(properties).forEach(([name, value]) => {
        if (value === "") this.css.delete(name);
        else this.css.set(name, value);
      });
    },
    addClass(name) {
      this.classList.add(name);
    },
    removeClass(name) {
      this.classList.remove(name);
    },
    toggleClass(name, enabled) {
      if (enabled) this.classList.add(name);
      else this.classList.remove(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    removeAttribute(name) {
      attributes.delete(name);
    }
  };
  return element;
}

function cssRules(text) {
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1].trim(),
    declarations: match[2].trim()
  }));
}

test("inline and block code fields have independent authoritative registry entries", () => {
  const inline = STYLE_FIELD_REGISTRY.codeBackground;
  const block = STYLE_FIELD_REGISTRY.codeBlockBackground;

  assert.equal(inline.variable, "--osc-code-background");
  assert.equal(block.variable, "--osc-code-block-background");
  assert.notEqual(inline.variable, block.variable);
  assert.equal(inline.property, "background-color");
  assert.equal(block.property, "background-color");
  assert.deepEqual(inline.selectors, INLINE_CODE_SELECTORS);
  assert.deepEqual(block.selectors, BLOCK_CODE_BACKGROUND_SELECTORS);
  assert.ok(block.selectors.some((selector) => selector.endsWith("pre")));
  assert.ok(block.selectors.some((selector) => selector.includes("HyperMD-codeblock")));
  assert.ok(BLOCK_CODE_TEXT_SELECTORS.includes(".markdown-source-view.mod-cm6 .cm-code"));
  assert.ok(!inline.selectors.some((selector) => block.selectors.includes(selector)));
});

test("identical #fafafa inline and block values survive normalize, save, load, export, and import", () => {
  const fixture = {
    codeFontFamily: "Menlo, monospace",
    codeBackground: "#fafafa",
    codeColor: "#fafafa",
    codeBlockFontFamily: "Menlo, monospace",
    codeBlockBackground: "#fafafa",
    codeBlockColor: "#fafafa"
  };

  assert.equal(normalizeHexColor("#fafafa"), "#fafafa");
  const profile = normalizeProfile(fixture);
  assert.equal(profile.codeBackground, "#fafafa");
  assert.equal(profile.codeBlockBackground, "#fafafa");
  assert.equal(profile.codeBlockFontFamily, fixture.codeBlockFontFamily);
  assert.equal(profile.codeBlockColor, "#fafafa");

  const loaded = normalizeSettings(JSON.parse(JSON.stringify({ global: profile })));
  const snapshot = createConfigurationSnapshot(loaded);
  const exported = configurationToExport({ name: "Code fixture", description: "", data: snapshot });
  const imported = parseConfigurationImport(exported);
  assert.equal(imported.data.global.codeBackground, "#fafafa");
  assert.equal(imported.data.global.codeBlockBackground, "#fafafa");
});

test("block variable is applied when enabled and removed without a fallback when disabled or switched", () => {
  const element = fakeElement();
  const enabled = normalizeProfile({ codeBlockBackground: "#fafafa" });
  applyProfileCssVariables(element, enabled);
  assert.equal(element.css.get("--osc-code-block-background"), "#fafafa");
  assert.equal(element.css.has("--osc-code-background"), false);

  applyProfileCssVariables(element, normalizeProfile({ codeBackground: "#123456" }));
  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.css.get("--osc-code-background"), "#123456");

  clearProfileCssVariables(element);
  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.css.has("--osc-code-background"), false);
});

test("path overrides resolve and apply independently per Markdown leaf", () => {
  const settings = normalizeSettings({
    global: { codeBlockBackground: "#fafafa" },
    overrides: [{
      id: "work",
      name: "Work",
      type: "folder",
      pattern: "Work",
      enabled: true,
      modules: { tablesCodeQuotes: true },
      profile: { codeBlockBackground: "#123456" }
    }]
  });
  const context = { settings };
  const work = StyleControllerPlugin.prototype.getProfileForPath.call(context, "Work/One.md");
  const personal = StyleControllerPlugin.prototype.getProfileForPath.call(context, "Personal/Two.md");
  const workLeaf = fakeElement();
  const personalLeaf = fakeElement();

  applyProfileCssVariables(workLeaf, work.profile);
  applyProfileCssVariables(personalLeaf, personal.profile);
  assert.equal(workLeaf.css.get("--osc-code-block-background"), "#123456");
  assert.equal(personalLeaf.css.get("--osc-code-block-background"), "#fafafa");
});

test("unload cleanup removes plugin variables and scope classes", () => {
  const element = fakeElement();
  element.classList.add(STYLE_SCOPE_CLASS, "osc-scope-0", "style-controller-image-width");
  applyProfileCssVariables(element, normalizeProfile({ codeBlockBackground: "#fafafa" }));
  let explorerCleared = false;

  StyleControllerPlugin.prototype.removeStyles.call({
    getMarkdownContainers: () => [element],
    clearFileExplorerStyles: () => {
      explorerCleared = true;
    }
  });

  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.classList.contains(STYLE_SCOPE_CLASS), false);
  assert.equal(element.classList.contains("osc-scope-0"), false);
  assert.equal(element.classList.contains("style-controller-image-width"), false);
  assert.equal(explorerCleared, true);
});

test("preview, reading view, and Live Preview use the same dedicated block variable", () => {
  const rules = cssRules(css);
  const previewPre = rules.find((rule) => rule.selectors.includes(".osc-code-block-rendered-preview pre") && !rule.selectors.includes("pre code"));
  const readingBlock = rules.find((rule) => rule.selectors.includes(".osc-style-scope .markdown-rendered pre") && rule.declarations.includes("background-color"));
  const editorBlock = rules.find((rule) => rule.selectors.includes(".HyperMD-codeblock-bg") && rule.declarations.includes("background-color"));
  const inlineRule = rules.find((rule) => rule.selectors.includes(":not(pre) > code"));

  assert.match(previewPre.declarations, /background-color:\s*var\(--osc-code-block-background\)/);
  assert.match(readingBlock.declarations, /background-color:\s*var\(--osc-code-block-background\)/);
  assert.match(editorBlock.declarations, /background-color:\s*var\(--osc-code-block-background\)/);
  assert.match(inlineRule.declarations, /background-color:\s*var\(--osc-code-background\)/);
  assert.doesNotMatch(inlineRule.declarations, /--osc-code-block-background/);

  const blockRules = rules.filter((rule) => (
    /code-block-rendered-preview|markdown-rendered pre|HyperMD-codeblock/.test(rule.selectors)
    && !/:not\(.HyperMD-codeblock\)/.test(rule.selectors)
  ));
  blockRules.forEach((rule) => assert.doesNotMatch(rule.declarations, /--osc-code-background(?:\W|$)/));
  const inlineRules = rules.filter((rule) => /osc-inline-code-preview|cm-inline-code|:not\(pre\) > code/.test(rule.selectors));
  inlineRules.forEach((rule) => assert.doesNotMatch(rule.declarations, /--osc-code-block-background/));

  const focusedFixture = normalizeProfile({ codeBackground: "#fafafa", codeBlockBackground: "#fafafa" });
  const element = fakeElement();
  applyProfileCssVariables(element, focusedFixture);
  assert.equal(element.css.get("--osc-code-background"), "#fafafa");
  assert.equal(element.css.get("--osc-code-block-background"), "#fafafa");
});

test("code preview has no hardcoded white fallback and source has no runtime stylesheet mutation", () => {
  const codeRules = cssRules(css).filter((rule) => /osc-(?:inline-code-preview|code-block-rendered-preview)/.test(rule.selectors));
  codeRules.forEach((rule) => {
    assert.doesNotMatch(rule.declarations, /background(?:-color)?:\s*(?:#fff(?:fff)?\b|white\b)/i);
    assert.doesNotMatch(rule.declarations, /background(?:-color)?:\s*(?:transparent|inherit|unset)\b/i);
  });
  assert.doesNotMatch(source, /create(?:El|Element)\(\s*["']style["']/);
  assert.doesNotMatch(source, /CSSStyleSheet|adoptedStyleSheets|insertRule|replaceSync/);
  assert.doesNotMatch(source, /buildProfileRuntimeCss|buildCalloutCss|buildFileExplorerCss/);
});
