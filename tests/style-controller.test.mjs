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
  CODE_BACKGROUND_CUSTOM_FIELDS,
  DEFAULT_CODE_BACKGROUND,
  DEFAULT_PROFILE,
  INLINE_CODE_SELECTORS,
  NATIVE_DEFAULT_CONFIGURATION,
  SETTINGS_SCHEMA_VERSION,
  STYLE_FIELD_REGISTRY,
  STYLE_SCOPE_CLASS,
  STYLE_HEADING_COLOR_ACTIVE_CLASS,
  STYLE_HEADING_COLOR_CLASSES,
  applyProfileCssVariables,
  applyProfileStateClasses,
  clearProfileCssVariables,
  codeBackgroundUiState,
  configurationToExport,
  createConfigurationSnapshot,
  createDefaultProfile,
  createNativeConfigurationData,
  effectiveCodeBackground,
  normalizeHexColor,
  normalizeOptionalProfile,
  normalizeProfile,
  normalizeSettings,
  parseConfigurationImport,
  setCodeBackgroundCustomEnabled,
  setCodeBackgroundCustomInput,
  setCodeBackgroundCustomValue
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

function selectorExclusions(selector) {
  const match = selector.match(/:not\(([^)]+)\)$/);
  return match
    ? match[1].split(",").map((item) => item.trim().replace(/^\./, ""))
    : [];
}

function headingTokenMatches(selector, classes, level) {
  return selector.includes(`.cm-line.HyperMD-header-${level} > .cm-header-${level}`)
    && classes.has(`cm-header-${level}`)
    && !selectorExclusions(selector).some((className) => className.startsWith("[class*")
      ? [...classes].some((value) => value.startsWith("cm-html-"))
      : classes.has(className));
}

function activeHeadingFixture() {
  return {
    text: "### 5. Measure an observable $H$ and `code` with [link](url) #tag",
    line: new Set(["cm-line", "HyperMD-header-3"]),
    tokens: {
      semantic: new Set(["cm-header", "cm-header-3"]),
      markers: new Set(["cm-formatting", "cm-formatting-header", "cm-header", "cm-header-3"]),
      math: new Set(["cm-math", "cm-header", "cm-header-3"]),
      inlineCode: new Set(["cm-inline-code", "cm-header", "cm-header-3"]),
      link: new Set(["cm-link", "cm-header", "cm-header-3"]),
      url: new Set(["cm-url", "cm-header", "cm-header-3"]),
      tag: new Set(["cm-hashtag", "cm-header", "cm-header-3"]),
      comment: new Set(["cm-comment", "cm-header", "cm-header-3"]),
      html: new Set(["cm-html-embed", "cm-header", "cm-header-3"]),
      embed: new Set(["cm-embed", "cm-header", "cm-header-3"]),
      property: new Set(["cm-property", "cm-header", "cm-header-3"])
    }
  };
}

test("heading registry uses semantic Live Preview spans and excludes native token spans", () => {
  const fixture = activeHeadingFixture();
  assert.equal(fixture.text, "### 5. Measure an observable $H$ and `code` with [link](url) #tag");
  const selector = STYLE_FIELD_REGISTRY.h3Color.selectors[1];
  assert.match(selector, /\.cm-line\.HyperMD-header-3 > \.cm-header-3/);
  assert.match(selector, /:not\(/);
  assert.equal(headingTokenMatches(selector, fixture.tokens.semantic, 3), true);
  for (const name of ["markers", "math", "inlineCode", "link", "url", "tag", "comment", "html", "embed", "property"]) {
    assert.equal(headingTokenMatches(selector, fixture.tokens[name], 3), false, name);
  }
  assert.doesNotMatch(selector, /\.markdown-source-view\.mod-cm6 \.HyperMD-header-3\s*[,{}]/);
  assert.doesNotMatch(selector, /\.markdown-source-view\.mod-cm6 \.cm-header-3\s*[,{}]/);
});

test("heading levels remain independent and heading Off emits no heading color variable", () => {
  for (let level = 1; level <= 6; level += 1) {
    const selector = STYLE_FIELD_REGISTRY[`h${level}Color`].selectors[1];
    assert.equal(selector.includes(`.HyperMD-header-${level}`), true);
    assert.equal(selector.includes(`.cm-header-${level}`), true);
    for (let other = 1; other <= 6; other += 1) {
      if (other === level) continue;
      assert.doesNotMatch(selector, new RegExp(`(?:HyperMD|cm-header)-${other}(?!\\d)`));
    }
  }

  const element = fakeElement();
  applyProfileCssVariables(element, normalizeProfile({ h3Color: "#123456" }));
  assert.equal(element.css.get("--osc-h3-color"), "#123456");
  assert.equal(element.css.has("--osc-h2-color"), false);
  assert.equal(element.css.has("--osc-h4-color"), false);

  applyProfileStateClasses(element, normalizeProfile({ h3Color: "#123456" }));
  assert.equal(element.classList.contains(STYLE_HEADING_COLOR_ACTIVE_CLASS), true);
  applyProfileCssVariables(element, normalizeProfile({}));
  applyProfileStateClasses(element, normalizeProfile({}));
  assert.equal(element.css.has("--osc-h3-color"), false);
  assert.equal(element.classList.contains(STYLE_HEADING_COLOR_ACTIVE_CLASS), false);
  STYLE_HEADING_COLOR_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
});

test("reading-view MathJax is protected only while a heading color is active", () => {
  const rules = cssRules(css);
  const headingColorRules = rules.filter((rule) => /var\(--osc-h[1-6]-color\)/.test(rule.declarations));
  assert.ok(headingColorRules.length >= 6);
  headingColorRules.forEach((rule) => {
    assert.doesNotMatch(rule.selectors, /MathJax|mjx-container|\.math/);
  });
  const mathProtection = rules.find((rule) => rule.selectors.includes(STYLE_HEADING_COLOR_ACTIVE_CLASS)
    && /MathJax|mjx-container|\.math/.test(rule.selectors));
  assert.ok(mathProtection);
  assert.match(mathProtection.declarations, /color:\s*var\(--text-normal\)/);
  assert.doesNotMatch(mathProtection.declarations, /--osc-h[1-6]-color/);
});

test("content-facing rules stay scoped and emphasis does not style formatting markers", () => {
  const contentRules = cssRules(css).filter((rule) => /markdown-(?:preview|source|rendered)/.test(rule.selectors));
  contentRules.forEach((rule) => assert.match(rule.selectors, /\.osc-style-scope/));
  assert.match(STYLE_FIELD_REGISTRY.boldColor.selectors.at(-1), /:not\(\.cm-formatting\)/);
  assert.match(STYLE_FIELD_REGISTRY.italicColor.selectors.at(-1), /:not\(\.cm-formatting\)/);
  assert.doesNotMatch(css, /\.osc-style-scope \.markdown-source-view\.mod-cm6 \.HyperMD-header-[1-6]\s*\{/);
});

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
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBackground.enabled, "codeBackgroundCustomEnabled");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBackground.value, "codeBackgroundCustomValue");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBlockBackground.enabled, "codeBlockBackgroundCustomEnabled");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBlockBackground.value, "codeBlockBackgroundCustomValue");
});

test("real defaults render #fafafa while both custom overrides are Off", () => {
  assert.equal(DEFAULT_CODE_BACKGROUND, "#fafafa");
  assert.equal(DEFAULT_PROFILE.codeBackground, "#fafafa");
  assert.equal(DEFAULT_PROFILE.codeBlockBackground, "#fafafa");
  assert.equal(DEFAULT_PROFILE.codeBackgroundCustomEnabled, false);
  assert.equal(DEFAULT_PROFILE.codeBlockBackgroundCustomEnabled, false);
  assert.equal(DEFAULT_PROFILE.codeBackgroundCustomValue, "#fafafa");
  assert.equal(DEFAULT_PROFILE.codeBlockBackgroundCustomValue, "#fafafa");

  const created = createDefaultProfile();
  const newSettings = normalizeSettings(null);
  const reset = createNativeConfigurationData();
  const bundledDefault = NATIVE_DEFAULT_CONFIGURATION.data.global;

  for (const profile of [created, newSettings.global, reset.global, bundledDefault]) {
    assert.equal(profile.codeBackground, "#fafafa");
    assert.equal(profile.codeBlockBackground, "#fafafa");
    for (const field of ["codeBackground", "codeBlockBackground"]) {
      const state = codeBackgroundUiState(profile, field);
      assert.equal(state.enabled, false);
      assert.equal(state.status, "Off");
      assert.equal(state.displayedValue, "#fafafa");
      assert.equal(state.effectiveValue, "#fafafa");
    }
  }

  const element = fakeElement();
  applyProfileCssVariables(element, created);
  assert.equal(element.css.get("--osc-code-background"), "#fafafa");
  assert.equal(element.css.get("--osc-code-block-background"), "#fafafa");
});

test("custom values survive Off, save/load, export/import, and restore when On", () => {
  assert.equal(normalizeHexColor("#fafafa"), "#fafafa");
  const profile = createDefaultProfile();
  setCodeBackgroundCustomValue(profile, "codeBackground", "#e8e8e8");
  setCodeBackgroundCustomValue(profile, "codeBlockBackground", "#eeeeee");
  setCodeBackgroundCustomEnabled(profile, "codeBackground", true);
  setCodeBackgroundCustomEnabled(profile, "codeBlockBackground", true);

  assert.equal(profile.codeBackground, "#e8e8e8");
  assert.equal(profile.codeBlockBackground, "#eeeeee");
  setCodeBackgroundCustomEnabled(profile, "codeBackground", false);
  assert.equal(profile.codeBackground, "#fafafa");
  assert.equal(profile.codeBackgroundCustomValue, "#e8e8e8");
  assert.equal(profile.codeBlockBackground, "#eeeeee");

  const loaded = normalizeSettings(JSON.parse(JSON.stringify({ schemaVersion: 2, global: profile })));
  assert.equal(loaded.global.codeBackgroundCustomEnabled, false);
  assert.equal(loaded.global.codeBackgroundCustomValue, "#e8e8e8");
  const snapshot = createConfigurationSnapshot(loaded);
  const exported = configurationToExport({ name: "Code fixture", description: "", data: snapshot });
  const imported = parseConfigurationImport(exported);
  assert.equal(imported.data.global.codeBackground, "#fafafa");
  assert.equal(imported.data.global.codeBackgroundCustomEnabled, false);
  assert.equal(imported.data.global.codeBackgroundCustomValue, "#e8e8e8");
  assert.equal(imported.data.global.codeBlockBackground, "#eeeeee");
  assert.equal(imported.data.global.codeBlockBackgroundCustomEnabled, true);

  setCodeBackgroundCustomEnabled(imported.data.global, "codeBackground", true);
  assert.equal(imported.data.global.codeBackground, "#e8e8e8");
});

test("Off emits both built-in variables and custom On remains independent", () => {
  const element = fakeElement();
  const profile = createDefaultProfile();
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.get("--osc-code-background"), "#fafafa");
  assert.equal(element.css.get("--osc-code-block-background"), "#fafafa");

  setCodeBackgroundCustomValue(profile, "codeBackground", "#123456");
  setCodeBackgroundCustomEnabled(profile, "codeBackground", true);
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.get("--osc-code-background"), "#123456");
  assert.equal(element.css.get("--osc-code-block-background"), "#fafafa");

  setCodeBackgroundCustomEnabled(profile, "codeBackground", false);
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.get("--osc-code-background"), "#fafafa");
  assert.equal(profile.codeBackgroundCustomValue, "#123456");

  clearProfileCssVariables(element);
  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.css.has("--osc-code-background"), false);
});

test("legacy blank and #fafafa migrate Off while custom colors migrate On", () => {
  const migrated = normalizeSettings({
    schemaVersion: 1,
    global: { codeBackground: "", codeBlockBackground: "#fafafa", textColor: "#123456" },
    storedConfigurations: [
      { id: "blank", name: "Blank", data: { global: { codeBackground: "", codeBlockBackground: "" } } },
      { id: "custom", name: "Custom", data: { global: { codeBackground: "#112233", codeBlockBackground: "#445566" } } }
    ]
  });
  assert.equal(migrated.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(migrated.global.codeBackground, "#fafafa");
  assert.equal(migrated.global.codeBlockBackground, "#fafafa");
  assert.equal(migrated.global.codeBackgroundCustomEnabled, false);
  assert.equal(migrated.global.codeBlockBackgroundCustomEnabled, false);
  assert.equal(migrated.global.codeBackgroundCustomValue, "#fafafa");
  assert.equal(migrated.global.codeBlockBackgroundCustomValue, "#fafafa");
  assert.equal(migrated.global.textColor, "#123456");

  const blank = migrated.storedConfigurations.find((config) => config.id === "blank").data.global;
  const custom = migrated.storedConfigurations.find((config) => config.id === "custom").data.global;
  assert.equal(blank.codeBackgroundCustomEnabled, false);
  assert.equal(blank.codeBlockBackgroundCustomEnabled, false);
  assert.equal(custom.codeBackgroundCustomEnabled, true);
  assert.equal(custom.codeBlockBackgroundCustomEnabled, true);
  assert.equal(custom.codeBackgroundCustomValue, "#112233");
  assert.equal(custom.codeBlockBackgroundCustomValue, "#445566");
  assert.equal(custom.codeBackground, "#112233");
  assert.equal(custom.codeBlockBackground, "#445566");
  assert.deepEqual(normalizeSettings(migrated), migrated);

  const explicitlyOff = normalizeSettings({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    global: {
      codeBackground: "#fafafa",
      codeBackgroundCustomEnabled: false,
      codeBackgroundCustomValue: "#abcdef",
      codeBlockBackground: "#fafafa",
      codeBlockBackgroundCustomEnabled: false,
      codeBlockBackgroundCustomValue: "#fedcba"
    }
  });
  assert.equal(explicitlyOff.global.codeBackgroundCustomEnabled, false);
  assert.equal(explicitlyOff.global.codeBackgroundCustomValue, "#abcdef");
  assert.equal(explicitlyOff.global.codeBackground, "#fafafa");
  assert.equal(explicitlyOff.global.codeBlockBackgroundCustomEnabled, false);
  assert.equal(explicitlyOff.global.codeBlockBackgroundCustomValue, "#fedcba");
  assert.equal(explicitlyOff.global.codeBlockBackground, "#fafafa");
});

test("partial path overrides inherit unless an effective background is explicitly configured", () => {
  const optional = normalizeOptionalProfile({});
  assert.equal(optional.codeBackground, "");
  assert.equal(optional.codeBlockBackground, "");
  assert.equal(optional.codeBackgroundCustomEnabled, "");
  assert.equal(optional.codeBlockBackgroundCustomEnabled, "");
  assert.equal(codeBackgroundUiState(optional, "codeBackground", true).status, "Inherit");

  const customOverride = normalizeOptionalProfile({ codeBlockBackground: "#123456" });
  assert.equal(customOverride.codeBackground, "");
  assert.equal(customOverride.codeBlockBackground, "#123456");
  assert.equal(customOverride.codeBlockBackgroundCustomEnabled, true);
});

test("code background UI displays the real effective value without a Native label or placeholder", () => {
  const profile = createDefaultProfile();
  for (const field of ["codeBackground", "codeBlockBackground"]) {
    assert.equal(effectiveCodeBackground(profile, field), "#fafafa");
    const state = codeBackgroundUiState(profile, field);
    assert.equal(state.enabled, false);
    assert.equal(state.inherited, false);
    assert.equal(state.customValue, "#fafafa");
    assert.equal(state.displayedValue, "#fafafa");
    assert.equal(state.effectiveValue, "#fafafa");
    assert.equal(state.status, "Off");
  }

  setCodeBackgroundCustomValue(profile, "codeBlockBackground", "#334455");
  setCodeBackgroundCustomEnabled(profile, "codeBlockBackground", true);
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").displayedValue, "#334455");
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").effectiveValue, "#334455");
  assert.match(source, /input\.value = state\.displayedValue/);
  assert.match(source, /toggleClass\("osc-default-color-value", false\)/);
  assert.doesNotMatch(source, /Built-in default:\s*#fafafa/i);
});

test("one compact control automatically maps typed custom values and clearing to On and Off", () => {
  const profile = normalizeProfile({
    codeBackground: "#fafafa",
    codeBackgroundCustomEnabled: false,
    codeBackgroundCustomValue: "#778899",
    codeBlockBackground: "#fafafa",
    codeBlockBackgroundCustomEnabled: false,
    codeBlockBackgroundCustomValue: "#fafafa"
  });
  assert.equal(codeBackgroundUiState(profile, "codeBackground").displayedValue, "#fafafa");
  assert.equal(codeBackgroundUiState(profile, "codeBackground").status, "Off");

  setCodeBackgroundCustomInput(profile, "codeBackground", "#e8e8e8");
  assert.equal(profile.codeBackgroundCustomEnabled, true);
  assert.equal(profile.codeBackgroundCustomValue, "#e8e8e8");
  assert.equal(codeBackgroundUiState(profile, "codeBackground").status, "On");
  assert.equal(codeBackgroundUiState(profile, "codeBackground").displayedValue, "#e8e8e8");
  assert.equal(codeBackgroundUiState(profile, "codeBackground").effectiveValue, "#e8e8e8");
  assert.equal(profile.codeBlockBackground, "#fafafa");
  assert.equal(profile.codeBlockBackgroundCustomEnabled, false);

  const applied = fakeElement();
  applyProfileCssVariables(applied, profile);
  assert.equal(applied.css.get("--osc-code-background"), "#e8e8e8");
  assert.equal(applied.css.get("--osc-code-block-background"), "#fafafa");

  setCodeBackgroundCustomInput(profile, "codeBackground", "");
  const cleared = codeBackgroundUiState(profile, "codeBackground");
  assert.equal(profile.codeBackgroundCustomEnabled, false);
  assert.equal(cleared.status, "Off");
  assert.equal(cleared.displayedValue, "#fafafa");
  assert.equal(cleared.effectiveValue, "#fafafa");
  applyProfileCssVariables(applied, profile);
  assert.equal(applied.css.get("--osc-code-background"), "#fafafa");
  assert.notEqual(applied.css.get("--osc-code-background"), "#ffffff");

  setCodeBackgroundCustomInput(profile, "codeBlockBackground", "not-a-color");
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").status, "Error");
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").effectiveValue, "#fafafa");
});

test("code backgrounds use the standard single-row color-control structure without a toggle", () => {
  const colorMethod = source.slice(source.indexOf("  addColorControl("), source.indexOf("  addFontControl("));
  const codeBranch = colorMethod.slice(colorMethod.indexOf("    if (codeStateFields)"), colorMethod.indexOf("      return;"));
  const textSettingMethod = source.slice(source.indexOf("  addTextSetting("), source.indexOf("  addSizeControl("));

  assert.match(colorMethod, /createDiv\(\{ cls: "osc-color-control" \}\)/);
  assert.doesNotMatch(colorMethod, /osc-code-background-(?:setting|control)/);
  assert.doesNotMatch(codeBranch, /addToggle|ToggleComponent|setDesc/);
  assert.equal((codeBranch.match(/createSpan\(\{ cls: "osc-value-status" \}\)/g) || []).length, 1);
  assert.doesNotMatch(textSettingMethod, /addCodeBackgroundControl/);
  assert.doesNotMatch(css, /osc-code-background-(?:setting|control)/);
  assert.match(colorMethod, /aria-label[^\n]*color picker/);
  assert.match(colorMethod, /aria-label[^\n]*color value/);
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
  element.classList.add(STYLE_SCOPE_CLASS, "osc-scope-0", "style-controller-image-width", STYLE_HEADING_COLOR_ACTIVE_CLASS);
  element.classList.add(...STYLE_HEADING_COLOR_CLASSES);
  applyProfileCssVariables(element, normalizeProfile({ codeBlockBackground: "#fafafa", h3Color: "#123456" }));
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
  assert.equal(element.classList.contains(STYLE_HEADING_COLOR_ACTIVE_CLASS), false);
  STYLE_HEADING_COLOR_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
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
  assert.doesNotMatch(source, /\.obsidian(?:\/|\\\\)/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
});
