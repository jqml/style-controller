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
  DEFAULT_INTERFACE_SETTINGS,
  DEFAULT_PROFILE,
  HEADING_SPACE_ABOVE_FIELDS,
  HEADING_SPACE_ABOVE_UNITS,
  LINE_HEIGHT_UNITS,
  INLINE_CODE_SELECTORS,
  NATIVE_DEFAULT_CONFIGURATION,
  PROFILE_SECTION_FIELDS,
  SectionDraftManager,
  BOTTOM_LEFT_CONTROLS_POSITION_NATIVE,
  BOTTOM_LEFT_CONTROLS_POSITION_LEFT,
  READING_EDITING_LAYOUT_NATIVE,
  READING_EDITING_LAYOUT_MATCHED,
  BOTTOM_LEFT_CONTROLS_LEFT_SELECTOR,
  THEMEPRO_ORIGINAL_ORDER,
  THEMEPRO_ORIGINAL_SELECTOR,
  SETTINGS_SCHEMA_VERSION,
  STYLE_FIELD_REGISTRY,
  STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS,
  STYLE_EMPHASIS_ACTIVE_CLASSES,
  STYLE_BOLD_FONT_ACTIVE_CLASS,
  STYLE_BOLD_WEIGHT_ACTIVE_CLASS,
  STYLE_BOLD_COLOR_ACTIVE_CLASS,
  STYLE_ITALIC_FONT_ACTIVE_CLASS,
  STYLE_ITALIC_SIZE_ACTIVE_CLASS,
  STYLE_ITALIC_WEIGHT_ACTIVE_CLASS,
  STYLE_ITALIC_COLOR_ACTIVE_CLASS,
  STYLE_SCOPE_CLASS,
  STYLE_HEADING_COLOR_ACTIVE_CLASS,
  STYLE_HEADING_COLOR_CLASSES,
  STYLE_HEADING_SPACE_ABOVE_CLASSES,
  STYLE_HEADING_SPACE_ABOVE_VARIABLES,
  STYLE_TITLE_FONT_ACTIVE_CLASS,
  STYLE_TITLE_SIZE_ACTIVE_CLASS,
  STYLE_TITLE_WEIGHT_ACTIVE_CLASS,
  STYLE_TITLE_ACTIVE_CLASSES,
  STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS,
  STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS,
  applyDocumentLayoutStateClass,
  applyProfileCssVariables,
  applyProfileStateClasses,
  applyDraftAtomically,
  applyInterfaceStateClasses,
  clearProfileCssVariables,
  clearInterfaceStateClasses,
  codeBackgroundUiState,
  configurationToExport,
  createConfigurationSnapshot,
  createDefaultProfile,
  createNativeConfigurationData,
  effectiveCodeBackground,
  headingSpaceAboveCssValue,
  isValidHeadingSpaceAboveValue,
  lineHeightCssValue,
  normalizeHexColor,
  normalizeInterfaceSettings,
  normalizeNativeFontFamilyStack,
  normalizeOptionalProfile,
  normalizeProfile,
  normalizeSettings,
  parseConfigurationImport,
  setCodeBackgroundCustomEnabled,
  setCodeBackgroundCustomInput,
  setCodeBackgroundCustomValue,
  singleLineScrollState
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

test("all heading Space above fields default Off and older profiles retain heading styling", () => {
  assert.equal(Array.from(HEADING_SPACE_ABOVE_FIELDS).length, 18);
  assert.deepEqual(Array.from(HEADING_SPACE_ABOVE_UNITS), ["px", "rem", "em", "%", "pt"]);
  const legacy = normalizeProfile({
    h1FontFamily: "Georgia, Times New Roman, serif",
    h2Size: "24px",
    h3Weight: "650",
    h4Color: "#123456",
    unknownFutureHeadingField: "preserved"
  });
  assert.equal(legacy.h1FontFamily, "Georgia, Times New Roman, serif");
  assert.equal(legacy.h2Size, "24px");
  assert.equal(legacy.h3Weight, "650");
  assert.equal(legacy.h4Color, "#123456");
  assert.equal(legacy.unknownFutureHeadingField, "preserved");
  for (let level = 1; level <= 6; level += 1) {
    assert.equal(legacy[`h${level}SpaceAboveEnabled`], false);
    assert.equal(legacy[`h${level}SpaceAboveValue`], "0");
    assert.equal(legacy[`h${level}SpaceAboveUnit`], "px");
  }
});

test("H5 Space above is independent, unit-aware, and Off emits no active override", () => {
  const element = fakeElement();
  const native = normalizeProfile({});
  applyProfileCssVariables(element, native);
  applyProfileStateClasses(element, native);
  STYLE_HEADING_SPACE_ABOVE_VARIABLES.forEach((variable) => assert.equal(element.css.has(variable), false));
  STYLE_HEADING_SPACE_ABOVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));

  const configured = normalizeProfile({
    h1FontFamily: "serif, sans-serif, cursive",
    h2Size: "24px",
    h3Weight: "650",
    h4Color: "#123456",
    h5SpaceAboveEnabled: true,
    h5SpaceAboveValue: "0.5",
    h5SpaceAboveUnit: "rem"
  });
  applyProfileCssVariables(element, configured);
  applyProfileStateClasses(element, configured);
  assert.equal(headingSpaceAboveCssValue(configured, 5), "0.5rem");
  assert.equal(element.css.get("--osc-h5-space-above"), "0.5rem");
  assert.equal(element.classList.contains(STYLE_HEADING_SPACE_ABOVE_CLASSES[4]), true);
  for (const level of [1, 2, 3, 4, 6]) {
    assert.equal(element.css.has(`--osc-h${level}-space-above`), false);
    assert.equal(element.classList.contains(STYLE_HEADING_SPACE_ABOVE_CLASSES[level - 1]), false);
  }
  assert.equal(element.css.get("--osc-h1-font-family"), "serif, sans-serif, cursive");
  assert.equal(element.css.get("--osc-h2-size"), "24px");
  assert.equal(element.css.get("--osc-h3-weight"), "650");
  assert.equal(element.css.get("--osc-h4-color"), "#123456");

  configured.h5SpaceAboveEnabled = false;
  applyProfileCssVariables(element, configured);
  applyProfileStateClasses(element, configured);
  assert.equal(element.css.has("--osc-h5-space-above"), false);
  assert.equal(element.classList.contains(STYLE_HEADING_SPACE_ABOVE_CLASSES[4]), false);
});

test("heading Space above validation rejects unsafe values and invalid units", () => {
  for (const value of ["", "-1", "-0.1", "Infinity", "NaN", "1e3", "  "]) {
    assert.equal(isValidHeadingSpaceAboveValue(value), false, value);
    assert.equal(headingSpaceAboveCssValue({
      h5SpaceAboveEnabled: true,
      h5SpaceAboveValue: value,
      h5SpaceAboveUnit: "px"
    }, 5), "");
  }
  for (const value of ["0", "0.1", "12", "12.5"]) {
    assert.equal(isValidHeadingSpaceAboveValue(value), true, value);
  }
  assert.equal(headingSpaceAboveCssValue({
    h5SpaceAboveEnabled: true,
    h5SpaceAboveValue: "12",
    h5SpaceAboveUnit: "vh"
  }, 5), "");
});

test("heading Space above CSS is per-level, scoped, property-correct, and has no important declarations", () => {
  const spacingRules = cssRules(css).filter((rule) => /--osc-h[1-6]-space-above/.test(rule.declarations));
  assert.equal(spacingRules.length, 12);
  for (let level = 1; level <= 6; level += 1) {
    const rules = spacingRules.filter((rule) => rule.declarations.includes(`--osc-h${level}-space-above`));
    assert.equal(rules.length, 2);
    const reading = rules.find((rule) => rule.selectors.includes(`.markdown-preview-view h${level}`));
    const editor = rules.find((rule) => rule.selectors.includes(`.cm-line.HyperMD-header-${level}`));
    assert.ok(reading);
    assert.ok(editor);
    assert.match(reading.selectors, new RegExp(`\\.osc-style-scope\\.style-controller-h${level}-space-above-active`));
    assert.match(editor.selectors, new RegExp(`\\.osc-style-scope\\.style-controller-h${level}-space-above-active`));
    assert.equal(reading.selectors.startsWith(".osc-style-scope."), true);
    assert.equal(editor.selectors.startsWith(".osc-style-scope."), true);
    assert.match(reading.declarations, /margin-block-start:/);
    assert.match(editor.declarations, /padding-top:/);
    assert.doesNotMatch(`${reading.selectors}${editor.selectors}`, /\bbody\b/);
    assert.doesNotMatch(`${reading.declarations}${editor.declarations}`, /!important/);
  }
});

test("heading settings render one Space above card per H1-H6 loop iteration", () => {
  const headingUi = source.slice(source.indexOf("  renderHeadingGroup(parent"), source.indexOf("  renderImageGroup(parent"));
  assert.equal((headingUi.match(/addHeadingSpaceAboveControl\(controlsRow, profile, level\)/g) || []).length, 1);
  const controlMethod = source.slice(source.indexOf("  addHeadingSpaceAboveControl(parent"), source.indexOf("  addColorControl(setting"));
  assert.equal((controlMethod.match(/setName\("Space above"\)/g) || []).length, 1);
  assert.match(controlMethod, /type: "number"/);
  assert.match(controlMethod, /min: "0"/);
  assert.match(controlMethod, /HEADING_SPACE_ABOVE_UNITS/);
  assert.match(controlMethod, /addToggle/);
  assert.match(controlMethod, /aria-labelledby/);
  assert.match(controlMethod, /aria-label/);
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

test("math source and rendered MathJax have no Style Controller color owner", () => {
  const directMathRules = cssRules(css).filter((rule) => {
    if (rule.selectors.includes(STYLE_HEADING_COLOR_ACTIVE_CLASS)) return false;
    const selectorsWithoutExclusions = rule.selectors.replace(/:not\([^)]*\)/g, "");
    return /(?:^|[ ,>])(?:\.cm-math|\.cm-formatting-math|\.MathJax|\.mjx-container|\.math(?:[-. ]|$))/i.test(selectorsWithoutExclusions);
  });
  assert.equal(directMathRules.length, 0);
  const mathProtection = cssRules(css).find((rule) => rule.selectors.includes(STYLE_HEADING_COLOR_ACTIVE_CLASS)
    && /MathJax|mjx-container|\.math/.test(rule.selectors));
  assert.ok(mathProtection);
  assert.doesNotMatch(mathProtection.declarations, /var\(--osc-(?:text|bold|italic|h[1-6])-color\)/);
  assert.doesNotMatch(STYLE_FIELD_REGISTRY.textColor.selectors.join("\n"), /cm-math|MathJax|mjx-container/);
  assert.doesNotMatch(STYLE_FIELD_REGISTRY.italicColor.selectors.join("\n"), /cm-math|MathJax|mjx-container/);
  assert.doesNotMatch(source, /(?:EditorView\.inputHandler|keymap\.of|beforeinput|latex-suite)/i);
});

test("Headings and title keeps title fields before independent H1 fields", () => {
  assert.match(source, /renderCollapsibleGroup\(parent, "Headings and title"\)/);
  assert.equal(Array.from(PROFILE_SECTION_FIELDS.headings.slice(0, 3)).join(","), "titleFontFamily,titleSize,titleWeight");
  assert.equal(STYLE_FIELD_REGISTRY.titleFontFamily.selectors.join("\n"), [
    ".markdown-preview-view .inline-title:not([data-level])",
    ".markdown-source-view.mod-cm6 .inline-title:not([data-level])"
  ].join("\n"));
  for (const field of ["titleFontFamily", "titleSize", "titleWeight"]) {
    assert.doesNotMatch(STYLE_FIELD_REGISTRY[field].selectors.join("\n"), /h[1-6]|nav-|breadcrumb|tab|file-title/);
  }
  assert.notDeepEqual(STYLE_FIELD_REGISTRY.titleSize.selectors, STYLE_FIELD_REGISTRY.h1Size.selectors);

  const element = fakeElement();
  const native = createDefaultProfile();
  applyProfileCssVariables(element, native);
  applyProfileStateClasses(element, native);
  assert.equal(element.css.has("--osc-title-font-family"), false);
  assert.equal(element.css.has("--osc-title-size"), false);
  assert.equal(element.css.has("--osc-title-weight"), false);
  STYLE_TITLE_ACTIVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));

  const configured = normalizeProfile({
    titleFontFamily: "serif, sans-serif",
    titleSize: "40px",
    titleWeight: "400",
    h1Size: "32px"
  });
  applyProfileCssVariables(element, configured);
  applyProfileStateClasses(element, configured);
  assert.equal(element.css.get("--osc-title-font-family"), "serif, sans-serif");
  assert.equal(element.css.get("--osc-title-size"), "40px");
  assert.equal(element.css.get("--osc-title-weight"), "400");
  assert.equal(element.css.get("--osc-h1-size"), "32px");
  assert.equal(element.classList.contains(STYLE_TITLE_FONT_ACTIVE_CLASS), true);
  assert.equal(element.classList.contains(STYLE_TITLE_SIZE_ACTIVE_CLASS), true);
  assert.equal(element.classList.contains(STYLE_TITLE_WEIGHT_ACTIVE_CLASS), true);

  applyProfileCssVariables(element, native);
  applyProfileStateClasses(element, native);
  assert.equal(element.css.has("--osc-title-font-family"), false);
  assert.equal(element.css.has("--osc-title-size"), false);
  assert.equal(element.css.has("--osc-title-weight"), false);
  STYLE_TITLE_ACTIVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
});

test("Title uses one heading card with a full-width font row and wrapping metric cards", () => {
  const start = source.indexOf("  renderHeadingGroup(parent, profile, context = null) {");
  const end = source.indexOf("\n  renderImageGroup(", start);
  const headingMethod = source.slice(start, end);
  const titleStart = headingMethod.indexOf('cls: "osc-heading-card osc-title-card"');
  const h1Start = headingMethod.indexOf("for (let level = 1; level <= 6; level += 1)");
  const titleSection = headingMethod.slice(titleStart, h1Start);

  assert.ok(titleStart >= 0 && h1Start > titleStart);
  assert.match(titleSection, /createEl\("div", \{ text: "Title", cls: "osc-heading-card-title" \}\)/);
  assert.match(titleSection, /titleCard\.createDiv\(\{ cls: "osc-heading-font-row" \}\)/);
  assert.match(titleSection, /addTextSetting\(titleFontRow, profile, "titleFontFamily", "Title font", ""\)/);
  assert.match(titleSection, /titleCard\.createDiv\(\{ cls: "osc-heading-controls-row osc-title-controls-row" \}\)/);
  assert.match(titleSection, /addTextSetting\(titleMetrics, profile, "titleSize", "Title size", ""\)/);
  assert.match(titleSection, /addTextSetting\(titleMetrics, profile, "titleWeight", "Title weight", ""\)/);
  assert.doesNotMatch(titleSection, /osc-title-controls"/);

  const titleLabelRule = cssRules(css).find((rule) => rule.selectors === ".osc-title-card .setting-item-name");
  assert.ok(titleLabelRule);
  assert.match(titleLabelRule.declarations, /overflow:\s*visible/);
  assert.match(titleLabelRule.declarations, /text-overflow:\s*clip/);
  assert.match(titleLabelRule.declarations, /white-space:\s*normal/);
  assert.doesNotMatch(titleLabelRule.declarations, /ellipsis/);

  const headingCardRule = cssRules(css).find((rule) => rule.selectors.includes(".osc-heading-card .setting-item")
    && /display:\s*block/.test(rule.declarations));
  assert.ok(headingCardRule);
  const controlsRule = cssRules(css).find((rule) => rule.selectors === ".osc-heading-controls-row"
    && /minmax\(150px,\s*1fr\)/.test(rule.declarations));
  assert.ok(controlsRule);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.osc-heading-controls-row\s*\{\s*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /\.osc-title-card[^{}]*\{[^}]*(?:overflow-x|white-space:\s*nowrap|text-overflow:\s*ellipsis)/s);
});

test("Title card keeps the production field, scroll, draft, Apply, and Revert pipelines", () => {
  assert.deepEqual(Array.from(PROFILE_SECTION_FIELDS.headings.slice(0, 3)), ["titleFontFamily", "titleSize", "titleWeight"]);
  assert.match(source, /addFontControl\(setting, profile, key, resolvedPlaceholder\)/);
  assert.match(source, /addScrollableTextField\(input, resolvedDefault \|\| placeholder\)/);
  assert.match(source, /const status = wrapper\.createEl\("span", \{ cls: "osc-font-status"[\s\S]*addScrollableTextField\(input/);
  assert.match(source, /renderHeadingGroup[\s\S]*renderSectionActions\(content, context\)/);
  assert.match(source, /profile\[key\] = input\.value[\s\S]*noteDraftMutation\(profile\)[\s\S]*updateDraftPreview\(profile\)/);
  assert.match(source, /applyDraftContext[\s\S]*applyDraftAtomically/);
  assert.match(source, /revertDraftContext/);

  const saved = normalizeProfile({
    titleFontFamily: '"Linux Libertine", Georgia, "Times New Roman", serif',
    titleSize: "41px",
    titleWeight: "450"
  });
  assert.equal(saved.titleFontFamily, '"Linux Libertine", Georgia, "Times New Roman", serif');
  assert.equal(saved.titleSize, "41px");
  assert.equal(saved.titleWeight, "450");
});

test("title CSS is static, class-gated, and cannot target tabs, explorer, or breadcrumbs", () => {
  const titleRules = cssRules(css).filter((rule) => /--osc-title-(?:font-family|size|weight)/.test(rule.declarations));
  assert.equal(titleRules.length, 4);
  titleRules.forEach((rule) => {
    assert.match(rule.selectors, /style-controller-(?:title-(?:font|size|weight)-active|matched-document-layout)/);
    assert.match(rule.selectors, /inline-title:not\(\[data-level\]\)/);
    assert.doesNotMatch(rule.selectors, /nav-|breadcrumb|tab-|\.workspace-tab-header|nav-file-title/);
  });
  assert.match(css, /\.osc-heading-preview-title/);
  assert.doesNotMatch(css, /--osc-preview-title-/);
  assert.match(source, /applyProfileToPreview\(preview, profile\)/);
});

test("heading preview uses a full-width title followed by two three-heading rows", () => {
  const headingPreview = source.slice(
    source.indexOf("  renderHeadingPreview(parent, profile)"),
    source.indexOf("  updatePreview(profile", source.indexOf("  renderHeadingPreview(parent, profile)"))
  );
  assert.match(headingPreview, /osc-heading-preview-grid/);
  assert.match(headingPreview, /grid\.createDiv\(\{ text: "Note title", cls: "inline-title osc-heading-preview-title" \}\)/);
  assert.match(headingPreview, /grid\.createEl\(`h\$\{level\}`/);
  assert.match(headingPreview, /for \(let level = 1; level <= 6; level \+= 1\)/);

  const gridRule = cssRules(css).find((rule) => rule.selectors === ".osc-heading-preview-grid"
    && rule.declarations.includes("repeat(3, minmax(0, 1fr))"));
  assert.ok(gridRule);
  const titleRule = cssRules(css).find((rule) => rule.selectors === ".osc-heading-preview-title"
    && rule.declarations.includes("grid-column: 1 / -1"));
  assert.ok(titleRule);
});

test("heading preview narrows without overflow and preserves heading typography", () => {
  assert.match(css, /@container \(max-width: 480px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@container \(max-width: 280px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /\.osc-heading-preview(?:-grid)?[^{}]*\{[^}]*overflow-x\s*:/s);
  assert.doesNotMatch(css, /\.osc-heading-preview(?:-grid)?[^{}]*\{[^}]*width\s*:/s);

  assert.doesNotMatch(css, /--osc-preview-heading-/);
  assert.match(css, /\.osc-style-scope \.markdown-preview-view h1/);
});

test("narrow settings widths collapse fixed control grids without horizontal scrolling", () => {
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.osc-base-text-row\.is-metrics-row,[\s\S]*?\.osc-base-text-row\.is-color-row[\s\S]*?grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.osc-images-grid\s*\{\s*grid-template-columns: 1fr/);
  assert.doesNotMatch(css, /\.osc-mini-preview[^{}]*\{[^}]*overflow-x:\s*(?:auto|scroll)/s);
});

test("content-facing rules stay scoped and emphasis does not style formatting markers", () => {
  const contentRules = cssRules(css).filter((rule) => /markdown-(?:preview|source|rendered)/.test(rule.selectors));
  contentRules.forEach((rule) => assert.match(rule.selectors, /\.osc-style-scope/));
  assert.match(STYLE_FIELD_REGISTRY.boldColor.selectors.at(-1), /:not\(\.cm-formatting\)/);
  assert.match(STYLE_FIELD_REGISTRY.italicColor.selectors.at(-1), /:not\(\.cm-formatting\)/);
  assert.doesNotMatch(css, /\.osc-style-scope \.markdown-source-view\.mod-cm6 \.HyperMD-header-[1-6]\s*\{/);
});

test("italic geometry is opt-in and semantic tokens stay separate from formatting markers", () => {
  const rules = cssRules(css);
  const italicGeometryRules = rules.filter((rule) => /font-(?:family|size|weight):\s*var\(--osc-(?:italic-font-family|italic-size|italic-weight)/.test(rule.declarations));
  assert.ok(italicGeometryRules.length >= 3);
  italicGeometryRules.forEach((rule) => {
    assert.match(rule.selectors, /style-controller-italic-(?:font|size|weight)-active/);
    assert.match(rule.selectors, /:not\(\.cm-formatting\)/);
    assert.doesNotMatch(rule.selectors, /cm-formatting-header|cm-math|cm-inline-code|cm-link|cm-url|cm-tag|cm-comment|cm-html|cm-embed/);
  });
  assert.doesNotMatch(css, /\.osc-style-scope[^{}]*\.cm-em\s*\{[^}]*font-(?:family|size|weight)/s);
  assert.doesNotMatch(css, /\.osc-style-scope[^{}]*\.markdown-preview-view\s+(?:em|i)\s*\{[^}]*font-(?:family|size|weight)/s);

  const element = fakeElement();
  const native = createDefaultProfile();
  applyProfileCssVariables(element, native);
  applyProfileStateClasses(element, native);
  assert.equal(element.css.has("--osc-italic-font-family"), false);
  assert.equal(element.css.has("--osc-italic-size"), false);
  assert.equal(element.css.has("--osc-italic-weight"), false);
  STYLE_EMPHASIS_ACTIVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));

  const colorOnly = normalizeProfile({ italicColor: "#123456" });
  applyProfileCssVariables(element, colorOnly);
  applyProfileStateClasses(element, colorOnly);
  assert.equal(element.classList.contains(STYLE_ITALIC_COLOR_ACTIVE_CLASS), true);
  assert.equal(element.classList.contains(STYLE_ITALIC_FONT_ACTIVE_CLASS), false);
  assert.equal(element.classList.contains(STYLE_ITALIC_SIZE_ACTIVE_CLASS), false);
  assert.equal(element.classList.contains(STYLE_ITALIC_WEIGHT_ACTIVE_CLASS), false);
  assert.equal(element.css.has("--osc-italic-font-family"), false);
  assert.equal(element.css.has("--osc-italic-size"), false);
  assert.equal(element.css.has("--osc-italic-weight"), false);
});

test("explicit italic font and size apply independently and clear on profile switching", () => {
  const element = fakeElement();
  const configured = normalizeProfile({
    italicFontFamily: "serif, Arial, sans-serif",
    italicSize: "18px"
  });
  applyProfileCssVariables(element, configured);
  applyProfileStateClasses(element, configured);
  assert.equal(element.css.get("--osc-italic-font-family"), "serif, Arial, sans-serif");
  assert.equal(element.css.get("--osc-italic-size"), "18px");
  assert.equal(element.classList.contains(STYLE_ITALIC_FONT_ACTIVE_CLASS), true);
  assert.equal(element.classList.contains(STYLE_ITALIC_SIZE_ACTIVE_CLASS), true);
  assert.equal(element.classList.contains(STYLE_ITALIC_WEIGHT_ACTIVE_CLASS), false);

  const native = createDefaultProfile();
  applyProfileCssVariables(element, native);
  applyProfileStateClasses(element, native);
  assert.equal(element.css.has("--osc-italic-font-family"), false);
  assert.equal(element.css.has("--osc-italic-size"), false);
  assert.equal(element.classList.contains(STYLE_ITALIC_FONT_ACTIVE_CLASS), false);
  assert.equal(element.classList.contains(STYLE_ITALIC_SIZE_ACTIVE_CLASS), false);
});

test("Bottom-left controls position uses the exact ThemePro group rule and never broad sidebar selectors", () => {
  assert.equal(DEFAULT_INTERFACE_SETTINGS.bottomLeftControlsPosition, BOTTOM_LEFT_CONTROLS_POSITION_NATIVE);
  assert.equal(THEMEPRO_ORIGINAL_SELECTOR, ".workspace-drawer-vault-actions");
  assert.equal(THEMEPRO_ORIGINAL_ORDER, -1);
  assert.equal(BOTTOM_LEFT_CONTROLS_LEFT_SELECTOR, ".workspace-drawer-vault-actions");
  const rule = cssRules(css).find((candidate) => candidate.selectors.includes(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS));
  assert.ok(rule);
  assert.match(rule.selectors, /\.workspace-split\.mod-left-split/);
  assert.match(rule.selectors, /\.workspace-sidedock-vault-profile/);
  assert.match(rule.selectors, /\.workspace-drawer-vault-actions\b/);
  assert.match(rule.declarations, /order:\s*-1/);
  assert.doesNotMatch(rule.selectors, />|nth-(?:child|of-type)|:has|\.lucide-settings|clickable-icon/);
  assert.doesNotMatch(rule.selectors, /button|\.sidebar|\.workspace-ribbon|\.workspace-drawer-vault-switcher|collapse/);
  assert.doesNotMatch(css, /\.style-controller-bottom-left-controls-left[^{}]*(?:button|\.sidebar|\.workspace-drawer-vault-switcher|collapse)\b/);
});

test("Native and Left interface states toggle only the bottom-left group class", () => {
  const root = fakeElement();
  root.classList.add("style-controller-settings-icon-themepro");
  applyInterfaceStateClasses(root, normalizeInterfaceSettings(null));
  assert.equal(root.classList.contains(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS), false);
  assert.equal(root.classList.contains("style-controller-settings-icon-themepro"), false);

  applyInterfaceStateClasses(root, { bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_LEFT });
  assert.equal(root.classList.contains(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS), true);

  applyInterfaceStateClasses(root, { bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_NATIVE });
  assert.equal(root.classList.contains(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS), false);
  clearInterfaceStateClasses(root);
  assert.equal(root.classList.contains(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS), false);
});

test("Reading/editing layout normalizes to Native and preserves only Matched", () => {
  assert.equal(DEFAULT_INTERFACE_SETTINGS.readingEditingLayout, READING_EDITING_LAYOUT_NATIVE);
  assert.equal(normalizeInterfaceSettings(null).readingEditingLayout, READING_EDITING_LAYOUT_NATIVE);
  assert.equal(normalizeInterfaceSettings({ readingEditingLayout: "invalid" }).readingEditingLayout, READING_EDITING_LAYOUT_NATIVE);
  assert.equal(
    normalizeInterfaceSettings({ readingEditingLayout: READING_EDITING_LAYOUT_MATCHED }).readingEditingLayout,
    READING_EDITING_LAYOUT_MATCHED
  );
  assert.equal(
    normalizeSettings({ interface: { bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_LEFT } }).interface.readingEditingLayout,
    READING_EDITING_LAYOUT_NATIVE
  );
});

test("Matched layout class follows only the applied Interface state", () => {
  const root = fakeElement();
  const persisted = normalizeInterfaceSettings(null);
  const drafts = new SectionDraftManager();
  const entry = drafts.get("interface:root", persisted);

  entry.value.readingEditingLayout = READING_EDITING_LAYOUT_MATCHED;
  drafts.mark(entry.value);
  applyDocumentLayoutStateClass(root, persisted);
  assert.equal(root.classList.contains(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS), false);

  applyDocumentLayoutStateClass(root, entry.value);
  assert.equal(root.classList.contains(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS), true);

  drafts.revert("interface:root", persisted);
  applyDocumentLayoutStateClass(root, entry.value);
  assert.equal(entry.value.readingEditingLayout, READING_EDITING_LAYOUT_NATIVE);
  assert.equal(root.classList.contains(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS), false);
});

test("Matched document layout CSS is native-variable based and Markdown-scoped", () => {
  const matchedRules = cssRules(css).filter((rule) => rule.selectors.includes(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS));
  assert.ok(matchedRules.length >= 5);
  matchedRules.forEach((rule) => {
    const selectors = rule.selectors.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    assert.match(selectors, /^\.osc-style-scope\.style-controller-matched-document-layout/);
    assert.doesNotMatch(selectors, /\bbody\b|\.workspace-split|\.workspace-leaf(?!-content)/);
    assert.doesNotMatch(rule.declarations, /!important|transform|position|(?:^|[;\s])(?:top|bottom|height)\s*:/);
  });
  assert.match(css, /--osc-matched-document-line-width:\s*var\(--file-line-width\)/);
  assert.match(css, /--osc-matched-document-margin-x:\s*var\(--file-margins-x\)/);
  assert.match(css, /\.markdown-preview-view\.is-readable-line-width \.markdown-preview-sizer/);
  assert.match(css, /\.markdown-source-view\.mod-cm6\.is-readable-line-width \.cm-sizer/);
  assert.match(css, /padding-inline:\s*var\(--osc-matched-document-margin-x\)/);
  assert.match(css, /max-width:\s*var\(--osc-matched-document-line-width\)/);
  assert.doesNotMatch(matchedRules.map((rule) => rule.declarations).join("\n"), /\b\d+px\b/);
});

test("Matched body and title metrics use native fallbacks while Native remains untouched", () => {
  const matchedRules = cssRules(css).filter((rule) => rule.selectors.includes(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS));
  const bodyRule = matchedRules.find((rule) =>
    rule.selectors.includes(".markdown-preview-view")
    && rule.selectors.includes(".markdown-source-view.mod-cm6")
    && rule.declarations.includes("--font-text-size")
  );
  const titleRule = matchedRules.find((rule) =>
    rule.selectors.includes(".inline-title:not([data-level])")
    && rule.declarations.includes("--inline-title-line-height")
  );

  assert.ok(bodyRule);
  assert.match(bodyRule.declarations, /font-family:\s*var\(--font-text\)/);
  assert.match(bodyRule.declarations, /font-size:\s*var\(--font-text-size\)/);
  assert.match(bodyRule.declarations, /font-weight:\s*var\(--osc-text-weight,\s*var\(--font-normal\)\)/);
  assert.match(bodyRule.declarations, /line-height:\s*var\(--osc-line-height,\s*var\(--line-height-normal\)\)/);
  assert.ok(titleRule);
  assert.match(titleRule.declarations, /font-size:\s*var\(--osc-title-size,\s*var\(--inline-title-size\)\)/);
  assert.match(titleRule.declarations, /font-weight:\s*var\(--osc-title-weight,\s*var\(--inline-title-weight\)\)/);
  assert.match(titleRule.declarations, /line-height:\s*var\(--inline-title-line-height\)/);

  const nativeRules = cssRules(css).filter((rule) =>
    !rule.selectors.includes(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS)
    && /--osc-text-size,|--osc-title-size,/.test(rule.declarations)
  );
  assert.equal(nativeRules.length, 0);
});

test("Matched H1-H6 metrics target Reading headings and Live Preview heading lines", () => {
  const matchedRules = cssRules(css).filter((rule) => rule.selectors.includes(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS));
  for (let level = 1; level <= 6; level += 1) {
    const rule = matchedRules.find((candidate) =>
      candidate.selectors.includes(`.markdown-preview-view h${level}`)
      && candidate.selectors.includes(`.cm-line.HyperMD-header-${level}`)
    );
    assert.ok(rule, `missing matched H${level} rule`);
    assert.doesNotMatch(rule.selectors, new RegExp(`HyperMD-header-${level}\\s*>\\s*\\.cm-header-${level}`));
    assert.match(rule.declarations, new RegExp(`font-family:\\s*var\\(--osc-h${level}-font-family,\\s*var\\(--h${level}-font\\)\\)`));
    assert.match(rule.declarations, new RegExp(`font-size:\\s*var\\(--osc-h${level}-size,\\s*var\\(--h${level}-size\\)\\)`));
    assert.match(rule.declarations, new RegExp(`font-weight:\\s*var\\(--osc-h${level}-weight,\\s*var\\(--h${level}-weight\\)\\)`));
    assert.match(rule.declarations, new RegExp(`line-height:\\s*var\\(--h${level}-line-height\\)`));
  }
});

test("Matched layout does not manipulate CodeMirror or native syntax behavior", () => {
  assert.doesNotMatch(source, /MutationObserver|EditorView|ViewPlugin|requestMeasure|\.dispatch\(/);
  const matchedCss = cssRules(css)
    .filter((rule) => rule.selectors.includes(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS))
    .map((rule) => `${rule.selectors} { ${rule.declarations} }`)
    .join("\n");
  assert.doesNotMatch(matchedCss, /\.cm-formatting|\.cm-cursor|\.cm-selection|color\s*:|visibility\s*:|display\s*:|transform\s*:|!important/);
});

test("bottom-left controls selection survives settings normalization but is not profile- or path-controlled", () => {
  const loaded = normalizeSettings({
    interface: { settingsIconPosition: "themepro" },
    global: { h3Color: "#123456" },
    overrides: [{
      id: "work",
      type: "folder",
      pattern: "Work",
      modules: { headings: true },
      profile: { bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_LEFT, settingsIconPosition: "themepro", h3Color: "#abcdef" }
    }]
  });
  assert.equal(loaded.interface.bottomLeftControlsPosition, BOTTOM_LEFT_CONTROLS_POSITION_LEFT);
  assert.equal(normalizeSettings(loaded).interface.bottomLeftControlsPosition, BOTTOM_LEFT_CONTROLS_POSITION_LEFT);
  assert.equal(Object.hasOwn(loaded.overrides[0].profile, "bottomLeftControlsPosition"), false);
  assert.equal(Object.hasOwn(loaded.overrides[0].profile, "settingsIconPosition"), false);
  const match = StyleControllerPlugin.prototype.getProfileForPath.call({ settings: loaded }, "Work/Note.md");
  assert.equal(Object.hasOwn(match.profile, "settingsIconPosition"), false);

  const snapshot = createConfigurationSnapshot(loaded);
  assert.equal(Object.hasOwn(snapshot, "interface"), false);
});

test("Interface settings use the section Apply/Revert transaction", () => {
  assert.match(source, /\["interface", "Interface"\]/);
  assert.match(source, /activeTab === "interface"/);
  assert.match(source, /getSectionContext\("interface:root"/);
  assert.match(source, /setName\("Bottom-left controls position"\)/);
  assert.match(source, /addOption\(BOTTOM_LEFT_CONTROLS_POSITION_NATIVE, "Native"\)/);
  assert.match(source, /addOption\(BOTTOM_LEFT_CONTROLS_POSITION_LEFT, "Left"\)/);
  assert.match(source, /setName\("Reading\/editing layout"\)/);
  assert.match(source, /share safe text metrics and horizontal document geometry/);
  assert.match(source, /addOption\(READING_EDITING_LAYOUT_NATIVE, "Native"\)/);
  assert.match(source, /addOption\(READING_EDITING_LAYOUT_MATCHED, "Matched"\)/);
  assert.match(source, /context\.value\.readingEditingLayout = value/);
  assert.match(source, /this\.noteDraftMutation\(context\.value\)/);
  assert.match(source, /new Notice\(`\$\{context\.label\} applied\.`\)/);
});

test("section drafts stay independent until their own Apply", () => {
  const persisted = { baseText: "native", links: "native" };
  const drafts = new SectionDraftManager();
  const base = drafts.get("base", persisted);
  const links = drafts.get("links", persisted);

  base.value.baseText = "draft base";
  drafts.mark(base.value);
  assert.equal(persisted.baseText, "native");
  assert.equal(base.dirty, true);
  assert.equal(links.dirty, false);

  links.value.links = "draft link";
  drafts.mark(links.value);
  assert.equal(drafts.dirtyEntries().map((entry) => entry.key).sort().join(","), "base,links");
  assert.equal(persisted.links, "native");
});

test("Revert restores the last applied section baseline without persistence", () => {
  const drafts = new SectionDraftManager();
  const source = { value: "applied" };
  const entry = drafts.get("section", source);
  entry.value.value = "unsaved";
  drafts.mark(entry.value);
  assert.equal(entry.dirty, true);

  drafts.revert("section", source);
  assert.equal(entry.value.value, "applied");
  assert.equal(entry.baseline.value, "applied");
  assert.equal(entry.dirty, false);
  assert.equal(source.value, "applied");
});

test("Apply validates before commit and commits only the requested section atomically", async () => {
  const persisted = { baseText: "native", links: "native" };
  let persistCount = 0;
  const result = await applyDraftAtomically({
    draft: { baseText: "draft", links: "other draft" },
    normalize: (value) => value,
    validate: () => [],
    commit: (candidate) => {
      persisted.baseText = candidate.baseText;
    },
    persist: async () => {
      persistCount += 1;
    }
  });
  assert.equal(result.applied, true);
  assert.equal(persistCount, 1);
  assert.deepEqual(persisted, { baseText: "draft", links: "native" });

  let committed = false;
  const invalid = await applyDraftAtomically({
    draft: { baseText: "bad" },
    normalize: (value) => value,
    validate: () => ["invalid draft"],
    commit: () => {
      committed = true;
    },
    persist: async () => {
      throw new Error("must not persist invalid draft");
    }
  });
  assert.equal(invalid.applied, false);
  assert.equal(committed, false);
});

test("failed persistence rolls back the section commit", async () => {
  const persisted = { value: "native" };
  await assert.rejects(() => applyDraftAtomically({
    draft: { value: "draft" },
    normalize: (value) => value,
    validate: () => [],
    commit: (candidate) => {
      persisted.value = candidate.value;
    },
    persist: async () => {
      throw new Error("save failed");
    },
    rollback: () => {
      persisted.value = "native";
    }
  }), /save failed/);
  assert.equal(persisted.value, "native");
});

test("settings UI exposes section Apply/Revert actions and navigation guard", () => {
  for (const title of ["Base text", "Bold and italic", "Links", "Tables", "Code", "Quotes"]) {
    assert.match(source, new RegExp(`renderSettingGroup\\([^\\n]+\\"${title}\\"`));
  }
  assert.match(source, /renderHeadingGroup\([^\n]+context/);
  assert.match(source, /renderImageGroup\([^\n]+context/);
  assert.match(source, /createEl\("button", \{ text: "Apply"/);
  assert.match(source, /createEl\("button", \{ text: "Revert"/);
  assert.match(source, /Apply or Revert unsaved changes before you/);
  assert.match(source, /Unsaved Style Controller changes were not applied/);
  assert.match(source, /global:baseText/);
  assert.match(source, /global:boldItalic/);
  assert.match(source, /global:code/);
  assert.match(source, /override:\$\{override\.id\}/);
  assert.match(source, /callouts:root/);
  assert.deepEqual(PROFILE_SECTION_FIELDS.baseText.includes("boldColor"), false);
  assert.deepEqual(PROFILE_SECTION_FIELDS.boldItalic.includes("boldColor"), true);
});

test("Base text owns only base controls and its preview contains regular text only", () => {
  assert.deepEqual(Array.from(PROFILE_SECTION_FIELDS.baseText), [
    "textWeight", "lineHeight", "lineHeightValue", "lineHeightUnit", "textColor", "backgroundColor", "accentColor"
  ]);
  const baseControls = source.slice(source.indexOf("  renderBaseTextControls(parent"), source.indexOf("  renderHeadingGroup(parent"));
  assert.doesNotMatch(baseControls, /bold|italic/i);
  assert.doesNotMatch(baseControls, /fontFamily|textSize|Font family|Text size/);
  assert.equal(STYLE_FIELD_REGISTRY.fontFamily, undefined);
  assert.equal(STYLE_FIELD_REGISTRY.textSize, undefined);
  assert.match(baseControls, /\["lineHeight", "Line height", "1\.65"\]/);
  assert.match(source, /addLineHeightControl[\s\S]*type: "number"[\s\S]*LINE_HEIGHT_UNITS\.forEach/);
  assert.doesNotMatch(css, /var\(--osc-font-family/);
  assert.doesNotMatch(css, /var\(--osc-text-size/);
  assert.match(css, /font-family:\s*var\(--font-text\)/);
  assert.match(css, /font-size:\s*var\(--font-text-size\)/);
  const previewMethod = source.slice(source.indexOf("  renderSectionPreview(parent"), source.indexOf("  renderHeadingPreview(parent"));
  const baseBranch = previewMethod.slice(previewMethod.indexOf('title === "Base text"'), previewMethod.indexOf('title === "Bold and italic"'));
  assert.match(baseBranch, /Regular body text preview/);
  assert.doesNotMatch(baseBranch, /createEl\("strong"|createEl\("em"|\*\*|\*italic/);
});

test("Appearance-owned legacy values are preserved but no longer applied", () => {
  const profile = normalizeProfile({
    fontFamily: "Legacy Font, serif",
    textSize: "19px",
    lineHeight: "1.7rem",
    textColor: "#123456",
    unrelatedFutureField: "preserved"
  });
  assert.equal(profile.fontFamily, "Legacy Font, serif");
  assert.equal(profile.textSize, "19px");
  assert.equal(profile.lineHeight, "1.7rem");
  assert.equal(profile.lineHeightValue, "1.7");
  assert.equal(profile.lineHeightUnit, "rem");
  assert.equal(profile.textColor, "#123456");
  assert.equal(profile.unrelatedFutureField, "preserved");

  const element = fakeElement();
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.has("--osc-font-family"), false);
  assert.equal(element.css.has("--osc-text-size"), false);
  assert.equal(element.css.get("--osc-line-height"), "1.7rem");
});

test("Line height migrates to explicit value and unit without changing legacy CSS semantics", () => {
  assert.deepEqual(Array.from(LINE_HEIGHT_UNITS), ["unitless", "px", "rem", "em", "%", "pt"]);
  const unitless = normalizeProfile({ lineHeight: "1.65" });
  assert.equal(unitless.lineHeightValue, "1.65");
  assert.equal(unitless.lineHeightUnit, "unitless");
  assert.equal(lineHeightCssValue(unitless), "1.65");

  const sized = normalizeProfile({ lineHeight: "24px" });
  assert.equal(sized.lineHeightValue, "24");
  assert.equal(sized.lineHeightUnit, "px");
  assert.equal(lineHeightCssValue(sized), "24px");

  const structured = normalizeProfile({ lineHeight: "9px", lineHeightValue: "1.8", lineHeightUnit: "em" });
  assert.equal(structured.lineHeight, "1.8em");
  assert.equal(lineHeightCssValue(structured), "1.8em");
  const optional = normalizeOptionalProfile({ unrelatedFutureField: "preserved" });
  assert.equal(optional.lineHeight, "");
  assert.equal(optional.lineHeightValue, "");
  assert.equal(optional.lineHeightUnit, "");
  assert.equal(optional.unrelatedFutureField, "preserved");
  assert.match(source, /fields\.includes\("lineHeightValue"\)[\s\S]*isValidLineHeightValue[\s\S]*LINE_HEIGHT_UNITS\.includes/);
});

test("Bold and italic owns exactly one complete control set and a real Markdown preview", () => {
  assert.deepEqual(Array.from(PROFILE_SECTION_FIELDS.boldItalic), [
    "boldFontFamily", "boldWeight", "boldColor", "italicFontFamily", "italicSize", "italicWeight", "italicColor"
  ]);
  PROFILE_SECTION_FIELDS.boldItalic.forEach((field) => assert.equal(STYLE_FIELD_REGISTRY[field].group, "boldItalic"));
  const profileSection = source.slice(source.indexOf("  renderProfileSection(parent"), source.indexOf("  renderSettingGroup(parent"));
  PROFILE_SECTION_FIELDS.boldItalic.forEach((field) => {
    assert.equal((profileSection.match(new RegExp(`\\["${field}"`, "g")) || []).length, 1, field);
  });
  const previewMethod = source.slice(source.indexOf("  renderSectionPreview(parent"), source.indexOf("  renderHeadingPreview(parent"));
  const emphasisBranch = previewMethod.slice(previewMethod.indexOf('title === "Bold and italic"'), previewMethod.indexOf('title === "Links"'));
  assert.match(emphasisBranch, /MarkdownRenderer\.renderMarkdown/);
  assert.match(emphasisBranch, /\*\*bold text\*\*/);
  assert.match(emphasisBranch, /\*italic text\*/);
  assert.match(emphasisBranch, /createCompactPreview\(parent, "osc-emphasis-preview"\)/);
});

test("every first-tab preview uses one compact semantic shell without pane layout classes", () => {
  const helper = source.slice(source.indexOf("  createCompactPreview(parent"), source.indexOf("  renderTablePreview(parent"));
  assert.match(helper, /osc-mini-preview osc-compact-preview osc-style-scope/);
  assert.match(helper, /osc-compact-preview-content markdown-preview-view markdown-rendered/);
  assert.doesNotMatch(helper, /markdown-source-view|mod-cm6|(?:^|[\s"])view-content/u);

  for (const previewClass of [
    "osc-base-preview",
    "osc-emphasis-preview",
    "osc-links-preview",
    "osc-heading-preview",
    "osc-table-preview",
    "osc-code-preview",
    "osc-quote-preview",
    "osc-image-preview"
  ]) {
    assert.match(source, new RegExp(`createCompactPreview\\([^\\n]+${previewClass}`), previewClass);
  }

  const compactRule = cssRules(css).find((rule) => rule.selectors === ".osc-mini-preview.osc-compact-preview");
  assert.ok(compactRule);
  assert.match(compactRule.declarations, /height: auto/);
  assert.match(compactRule.declarations, /min-height: 0/);
  assert.match(compactRule.declarations, /flex: 0 0 auto/);
  assert.doesNotMatch(compactRule.declarations, /(?:min-)?height:\s*\d+(?:px|rem|vh)/);

  const contentRule = cssRules(css).find((rule) => rule.selectors.includes("osc-compact-preview-content.markdown-preview-view"));
  assert.ok(contentRule);
  assert.match(contentRule.declarations, /height: auto/);
  assert.match(contentRule.declarations, /min-height: 0/);
  assert.match(contentRule.declarations, /overflow: visible/);
  assert.match(contentRule.declarations, /padding: 0/);
  assert.match(contentRule.declarations, /position: static/);
  assert.doesNotMatch(contentRule.declarations, /flex-grow:\s*[1-9]/);
});

test("heading preview restores H1 locally and preserves the three-row grid order", () => {
  assert.match(css, /\.osc-heading-preview \.osc-heading-preview-grid > h1\s*\{\s*display: block/);
  assert.doesNotMatch(css, /(?:^|,)\s*h1\s*\{[^}]*display: block/s);
  assert.match(css, /\.osc-heading-preview-title\s*\{[^}]*grid-column: 1 \/ -1/s);
  assert.match(css, /\.osc-heading-preview-grid > h1,[\s\S]*\.osc-heading-preview-grid > h6\s*\{[^}]*margin: 0/s);
  const headingMethod = source.slice(source.indexOf("  renderHeadingPreview(parent"), source.indexOf("  updatePreview(profile"));
  assert.match(headingMethod, /createCompactPreview\(parent, "osc-heading-preview"\)/);
  assert.match(headingMethod, /for \(let level = 1; level <= 6; level \+= 1\)/);
  assert.doesNotMatch(headingMethod, /markdown-source-view|mod-cm6/);
});

test("native font stacks remove corrupted tokens and duplicates without losing Unicode families", () => {
  const raw = '"??", "??", ui-sans-serif, "system-ui", system-ui, "Noto Sans CJK JP", 游ゴシック, "�"';
  assert.equal(
    normalizeNativeFontFamilyStack(raw),
    'ui-sans-serif, system-ui, "Noto Sans CJK JP", 游ゴシック'
  );
  assert.equal(normalizeNativeFontFamilyStack('"宋体", "宋体", sans-serif'), '宋体, sans-serif');
  assert.match(source, /resolvedNativeDisplayValueForField[\s\S]*normalizeNativeFontFamilyStack/);
  assert.match(source, /data-osc-native-value", nativeValue/);
  assert.doesNotMatch(source, /profile\[key\]\s*=\s*resolvedNativeDisplayValueForField/);
});

test("active and Off text values use one native horizontal scrollbar without persisting native display text", () => {
  assert.match(source, /class ScrollableSingleLineTextField/);
  assert.match(source, /this\.nativeDisplay\.textContent = this\.displayValue/);
  assert.deepEqual({ ...singleLineScrollState("", "native stack", false) }, {
    native: true,
    nativeVisible: true,
    target: "native"
  });
  assert.deepEqual({ ...singleLineScrollState("", "native stack", true) }, {
    native: true,
    nativeVisible: false,
    target: "input"
  });
  assert.deepEqual({ ...singleLineScrollState("custom stack", "native stack", false) }, {
    native: false,
    nativeVisible: false,
    target: "input"
  });
  assert.deepEqual({ ...singleLineScrollState("", "", false) }, {
    native: false,
    nativeVisible: false,
    target: "input"
  });
  assert.doesNotMatch(source, /singleLineScrollGeometry|osc-scroll-text-track|osc-scroll-text-thumb/);
  assert.doesNotMatch(source, /setPointerCapture|releasePointerCapture|handleWheel|startTrackDrag|moveTrackDrag/);
  assert.doesNotMatch(source, /scrollLeft\s*=|scrollLeft\s*\+=/);
  assert.doesNotMatch(source, /profile\[[^\]]+\]\s*=\s*(?:displayValue|this\.displayValue|nativeDisplay\.textContent)/);

  assert.match(css, /\.osc-scroll-text-field\s*\{[\s\S]*min-width:\s*0[\s\S]*overflow:\s*hidden/);
  assert.match(source, /this\.viewport\.className = "osc-scroll-text-viewport"[\s\S]*this\.viewport\.appendChild\(input\)[\s\S]*this\.viewport\.appendChild\(this\.nativeDisplay\)/);
  assert.match(css, /\.osc-scroll-text-viewport\s*\{[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/);
  assert.match(css, /\.osc-scroll-text-viewport > input\[type="text"\]\s*\{[\s\S]*field-sizing:\s*content[\s\S]*min-width:\s*100%[\s\S]*width:\s*max-content/);
  assert.match(css, /\.osc-scroll-text-native\s*\{[\s\S]*min-width:\s*100%[\s\S]*width:\s*max-content/);
  assert.match(css, /height:\s*calc\(var\(--osc-control-height\) \+ var\(--osc-native-scrollbar-space\)\)/);
  assert.match(css, /--osc-native-scrollbar-space:\s*var\(--size-4-3\)/);
  assert.match(css, /padding-bottom:\s*var\(--osc-native-scrollbar-space\)/);
  assert.match(css, /\.osc-scroll-text-native\s*\{[\s\S]*color:\s*var\(--text-muted\)/);
  assert.match(css, /\.osc-scroll-text-native\s*\{[\s\S]*display:\s*none[\s\S]*opacity:\s*0/);
  assert.match(css, /\.osc-scroll-text-native\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(css, /\.osc-scroll-text-field\.is-native:not\(\.is-editing-native\) \.osc-scroll-text-native/);
  assert.match(css, /\.osc-scroll-text-field\.is-native:not\(\.is-editing-native\) \.osc-scroll-text-native\s*\{[^}]*display:\s*block[^}]*pointer-events:\s*auto/s);
  assert.doesNotMatch(css, /osc-scroll-text-(?:track|thumb)|scrollbar-width:\s*none|::-webkit-scrollbar/);
});

test("clicking the native Off viewport focuses the real empty input for immediate editing", () => {
  assert.match(source, /this\.nativeDisplay\.addEventListener\("click"[\s\S]*this\.editingBlank = true[\s\S]*this\.update\(\)[\s\S]*input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /input\.addEventListener\("focus"[\s\S]*this\.editingBlank = this\.isNativeValue\(\)[\s\S]*this\.update\(\)/);
  assert.match(source, /input\.addEventListener\("input"[\s\S]*this\.editingBlank = false[\s\S]*this\.update\(\)/);
  assert.match(source, /input\.addEventListener\("blur"[\s\S]*this\.editingBlank = false[\s\S]*this\.update\(\)/);
  assert.doesNotMatch(source, /(?:wheel|keydown|keyup|select)"[^\n]*preventDefault/);
});

test("scrollable text enhancement preserves editing, layout, and accessibility while excluding specialized controls", () => {
  assert.match(source, /input\.setAttribute\("aria-describedby"/);
  assert.doesNotMatch(source, /input\.addEventListener\("keydown"[\s\S]{0,200}preventDefault/);
  assert.match(source, /addFontControl[\s\S]*addScrollableTextField\(input, resolvedDefault \|\| placeholder\)/);
  assert.match(source, /addDirectFontControl[\s\S]*addScrollableTextField\(input, resolvedDefault \|\| placeholder\)/);
  assert.match(source, /const status = wrapper\.createEl\("span", \{ cls: "osc-font-status"[\s\S]*addScrollableTextField\(input/);

  const scrollCss = css.match(/\.osc-scroll-text-field\s*\{[\s\S]*?\.osc-scroll-text-field:has\(input:disabled\)[\s\S]*?\}/)?.[0] || "";
  assert.match(scrollCss, /min-width:\s*0/);
  assert.match(scrollCss, /overflow:\s*hidden/);
  assert.doesNotMatch(scrollCss, /input\[type="(?:number|color)"\]|select|textarea|checkbox/);
  assert.match(source, /addSizeControl[\s\S]*type: "number"/);
  assert.match(source, /addColorControl[\s\S]*type: "color"/);
  assert.match(source, /new OverridePathSuggest\(this\.app, text\.inputEl/);
});

test("all applicable Off controls share muted value styling without fading labels or status", () => {
  assert.match(source, /function bindControlInactiveState\(setting, isActive\)/);
  assert.match(source, /settingEl\.toggleClass\("osc-control-off", !active\)/);
  assert.match(source, /addTextSetting[\s\S]*bindControlInactiveState\(setting/);
  assert.match(source, /addDirectSetting[\s\S]*bindControlInactiveState\(setting/);
  assert.match(source, /addImageAlignmentControl[\s\S]*bindControlInactiveState\(setting/);
  assert.match(source, /addHeadingSpaceAboveControl[\s\S]*updateControlInactiveState\(setting\.settingEl, enabled\)/);
  assert.match(css, /\.setting-item\.osc-control-off \.setting-item-control input:not\(\[type="checkbox"\]\):not\(\[type="color"\]\)/);
  assert.match(css, /\.setting-item\.osc-control-off \.setting-item-control input\[type="color"\]\s*\{[^}]*opacity:\s*var\(--icon-opacity\)/s);
  assert.match(css, /\.setting-item\.osc-control-off \.osc-scroll-text-native\s*\{[^}]*color:\s*var\(--text-faint\)[^}]*opacity:\s*var\(--icon-opacity\)/s);
  assert.match(css, /\.setting-item\.osc-control-off \.setting-item-control input:not\(\.osc-scroll-text-input\)::placeholder/);
  assert.match(css, /\.osc-scroll-text-field\.is-native input\[type="text"\]::placeholder\s*\{[^}]*color:\s*transparent/s);
  assert.doesNotMatch(css, /\.osc-control-off[^{}]*(?:\.setting-item-name|\.setting-item-info|\.osc-value-status)/);
});

test("preview corrections introduce no important declarations", () => {
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(source, /!important/);
});

test("all section previews use the production profile pipeline and draft handlers update immediately", () => {
  assert.match(source, /function applyProfileToPreview\(element, profile\)[\s\S]*applyProfileCssVariables\(element, profile\)[\s\S]*applyProfileStateClasses\(element, profile\)/);
  for (const selector of ["osc-base-preview", "osc-emphasis-preview", "osc-links-preview", "osc-heading-preview", "osc-rich-preview"]) {
    assert.match(source, new RegExp(selector));
  }
  for (const method of ["addTextSetting", "addSizeControl", "addColorControl", "addFontControl", "addWeightControl", "addImageAlignmentControl", "addImageRespectExplicitSizeControl"]) {
    const start = source.indexOf(`  ${method}(`);
    const next = source.indexOf("\n  }\n\n  ", start);
    assert.ok(start >= 0, method);
    assert.match(source.slice(start, next > start ? next : source.length), /updateDraftPreview/, method);
  }
  assert.doesNotMatch(css, /--osc-preview-(?:font|title|heading|link|table|blockquote)/);
});

test("native values are resolved semantically, displayed without persistence, and refreshed on theme changes", () => {
  assert.match(source, /nativeSemanticElementForField/);
  assert.match(source, /function nativeActiveElementForField\(field\)/);
  assert.match(source, /STYLE_FIELD_REGISTRY\[field\]\?\.selectors/);
  assert.match(source, /nativeSemanticProbeUsesReadingView[\s\S]*\.markdown-preview-view[\s\S]*\.markdown-source-view/);
  assert.match(source, /nativeActiveElementForField\(field\)[\s\S]*nativeSemanticElementForField\(probe, field\)/);
  assert.match(source, /\.markdown-source-view\.mod-cm6 \.cm-inline-code/);
  assert.match(source, /--osc-native-inline-code-line-height/);
  assert.match(source, /function resolvedNativePreviewValueForField\(field, profile = null\)/);
  assert.match(source, /return "transparent"/);
  assert.match(source, /String\(style\[property\] \|\| ""\)\.trim\(\)/);
  assert.match(source, /nativeProps\[variable\] = resolvedNativePreviewValueForField\(field, profile\)/);
  assert.match(source, /createEl\("p", \{ cls: "osc-inline-code-row" \}\)[\s\S]*createEl\("code", \{ text: "inline code sample"/);
  assert.match(css, /\.osc-rich-preview \.osc-inline-code-preview[\s\S]*line-height: var\(--osc-native-inline-code-line-height\)/);
  assert.match(source, /inline-title/);
  assert.match(source, /probe\.ownerDocument\.defaultView/);
  assert.match(source, /view\.getComputedStyle\(element\)/);
  assert.match(source, /nativeSemanticProbeScope/);
  assert.match(source, /profileWithNativeField/);
  assert.match(source, /data-osc-native-value/);
  assert.doesNotMatch(source, /"Title size", "40"|"Title weight", "400"/);
  assert.match(source, /workspace\.on\("css-change"[\s\S]*refreshNativeDefaults/);
  assert.match(source, /refreshNativeDefaults\(\)[\s\S]*refreshPreservingScroll/);
  assert.doesNotMatch(source, /profile\[key\]\s*=\s*nativeValue/);
});

test("legacy Base text override modules retain emphasis through the new logical module", () => {
  const settings = normalizeSettings({
    overrides: [{ id: "legacy", modules: { baseText: true }, profile: { boldWeight: "650" } }]
  });
  assert.equal(settings.overrides[0].modules.baseText, true);
  assert.equal(settings.overrides[0].modules.boldItalic, true);
  assert.equal(settings.overrides[0].profile.boldWeight, "650");
  assert.match(source, /renderOverrideModuleToggle\(card, draft, "boldItalic", "Bold and italic"\)/);
});

test("the real fenced code block has an auditable ownership fixture", () => {
  const notePath = "Metadata class/Untitled 1.md";
  const fixture = "```text\\nQMSE circuit\\n→ trainable quantum circuit\\n→ quantum measurements\\n→ classical regression\\n→ atomization energy\\n```";
  assert.match(notePath, /Metadata class/);
  assert.match(fixture, /QMSE circuit/);
  assert.deepEqual([...BLOCK_CODE_BACKGROUND_SELECTORS], [
    ".markdown-rendered pre",
    ".markdown-source-view.mod-cm6 .HyperMD-codeblock-bg"
  ]);
  assert.deepEqual([...BLOCK_CODE_TEXT_SELECTORS], [
    ".markdown-rendered pre",
    ".markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock"
  ]);
  assert.notEqual(STYLE_FIELD_REGISTRY.codeBackground.variable, STYLE_FIELD_REGISTRY.codeBlockBackground.variable);
  assert.equal(STYLE_FIELD_REGISTRY.codeBlockColor.property, "color");
});

test("block background and text stay native unless explicitly active", () => {
  const rules = cssRules(css);
  const backgroundRule = rules.find((rule) => rule.selectors.includes(".markdown-source-view.mod-cm6 .HyperMD-codeblock-bg")
    && rule.declarations.includes("background-color"));
  assert.ok(backgroundRule);
  assert.match(backgroundRule.declarations, /--osc-code-block-background/);
  assert.doesNotMatch(backgroundRule.selectors, /\.markdown-rendered pre code/);

  const blockTextRule = rules.find((rule) => rule.selectors.includes(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS)
    && rule.declarations.includes("var(--osc-code-block-color)"));
  assert.ok(blockTextRule);
  assert.match(blockTextRule.selectors, new RegExp(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS));
  assert.doesNotMatch(blockTextRule.selectors, /HyperMD-codeblock-bg/);

  const element = fakeElement();
  applyProfileCssVariables(element, normalizeProfile({}));
  applyProfileStateClasses(element, normalizeProfile({}));
  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.classList.contains(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS), false);
  applyProfileStateClasses(element, normalizeProfile({ codeBlockColor: "#123456" }));
  assert.equal(element.classList.contains(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS), true);
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
  assert.ok(BLOCK_CODE_TEXT_SELECTORS.includes(".markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock"));
  assert.ok(!BLOCK_CODE_TEXT_SELECTORS.includes(".markdown-source-view.mod-cm6 .HyperMD-codeblock-bg"));
  assert.ok(!inline.selectors.some((selector) => block.selectors.includes(selector)));
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBackground.enabled, "codeBackgroundCustomEnabled");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBackground.value, "codeBackgroundCustomValue");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBlockBackground.enabled, "codeBlockBackgroundCustomEnabled");
  assert.equal(CODE_BACKGROUND_CUSTOM_FIELDS.codeBlockBackground.value, "codeBlockBackgroundCustomValue");
});

test("stored code defaults remain compatible while Off emits no override", () => {
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
      const state = codeBackgroundUiState(profile, field, false, "#112233");
      assert.equal(state.enabled, false);
      assert.equal(state.status, "Off");
      assert.equal(state.displayedValue, "#112233");
      assert.equal(state.effectiveValue, "");
    }
  }

  const element = fakeElement();
  applyProfileCssVariables(element, created);
  assert.equal(element.css.has("--osc-code-background"), false);
  assert.equal(element.css.has("--osc-code-block-background"), false);
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

test("Off emits no code variables and custom On remains independent", () => {
  const element = fakeElement();
  const profile = createDefaultProfile();
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.has("--osc-code-background"), false);
  assert.equal(element.css.has("--osc-code-block-background"), false);

  setCodeBackgroundCustomValue(profile, "codeBackground", "#123456");
  setCodeBackgroundCustomEnabled(profile, "codeBackground", true);
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.get("--osc-code-background"), "#123456");
  assert.equal(element.css.has("--osc-code-block-background"), false);

  setCodeBackgroundCustomEnabled(profile, "codeBackground", false);
  applyProfileCssVariables(element, profile);
  assert.equal(element.css.has("--osc-code-background"), false);
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

test("legacy imported italic geometry is cleared only during schema migration", () => {
  const migrated = normalizeSettings({
    schemaVersion: 2,
    global: {
      italicFontFamily: "Times New Roman, Times, serif",
      italicWeight: "400",
      italicColor: "#ac38de"
    }
  });
  assert.equal(migrated.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(migrated.global.italicFontFamily, "");
  assert.equal(migrated.global.italicWeight, "");
  assert.equal(migrated.global.italicColor, "#ac38de");
  assert.equal(migrated.global.italicSize, "");

  const explicit = normalizeSettings({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    global: {
      italicFontFamily: "Times New Roman, Times, serif",
      italicSize: "18px",
      italicWeight: "400"
    }
  });
  assert.equal(explicit.global.italicFontFamily, "Times New Roman, Times, serif");
  assert.equal(explicit.global.italicSize, "18px");
  assert.equal(explicit.global.italicWeight, "400");
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

test("code background UI displays a resolved native value without persisting it", () => {
  const profile = createDefaultProfile();
  for (const field of ["codeBackground", "codeBlockBackground"]) {
    assert.equal(effectiveCodeBackground(profile, field), "");
    const state = codeBackgroundUiState(profile, field, false, "#334455");
    assert.equal(state.enabled, false);
    assert.equal(state.inherited, false);
    assert.equal(state.customValue, "#fafafa");
    assert.equal(state.displayedValue, "#334455");
    assert.equal(state.effectiveValue, "");
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
  assert.equal(codeBackgroundUiState(profile, "codeBackground", false, "#556677").displayedValue, "#556677");
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
  assert.equal(applied.css.has("--osc-code-block-background"), false);

  setCodeBackgroundCustomInput(profile, "codeBackground", "");
  const cleared = codeBackgroundUiState(profile, "codeBackground", false, "#556677");
  assert.equal(profile.codeBackgroundCustomEnabled, false);
  assert.equal(cleared.status, "Off");
  assert.equal(cleared.displayedValue, "#556677");
  assert.equal(cleared.effectiveValue, "");
  applyProfileCssVariables(applied, profile);
  assert.equal(applied.css.has("--osc-code-background"), false);
  assert.notEqual(applied.css.get("--osc-code-background"), "#ffffff");

  setCodeBackgroundCustomInput(profile, "codeBlockBackground", "not-a-color");
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").status, "Error");
  assert.equal(codeBackgroundUiState(profile, "codeBlockBackground").effectiveValue, "");
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
  assert.equal(personalLeaf.css.has("--osc-code-block-background"), false);
});

test("heading path overrides can control Title without changing H1", () => {
  const settings = normalizeSettings({
    global: { titleSize: "40px", h1Size: "32px" },
    overrides: [{
      id: "title-work",
      name: "Title work",
      type: "folder",
      pattern: "Work",
      enabled: true,
      modules: { headings: true },
      profile: { titleSize: "48px" }
    }]
  });
  const context = { settings };
  const work = StyleControllerPlugin.prototype.getProfileForPath.call(context, "Work/One.md");
  const personal = StyleControllerPlugin.prototype.getProfileForPath.call(context, "Personal/Two.md");
  assert.equal(work.profile.titleSize, "48px");
  assert.equal(work.profile.h1Size, "32px");
  assert.equal(personal.profile.titleSize, "40px");
  assert.equal(personal.profile.h1Size, "32px");
});

test("unload cleanup removes plugin variables and scope classes", () => {
  const element = fakeElement();
  const interfaceRoot = fakeElement();
  applyInterfaceStateClasses(interfaceRoot, { bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_LEFT });
  element.classList.add(STYLE_SCOPE_CLASS, "osc-scope-0", "style-controller-image-width", STYLE_HEADING_COLOR_ACTIVE_CLASS, STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS, STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS, ...STYLE_TITLE_ACTIVE_CLASSES);
  element.classList.add(...STYLE_HEADING_COLOR_CLASSES);
  element.classList.add(...STYLE_HEADING_SPACE_ABOVE_CLASSES);
  applyProfileCssVariables(element, normalizeProfile({
    codeBlockBackground: "#fafafa",
    h3Color: "#123456",
    h5SpaceAboveEnabled: true,
    h5SpaceAboveValue: "8",
    h5SpaceAboveUnit: "px"
  }));
  let explorerCleared = false;

  StyleControllerPlugin.prototype.removeStyles.call({
    getInterfaceRoot: () => interfaceRoot,
    getMarkdownContainers: () => [element],
    clearFileExplorerStyles: () => {
      explorerCleared = true;
    }
  });

  assert.equal(interfaceRoot.classList.contains(STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS), false);
  assert.equal(element.css.has("--osc-code-block-background"), false);
  assert.equal(element.css.has("--osc-h5-space-above"), false);
  assert.equal(element.classList.contains(STYLE_SCOPE_CLASS), false);
  assert.equal(element.classList.contains("osc-scope-0"), false);
  assert.equal(element.classList.contains("style-controller-image-width"), false);
  assert.equal(element.classList.contains(STYLE_HEADING_COLOR_ACTIVE_CLASS), false);
  assert.equal(element.classList.contains(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS), false);
  assert.equal(element.classList.contains(STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS), false);
  STYLE_HEADING_COLOR_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
  STYLE_HEADING_SPACE_ABOVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
  STYLE_TITLE_ACTIVE_CLASSES.forEach((className) => assert.equal(element.classList.contains(className), false));
  assert.equal(explorerCleared, true);
});

test("preview, reading view, and Live Preview use the same dedicated block variable", () => {
  const rules = cssRules(css);
  const readingBlock = rules.find((rule) => rule.selectors.includes(".osc-style-scope .markdown-rendered pre") && rule.declarations.includes("background-color"));
  const editorBlock = rules.find((rule) => rule.selectors.includes(".HyperMD-codeblock-bg") && rule.declarations.includes("background-color"));
  const inlineRule = rules.find((rule) => rule.selectors.includes(":not(pre) > code"));

  assert.match(readingBlock.declarations, /background-color:\s*var\(--osc-code-block-background\)/);
  assert.match(editorBlock.declarations, /background-color:\s*var\(--osc-code-block-background\)/);
  assert.match(inlineRule.declarations, /background-color:\s*var\(--osc-code-background\)/);
  assert.doesNotMatch(inlineRule.declarations, /--osc-code-block-background/);
  assert.match(source, /osc-code-block-rendered-preview markdown-rendered/);
  assert.match(source, /applyProfileToPreview\(preview, profile\)/);

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
  assert.equal(element.css.has("--osc-code-background"), false);
  assert.equal(element.css.has("--osc-code-block-background"), false);
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
